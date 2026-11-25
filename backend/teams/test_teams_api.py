from datetime import date, timedelta

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from sprints.models import Sprint

from .models import Team, TeamMembership

User = get_user_model()


class TeamListApiTests(APITestCase):
    def test_empty_list(self):
        response = self.client.get("/api/teams/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_lists_all_teams_ordered_by_name(self):
        Team.objects.create(name="Team B", description="Backend")
        Team.objects.create(name="Team A")
        Team.objects.create(name="Old team", is_active=False)
        response = self.client.get("/api/teams/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([t["name"] for t in response.data], ["Old team", "Team A", "Team B"])
        self.assertEqual(
            set(response.data[0].keys()),
            {"id", "name", "description", "is_active", "base_capacity_points"},
        )
        self.assertFalse(response.data[0]["is_active"])
        self.assertEqual(response.data[2]["description"], "Backend")

    def test_filter_active_teams(self):
        Team.objects.create(name="Team A")
        Team.objects.create(name="Old team", is_active=False)
        active = self.client.get("/api/teams/?active=true")
        deleted = self.client.get("/api/teams/?active=false")
        self.assertEqual([t["name"] for t in active.data], ["Team A"])
        self.assertEqual([t["name"] for t in deleted.data], ["Old team"])

    def test_filter_active_rejects_other_values(self):
        response = self.client.get("/api/teams/?active=yes")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("active", response.data)


class TeamCreateApiTests(APITestCase):
    def test_create_team(self):
        response = self.client.post(
            "/api/teams/",
            {"name": "Team A", "description": "Backend", "base_capacity_points": 40},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        team = Team.objects.get(pk=response.data["id"])
        self.assertEqual(team.name, "Team A")
        self.assertEqual(team.description, "Backend")
        self.assertEqual(team.base_capacity_points, 40)
        self.assertTrue(team.is_active)

    def test_only_name_is_required(self):
        response = self.client.post("/api/teams/", {"name": "Team A"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["description"], "")
        self.assertIsNone(response.data["base_capacity_points"])

    def test_name_is_trimmed(self):
        response = self.client.post("/api/teams/", {"name": "  Team A  "}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Team A")

    def test_missing_name_is_rejected(self):
        response = self.client.post("/api/teams/", {"description": "x"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_blank_name_is_rejected(self):
        response = self.client.post("/api/teams/", {"name": "   "}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_duplicate_name_is_rejected_ignoring_case(self):
        Team.objects.create(name="Team A")
        response = self.client.post("/api/teams/", {"name": "team a"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_negative_capacity_is_rejected(self):
        response = self.client.post(
            "/api/teams/", {"name": "Team A", "base_capacity_points": -5}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("base_capacity_points", response.data)

    def test_is_active_cannot_be_set(self):
        response = self.client.post(
            "/api/teams/", {"name": "Team A", "is_active": False}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["is_active"])


class TeamDetailApiTests(APITestCase):
    def setUp(self):
        self.team = Team.objects.create(name="Team A", description="Backend")

    def url(self, pk=None):
        return f"/api/teams/{pk or self.team.pk}/"

    def test_get_team(self):
        response = self.client.get(self.url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Team A")
        self.assertEqual(response.data["description"], "Backend")

    def test_get_deleted_team(self):
        self.team.is_active = False
        self.team.save()
        response = self.client.get(self.url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_active"])

    def test_unknown_team_is_404(self):
        response = self.client.get(self.url(9999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_rename_team(self):
        response = self.client.patch(self.url(), {"name": "Team Alpha"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.team.refresh_from_db()
        self.assertEqual(self.team.name, "Team Alpha")
        self.assertEqual(self.team.description, "Backend")  # unchanged

    def test_edit_description_and_capacity(self):
        response = self.client.patch(
            self.url(), {"description": "QA", "base_capacity_points": 30}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.team.refresh_from_db()
        self.assertEqual(self.team.description, "QA")
        self.assertEqual(self.team.base_capacity_points, 30)

    def test_keeping_the_same_name_is_allowed(self):
        response = self.client.patch(self.url(), {"name": "team a"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_rename_to_existing_name_is_rejected(self):
        Team.objects.create(name="Team B")
        response = self.client.patch(self.url(), {"name": "Team B"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_put_is_not_allowed(self):
        response = self.client.put(self.url(), {"name": "X"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class TeamDeleteApiTests(APITestCase):
    def setUp(self):
        self.team = Team.objects.create(name="Team A")
        self.user = User.objects.create_user(username="ana")
        today = date.today()
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
        for sprint in (self.past_sprint, self.current_sprint, self.future_sprint):
            TeamMembership.objects.create(sprint=sprint, team=self.team, user=self.user)

    def test_delete_deactivates_the_team(self):
        response = self.client.delete(f"/api/teams/{self.team.pk}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.team.refresh_from_db()
        self.assertFalse(self.team.is_active)  # still in the database

    def test_delete_keeps_past_sprints_and_frees_members_from_now_on(self):
        self.client.delete(f"/api/teams/{self.team.pk}/")
        sprints = list(self.team.team_memberships.values_list("sprint__name", flat=True))
        self.assertEqual(sprints, ["Past"])

    def test_delete_does_not_touch_other_teams(self):
        other = Team.objects.create(name="Team B")
        bob = User.objects.create_user(username="bob")
        TeamMembership.objects.create(sprint=self.current_sprint, team=other, user=bob)
        self.client.delete(f"/api/teams/{self.team.pk}/")
        self.assertTrue(
            TeamMembership.objects.filter(team=other, sprint=self.current_sprint).exists()
        )

    def test_delete_unknown_team_is_404(self):
        response = self.client.delete("/api/teams/9999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

