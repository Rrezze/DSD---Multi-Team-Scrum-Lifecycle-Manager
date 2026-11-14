from django.db import models


class Sprint(models.Model):
    """A two-week sprint shared by all teams."""

    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    goal = models.TextField(blank=True)

    class Meta:
        ordering = ["start_date"]

    def __str__(self):
        return self.name
