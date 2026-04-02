"""Authentication and user administration API views.

This module provides role and user management endpoints plus custom
token authentication with optional 2FA setup flow.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import Role, UserProfile
from .serializers import RoleSerializer, UserSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
import pyotp
import qrcode
import base64
from io import BytesIO
import secrets
import string
from django.core.mail import send_mail
from django.contrib.auth.hashers import make_password

class RoleViewSet(viewsets.ModelViewSet):
    """CRUD API for role definitions and allowed view permissions.

    Commercial action:
    - Configure role-based access to CRM modules for internal teams.

    Response type:
    - JSON payloads through DRF serializers.
    """

    queryset = Role.objects.all().order_by('name')
    serializer_class = RoleSerializer

class UserViewSet(viewsets.ModelViewSet):
    """CRUD API for CRM users and profile data.

    Commercial action:
    - Manage internal users who operate sales, support, and billing flows.

    Permissions:
    - Global authenticated API permission policy.
    - Includes guard to avoid deleting primary superadmin.

    Response type:
    - JSON payloads through DRF serializers.
    """

    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer

    # Override destroy to not delete the superadmin/admin user by accident
    def destroy(self, request, *args, **kwargs):
        """Delete user unless it is the protected superadmin account."""
        instance = self.get_object()
        if instance.username == 'admin' or instance.is_superuser:
            return Response({"error": "No se puede eliminar al súper administrador principal."}, status=status.HTTP_403_FORBIDDEN)
        
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _transform_profile_data(self, request):
        """Normalize multipart keys from `profile.*` into nested profile data."""
        data = request.data.copy() if hasattr(request.data, 'copy') else request.data
        if hasattr(data, 'dict'):
            data = data.dict()
            
        profile_data = {}
        to_delete = []
        for key, value in data.items():
            if key.startswith('profile.'):
                profile_data[key.replace('profile.', '')] = value
                to_delete.append(key)
                
        for key in to_delete:
            del data[key]
            
        if profile_data:
            data['profile'] = profile_data
            
        return data

    def create(self, request, *args, **kwargs):
        """Create user with nested profile payload transformation."""
        data = self._transform_profile_data(request)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """Partially update user and restrict sensitive fields by role."""
        partial = True # Always allow partial updates to handle multipart/form-data correctly
        instance = self.get_object()
        data = self._transform_profile_data(request)
        
        # If user is not superuser, do not allow changing role or username
        if not request.user.is_superuser:
            if 'username' in data:
                del data['username']
            if 'profile' in data and 'role' in data['profile']:
                del data['profile']['role']
                
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_permissions(request):
    """Return role-based permissions and profile data for current user.

    Commercial action:
    - Supplies frontend authorization context to enable/disable CRM modules.

    Response type:
    - JSON payload.
    """
    user = request.user
    
    full_name = f"{user.first_name} {user.last_name}".strip()
    if not full_name:
        full_name = user.username

    payload = {
        "id": user.id,
        "username": user.username,
        "full_name": full_name,
        "email": user.email,
        "is_superuser": user.is_superuser,
        "role": "Sin Rol",
        "allowed_views": [],
        "photo": None
    }

    try:
        profile = user.profile
        if profile.photo:
            payload["photo"] = profile.photo.url
        
        # Add profile info if needed
        payload["cedula"] = profile.cedula
        payload["cargo"] = profile.cargo
        payload["birthdate"] = profile.birthdate
        payload["civil_status"] = profile.civil_status

        if profile.role:
            payload["role"] = profile.role.name
            payload["allowed_views"] = profile.role.allowed_views
    except UserProfile.DoesNotExist:
        pass

    if user.is_superuser:
        payload["role"] = "Súper Administrador"
        payload["allowed_views"] = ["dashboard", "clients", "services", "support", "billing", "catalog", "settings", "export_reports"]
        
    return Response(payload)

class CustomAuthToken(ObtainAuthToken):
    """Authenticate user and enforce 2FA setup/verification workflow.

    Commercial action:
    - Controls secure login for internal CRM users.

    Response type:
    - JSON with auth token, or 2FA challenge/setup payload.
    """

    def post(self, request, *args, **kwargs):
        """Issue token only after validating credentials and TOTP state."""
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        totp_code = request.data.get('totp_code', None)
        
        profile, created = UserProfile.objects.get_or_create(user=user)
        
        # If user does not have 2FA enabled, force setup 
        if not profile.totp_secret:
            # Generate a new secret and QR
            totp_secret = pyotp.random_base32()
            totp = pyotp.TOTP(totp_secret)
            uri = totp.provisioning_uri(name=user.email or user.username, issuer_name="Datacom CRM")
            
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(uri)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            
            buffer = BytesIO()
            img.save(buffer, format="PNG")
            img_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
            
            return Response({
                "requires_2fa_setup": True,
                "qr_code": f"data:image/png;base64,{img_b64}",
                "temp_secret": totp_secret,
                "user_id": user.id  # Pass user_id explicitly to continue flow without Auth token
            }, status=status.HTTP_200_OK)
            
        # If 2FA is enabled but no code provided, prompt for code
        if not totp_code:
            return Response({
                "requires_2fa": True,
                "user_id": user.id
            }, status=status.HTTP_200_OK)
            
        # Validate 2FA code (allow 1 step/30s of clock skew)
        totp = pyotp.TOTP(profile.totp_secret)
        if not totp.verify(totp_code, valid_window=1):
            return Response({"error": f"Código inválido. El servidor esperaba: {totp.now()}"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Success: Return actual token
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'email': user.email
        })

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_2fa_setup(request):
    """
    Verify first-time 2FA setup code and finalize authenticated login.

    Commercial action:
    - Completes secure access provisioning for CRM users.

    Response type:
    - JSON token response or validation error.
    """
    user_id = request.data.get('user_id')
    temp_secret = request.data.get('temp_secret')
    code = request.data.get('totp_code')
    
    if not all([user_id, temp_secret, code]):
        return Response({"error": "Datos incompletos."}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        user = User.objects.get(id=user_id)
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        if profile.totp_secret:
            return Response({"error": "2FA ya está configurado para este usuario."}, status=status.HTTP_400_BAD_REQUEST)
            
        totp = pyotp.TOTP(temp_secret)
        if totp.verify(code, valid_window=1):
            profile.totp_secret = temp_secret
            profile.save()
            
            # Login successful, generate token
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user_id': user.pk,
                'email': user.email
            })
        else:
            return Response({"error": f"Código incorrecto. Servidor esperaba: {totp.now()}"}, status=status.HTTP_400_BAD_REQUEST)
            
    except User.DoesNotExist:
        return Response({"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_account_managers(request):
    """
    Return users eligible to be assigned as account managers.

    Commercial action:
    - Supports client assignment workflows in sales operations.
        - Returned `id` is the Django User.id expected by `account_manager`
            in client create/update payloads.

    Response type:
    - JSON list of users.
    """
    roles = ["Gerente de Cuenta", "Gerente General", "Presidente Ejecutivo"]
    users = User.objects.filter(profile__role__name__in=roles).distinct()
    
    data = []
    for user in users:
        full_name = f"{user.first_name} {user.last_name}".strip()
        data.append({
            "id": user.id,
            "full_name": full_name or user.username
        })
    return Response(data)


def _generate_secure_password(length=8):
    """
    Generate a cryptographically secure password following best practices:
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 digit
    - At least 1 special character
    - Total length of 'length' characters (minimum 8)
    """
    alphabet_upper = string.ascii_uppercase
    alphabet_lower = string.ascii_lowercase
    digits = string.digits
    # Avoid ambiguous chars like 0, O, l, 1, I
    specials = "!@#$%^&*()-_=+[]{}|;:,.<>?"
    
    # Guarantee at least one of each required type
    required = [
        secrets.choice(alphabet_upper),
        secrets.choice(alphabet_lower),
        secrets.choice(digits),
        secrets.choice(specials),
    ]
    
    # Fill the rest randomly from full alphabet
    full_alphabet = alphabet_upper + alphabet_lower + digits + specials
    remaining = [secrets.choice(full_alphabet) for _ in range(length - len(required))]
    
    password_list = required + remaining
    # Shuffle to avoid predictable patterns
    secrets.SystemRandom().shuffle(password_list)
    return ''.join(password_list)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_and_send_password(request):
    """
    Generate a secure 8-character password for a user and send it via email.

    Commercial action:
    - Allows admin to provision new credentials and notify the user immediately.

    Request body:
    - user_id: int - ID of the user to generate the password for

    Response type:
    - JSON with success status and the generated password.
    """
    user_id = request.data.get('user_id')
    if not user_id:
        return Response({"error": "Se requiere el user_id."}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)
    
    if not user.email:
        return Response({"error": "El usuario no tiene correo electrónico configurado."}, status=status.HTTP_400_BAD_REQUEST)
    
    # Generate secure password
    new_password = _generate_secure_password(8)
    
    # Save hashed password to user
    user.password = make_password(new_password)
    user.save()
    
    # Invalidate existing tokens so user must log in again with new password
    Token.objects.filter(user=user).delete()
    
    full_name = f"{user.first_name} {user.last_name}".strip() or user.username
    
    # Build HTML email
    html_message = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; }}
        .container {{ max-width: 540px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }}
        .header {{ background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%); padding: 32px 40px; }}
        .header h1 {{ color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }}
        .header p {{ color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 13px; }}
        .body {{ padding: 32px 40px; }}
        .greeting {{ color: #1a1a2e; font-size: 16px; margin-bottom: 20px; }}
        .credentials-box {{ background: #f0f4ff; border: 1px solid #c7d7fc; border-radius: 10px; padding: 24px; margin: 24px 0; }}
        .cred-label {{ font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7c9d; font-weight: 600; margin-bottom: 4px; }}
        .cred-value {{ font-size: 20px; font-weight: 700; color: #1a1a2e; font-family: 'Courier New', monospace; letter-spacing: 1px; }}
        .cred-row {{ margin-bottom: 16px; }}
        .cred-row:last-child {{ margin-bottom: 0; }}
        .warning {{ background: #fff8e1; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 6px; margin: 24px 0; }}
        .warning p {{ margin: 0; font-size: 13px; color: #78350f; }}
        .footer {{ background: #f8faff; padding: 24px 40px; border-top: 1px solid #e8edf5; text-align: center; }}
        .footer p {{ margin: 0; font-size: 12px; color: #9ca3af; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>&#128274; Nuevas Credenciales de Acceso</h1>
            <p>CRM Datacom &mdash; Sistema de Gesti&oacute;n</p>
        </div>
        <div class="body">
            <p class="greeting">Hola, <strong>{full_name}</strong></p>
            <p style="color:#4b5563; font-size:14px;">Se han generado nuevas credenciales de acceso para tu cuenta en el CRM Datacom. Por favor, utiliza los siguientes datos para ingresar al sistema:</p>
            <div class="credentials-box">
                <div class="cred-row">
                    <div class="cred-label">&#128100; Usuario</div>
                    <div class="cred-value">{user.username}</div>
                </div>
                <div class="cred-row">
                    <div class="cred-label">&#128273; Contrase&ntilde;a Temporal</div>
                    <div class="cred-value">{new_password}</div>
                </div>
            </div>
            <div class="warning">
                <p>&#9888;&#65039; <strong>Importante:</strong> Por seguridad, deber&aacute;s cambiar esta contrase&ntilde;a en tu pr&oacute;ximo inicio de sesi&oacute;n. Esta contrase&ntilde;a es de uso &uacute;nico y temporal.</p>
            </div>
            <p style="color:#4b5563; font-size:13px;">Si no solicitaste este cambio, contacta inmediatamente con el administrador del sistema.</p>
        </div>
        <div class="footer">
            <p>Este correo fue generado autom&aacute;ticamente por el CRM Datacom &bull; No responder a este mensaje</p>
        </div>
    </div>
</body>
</html>"""
    
    plain_message = f"""Nuevas Credenciales de Acceso - CRM Datacom

Hola {full_name},

Se han generado nuevas credenciales de acceso para tu cuenta:

Usuario: {user.username}
Contrasena Temporal: {new_password}

IMPORTANTE: Debes cambiar esta contrasena en tu proximo inicio de sesion.

Si no solicitaste este cambio, contacta al administrador del sistema.

CRM Datacom"""
    
    try:
        send_mail(
            subject="[CRM Datacom] Nuevas Credenciales de Acceso",
            message=plain_message,
            from_email=None,  # Uses DEFAULT_FROM_EMAIL from settings
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as e:
        return Response({
            "error": f"Contrasena generada pero no se pudo enviar el correo: {str(e)}",
            "generated_password": new_password
        }, status=status.HTTP_207_MULTI_STATUS)
    
    return Response({
        "success": True,
        "message": f"Contraseña generada y enviada a {user.email}",
        "generated_password": new_password
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_backup(request):
    """Generate a pg_dump backup of the PostgreSQL database and return it for download.

    Only accessible to superadministrators. Uses pg_dump with maximum compression
    (custom format, -Z 9). The PGPASSWORD env variable is used to avoid exposing
    credentials in the process list.

    Response type:
    - Binary file download (.dump) on success.
    - JSON error payload on failure.
    """
    if not request.user.is_superuser:
        return Response(
            {"error": "Acceso denegado. Solo el súper administrador puede generar respaldos."},
            status=status.HTTP_403_FORBIDDEN
        )

    import subprocess
    import tempfile
    import os
    from django.http import HttpResponse
    from django.conf import settings as django_settings
    from datetime import datetime

    db = django_settings.DATABASES['default']

    if 'postgresql' not in db.get('ENGINE', ''):
        return Response(
            {"error": "El respaldo automático solo está disponible para bases de datos PostgreSQL."},
            status=status.HTTP_400_BAD_REQUEST
        )

    db_name = db.get('NAME', '')
    db_user = db.get('USER', 'postgres')
    db_password = db.get('PASSWORD', '')
    db_host = db.get('HOST', 'localhost')
    db_port = str(db.get('PORT', '5432'))

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"datacom_crm_backup_{timestamp}.dump"

    tmp_fd, tmp_path = tempfile.mkstemp(suffix='.dump')
    os.close(tmp_fd)

    try:
        env = os.environ.copy()
        env['PGPASSWORD'] = db_password

        result = subprocess.run(
            [
                'pg_dump',
                '-U', db_user,
                '-h', db_host,
                '-p', db_port,
                '-d', db_name,
                '-F', 'c',
                '-Z', '9',
                '-f', tmp_path,
            ],
            env=env,
            capture_output=True,
            text=True,
            timeout=300,
        )

        if result.returncode != 0:
            return Response(
                {"error": f"Error al generar el respaldo: {result.stderr}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        with open(tmp_path, 'rb') as f:
            content = f.read()

        response = HttpResponse(content, content_type='application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Length'] = len(content)
        return response

    except subprocess.TimeoutExpired:
        return Response(
            {"error": "El proceso de respaldo excedió el tiempo límite (5 min)."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        return Response(
            {"error": f"Error inesperado: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
