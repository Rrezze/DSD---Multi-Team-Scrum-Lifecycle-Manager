from django.contrib.auth.models import AbstractUser
from django.db import models


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

    # The team of a user is stored per sprint in teams.TeamMembership.

    def __str__(self):
        return self.get_full_name() or self.username