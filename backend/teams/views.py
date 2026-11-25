from datetime import date

from django.db import transaction
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics
from rest_framework.exceptions import ValidationError

from .models import Team, TeamMembership
from .serializers import TeamSerializer


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