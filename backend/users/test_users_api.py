from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

LIST = "/api/users/"


def detail(user):
    return f"/api/users/{user.pk}/"


class CreateUserApiTests(APITestCase):
    def create(self, **data):
        return self.client.post(LIST, data, format="json")

    def test_create_user(self):
        response = self.create(username="ana", first_name="Ana", last_name="Petrovic",
                               email="ana@example.com", role="ENGINEERING_MANAGER")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username="ana")
        self.assertEqual(response.data, {
            "id": user.pk, "username": "ana", "email": "ana@example.com",
            "first_name": "Ana", "last_name": "Petrovic",
            "role": "ENGINEERING_MANAGER", "is_active": True,
        })

    def test_only_username_is_required_and_role_defaults_to_developer(self):
        response = self.create(username="dev1")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], "DEVELOPER")
        self.assertEqual(response.data["first_name"], "")

    def test_new_user_has_no_password(self):
        self.create(username="dev1")
        self.assertFalse(User.objects.get(username="dev1").has_usable_password())
        self.assertNotIn("password", self.create(username="dev2").data)

    def test_new_user_can_log_in(self):
        self.create(username="dev1", role="DEVELOPER")
        response = self.client.post("/api/auth/login/", {"username": "dev1"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_username_is_required(self):
        response = self.create(first_name="Ana")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_duplicate_username_is_rejected(self):
        self.create(username="ana")
        response = self.create(username="ana")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_duplicate_username_with_other_case_is_rejected(self):
        self.create(username="ana")
        response = self.create(username="ANA")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_invalid_username_characters(self):
        response = self.create(username="ana petrovic")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_email_as_username_is_rejected(self):
        response = self.create(username="ana@example.com")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["username"], [
            "Username can only contain letters, numbers, dots and underscores."
        ])

    def test_hyphen_and_plus_in_username_are_rejected(self):
        for username in ["ana-petrovic", "ana+1"]:
            response = self.create(username=username)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("username", response.data)

    def test_username_with_dot_underscore_and_numbers(self):
        response = self.create(username="ana.petrovic_2")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_unknown_role(self):
        response = self.create(username="ana", role="BOSS")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", response.data)

    def test_invalid_email(self):
        response = self.create(username="ana", email="not-an-email")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_is_active_and_id_are_read_only(self):
        response = self.create(username="ana", is_active=False, id=999)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["is_active"])
        self.assertNotEqual(response.data["id"], 999)


class ListUsersApiTests(APITestCase):
    def setUp(self):
        self.ana = User.objects.create_user(username="ana", first_name="Ana",
                                            last_name="Petrovic", email="ana@mail.com")
        self.marko = User.objects.create_user(username="marko", first_name="Marko",
                                              role=User.Role.ENGINEERING_MANAGER)
        self.old = User.objects.create_user(username="old", is_active=False)

    def usernames(self, query=""):
        response = self.client.get(LIST + query)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return [u["username"] for u in response.data]

    def test_lists_active_users_ordered_by_username(self):
        self.assertEqual(self.usernames(), ["ana", "marko", "po"])

    def test_filter_by_role(self):
        self.assertEqual(self.usernames("?role=ENGINEERING_MANAGER"), ["marko"])
        self.assertEqual(self.usernames("?role=PRODUCT_OWNER"), ["po"])

    def test_unknown_role_filter(self):
        response = self.client.get(LIST + "?role=BOSS")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", response.data)

    def test_search_by_name_username_and_email(self):
        self.assertEqual(self.usernames("?search=petro"), ["ana"])
        self.assertEqual(self.usernames("?search=MARK"), ["marko"])
        self.assertEqual(self.usernames("?search=mail.com"), ["ana"])

    def test_search_and_role_together(self):
        self.assertEqual(self.usernames("?search=a&role=DEVELOPER"), ["ana"])

    def test_search_without_match(self):
        self.assertEqual(self.usernames("?search=zzz"), [])


