from django.conf import settings
from django.db import models


class Sprint(models.Model):

    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    goal = models.TextField(blank=True)

    class Meta:
        ordering = ["start_date"]

    def __str__(self):
        return self.name


class Ticket(models.Model):

    class Type(models.TextChoices):
        EPIC = "EPIC", "Epic"
        STORY = "STORY", "Story"
        TASK = "TASK", "Task"
        BUG = "BUG", "Bug"

    class Status(models.TextChoices):
        TODO = "TODO", "To Do"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        WAITING_FOR_QA = "WAITING_FOR_QA", "Waiting for QA"
        IN_QA = "IN_QA", "In QA"
        DONE = "DONE", "Done"

    type = models.CharField(max_length=16, choices=Type.choices)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    estimate_points = models.PositiveSmallIntegerField(null=True, blank=True)
    # lower number = higher in the backlog
    priority = models.PositiveIntegerField()
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.TODO
    )
    # epic -> story -> task/bug
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="children",
    )

    sprint = models.ForeignKey(
        Sprint,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tickets",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_tickets",
    )
    
    # a ticket can be worked on by more than one person
    assignees = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="assigned_tickets",
    )

    # one team at first, more can be added (e.g. another team does QA);
    # no team = shared pool
    teams = models.ManyToManyField(
        "users.Team",
        blank=True,
        related_name="tickets",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["priority", "id"]

    def __str__(self):
        return f"[{self.type}] {self.title}"


class TeamMembership(models.Model):
    """Which team a user is in for a sprint, their role in the team and how
    many hours they can work.

    Kept per sprint, so changing teams later doesn't change past sprints.
    """

    class Role(models.TextChoices):
        DEVELOPER = "DEVELOPER", "Developer"
        SCRUM_MASTER = "SCRUM_MASTER", "Scrum Master"

    sprint = models.ForeignKey(
        Sprint, on_delete=models.CASCADE, related_name="team_memberships"
    )
    team = models.ForeignKey(
        "users.Team", on_delete=models.CASCADE, related_name="team_memberships"
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
