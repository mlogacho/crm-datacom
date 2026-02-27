from django.db import models
from django.contrib.auth.models import User

class Role(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Nombre del Rol")
    description = models.TextField(blank=True, null=True, verbose_name="Descripción")
    
    # Stores the allowed views. e.g. ["dashboard", "clients", "services", "support", "billing", "catalog"]
    allowed_views = models.JSONField(default=list, verbose_name="Vistas Permitidas")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, related_name="users", verbose_name="Rol")
    cedula = models.CharField(max_length=20, blank=True, null=True, verbose_name="Cédula")
    cargo = models.CharField(max_length=100, blank=True, null=True, verbose_name="Cargo")
    totp_secret = models.CharField(max_length=32, blank=True, null=True, verbose_name="Secreto TOTP")
    
    def __str__(self):
        return f"Perfil de {self.user.username}"
