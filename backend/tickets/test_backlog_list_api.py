from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from sprints.models import Sprint
from teams.models import Team

from .models import Ticket

URL = "/api/tickets/"


class BacklogListApiTests(APITestCase):
    def setUp(self):
        self.po = get_user_model().objects.get(username="po")

    def make_ticket(self, title, priority, **kwargs):
        data = {"type": Ticket.Type.STORY, "title": title, "priority": priority,
                "created_by": self.po}
        data.update(kwargs)
        return Ticket.objects.create(**data)

    def titles(self, query=""):
        response = self.client.get(URL + query)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return [ticket["title"] for ticket in response.data]

    def test_empty_backlog(self):
        self.assertEqual(self.titles(), [])

    def test_backlog_is_ordered_by_priority(self):
        self.make_ticket("third", 3)
        self.make_ticket("first", 1)
        self.make_ticket("second", 2)
        self.assertEqual(self.titles(), ["first", "second", "third"])

    def test_tickets_in_a_sprint_are_not_in_the_backlog(self):
        sprint = Sprint.objects.create(name="Sprint 1", start_date="2026-11-02",
                                       end_date="2026-11-15")
        self.make_ticket("in backlog", 1)
        self.make_ticket("in sprint", 1, sprint=sprint)
        self.assertEqual(self.titles(), ["in backlog"])

    def test_response_has_all_ticket_fields(self):
        self.make_ticket("Login page", 1, description="As a user...", estimate_points=3)
        ticket = self.client.get(URL).data[0]
        self.assertEqual(ticket["type"], "STORY")
        self.assertEqual(ticket["status"], "TODO")
        self.assertEqual(ticket["priority"], 1)
        self.assertEqual(ticket["estimate_points"], 3)
        self.assertEqual(ticket["created_by"], self.po.pk)

    def test_filter_by_type(self):
        self.make_ticket("Epic", 1, type=Ticket.Type.EPIC)
        self.make_ticket("Story", 2)
        self.assertEqual(self.titles("?type=EPIC"), ["Epic"])

    def test_filter_by_status(self):
        self.make_ticket("todo", 1)
        self.make_ticket("done", 2, status=Ticket.Status.DONE)
        self.assertEqual(self.titles("?status=DONE"), ["done"])

    def test_search_title_and_description_ignores_case(self):
        self.make_ticket("Login page", 1)
        self.make_ticket("Burndown chart", 2, description="needs LOGIN first")
        self.make_ticket("Team board", 3)
        self.assertEqual(self.titles("?search=login"), ["Login page", "Burndown chart"])

    def test_filters_can_be_combined(self):
        self.make_ticket("Login epic", 1, type=Ticket.Type.EPIC)
        self.make_ticket("Login story", 2)
        self.make_ticket("Other epic", 3, type=Ticket.Type.EPIC)
        self.assertEqual(self.titles("?type=EPIC&search=login"), ["Login epic"])

    def test_unknown_type_or_status_is_rejected(self):
        response = self.client.get(URL + "?type=ABC")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("type", response.data)
        response = self.client.get(URL + "?status=FINISHED")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)

    def test_created_ticket_shows_up_at_the_bottom(self):
        self.make_ticket("existing", 1)
        response = self.client.post(URL, {"type": "TASK", "title": "new"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(self.titles(), ["existing", "new"])


class BacklogTeamFilterApiTests(APITestCase):
    def setUp(self):
        self.po = get_user_model().objects.get(username="po")
        self.team_a = Team.objects.create(name="Team A")
        self.team_b = Team.objects.create(name="Team B")
        self.only_a = self.make_ticket("only A", 1, teams=[self.team_a])
        self.shared = self.make_ticket("A and B", 2, teams=[self.team_a, self.team_b])
        self.only_b = self.make_ticket("only B", 3, type=Ticket.Type.TASK, teams=[self.team_b])
        self.pool = self.make_ticket("no team", 4)

    def make_ticket(self, title, priority, teams=(), **kwargs):
        data = {"type": Ticket.Type.STORY, "title": title, "priority": priority,
                "created_by": self.po}
        data.update(kwargs)
        ticket = Ticket.objects.create(**data)
        ticket.teams.set(teams)
        return ticket

    def titles(self, query):
        response = self.client.get(URL + query)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return [ticket["title"] for ticket in response.data]

    def test_filter_by_team(self):
        self.assertEqual(self.titles(f"?team={self.team_a.pk}"), ["only A", "A and B"])

    def test_ticket_shared_by_two_teams_is_listed_once(self):
        self.assertEqual(self.titles(f"?team={self.team_b.pk}"), ["A and B", "only B"])
        self.assertEqual(len(self.titles("")), 4)

    def test_team_none_returns_the_shared_pool(self):
        self.assertEqual(self.titles("?team=none"), ["no team"])

    def test_team_filter_can_be_combined(self):
        self.assertEqual(self.titles(f"?team={self.team_b.pk}&type=TASK"), ["only B"])

    def test_response_shows_teams(self):
        response = self.client.get(URL + f"?team={self.team_b.pk}&type=TASK")
        self.assertEqual(response.data[0]["teams"], [self.team_b.pk])

    def test_unknown_team_is_rejected(self):
        for value in ["abc", "9999"]:
            response = self.client.get(URL + f"?team={value}")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("team", response.data)
