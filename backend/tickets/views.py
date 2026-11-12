from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Max
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import filters, generics
from rest_framework.exceptions import ValidationError

from .models import Ticket
from .serializers import TicketSerializer, TicketUpdateSerializer

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
        ]
    )
)
class TicketListCreateView(generics.ListCreateAPIView):
    """Product backlog.

    GET returns the tickets that are not in any sprint, ordered by priority
    (top of the backlog first). Optional filters: ?type=, ?status= and
    ?search= (title and description, case-insensitive). They can be combined.

    POST creates a ticket. It goes to the bottom of the backlog
    (priority = last + 1), starts in TODO, is not in a sprint and is created
    by the default PO.
    """

    serializer_class = TicketSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["title", "description"]

    def get_queryset(self):
        queryset = Ticket.objects.filter(sprint__isnull=True)
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
