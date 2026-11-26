from rest_framework import status
from rest_framework.test import APITestCase

from .models import Sprint


class SprintListApiTests(APITestCase):
    def test_lists_sprints_by_start_date(self):
        later = Sprint.objects.create(
            name="Later", start_date="2026-12-14", end_date="2026-12-27"
        )
        earlier = Sprint.objects.create(
            name="Earlier", start_date="2026-11-16", end_date="2026-11-29"
        )
        fixed = Sprint.objects.get(name="Sprint 1")

        response = self.client.get("/api/sprints/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [sprint["id"] for sprint in response.data],
            [earlier.pk, fixed.pk, later.pk],
        )
        self.assertEqual(
            set(response.data[0]),
            {"id", "name", "start_date", "end_date", "goal"},
        )

    def test_create_sprint(self):
        response = self.client.post(
            "/api/sprints/",
            {
                "name": "Sprint 2",
                "start_date": "2026-12-14",
                "end_date": "2026-12-27",
                "goal": "Ship the next increment",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        sprint = Sprint.objects.get(pk=response.data["id"])
        self.assertEqual(sprint.name, "Sprint 2")
        self.assertEqual(sprint.goal, "Ship the next increment")

    def test_create_rejects_end_date_before_start_date(self):
        response = self.client.post(
            "/api/sprints/",
            {
                "name": "Invalid sprint",
                "start_date": "2026-12-14",
                "end_date": "2026-12-13",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("end_date", response.data)
        self.assertFalse(Sprint.objects.filter(name="Invalid sprint").exists())


class SprintDetailApiTests(APITestCase):
    def setUp(self):
        self.sprint = Sprint.objects.create(
            name="Sprint 2",
            start_date="2026-12-14",
            end_date="2026-12-27",
            goal="Original goal",
        )
        self.url = f"/api/sprints/{self.sprint.pk}/"

    def test_get_sprint(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Sprint 2")
        self.assertEqual(response.data["goal"], "First goal")

    def test_patch_sprint(self):
        response = self.client.patch(self.url, {"goal": "Updated goal"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.sprint.refresh_from_db()
        self.assertEqual(self.sprint.goal, "Second goal")
        self.assertEqual(self.sprint.name, "Sprint 2")

    def test_patch_rejects_invalid_date_range(self):
        response = self.client.patch(
            self.url, {"start_date": "2026-12-28"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("end_date", response.data)
        self.sprint.refresh_from_db()
        self.assertEqual(self.sprint.start_date.isoformat(), "2026-12-14")

    def test_put_is_not_allowed(self):
        response = self.client.put(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_delete_sprint(self):
        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Sprint.objects.filter(pk=self.sprint.pk).exists())

    def test_unknown_sprint_is_404(self):
        response1 = self.client.get("/api/sprints/-1/")

        self.assertEqual(response1.status_code, status.HTTP_404_NOT_FOUND)
