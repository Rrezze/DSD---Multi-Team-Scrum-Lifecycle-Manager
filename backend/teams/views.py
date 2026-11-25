from datetime import date

from django.db import transaction
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics
from rest_framework.exceptions import ValidationError

from .models import Team, TeamMembership
from .serializers import TeamMembershipSerializer, TeamSerializer


@extend_schema_view(
    get=extend_schema(
        parameters=[
            OpenApiParameter(
                "active", OpenApiTypes.BOOL,
                description="true: only active teams, false: only deleted teams. "
                            "Without it, all teams.",
            ),
        ]
    )
)
class TeamListCreateView(generics.ListCreateAPIView):
    """Teams of the organization.

    GET returns all past and present teams, ordered by name (deleted teams
    have is_active=false). Optional filter: ?active=true or ?active=false.
    POST creates a team: name is required and must be unique, description
    and base_capacity_points are optional.
    """

    serializer_class = TeamSerializer

    def get_queryset(self):
        queryset = Team.objects.all()
        active = self.request.query_params.get("active")
        if active is not None:
            if active not in ("true", "false"):
                raise ValidationError({"active": "Use true or false."})
            queryset = queryset.filter(is_active=(active == "true"))
        return queryset.order_by("name")


class TeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    """One team.

    GET returns the team (also when deleted, for past sprints). PATCH
    changes its name, description or base_capacity_points. DELETE
    deactivates the team: it stays in past sprints, and its members are
    moved to "Not in a team" in the current and future sprints.
    """

    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    # only partial updates, no PUT
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def perform_destroy(self, instance):
        with transaction.atomic():
            instance.is_active = False
            instance.save(update_fields=["is_active"])
            # A sprint that hasn't ended yet is current or future.
            TeamMembership.objects.filter(
                team=instance, sprint__end_date__gte=date.today()
            ).delete()

@extend_schema_view(
    get=extend_schema(
        parameters=[
            OpenApiParameter(
                "user", OpenApiTypes.INT,
                description="Only the memberships of this user (user id).",
            ),
        ]
    )
)
class TeamMembershipListCreateView(generics.ListCreateAPIView):
    """Team memberships: which team a Developer is in for each sprint.

    GET returns the memberships, oldest sprint first. Optional filter:
    ?user= (a user id), e.g. to see a user's team history. POST adds a
    Developer to a team for a sprint: user, team and sprint are required,
    role (DEVELOPER or SCRUM_MASTER, default DEVELOPER) and
    available_hours (default 80) are optional. A Developer can be in only
    one team per sprint, and sprints that have ended can't be changed.
    """

    serializer_class = TeamMembershipSerializer

    def get_queryset(self):
        queryset = TeamMembership.objects.select_related("user", "team", "sprint")
        user = self.request.query_params.get("user")
        if user is not None:
            if not user.isdigit():
                raise ValidationError({"user": "Use a user id, e.g. ?user=3."})
            queryset = queryset.filter(user_id=int(user))
        return queryset.order_by("sprint__start_date", "team__name", "user__username")


class TeamMembershipDetailView(generics.RetrieveUpdateDestroyAPIView):
    """One team membership.

    GET returns it. PATCH moves the Developer to another team in the same
    sprint, or changes their role or available_hours. DELETE removes the
    Developer from the team for that sprint ("Not in a team"). Memberships
    of sprints that have ended can't be changed or deleted.
    """

    queryset = TeamMembership.objects.select_related("user", "team", "sprint")
    serializer_class = TeamMembershipSerializer
    # only partial updates, no PUT
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def perform_destroy(self, instance):
        if instance.sprint.end_date < date.today():
            raise ValidationError(
                {"sprint": "This sprint has already ended, so its teams can't be changed."}
            )
        instance.delete()

