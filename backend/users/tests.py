from django.contrib.auth import get_user_model
from django.test import TestCase

User = get_user_model()


class UserModelTests(TestCase):
    def test_project_uses_custom_user_model(self):
        self.assertEqual(User._meta.label, "users.User")

    def test_new_user_is_developer(self):
        user = User.objects.create_user(username="dev1", password="test-pass-123")
        self.assertEqual(user.role, User.Role.DEVELOPER)

    def test_new_user_is_not_in_any_team(self):
        # teams are stored per sprint in teams.TeamMembership
        user = User.objects.create_user(username="dev2")
        self.assertFalse(user.team_memberships.exists())


class DefaultProductOwnerTests(TestCase):
    def test_default_po_exists_after_migrations(self):
        po = User.objects.get(username="po")
        self.assertEqual(po.role, User.Role.PRODUCT_OWNER)

    def test_default_po_cannot_log_in(self):
        po = User.objects.get(username="po")
        self.assertFalse(po.has_usable_password())