from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from sprints.models import Sprint

from .models import Ticket


class TicketDetailApiTests(APITestCase):
    def setUp(self):
        self.po = get_user_model().objects.get(username="po")
        self.epic = self.make_ticket("Epic", 1, type=Ticket.Type.EPIC)
        self.story = self.make_ticket("Story", 2, parent=self.epic)

    def make_ticket(self, title, priority, **kwargs):
        data = {"type": Ticket.Type.STORY, "title": title, "priority": priority,
                "created_by": self.po}
        data.update(kwargs)
        return Ticket.objects.create(**data)

    def url(self, ticket_id):
        return f"/api/tickets/{ticket_id}/"

    def patch(self, ticket, **data):
        return self.client.patch(self.url(ticket.pk), data, format="json")

    # --- view ---

    def test_get_one_ticket(self):
        response = self.client.get(self.url(self.story.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Story")
        self.assertEqual(response.data["parent"], self.epic.pk)
        self.assertEqual(response.data["status"], "TODO")

    def test_ticket_in_a_sprint_can_be_viewed(self):
        sprint = Sprint.objects.create(name="Sprint 1", start_date="2026-11-02",
                                       end_date="2026-11-15")
        task = self.make_ticket("In sprint", 1, type=Ticket.Type.TASK, sprint=sprint)
        response = self.client.get(self.url(task.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unknown_ticket_returns_404(self):
        response = self.client.get(self.url(9999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        response = self.client.patch(self.url(9999), {"title": "x"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- edit ---

    def test_edit_title_description_and_estimate(self):
        response = self.patch(self.story, title="New title", description="More info",
                              estimate_points=5)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.story.refresh_from_db()
        self.assertEqual(self.story.title, "New title")
        self.assertEqual(self.story.description, "More info")
        self.assertEqual(self.story.estimate_points, 5)
        self.assertEqual(self.story.parent, self.epic)

    def test_title_cannot_be_empty(self):
        response = self.patch(self.story, title="")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("title", response.data)

    def test_change_status(self):
        response = self.patch(self.story, status="IN_PROGRESS")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.story.refresh_from_db()
        self.assertEqual(self.story.status, Ticket.Status.IN_PROGRESS)

    def test_unknown_status_is_rejected(self):
        response = self.patch(self.story, status="FINISHED")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)

    def test_read_only_fields_are_ignored(self):
        response = self.patch(self.story, priority=99, created_by=None, title="Still ok")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.story.refresh_from_db()
        self.assertEqual(self.story.priority, 2)
        self.assertEqual(self.story.created_by, self.po)

    def test_put_is_not_allowed(self):
        response = self.client.put(self.url(self.story.pk), {"type": "STORY", "title": "x"},
                                   format="json")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    # --- hierarchy rules on edit ---

    def test_move_task_from_story_to_epic(self):
        task = self.make_ticket("Task", 3, type=Ticket.Type.TASK, parent=self.story)
        response = self.patch(task, parent=self.epic.pk)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        task.refresh_from_db()
        self.assertEqual(task.parent, self.epic)

    def test_parent_can_be_removed(self):
        response = self.patch(self.story, parent=None)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.story.refresh_from_db()
        self.assertIsNone(self.story.parent)

    def test_story_cannot_be_moved_under_a_story(self):
        other_story = self.make_ticket("Other story", 3)
        response = self.patch(self.story, parent=other_story.pk)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("parent", response.data)

    def test_type_change_is_checked_against_current_parent(self):
        # the story stays under the epic, so it cannot become an epic
        response = self.patch(self.story, type="EPIC")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("parent", response.data)

    def test_ticket_cannot_be_its_own_parent(self):
        response = self.patch(self.epic, type="STORY", parent=self.epic.pk)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("parent", response.data)

    def test_type_change_cannot_break_children(self):
        # the epic has a story under it, and a story can only be under an epic
        response = self.patch(self.epic, type="STORY")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("type", response.data)
        self.epic.refresh_from_db()
        self.assertEqual(self.epic.type, Ticket.Type.EPIC)

    def test_type_change_that_keeps_children_valid_is_allowed(self):
        task = self.make_ticket("Task", 3, type=Ticket.Type.TASK, parent=self.story)
        # tasks can be under an epic too, so the story can become an epic
        # once it no longer has a parent
        response = self.patch(self.story, type="EPIC", parent=None)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        task.refresh_from_db()
        self.assertEqual(task.parent.type, Ticket.Type.EPIC)
