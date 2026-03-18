"""
Core App Models

This module defines authentication, authorization, and user profile models.
Includes Role-based access control and extended user profile information for CRM users.
"""

from django.db import models
from django.contrib.auth.models import User

class Role(models.Model):
    """
    Role model for implementing role-based access control (RBAC).
    
    Defines custom roles and their permissions within the CRM system,
    allowing fine-grained control over which application views each user can access.
    
    Fields:
        name (str): Unique identifier for the role (e.g., "Sales Manager", "Support Agent")
        description (str): Human-readable description of the role's purpose and responsibilities
        allowed_views (JSONField): List of view names/modules user with this role can access
                                   Examples: ["dashboard", "clients", "services", "support", "billing"]
        created_at (datetime): Timestamp when role was created
        updated_at (datetime): Timestamp of last modification
        
    Relations:
        - users: Related UserProfile records with this role (one-to-many)
        
    Example:
        A "Sales Manager" role might have allowed_views = ["dashboard", "clients", "services", "billing"]
    """
    name = models.CharField(max_length=100, unique=True, verbose_name="Nombre del Rol")
    description = models.TextField(blank=True, null=True, verbose_name="Descripción")
    
    # Stores the allowed views. e.g. ["dashboard", "clients", "services", "support", "billing", "catalog"]
    allowed_views = models.JSONField(default=list, verbose_name="Vistas Permitidas")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class UserProfile(models.Model):
    """
    UserProfile model extending Django's built-in User model with CRM-specific fields.
    
    Extends Django's User model with additional information needed for CRM operations,
    including role assignment, personal details, and optional TOTP 2FA configuration.
    
    Fields:
        user (OneToOneField): Reference to the Django User account
        role (ForeignKey): Reference to the user's assigned Role
        cedula (str): National ID/Passport number for identity verification
        cargo (str): Job title or position within DataCom
        totp_secret (str): Base32-encoded TOTP secret for 2FA (if enabled)
        photo (ImageField): Profile photograph/avatar
        birthdate (date): User's birth date
        civil_status (str): Marital/civil status
        
    Relations:
        - user: Django User model (one-to-one)
        - role: Role model (many-to-one)
        - assigned_tickets: Related Ticket records assigned to this user
        - created_tickets: Related Ticket records created by this user
        
    Notes:
        - TOTP 2FA can be optionally enabled by storing a secret
        - Photo is optional and stored in media/profiles/
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, related_name="users", verbose_name="Rol")
    cedula = models.CharField(max_length=20, blank=True, null=True, verbose_name="Cédula")
    cargo = models.CharField(max_length=100, blank=True, null=True, verbose_name="Cargo")
    totp_secret = models.CharField(max_length=32, blank=True, null=True, verbose_name="Secreto TOTP")
    
    photo = models.ImageField(upload_to='profiles/', blank=True, null=True, verbose_name="Fotografía")
    birthdate = models.DateField(blank=True, null=True, verbose_name="Fecha de Nacimiento")
    civil_status = models.CharField(max_length=50, blank=True, null=True, verbose_name="Estado Civil")
    
    def __str__(self):
        return f"Perfil de {self.user.username}"

