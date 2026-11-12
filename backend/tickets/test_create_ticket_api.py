from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Sprint, Ticket

URL = "/api/tickets/"


class CreateTicketApiTests(APITestCase):
    def setUp(self):
        self.po = get_user_model().objects.get(username="po")

    def post(self, **data):
        payload = {"type": "STORY", "title": "A ticket"}
        payload.update(data)
        return self.client.post(URL, payload, format="json")

    def make_ticket(self, **kwargs):
        data = {"type": Ticket.Type.STORY, "title": "Existing", "priority": 1, "created_by": self.po}
        data.update(kwargs)
        return Ticket.objects.create(**data)

    def test_create_story_with_defaults(self):
        response = self.post(title="Login page", description="As a user...", estimate_points=3)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        ticket = Ticket.objects.get(pk=response.data["id"])
        self.assertEqual(ticket.title, "Login page")
        self.assertEqual(ticket.estimate_points, 3)
        self.assertEqual(ticket.status, Ticket.Status.TODO)
        self.assertEqual(ticket.priority, 1)
        self.assertEqual(ticket.created_by, self.po)
        self.assertIsNone(ticket.sprint)
        self.assertFalse(ticket.assignees.exists())
        self.assertFalse(ticket.teams.exists())

    def test_new_ticket_goes_to_bottom_of_backlog(self):
        self.post(title="First")
        response = self.post(title="Second")
        self.assertEqual(response.data["priority"], 2)

    def test_tickets_in_a_sprint_do_not_count_for_backlog_priority(self):
        sprint = Sprint.objects.create(name="Sprint 1", start_date="2026-11-02", end_date="2026-11-15")
        self.make_ticket(priority=7, sprint=sprint)
        response = self.post()
        self.assertEqual(response.data["priority"], 1)

    def test_title_is_required(self):
        response = self.post(title="")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("title", response.data)

    def test_unknown_type_is_rejected(self):
        response = self.post(type="FEATURE")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("type", response.data)

    def test_negative_estimate_is_rejected(self):
        response = self.post(estimate_points=-1)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("estimate_points", response.data)

    def test_epic_cannot_have_parent(self):
        epic = self.make_ticket(type=Ticket.Type.EPIC)
        response = self.post(type="EPIC", parent=epic.id)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("parent", response.data)

    def test_story_parent_must_be_epic(self):
        task = self.make_ticket(type=Ticket.Type.TASK)
        response = self.post(type="STORY", parent=task.id)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("parent", response.data)

    def test_story_under_epic_is_allowed(self):
        epic = self.make_ticket(type=Ticket.Type.EPIC)
        response = self.post(type="STORY", parent=epic.id)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["parent"], epic.id)

    def test_task_and_bug_under_story_are_allowed(self):
        story = self.make_ticket(type=Ticket.Type.STORY)
        for ticket_type in ("TASK", "BUG"):
            response = self.post(type=ticket_type, parent=story.id)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_read_only_fields_are_ignored(self):
        response = self.post(priority=99, status="DONE", assignees=[self.po.pk])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["priority"], 1)
        self.assertEqual(response.data["status"], "TODO")
        self.assertEqual(response.data["assignees"], [])
        self.assertEqual(response.data["teams"], [])
