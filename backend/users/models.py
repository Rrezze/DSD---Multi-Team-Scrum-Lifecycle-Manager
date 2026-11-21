from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower


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

    class Meta(AbstractUser.Meta):
        constraints = [
            # Email is used for login, so two users can't have the same one
            # (case-insensitive). Users without an email are allowed.
            models.UniqueConstraint(
                Lower("email"),
                condition=~models.Q(email=""),
                name="unique_user_email",
            )
        ]

    def __str__(self):
        return self.get_full_name() or self.username