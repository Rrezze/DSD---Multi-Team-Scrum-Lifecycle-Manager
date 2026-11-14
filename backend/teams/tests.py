from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase

from sprints.models import Sprint

from .models import Team, TeamMembership

User = get_user_model()


class TeamMembershipTests(TestCase):
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
        membership = TeamMembership.objects.create(
            sprint=self.sprint_1, team=self.team_a, user=self.user
        )
        self.assertEqual(membership.available_hours, 80)

    def test_default_role_is_developer(self):
        membership = TeamMembership.objects.create(
            sprint=self.sprint_1, team=self.team_a, user=self.user
        )
        self.assertEqual(membership.role, TeamMembership.Role.DEVELOPER)

    def test_user_can_be_scrum_master_in_one_sprint_and_developer_in_the_next(self):
        TeamMembership.objects.create(sprint=self.sprint_1, team=self.team_a, user=self.user,
                                      role=TeamMembership.Role.SCRUM_MASTER)
        TeamMembership.objects.create(sprint=self.sprint_2, team=self.team_a, user=self.user)
        roles = list(self.user.team_memberships.order_by("sprint__start_date")
                     .values_list("role", flat=True))
        self.assertEqual(roles, ["SCRUM_MASTER", "DEVELOPER"])

    def test_user_can_be_in_only_one_team_per_sprint(self):
        TeamMembership.objects.create(sprint=self.sprint_1, team=self.team_a, user=self.user)
        with self.assertRaises(IntegrityError), transaction.atomic():
            TeamMembership.objects.create(
                sprint=self.sprint_1, team=self.team_b, user=self.user
            )

    def test_changing_team_in_new_sprint_keeps_past_sprint(self):
        TeamMembership.objects.create(sprint=self.sprint_1, team=self.team_a, user=self.user)
        TeamMembership.objects.create(
            sprint=self.sprint_2, team=self.team_b, user=self.user, available_hours=76
        )
        past = TeamMembership.objects.get(sprint=self.sprint_1, user=self.user)
        self.assertEqual(past.team, self.team_a)
        self.assertEqual(past.available_hours, 80)
        self.assertEqual(
            list(self.sprint_2.team_memberships.values_list("team__name", flat=True)), ["Team B"]
        )
