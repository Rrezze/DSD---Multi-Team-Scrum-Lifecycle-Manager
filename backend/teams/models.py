from django.conf import settings
from django.db import models


class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class TeamMembership(models.Model):
    """Which team a user is in for a sprint, their role in the team and how
    many hours they can work.

    Kept per sprint, so changing teams later doesn't change past sprints.
    """

    class Role(models.TextChoices):
        DEVELOPER = "DEVELOPER", "Developer"
        SCRUM_MASTER = "SCRUM_MASTER", "Scrum Master"

    sprint = models.ForeignKey(
        "sprints.Sprint", on_delete=models.CASCADE, related_name="team_memberships"
    )
    team = models.ForeignKey(
        Team, on_delete=models.CASCADE, related_name="team_memberships"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="team_memberships",
    )
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.DEVELOPER)
    # 2 weeks x 8h by default
    available_hours = models.PositiveSmallIntegerField(default=80)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["sprint", "user"], name="one_team_per_user_per_sprint"
            )
        ]

    def __str__(self):
        return f"{self.user} in {self.team} ({self.sprint})"
