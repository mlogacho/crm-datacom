from rest_framework import serializers
from .models import Client, Contact, ClientStatusHistory

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = '__all__'

class ClientStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientStatusHistory
        fields = '__all__'

class ClientSerializer(serializers.ModelSerializer):
    contacts = ContactSerializer(many=True, read_only=True)
    status_history = ClientStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Client
        fields = '__all__'
