from django.contrib.auth import get_user_model
from django.db.models import ProtectedError
from django.test import TestCase

from .models import Ticket

User = get_user_model()


class TicketModelTests(TestCase):
    def setUp(self):
        self.po = User.objects.get(username="po")

    def make_ticket(self, **kwargs):
        data = {"type": Ticket.Type.STORY, "title": "A ticket", "priority": 1,
                "created_by": self.po}
        data.update(kwargs)
        return Ticket.objects.create(**data)

    def test_new_ticket_starts_in_todo(self):
        ticket = self.make_ticket()
        self.assertEqual(ticket.status, Ticket.Status.TODO)
        self.assertIsNone(ticket.assignee)
        self.assertIsNone(ticket.sprint)

    def test_story_can_belong_to_epic(self):
        epic = self.make_ticket(type=Ticket.Type.EPIC, title="Epic")
        story = self.make_ticket(parent=epic)
        self.assertEqual(list(epic.children.all()), [story])

    def test_cannot_delete_epic_with_children(self):
        epic = self.make_ticket(type=Ticket.Type.EPIC, title="Epic")
        self.make_ticket(parent=epic)
        with self.assertRaises(ProtectedError):
            epic.delete()

    def test_backlog_is_ordered_by_priority(self):
        second = self.make_ticket(title="second", priority=2)
        first = self.make_ticket(title="first", priority=1)
        self.assertEqual(list(Ticket.objects.all()), [first, second])