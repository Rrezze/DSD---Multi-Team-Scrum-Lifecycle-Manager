from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Max
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import filters, generics
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from users.models import Team

from .models import Ticket
from .serializers import ReorderBacklogSerializer, TicketSerializer, TicketUpdateSerializer

# Created by the users.0002_create_default_po migration.
# Used as the ticket creator until authentication is added.
DEFAULT_PO_USERNAME = "po"


@extend_schema_view(
    get=extend_schema(
        parameters=[
            OpenApiParameter(
                "type", OpenApiTypes.STR, enum=Ticket.Type.values,
                description="Only tickets of this type, e.g. EPIC for the parent dropdown.",
            ),
            OpenApiParameter(
                "status", OpenApiTypes.STR, enum=Ticket.Status.values,
                description="Only tickets with this status.",
            ),
            OpenApiParameter(
                "team", OpenApiTypes.STR,
                description="Only tickets of this team (team id), or 'none' for the "
                            "shared pool (tickets without a team).",
            ),
        ]
    )
)
class TicketListCreateView(generics.ListCreateAPIView):
    """Product backlog.

    GET returns the tickets that are not in any sprint, ordered by priority
    (top of the backlog first). Optional filters: ?type=, ?status=, ?team=
    (a team id, or "none" for tickets without a team) and ?search= (title and
    description, case-insensitive). They can be combined.

    POST creates a ticket. It goes to the bottom of the backlog
    (priority = last + 1), starts in TODO, is not in a sprint and is created
    by the default PO.
    """

    serializer_class = TicketSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["title", "description"]

    def get_queryset(self):
        queryset = Ticket.objects.filter(sprint__isnull=True).prefetch_related(
            "assignees", "teams"
        )
        params = self.request.query_params
        for name, choices in (("type", Ticket.Type), ("status", Ticket.Status)):
            value = params.get(name)
            if value is None:
                continue
            if value not in choices.values:
                raise ValidationError(
                    {name: f"Unknown {name} '{value}'. Use one of: {', '.join(choices.values)}."}
                )
            queryset = queryset.filter(**{name: value})

        team = params.get("team")
        if team is not None:
            if team == "none":
                queryset = queryset.filter(teams__isnull=True)
            elif team.isdigit() and Team.objects.filter(pk=int(team)).exists():
                queryset = queryset.filter(teams__id=int(team))
            else:
                raise ValidationError(
                    {"team": f"Unknown team '{team}'. Use a team id or 'none'."}
                )
        return queryset.order_by("priority", "id")

    def perform_create(self, serializer):
        creator = get_user_model().objects.get(username=DEFAULT_PO_USERNAME)
        with transaction.atomic():
            last = Ticket.objects.filter(sprint__isnull=True).aggregate(m=Max("priority"))["m"]
            serializer.save(priority=(last or 0) + 1, created_by=creator)


class TicketDetailView(generics.RetrieveUpdateAPIView):
    """One ticket.

    GET returns the ticket. PATCH edits it: type, title, description,
    estimate_points, parent and status can be changed. Priority is changed
    by reordering the backlog, the rest is read-only.
    """

    queryset = Ticket.objects.all()
    serializer_class = TicketUpdateSerializer
    # only partial updates, no PUT
    http_method_names = ["get", "patch", "head", "options"]


class BacklogReorderView(generics.GenericAPIView):
    """Save a new order of the product backlog (drag and drop).

    The body has the ids of ALL backlog tickets in the new order, top first.
    Their priority becomes 1, 2, 3... and the reordered backlog is returned.
    If a backlog ticket is missing, an id is not in the backlog or an id is
    repeated, nothing is saved and 400 is returned.
    """

    serializer_class = ReorderBacklogSerializer

    @extend_schema(request=ReorderBacklogSerializer, responses=TicketSerializer(many=True))
    def post(self, request):
        body = ReorderBacklogSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        ids = body.validated_data["ticket_ids"]
        if len(ids) != len(set(ids)):
            raise ValidationError({"ticket_ids": "A ticket is in the list more than once."})

        with transaction.atomic():
            backlog = {
                ticket.pk: ticket
                for ticket in Ticket.objects.select_for_update().filter(sprint__isnull=True)
            }
            missing = sorted(set(backlog) - set(ids))
            not_in_backlog = sorted(set(ids) - set(backlog))
            if missing or not_in_backlog:
                problems = []
                if missing:
                    problems.append(f"missing backlog tickets {missing}")
                if not_in_backlog:
                    problems.append(f"tickets not in the backlog {not_in_backlog}")
                raise ValidationError(
                    {"ticket_ids": "The list must have all backlog tickets exactly once: "
                                   + ", ".join(problems) + "."}
                )
            ordered = [backlog[ticket_id] for ticket_id in ids]
            for position, ticket in enumerate(ordered, start=1):
                ticket.priority = position
            Ticket.objects.bulk_update(ordered, ["priority"])

        return Response(TicketSerializer(ordered, many=True).data)
