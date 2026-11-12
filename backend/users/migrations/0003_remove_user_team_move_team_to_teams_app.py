# A user's team is now stored per sprint in teams.TeamMembership (see the DD),
# so User.team is removed. The Team model itself moved to the teams app
# (state only, its table is renamed in teams.0002).

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_create_default_po"),
        ("teams", "0001_initial"),
        ("tickets", "0004_move_sprint_and_teams_to_own_apps"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="team",
        ),
        migrations.SeparateDatabaseAndState(
            state_operations=[migrations.DeleteModel(name="Team")],
            database_operations=[],
        ),
    ]