class UserDetailApiTests(APITestCase):
    def setUp(self):
        self.ana = User.objects.create_user(username="ana", first_name="Ana")

    def patch(self, user, **data):
        return self.client.patch(detail(user), data, format="json")

    def test_get_user(self):
        response = self.client.get(detail(self.ana))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "ana")

    def test_unknown_user(self):
        self.assertEqual(self.client.get("/api/users/9999/").status_code,
                         status.HTTP_404_NOT_FOUND)

    def test_edit_name_email_and_role(self):
        response = self.patch(self.ana, first_name="Anna", email="anna@example.com",
                              role="ENGINEERING_MANAGER")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ana.refresh_from_db()
        self.assertEqual(self.ana.first_name, "Anna")
        self.assertEqual(self.ana.email, "anna@example.com")
        self.assertEqual(self.ana.role, User.Role.ENGINEERING_MANAGER)

    def test_rename_username(self):
        response = self.patch(self.ana, username="anna")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ana.refresh_from_db()
        self.assertEqual(self.ana.username, "anna")

    def test_cannot_change_username_to_an_email(self):
        response = self.patch(self.ana, username="ana@example.com")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)
        self.ana.refresh_from_db()
        self.assertEqual(self.ana.username, "ana")

    def test_keep_own_username_with_other_case(self):
        response = self.patch(self.ana, username="Ana")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cannot_take_another_users_username(self):
        response = self.patch(self.ana, username="PO")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_put_is_not_allowed(self):
        response = self.client.put(detail(self.ana), {"username": "x"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class DeleteUserApiTests(APITestCase):
    def setUp(self):
        self.ana = User.objects.create_user(username="ana")

    def test_delete_deactivates_the_user(self):
        response = self.client.delete(detail(self.ana))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.ana.refresh_from_db()
        self.assertFalse(self.ana.is_active)
        self.assertTrue(User.objects.filter(pk=self.ana.pk).exists())

    def test_deleted_user_is_not_listed_but_can_still_be_viewed(self):
        self.client.delete(detail(self.ana))
        names = [u["username"] for u in self.client.get(LIST).data]
        self.assertNotIn("ana", names)
        response = self.client.get(detail(self.ana))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_active"])

    def test_deleted_user_cannot_log_in(self):
        self.client.delete(detail(self.ana))
        response = self.client.post("/api/auth/login/", {"username": "ana"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_default_po_cannot_be_deleted(self):
        po = User.objects.get(username="po")
        response = self.client.delete(detail(po))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        po.refresh_from_db()
        self.assertTrue(po.is_active)

    def test_delete_removes_current_and_future_memberships(self):
        from datetime import date, timedelta

        from sprints.models import Sprint
        from teams.models import Team, TeamMembership

        today = date.today()
        team = Team.objects.create(name="Team A")
        past = Sprint.objects.create(
            name="Past", start_date=today - timedelta(days=30), end_date=today - timedelta(days=17)
        )
        current = Sprint.objects.create(
            name="Current", start_date=today - timedelta(days=3), end_date=today + timedelta(days=10)
        )
        future = Sprint.objects.create(
            name="Future", start_date=today + timedelta(days=11), end_date=today + timedelta(days=24)
        )
        for sprint in (past, current, future):
            TeamMembership.objects.create(user=self.ana, team=team, sprint=sprint)

        self.client.delete(detail(self.ana))

        remaining = TeamMembership.objects.filter(user=self.ana)
        self.assertEqual([m.sprint for m in remaining], [past])
        capacity = self.client.get(f"/api/teams/capacity/?sprint={current.pk}")
        self.assertEqual(capacity.data, [])

    def test_tickets_keep_their_creator_after_delete(self):
        from tickets.models import Ticket
        ticket = Ticket.objects.create(type="TASK", title="T", priority=1, created_by=self.ana)
        self.client.delete(detail(self.ana))
        ticket.refresh_from_db()
        self.assertEqual(ticket.created_by, self.ana)


class UniqueEmailApiTests(APITestCase):
    def setUp(self):
        self.ana = User.objects.create_user(username="ana", email="ana@example.com")

    def create(self, **data):
        return self.client.post(LIST, data, format="json")

    def test_two_active_users_cannot_share_an_email(self):
        response = self.create(username="ana2", email="ana@example.com")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual([str(e) for e in response.data["email"]],
                         ["A user with that email already exists."])

    def test_email_check_ignores_case(self):
        response = self.create(username="ana2", email="ANA@Example.com")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_cannot_change_email_to_another_users_email(self):
        marko = User.objects.create_user(username="marko", email="marko@example.com")
        response = self.client.patch(detail(marko), {"email": "ana@example.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_user_can_keep_own_email(self):
        response = self.client.patch(detail(self.ana), {"email": "ANA@example.com",
                                                        "first_name": "Ana"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_many_users_without_email(self):
        self.assertEqual(self.create(username="a1").status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.create(username="a2", email="").status_code,
                         status.HTTP_201_CREATED)

    def test_email_of_deactivated_user_can_be_used_again(self):
        self.client.delete(detail(self.ana))
        response = self.create(username="ana.new", email="ana@example.com")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class DefaultProductOwnerApiTests(APITestCase):
    def setUp(self):
        self.po = User.objects.get(username="po")

    def patch(self, **data):
        return self.client.patch(detail(self.po), data, format="json")

    def test_default_po_can_be_renamed(self):
        response = self.patch(first_name="Lucia", last_name="Famoso", email="lucia@example.com")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.po.refresh_from_db()
        self.assertEqual(self.po.get_full_name(), "Lucia Famoso")

    def test_default_po_username_cannot_change(self):
        for username in ("lucia", "PO"):
            with self.subTest(username=username):
                response = self.patch(username=username)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("username", response.data)
        self.po.refresh_from_db()
        self.assertEqual(self.po.username, "po")

    def test_sending_the_same_username_is_fine(self):
        self.assertEqual(self.patch(username="po").status_code, status.HTTP_200_OK)

    def test_default_po_role_cannot_change(self):
        response = self.patch(role="DEVELOPER")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", response.data)
        self.po.refresh_from_db()
        self.assertEqual(self.po.role, User.Role.PRODUCT_OWNER)

    def test_tickets_can_still_be_created_after_renaming_the_po(self):
        self.patch(first_name="Lucia")
        response = self.client.post("/api/tickets/", {"type": "TASK", "title": "T"},
                                    format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["created_by"], self.po.pk)

    def test_other_users_can_change_username_and_role(self):
        ana = User.objects.create_user(username="ana")
        response = self.client.patch(detail(ana), {"username": "anna",
                                                   "role": "PRODUCT_OWNER"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
