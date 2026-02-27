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

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all().order_by('name')
    serializer_class = RoleSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer

    # Override destroy to not delete the superadmin/admin user by accident
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.username == 'admin' or instance.is_superuser:
            return Response({"error": "No se puede eliminar al súper administrador principal."}, status=status.HTTP_403_FORBIDDEN)
        
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_permissions(request):
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
        "allowed_views": []
    }

    if user.is_superuser:
        payload["role"] = "Súper Administrador"
        payload["allowed_views"] = ["dashboard", "clients", "services", "support", "billing", "catalog", "settings"]
        return Response(payload)
    
    try:
        profile = user.profile
        if profile.role:
            payload["role"] = profile.role.name
            payload["allowed_views"] = profile.role.allowed_views
    except UserProfile.DoesNotExist:
        pass
        
    return Response(payload)

class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
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
    Called when a user is setting up 2FA for the first time during login.
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
