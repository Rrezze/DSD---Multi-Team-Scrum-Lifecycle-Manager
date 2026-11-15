from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from teams.models import Team

from .models import Ticket


class TicketTeamsEditApiTests(APITestCase):
    def setUp(self):
        po = get_user_model().objects.get(username="po")
        self.ticket = Ticket.objects.create(
            type=Ticket.Type.STORY, title="Story", priority=1, created_by=po
        )
        self.team_a = Team.objects.create(name="Team A")
        self.team_b = Team.objects.create(name="Team B")
        self.old_team = Team.objects.create(name="Old team", is_active=False)
        self.url = f"/api/tickets/{self.ticket.pk}/"

    def patch(self, **data):
        return self.client.patch(self.url, data, format="json")

    def team_ids(self):
        return set(self.ticket.teams.values_list("pk", flat=True))

    def test_set_one_team(self):
        response = self.patch(teams=[self.team_a.pk])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["teams"], [self.team_a.pk])
        self.assertEqual(self.team_ids(), {self.team_a.pk})

    def test_share_ticket_with_two_teams(self):
        response = self.patch(teams=[self.team_a.pk, self.team_b.pk])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.team_ids(), {self.team_a.pk, self.team_b.pk})

    def test_hand_over_replaces_teams(self):
        self.ticket.teams.set([self.team_a])
        response = self.patch(teams=[self.team_b.pk])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.team_ids(), {self.team_b.pk})

    def test_empty_list_puts_ticket_back_in_shared_pool(self):
        self.ticket.teams.set([self.team_a, self.team_b])
        response = self.patch(teams=[])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.team_ids(), set())

    def test_other_fields_do_not_change_teams(self):
        self.ticket.teams.set([self.team_a])
        response = self.patch(title="New title")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.team_ids(), {self.team_a.pk})

    def test_unknown_team_is_rejected(self):
        response = self.patch(teams=[self.team_a.pk, 9999])
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("teams", response.data)
        self.assertEqual(self.team_ids(), set())

    def test_inactive_team_cannot_be_added(self):
        response = self.patch(teams=[self.old_team.pk])
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("teams", response.data)

    def test_ticket_can_keep_an_inactive_team_it_already_has(self):
        self.ticket.teams.set([self.old_team])
        response = self.patch(teams=[self.old_team.pk, self.team_a.pk])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.team_ids(), {self.old_team.pk, self.team_a.pk})

    def test_teams_still_read_only_on_create(self):
        response = self.client.post(
            "/api/tickets/",
            {"type": "STORY", "title": "New", "teams": [self.team_a.pk]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["teams"], [])
