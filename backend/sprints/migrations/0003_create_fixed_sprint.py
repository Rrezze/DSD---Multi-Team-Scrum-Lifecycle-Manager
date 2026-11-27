from datetime import date

from django.db import migrations

# One fixed sprint, so teams and memberships can be used before sprints can
# be created through the API (PB-08: "a single fixed sprint").
FIXED_SPRINT_NAME = "Sprint 1"


def create_fixed_sprint(apps, schema_editor):
    Sprint = apps.get_model("sprints", "Sprint")
    Sprint.objects.get_or_create(
        name=FIXED_SPRINT_NAME,
        defaults={
            "start_date": date(2026, 11, 30),
            "end_date": date(2026, 12, 13),
        },
    )


def delete_fixed_sprint(apps, schema_editor):
    Sprint = apps.get_model("sprints", "Sprint")
    Sprint.objects.filter(name=FIXED_SPRINT_NAME).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("sprints", "0002_rename_sprint_table"),
    ]

    operations = [
        migrations.RunPython(create_fixed_sprint, delete_fixed_sprint),
    ]