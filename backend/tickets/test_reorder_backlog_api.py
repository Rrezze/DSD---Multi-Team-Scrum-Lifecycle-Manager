from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Sprint, Ticket

URL = "/api/tickets/reorder/"


class ReorderBacklogApiTests(APITestCase):
    def setUp(self):
        self.po = get_user_model().objects.get(username="po")
        self.a = self.make_ticket("A", 1)
        self.b = self.make_ticket("B", 2)
        self.c = self.make_ticket("C", 3)

    def make_ticket(self, title, priority, **kwargs):
        data = {"type": Ticket.Type.STORY, "title": title, "priority": priority,
                "created_by": self.po}
        data.update(kwargs)
        return Ticket.objects.create(**data)

    def reorder(self, ids):
        return self.client.post(URL, {"ticket_ids": ids}, format="json")

    def backlog_titles(self):
        return [t["title"] for t in self.client.get("/api/tickets/").data]

    def assert_order_unchanged(self):
        self.assertEqual(self.backlog_titles(), ["A", "B", "C"])

    def test_new_order_is_saved(self):
        response = self.reorder([self.c.pk, self.a.pk, self.b.pk])
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual([t["title"] for t in response.data], ["C", "A", "B"])
        self.assertEqual([t["priority"] for t in response.data], [1, 2, 3])
        self.assertEqual(self.backlog_titles(), ["C", "A", "B"])

    def test_new_ticket_still_goes_to_the_bottom_after_reorder(self):
        self.reorder([self.c.pk, self.a.pk, self.b.pk])
        self.client.post("/api/tickets/", {"type": "TASK", "title": "D"}, format="json")
        self.assertEqual(self.backlog_titles(), ["C", "A", "B", "D"])

    def test_tickets_in_a_sprint_are_not_touched(self):
        sprint = Sprint.objects.create(name="Sprint 1", start_date="2026-11-02",
                                       end_date="2026-11-15")
        in_sprint = self.make_ticket("In sprint", 1, sprint=sprint)
        response = self.reorder([self.b.pk, self.c.pk, self.a.pk])
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        in_sprint.refresh_from_db()
        self.assertEqual(in_sprint.priority, 1)

    def test_missing_ticket_is_rejected(self):
        response = self.reorder([self.c.pk, self.a.pk])
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ticket_ids", response.data)
        self.assert_order_unchanged()

    def test_ticket_from_a_sprint_is_rejected(self):
        sprint = Sprint.objects.create(name="Sprint 1", start_date="2026-11-02",
                                       end_date="2026-11-15")
        in_sprint = self.make_ticket("In sprint", 1, sprint=sprint)
        response = self.reorder([self.c.pk, self.a.pk, self.b.pk, in_sprint.pk])
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assert_order_unchanged()

    def test_unknown_id_is_rejected(self):
        response = self.reorder([self.c.pk, self.a.pk, self.b.pk, 9999])
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assert_order_unchanged()

    def test_repeated_id_is_rejected(self):
        response = self.reorder([self.c.pk, self.a.pk, self.b.pk, self.a.pk])
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assert_order_unchanged()

    def test_ticket_ids_is_required(self):
        response = self.client.post(URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ticket_ids", response.data)

    def test_empty_backlog_with_empty_list(self):
        Ticket.objects.all().delete()
        response = self.reorder([])
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data, [])
