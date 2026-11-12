# Moves the Sprint model from the tickets app to the sprints app.
# Only Django's state changes here; the table stays as it is (tickets_sprint)
# and is renamed in 0002, so no data is lost.

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("tickets", "0003_ticket_teams_assignees_team_membership"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name="Sprint",
                    fields=[
                        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                        ("name", models.CharField(max_length=100)),
                        ("start_date", models.DateField()),
                        ("end_date", models.DateField()),
                        ("goal", models.TextField(blank=True)),
                    ],
                    options={
                        "ordering": ["start_date"],
                        "db_table": "tickets_sprint",
                    },
                ),
            ],
            database_operations=[],
        ),
    ]
