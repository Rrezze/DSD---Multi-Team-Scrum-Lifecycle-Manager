from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

User = get_user_model()

LOGIN = "/api/auth/login/"
LOGOUT = "/api/auth/logout/"


class LoginApiTests(APITestCase):
    def setUp(self):
        self.ana = User.objects.create_user(
            username="ana", email="ana@example.com", password="secret-pass-1",
            first_name="Ana", last_name="Dev",
        )

    def login(self, email, password):
        return self.client.post(LOGIN, {"email": email, "password": password}, format="json")

    def test_login_returns_token_and_user(self):
        response = self.login("ana@example.com", "secret-pass-1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["token"], Token.objects.get(user=self.ana).key)
        self.assertEqual(response.data["user"], {
            "id": self.ana.pk, "username": "ana", "email": "ana@example.com",
            "first_name": "Ana", "last_name": "Dev", "role": "DEVELOPER",
        })
        self.assertNotIn("password", response.data["user"])

    def test_email_is_not_case_sensitive(self):
        response = self.login("ANA@Example.com", "secret-pass-1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logging_in_twice_gives_the_same_token(self):
        first = self.login("ana@example.com", "secret-pass-1").data["token"]
        second = self.login("ana@example.com", "secret-pass-1").data["token"]
        self.assertEqual(first, second)

    def test_wrong_password(self):
        response = self.login("ana@example.com", "wrong")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(str(response.data["detail"]), "Wrong email or password.")
        self.assertFalse(Token.objects.exists())

    def test_unknown_email_gives_the_same_error(self):
        response = self.login("nobody@example.com", "secret-pass-1")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(str(response.data["detail"]), "Wrong email or password.")

    def test_inactive_user_cannot_log_in(self):
        self.ana.is_active = False
        self.ana.save()
        response = self.login("ana@example.com", "secret-pass-1")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_without_password_cannot_log_in(self):
        User.objects.create_user(username="nopass", email="nopass@example.com")
        response = self.login("nopass@example.com", "")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_fields(self):
        response = self.client.post(LOGIN, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)
        self.assertIn("password", response.data)

    def test_invalid_email(self):
        response = self.login("not-an-email", "secret-pass-1")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_login_works_with_a_bad_token_header(self):
        # an old token left in the browser must not block a new login
        self.client.credentials(HTTP_AUTHORIZATION="Token old-invalid-token")
        response = self.login("ana@example.com", "secret-pass-1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class LogoutApiTests(APITestCase):
    def setUp(self):
        self.ana = User.objects.create_user(
            username="ana", email="ana@example.com", password="secret-pass-1"
        )
        self.token = Token.objects.create(user=self.ana)

    def test_logout_deletes_the_token(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.post(LOGOUT)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Token.objects.filter(user=self.ana).exists())

    def test_token_does_not_work_after_logout(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        self.client.post(LOGOUT)
        response = self.client.post(LOGOUT)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_without_token(self):
        response = self.client.post(LOGOUT)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UniqueEmailTests(TestCase):
    def test_two_users_cannot_have_the_same_email(self):
        User.objects.create_user(username="a", email="same@example.com")
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user(username="b", email="SAME@example.com")

    def test_many_users_can_have_no_email(self):
        User.objects.create_user(username="a")
        User.objects.create_user(username="b")
        self.assertEqual(User.objects.filter(email="").count(), 3)  # + default po
