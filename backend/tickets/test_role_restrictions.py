from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import Ticket

User = get_user_model()

REORDER = "/api/tickets/reorder/"


class RoleRestrictionTestMixin:
    def setUp(self):
        self.po_user = User.objects.create_user(
            username="lucia", email="po@example.com", role=User.Role.PRODUCT_OWNER
        )
        self.dev = User.objects.create_user(username="ana", email="dev@example.com")
        self.em = User.objects.create_user(
            username="marko", email="em@example.com", role=User.Role.ENGINEERING_MANAGER
        )
        default_po = User.objects.get(username="po")
        self.a = Ticket.objects.create(type="STORY", title="A", priority=1, created_by=default_po)
        self.b = Ticket.objects.create(type="STORY", title="B", priority=2, created_by=default_po)

    def login_as(self, user):
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def reorder(self):
        return self.client.post(REORDER, {"ticket_ids": [self.b.pk, self.a.pk]}, format="json")


@override_settings(REQUIRE_LOGIN=True)
class LoginRequiredTests(RoleRestrictionTestMixin, APITestCase):
    def test_backlog_needs_login(self):
        response = self.client.get("/api/tickets/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_every_endpoint_needs_login(self):
        for method, url in (
            ("post", "/api/tickets/"),
            ("get", f"/api/tickets/{self.a.pk}/"),
            ("patch", f"/api/tickets/{self.a.pk}/"),
            ("post", REORDER),
            ("get", "/api/teams/"),
        ):
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url, {}, format="json")
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_wrong_token_is_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION="Token not-a-real-token")
        response = self.client.get("/api/tickets/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_endpoint_does_not_need_login(self):
        User.objects.create_user(username="x", email="x@example.com", password="pass-123-x")
        response = self.client.post(
            "/api/auth/login/", {"email": "x@example.com", "password": "pass-123-x"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_api_docs_still_open(self):
        self.assertEqual(self.client.get("/api/schema/").status_code, status.HTTP_200_OK)

    def test_any_logged_in_user_can_use_the_backlog(self):
        for user in (self.dev, self.em, self.po_user):
            with self.subTest(role=user.role):
                self.login_as(user)
                self.assertEqual(self.client.get("/api/tickets/").status_code, 200)
                response = self.client.patch(
                    f"/api/tickets/{self.a.pk}/", {"title": f"by {user.username}"},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.client.credentials()

    def test_product_owner_can_reorder(self):
        self.login_as(self.po_user)
        response = self.reorder()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([t["title"] for t in response.data], ["B", "A"])

    def test_developer_cannot_reorder(self):
        self.login_as(self.dev)
        response = self.reorder()
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.a.refresh_from_db()
        self.assertEqual(self.a.priority, 1)

    def test_engineering_manager_cannot_reorder(self):
        self.login_as(self.em)
        self.assertEqual(self.reorder().status_code, status.HTTP_403_FORBIDDEN)

    def test_logged_in_user_is_the_ticket_creator(self):
        self.login_as(self.dev)
        response = self.client.post(
            "/api/tickets/", {"type": "TASK", "title": "Mine"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["created_by"], self.dev.pk)


@override_settings(REQUIRE_LOGIN=False)
class LoginOffTests(RoleRestrictionTestMixin, APITestCase):
    """While the login page isn't connected, the API works without a token."""

    def test_backlog_works_without_token(self):
        self.assertEqual(self.client.get("/api/tickets/").status_code, status.HTTP_200_OK)

    def test_reorder_works_without_token(self):
        self.assertEqual(self.reorder().status_code, status.HTTP_200_OK)

    def test_ticket_without_login_is_created_by_default_po(self):
        response = self.client.post(
            "/api/tickets/", {"type": "TASK", "title": "Anon"}, format="json"
        )
        self.assertEqual(response.data["created_by"], User.objects.get(username="po").pk)

    def test_roles_still_apply_when_logged_in(self):
        self.login_as(self.dev)
        self.assertEqual(self.reorder().status_code, status.HTTP_403_FORBIDDEN)

    def test_logged_in_user_is_the_ticket_creator(self):
        self.login_as(self.dev)
        response = self.client.post(
            "/api/tickets/", {"type": "TASK", "title": "Mine"}, format="json"
        )
        self.assertEqual(response.data["created_by"], self.dev.pk)
