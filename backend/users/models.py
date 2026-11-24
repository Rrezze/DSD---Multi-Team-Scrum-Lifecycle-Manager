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


class Absence(models.Model):
    """A period when a user can't work (holiday, sickness...). Used later to
    lower the team capacity in every sprint it overlaps.

    hours is only for a partial day off (e.g. a 4-hour appointment); when it
    is empty, all the days from start_date to end_date count as absent.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="absences")
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.CharField(max_length=200, blank=True)
    hours = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["start_date", "id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F("start_date")),
                name="absence_ends_after_it_starts",
            )
        ]

    def __str__(self):
        return f"{self.user} absent {self.start_date} - {self.end_date}"
