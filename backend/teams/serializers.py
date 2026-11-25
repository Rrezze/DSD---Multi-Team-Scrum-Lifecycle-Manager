from datetime import date

from rest_framework import serializers

from users.models import User

from .models import Team, TeamMembership


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
    
class TeamMembershipSerializer(serializers.ModelSerializer):
    """The team a Developer is in for one sprint, their role in it (Developer
    or Scrum Master) and how many hours they can work in that sprint."""

    class Meta:
        model = TeamMembership
        fields = ["id", "user", "team", "sprint", "role", "available_hours"]
        # The "one team per user per sprint" rule is checked in validate(),
        # with a clearer message than Django's default one.
        validators = []

    def validate(self, attrs):
        # On PATCH only the changed fields are sent, so the others are taken
        # from the membership that is already saved.
        def current(field):
            return attrs.get(field, getattr(self.instance, field, None))

        user, team, sprint = current("user"), current("team"), current("sprint")

        if self.instance is not None:
            if user != self.instance.user:
                raise serializers.ValidationError(
                    {"user": "The user of a membership can't be changed. "
                             "Delete it and create a new one."}
                )
            if sprint != self.instance.sprint:
                raise serializers.ValidationError(
                    {"sprint": "The sprint of a membership can't be changed. "
                               "Delete it and create a new one."}
                )

        # Past sprints keep their teams as they were (TEAM-5a).
        if sprint.end_date < date.today():
            raise serializers.ValidationError(
                {"sprint": "This sprint has already ended, so its teams can't be changed."}
            )
        if not user.is_active:
            raise serializers.ValidationError({"user": "This user has been deleted."})
        if user.role != User.Role.DEVELOPER:
            raise serializers.ValidationError({"user": "Only Developers can be in a team."})
        if "team" in attrs and not team.is_active:
            raise serializers.ValidationError({"team": "This team has been deleted."})

        # A Developer can be in at most one team in a sprint (TEAM-4).
        others = TeamMembership.objects.filter(sprint=sprint, user=user)
        if self.instance is not None:
            others = others.exclude(pk=self.instance.pk)
        other = others.select_related("team").first()
        if other is not None:
            raise serializers.ValidationError(
                {"user": f'This user is already in team "{other.team.name}" in this sprint.'}
            )
        return attrs
