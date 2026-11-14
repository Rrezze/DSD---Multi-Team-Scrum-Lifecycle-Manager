from django.conf import settings
from django.db import models


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
        "sprints.Sprint",
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
        "teams.Team",
        blank=True,
        related_name="tickets",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["priority", "id"]

    def __str__(self):
        return f"[{self.type}] {self.title}"
