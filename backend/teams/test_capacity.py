from datetime import date

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from sprints.models import Sprint
from users.models import Absence

from .capacity import working_days
from .models import Team, TeamMembership

User = get_user_model()


class WorkingDaysTests(APITestCase):
    def test_two_week_sprint_has_ten_working_days(self):
        # Monday 30 Nov to Sunday 13 Dec 2026
        self.assertEqual(working_days(date(2026, 11, 30), date(2026, 12, 13)), 10)

    def test_weekend_only(self):
        self.assertEqual(working_days(date(2026, 12, 5), date(2026, 12, 6)), 0)


class CapacityApiTestBase(APITestCase):
    """A 2-week sprint (Mon 30 Nov - Sun 13 Dec 2026) and two teams:
    Team A with ana and marko, Team B with luka."""

    def setUp(self):
        self.sprint = Sprint.objects.create(
            name="Test sprint", start_date=date(2026, 11, 30), end_date=date(2026, 12, 13)
        )
        self.other_sprint = Sprint.objects.create(
            name="Next sprint", start_date=date(2026, 12, 14), end_date=date(2026, 12, 27)
        )
        self.team_a = Team.objects.create(name="Team A")
        self.team_b = Team.objects.create(name="Team B")
        self.ana = User.objects.create_user(username="ana")
        self.marko = User.objects.create_user(username="marko")
        self.luka = User.objects.create_user(username="luka")
        self.ana_membership = TeamMembership.objects.create(
            user=self.ana, team=self.team_a, sprint=self.sprint
        )
        TeamMembership.objects.create(user=self.marko, team=self.team_a, sprint=self.sprint)
        TeamMembership.objects.create(user=self.luka, team=self.team_b, sprint=self.sprint)

    def absent(self, user, start, end, hours=None):
        Absence.objects.create(user=user, start_date=start, end_date=end, hours=hours)

    def capacity(self, sprint=None):
        sprint = sprint or self.sprint
        return self.client.get(f"/api/teams/capacity/?sprint={sprint.pk}")

    def team(self, response, team):
        return next(t for t in response.data if t["team"] == team.pk)

    def member_points(self):
        response = self.client.get(f"/api/memberships/{self.ana_membership.pk}/")
        return response.data["capacity_points"]


class MemberCapacityTests(CapacityApiTestBase):
    def test_full_availability_is_ten_points(self):
        response = self.client.get(f"/api/memberships/{self.ana_membership.pk}/")
        self.assertEqual(response.data["absent_hours"], 0)
        self.assertEqual(response.data["capacity_points"], 10)

    def test_full_day_absence_removes_its_working_days(self):
        # Wed 2 - Fri 4 Dec: 3 working days
        self.absent(self.ana, date(2026, 12, 2), date(2026, 12, 4))
        self.assertEqual(self.member_points(), 7)

    def test_weekend_days_of_an_absence_dont_count(self):
        # Fri 4 - Mon 7 Dec: 2 working days
        self.absent(self.ana, date(2026, 12, 4), date(2026, 12, 7))
        self.assertEqual(self.member_points(), 8)

    def test_only_the_part_inside_the_sprint_counts(self):
        # Thu 10 - Wed 16 Dec: only Thu 10 and Fri 11 are in the sprint
        self.absent(self.ana, date(2026, 12, 10), date(2026, 12, 16))
        self.assertEqual(self.member_points(), 8)

    def test_partial_day_absence_counts_its_hours(self):
        # 4 hours off: 76 hours left, rounded down to 9 points
        self.absent(self.ana, date(2026, 12, 3), date(2026, 12, 3), hours=4)
        response = self.client.get(f"/api/memberships/{self.ana_membership.pk}/")
        self.assertEqual(response.data["absent_hours"], 4)
        self.assertEqual(response.data["capacity_points"], 9)

    def test_absence_in_another_sprint_doesnt_count(self):
        self.absent(self.ana, date(2026, 12, 15), date(2026, 12, 18))
        self.assertEqual(self.member_points(), 10)

    def test_fewer_available_hours_means_fewer_points(self):
        self.ana_membership.available_hours = 40
        self.ana_membership.save()
        self.assertEqual(self.member_points(), 5)

    def test_capacity_is_never_negative(self):
        self.ana_membership.available_hours = 16
        self.ana_membership.save()
        self.absent(self.ana, date(2026, 11, 30), date(2026, 12, 4))
        self.assertEqual(self.member_points(), 0)

    def test_capacity_points_cannot_be_edited(self):
        response = self.client.patch(
            f"/api/memberships/{self.ana_membership.pk}/",
            {"capacity_points": 99}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["capacity_points"], 10)

    def test_memberships_can_be_filtered_by_sprint(self):
        TeamMembership.objects.create(user=self.ana, team=self.team_a, sprint=self.other_sprint)
        response = self.client.get(f"/api/memberships/?sprint={self.sprint.pk}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        self.assertTrue(all(m["sprint"] == self.sprint.pk for m in response.data))

    def test_sprint_filter_must_be_an_id(self):
        response = self.client.get("/api/memberships/?sprint=abc")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TeamCapacityApiTests(CapacityApiTestBase):
    def test_team_capacity_is_the_sum_of_its_members(self):
        self.absent(self.ana, date(2026, 12, 2), date(2026, 12, 4))
        response = self.capacity()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        team_a = self.team(response, self.team_a)
        self.assertEqual(team_a["team_name"], "Team A")
        self.assertEqual(team_a["capacity_points"], 17)
        self.assertEqual([m["capacity_points"] for m in team_a["members"]], [7, 10])
        self.assertEqual(self.team(response, self.team_b)["capacity_points"], 10)

    def test_teams_are_ordered_by_name(self):
        response = self.capacity()
        self.assertEqual([t["team_name"] for t in response.data], ["Team A", "Team B"])

    def test_sprint_without_members_is_empty(self):
        response = self.capacity(self.other_sprint)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_sprint_is_required(self):
        response = self.client.get("/api/teams/capacity/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_sprint_is_404(self):
        response = self.client.get("/api/teams/capacity/?sprint=9999")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)