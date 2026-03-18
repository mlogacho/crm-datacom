"""
Support App Models

This module defines the ticketing system for managing client support requests,
incidents, and service issues.
"""

from django.db import models
from django.contrib.auth.models import User
from clients.models import Client
from services.models import ClientService

class Ticket(models.Model):
    """
    Ticket model for support issue tracking and incident management.
    
    Represents a support request or incident reported by a client.
    Tracks the lifecycle of issues from creation through resolution.
    
    Fields:
        client (ForeignKey): Reference to the Client reporting the issue
        related_service (ForeignKey): Reference to affected ClientService (optional)
        title (str): Brief summary of the issue
        description (str): Detailed explanation of the problem
        priority (str): Urgency level (LOW, MEDIUM, HIGH, CRITICAL)
        status (str): Current state (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
        assigned_to (ForeignKey): User responsible for resolving the ticket
        created_by (ForeignKey): User who created/reported the ticket
        created_at (datetime): Timestamp when ticket was created
        updated_at (datetime): Timestamp of last update
        resolved_at (datetime): Timestamp when issue was resolved (if applicable)
        
    Relations:
        - client: Parent Client model (many-to-one)
        - related_service: Related ClientService model (many-to-one)
        - comments: Related TicketComment records (one-to-many)
        - assigned_to: Django User model (many-to-one)
        - created_by: Django User model (many-to-one)
        
    Priority Guide:
        LOW: Non-urgent issues, can wait
        MEDIUM: Normal priority, affects operations
        HIGH: Urgent, needs attention soon
        CRITICAL: Service down or severely impacted
        
    Status Workflow:
        OPEN → IN_PROGRESS → RESOLVED → CLOSED
        Can also transition to OPEN from other states if reopened
    """
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
    """
    TicketComment model for recording interactions and updates on a ticket.
    
    Allows support staff and clients to add updates, notes, and status changes
    to a ticket. Supports internal-only comments for staff discussions.
    
    Fields:
        ticket (ForeignKey): Reference to parent Ticket
        author (ForeignKey): User who wrote the comment
        comment (str): The comment text/content
        is_internal (bool): If True, visible only to staff; if False, visible to client
        created_at (datetime): Timestamp when comment was posted
        
    Relations:
        - ticket: Parent Ticket model (many-to-one)
        - author: Django User model (many-to-one)
        
    Notes:
        - Internal comments allow staff to discuss issues without client seeing
        - All comments are audited with timestamp and author attribution
    """
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    comment = models.TextField(verbose_name="Comentario")
    is_internal = models.BooleanField(default=False, verbose_name="Solo visible para staff")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comentario en Ticket #{self.ticket.id} por {self.author}"

