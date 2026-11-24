from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """A user as sent to and returned by the API. There is no password:
    login only needs the username for now."""

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role", "is_active"]
        read_only_fields = ["id", "is_active"]

    def validate_username(self, value):
        # Login ignores upper/lower case, so "Ana" and "ana" can't both exist.
        others = User.objects.filter(username__iexact=value)
        if self.instance is not None:
            others = others.exclude(pk=self.instance.pk)
        if others.exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def create(self, validated_data):
        # create_user leaves the user without a usable password
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
