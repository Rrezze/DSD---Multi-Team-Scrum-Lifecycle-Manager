from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase

from users.models import Team

from .models import Sprint, SprintMembership, Ticket

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


class SprintMembershipTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ana")
        self.team_a = Team.objects.create(name="Team A")
        self.team_b = Team.objects.create(name="Team B")
        self.sprint_1 = Sprint.objects.create(
            name="Sprint 1", start_date="2026-11-02", end_date="2026-11-15"
        )
        self.sprint_2 = Sprint.objects.create(
            name="Sprint 2", start_date="2026-11-16", end_date="2026-11-29"
        )

    def test_default_availability_is_80_hours(self):
        membership = SprintMembership.objects.create(
            sprint=self.sprint_1, team=self.team_a, user=self.user
        )
        self.assertEqual(membership.available_hours, 80)

    def test_user_can_be_in_only_one_team_per_sprint(self):
        SprintMembership.objects.create(sprint=self.sprint_1, team=self.team_a, user=self.user)
        with self.assertRaises(IntegrityError), transaction.atomic():
            SprintMembership.objects.create(
                sprint=self.sprint_1, team=self.team_b, user=self.user
            )

    def test_changing_team_in_new_sprint_keeps_past_sprint(self):
        SprintMembership.objects.create(sprint=self.sprint_1, team=self.team_a, user=self.user)
        SprintMembership.objects.create(
            sprint=self.sprint_2, team=self.team_b, user=self.user, available_hours=76
        )
        past = SprintMembership.objects.get(sprint=self.sprint_1, user=self.user)
        self.assertEqual(past.team, self.team_a)
        self.assertEqual(past.available_hours, 80)
        self.assertEqual(
            list(self.sprint_2.memberships.values_list("team__name", flat=True)), ["Team B"]
        )
