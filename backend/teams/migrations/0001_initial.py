# Moves Team (from users) and TeamMembership (from tickets) to the teams app.
# Only Django's state changes here; the tables stay as they are
# (users_team, tickets_teammembership) and are renamed in 0002, so no data is lost.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("users", "0002_create_default_po"),
        ("sprints", "0001_initial"),
        ("tickets", "0003_ticket_teams_assignees_team_membership"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name="Team",
                    fields=[
                        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                        ("name", models.CharField(max_length=100, unique=True)),
                        ("description", models.TextField(blank=True)),
                        ("is_active", models.BooleanField(default=True)),
                    ],
                    options={
                        "db_table": "users_team",
                    },
                ),
                migrations.CreateModel(
                    name="TeamMembership",
                    fields=[
                        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                        ("role", models.CharField(choices=[("DEVELOPER", "Developer"), ("SCRUM_MASTER", "Scrum Master")], default="DEVELOPER", max_length=16)),
                        ("available_hours", models.PositiveSmallIntegerField(default=80)),
                        ("sprint", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="team_memberships", to="sprints.sprint")),
                        ("team", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="team_memberships", to="teams.team")),
                        ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="team_memberships", to=settings.AUTH_USER_MODEL)),
                    ],
                    options={
                        "db_table": "tickets_teammembership",
                        "constraints": [models.UniqueConstraint(fields=("sprint", "user"), name="one_team_per_user_per_sprint")],
                    },
                ),
            ],
            database_operations=[],
        ),
    ]
