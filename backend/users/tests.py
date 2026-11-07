from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Team

User = get_user_model()


class UserModelTests(TestCase):
    def test_project_uses_custom_user_model(self):
        self.assertEqual(User._meta.label, "users.User")

    def test_new_user_is_developer_without_team(self):
        user = User.objects.create_user(username="dev1", password="test-pass-123")
        self.assertEqual(user.role, User.Role.DEVELOPER)
        self.assertIsNone(user.team)

    def test_user_can_be_put_in_a_team(self):
        team = Team.objects.create(name="Backend")
        user = User.objects.create_user(username="dev2", team=team)
        self.assertEqual(list(team.members.all()), [user])


class DefaultProductOwnerTests(TestCase):
    def test_default_po_exists_after_migrations(self):
        po = User.objects.get(username="po")
        self.assertEqual(po.role, User.Role.PRODUCT_OWNER)
        self.assertIsNone(po.team)

    def test_default_po_cannot_log_in(self):
        po = User.objects.get(username="po")
        self.assertFalse(po.has_usable_password())