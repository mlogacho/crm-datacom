from django.db import models
from django.contrib.auth.models import User
from clients.models import Client
from services.models import ClientService

class Ticket(models.Model):
    PRIORITY_CHOICES = [
        ('LOW', 'Baja'),
        ('MEDIUM', 'Media'),
        ('HIGH', 'Alta'),
        ('CRITICAL', 'Crítica'),
    ]

    STATUS_CHOICES = [
        ('OPEN', 'Abierto'),
        ('IN_PROGRESS', 'En Progreso'),
        ('RESOLVED', 'Resuelto'),
        ('CLOSED', 'Cerrado'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='tickets')
    related_service = models.ForeignKey(ClientService, on_delete=models.SET_NULL, null=True, blank=True, related_name='incident_tickets')
    
    title = models.CharField(max_length=255, verbose_name="Título del Problema")
    description = models.TextField(verbose_name="Descripción Detallada")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MEDIUM')
    
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_tickets')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Ticket #{self.id} - {self.title}"

class TicketComment(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    comment = models.TextField(verbose_name="Comentario")
    is_internal = models.BooleanField(default=False, verbose_name="Solo visible para staff")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comentario en Ticket #{self.ticket.id} por {self.author}"
