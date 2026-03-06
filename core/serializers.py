from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Role, UserProfile
from django.contrib.auth.hashers import make_password

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class UserProfileSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'cedula', 'cargo', 'role', 'role_name', 'photo', 'birthdate', 'civil_status']
        extra_kwargs = {
            'photo': {'required': False, 'allow_null': True},
            'birthdate': {'required': False, 'allow_null': True},
            'civil_status': {'required': False, 'allow_null': True},
            'cedula': {'required': False},
            'cargo': {'required': False}
        }

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'password', 'profile', 'is_active']
        read_only_fields = ['is_active']

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
            
        user = User.objects.create(**validated_data)
        
        # Create profile
        UserProfile.objects.create(user=user, **profile_data)
        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        
        if 'password' in validated_data and validated_data['password']:
            validated_data['password'] = make_password(validated_data['password'])
            
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if profile_data is not None:
            profile, created = UserProfile.objects.get_or_create(user=instance)
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance
