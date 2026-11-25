from datetime import date, timedelta

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from sprints.models import Sprint

from .models import Team, TeamMembership

User = get_user_model()


class MembershipApiTestBase(APITestCase):
    """Two teams, a Developer and a past, a current and a future sprint."""

    def setUp(self):
        today = date.today()
        self.team_a = Team.objects.create(name="Team A")
        self.team_b = Team.objects.create(name="Team B")
        self.dev = User.objects.create_user(username="ana")  # role DEVELOPER by default
        self.past_sprint = Sprint.objects.create(
            name="Past", start_date=today - timedelta(days=28),
            end_date=today - timedelta(days=15),
        )
        self.current_sprint = Sprint.objects.create(
            name="Current", start_date=today - timedelta(days=3),
            end_date=today + timedelta(days=10),
        )
        self.future_sprint = Sprint.objects.create(
            name="Future", start_date=today + timedelta(days=11),
            end_date=today + timedelta(days=24),
        )

    def create(self, **data):
        body = {"user": self.dev.pk, "team": self.team_a.pk, "sprint": self.current_sprint.pk}
        body.update(data)
        return self.client.post("/api/memberships/", body, format="json")


class MembershipCreateApiTests(MembershipApiTestBase):
    def test_add_developer_to_team(self):
        response = self.create()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        membership = TeamMembership.objects.get(pk=response.data["id"])
        self.assertEqual(membership.user, self.dev)
        self.assertEqual(membership.team, self.team_a)
        self.assertEqual(membership.sprint, self.current_sprint)
        self.assertEqual(membership.role, TeamMembership.Role.DEVELOPER)
        self.assertEqual(membership.available_hours, 80)

    def test_add_as_scrum_master_with_fewer_hours(self):
        response = self.create(role="SCRUM_MASTER", available_hours=60)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], "SCRUM_MASTER")
        self.assertEqual(response.data["available_hours"], 60)

    def test_add_to_future_sprint(self):
        response = self.create(sprint=self.future_sprint.pk)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_team_and_sprint_are_required(self):
        response = self.client.post("/api/memberships/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"user", "team", "sprint"})

    def test_second_team_in_same_sprint_is_rejected(self):
        self.create()
        response = self.create(team=self.team_b.pk)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Team A", str(response.data["user"]))
        self.assertEqual(TeamMembership.objects.count(), 1)

    def test_other_team_in_another_sprint_is_allowed(self):
        self.create()
        response = self.create(team=self.team_b.pk, sprint=self.future_sprint.pk)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_past_sprint_is_rejected(self):
        response = self.create(sprint=self.past_sprint.pk)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("sprint", response.data)

    def test_only_developers_can_be_added(self):
        po = User.objects.create_user(username="po2", role=User.Role.PRODUCT_OWNER)
        em = User.objects.create_user(username="em", role=User.Role.ENGINEERING_MANAGER)
        for user in (po, em):
            response = self.create(user=user.pk)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("user", response.data)

    def test_deleted_user_is_rejected(self):
        self.dev.is_active = False
        self.dev.save()
        response = self.create()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("user", response.data)

    def test_deleted_team_is_rejected(self):
        self.team_a.is_active = False
        self.team_a.save()
        response = self.create()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("team", response.data)

    def test_unknown_role_is_rejected(self):
        response = self.create(role="BOSS")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", response.data)

    def test_negative_hours_are_rejected(self):
        response = self.create(available_hours=-1)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("available_hours", response.data)


class MembershipListApiTests(MembershipApiTestBase):
    def test_list_memberships_oldest_sprint_first(self):
        TeamMembership.objects.create(sprint=self.future_sprint, team=self.team_b, user=self.dev)
        TeamMembership.objects.create(sprint=self.past_sprint, team=self.team_a, user=self.dev)
        response = self.client.get("/api/memberships/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [m["sprint"] for m in response.data], [self.past_sprint.pk, self.future_sprint.pk]
        )
        self.assertEqual(
            set(response.data[0].keys()),
            {"id", "user", "team", "sprint", "role", "available_hours"},
        )

    def test_filter_by_user(self):
        bob = User.objects.create_user(username="bob")
        TeamMembership.objects.create(sprint=self.current_sprint, team=self.team_a, user=self.dev)
        TeamMembership.objects.create(sprint=self.current_sprint, team=self.team_a, user=bob)
        response = self.client.get(f"/api/memberships/?user={bob.pk}")
        self.assertEqual([m["user"] for m in response.data], [bob.pk])

    def test_filter_by_user_rejects_non_ids(self):
        response = self.client.get("/api/memberships/?user=ana")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("user", response.data)


class MembershipDetailApiTests(MembershipApiTestBase):
    def setUp(self):
        super().setUp()
        self.membership = TeamMembership.objects.create(
            sprint=self.current_sprint, team=self.team_a, user=self.dev
        )
        self.url = f"/api/memberships/{self.membership.pk}/"

    def test_get_membership(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["team"], self.team_a.pk)

    def test_unknown_membership_is_404(self):
        response = self.client.get("/api/memberships/9999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_move_to_another_team(self):
        response = self.client.patch(self.url, {"team": self.team_b.pk}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.membership.refresh_from_db()
        self.assertEqual(self.membership.team, self.team_b)

    def test_make_scrum_master_and_change_hours(self):
        response = self.client.patch(
            self.url, {"role": "SCRUM_MASTER", "available_hours": 40}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.membership.refresh_from_db()
        self.assertEqual(self.membership.role, TeamMembership.Role.SCRUM_MASTER)
        self.assertEqual(self.membership.available_hours, 40)

    def test_move_to_deleted_team_is_rejected(self):
        self.team_b.is_active = False
        self.team_b.save()
        response = self.client.patch(self.url, {"team": self.team_b.pk}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("team", response.data)

    def test_user_cannot_be_changed(self):
        bob = User.objects.create_user(username="bob")
        response = self.client.patch(self.url, {"user": bob.pk}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("user", response.data)

    def test_sprint_cannot_be_changed(self):
        response = self.client.patch(self.url, {"sprint": self.future_sprint.pk}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("sprint", response.data)

    def test_put_is_not_allowed(self):
        response = self.client.put(self.url, {"team": self.team_b.pk}, format="json")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_remove_from_team(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(TeamMembership.objects.filter(pk=self.membership.pk).exists())

    def test_past_sprint_cannot_be_changed_or_deleted(self):
        past = TeamMembership.objects.create(
            sprint=self.past_sprint, team=self.team_a, user=self.dev
        )
        url = f"/api/memberships/{past.pk}/"
        patch = self.client.patch(url, {"team": self.team_b.pk}, format="json")
        delete = self.client.delete(url)
        self.assertEqual(patch.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(delete.status_code, status.HTTP_400_BAD_REQUEST)
        past.refresh_from_db()
        self.assertEqual(past.team, self.team_a)

    