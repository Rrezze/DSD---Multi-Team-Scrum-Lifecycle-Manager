# Sprint now lives in the sprints app, Team and TeamMembership in the teams app.
# Only Django's state changes here; the database is not touched.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tickets", "0003_ticket_teams_assignees_team_membership"),
        ("sprints", "0001_initial"),
        ("teams", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="ticket",
                    name="sprint",
                    field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="tickets", to="sprints.sprint"),
                ),
                migrations.AlterField(
                    model_name="ticket",
                    name="teams",
                    field=models.ManyToManyField(blank=True, related_name="tickets", to="teams.team"),
                ),
                migrations.DeleteModel(name="TeamMembership"),
                migrations.DeleteModel(name="Sprint"),
            ],
            database_operations=[],
        ),
    ]
