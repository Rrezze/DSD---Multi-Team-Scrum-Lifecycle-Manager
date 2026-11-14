# Renames tickets_sprint to sprints_sprint. The data is kept.

from django.db import migrations


def move_content_types(old_app, new_app, models):
    """Point the existing content types (used by permissions) to the new app."""

    def forwards(apps, schema_editor):
        ContentType = apps.get_model("contenttypes", "ContentType")
        for model in models:
            if not ContentType.objects.filter(app_label=new_app, model=model).exists():
                ContentType.objects.filter(app_label=old_app, model=model).update(app_label=new_app)

    return forwards


class Migration(migrations.Migration):

    dependencies = [
        ("sprints", "0001_initial"),
        ("tickets", "0004_move_sprint_and_teams_to_own_apps"),
        ("contenttypes", "0002_remove_content_type_name"),
    ]

    operations = [
        migrations.AlterModelTable(name="sprint", table=None),
        migrations.RunPython(
            move_content_types("tickets", "sprints", ["sprint"]),
            migrations.RunPython.noop,
        ),
    ]
