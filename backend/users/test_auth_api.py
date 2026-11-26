from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

LOGIN = "/api/auth/login/"


class LoginApiTests(APITestCase):
    def setUp(self):
        self.ana = User.objects.create_user(
            username="ana", email="ana@example.com", first_name="Ana", last_name="Dev"
        )

    def login(self, username):
        return self.client.post(LOGIN, {"username": username}, format="json")

    def test_login_returns_the_user(self):
        response = self.login("ana")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {
            "id": self.ana.pk, "username": "ana", "email": "ana@example.com",
            "first_name": "Ana", "last_name": "Dev", "role": "DEVELOPER",
            "is_active": True,
        })

    def test_login_returns_the_role(self):
        response = self.login("po")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], "PRODUCT_OWNER")

    def test_username_is_not_case_sensitive_and_trimmed(self):
        response = self.login("  ANA ")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.ana.pk)

    def test_no_password_or_token_in_the_response(self):
        response = self.login("ana")
        self.assertNotIn("password", response.data)
        self.assertNotIn("token", response.data)

    def test_unknown_username(self):
        response = self.login("nobody")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(str(response.data["username"]), "User not found.")

    def test_inactive_user_cannot_log_in(self):
        self.ana.is_active = False
        self.ana.save()
        response = self.login("ana")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_username(self):
        response = self.client.post(LOGIN, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_empty_username(self):
        response = self.login("")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_is_not_allowed(self):
        response = self.client.get(LOGIN)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class ApiStaysOpenTests(APITestCase):
    """Lucia's decision: no authentication on the backend for now."""

    def test_backlog_works_without_login(self):
        self.assertEqual(self.client.get("/api/tickets/").status_code, status.HTTP_200_OK)

    def test_reorder_works_without_login(self):
        response = self.client.post("/api/tickets/reorder/", {"ticket_ids": []}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
