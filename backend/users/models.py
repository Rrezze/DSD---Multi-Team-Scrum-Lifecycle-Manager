from django.contrib.auth.models import AbstractUser
from django.db import models


class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class User(AbstractUser):

    class Role(models.TextChoices):
        PRODUCT_OWNER = "PRODUCT_OWNER", "Product Owner"
        DEVELOPER = "DEVELOPER", "Developer"
        ENGINEERING_MANAGER = "ENGINEERING_MANAGER", "Engineering Manager"

    role = models.CharField(
        max_length=32,
        choices=Role.choices,
        default=Role.DEVELOPER,
    )

    team = models.ForeignKey(
        Team,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="members",
    )

    def __str__(self):
        return self.get_full_name() or self.username