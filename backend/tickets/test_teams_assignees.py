from django.contrib.auth import get_user_model
from django.test import TestCase

from teams.models import Team

from .models import Ticket

User = get_user_model()


class TicketTeamsAndAssigneesTests(TestCase):
    def setUp(self):
        self.po = User.objects.get(username="po")
        self.team_a = Team.objects.create(name="Team A")
        self.team_b = Team.objects.create(name="Team B")
        self.ticket = Ticket.objects.create(
            type=Ticket.Type.STORY, title="A ticket", priority=1, created_by=self.po
        )

    def test_ticket_can_have_more_than_one_assignee(self):
        ana = User.objects.create_user(username="ana")
        marko = User.objects.create_user(username="marko")
        self.ticket.assignees.add(ana, marko)
        self.assertEqual(set(self.ticket.assignees.all()), {ana, marko})
        self.assertEqual(list(ana.assigned_tickets.all()), [self.ticket])

    def test_ticket_can_be_shared_by_two_teams(self):
        self.ticket.teams.add(self.team_a)
        self.ticket.teams.add(self.team_b)
        self.assertEqual(set(self.ticket.teams.all()), {self.team_a, self.team_b})
        self.assertEqual(list(self.team_b.tickets.all()), [self.ticket])

    def test_ticket_without_team_is_in_shared_pool(self):
        other = Ticket.objects.create(
            type=Ticket.Type.TASK, title="Other", priority=2, created_by=self.po
        )
        other.teams.add(self.team_a)
        self.assertEqual(list(Ticket.objects.filter(teams__isnull=True)), [self.ticket])
