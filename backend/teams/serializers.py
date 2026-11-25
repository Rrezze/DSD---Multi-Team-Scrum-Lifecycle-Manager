from rest_framework import serializers

from .models import Team


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "description", "is_active", "base_capacity_points"]
        # is_active only changes through DELETE
        read_only_fields = ["id", "is_active"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Team name cannot be empty.")
        others = Team.objects.filter(name__iexact=value)
        if self.instance is not None:
            others = others.exclude(pk=self.instance.pk)
        if others.exists():
            raise serializers.ValidationError("A team with that name already exists.")
        return value