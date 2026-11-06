from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Max
from rest_framework import generics

from .models import Ticket
from .serializers import TicketSerializer

# Created by the users.0002_create_default_po migration.
# Used as the ticket creator until authentication is added.
DEFAULT_PO_USERNAME = "po"


class TicketCreateView(generics.CreateAPIView):
    """Create a ticket in the product backlog.

    The new ticket goes to the bottom of the backlog (priority = last + 1),
    starts in TODO, is not in a sprint and is created by the default PO.
    """

    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer

    def perform_create(self, serializer):
        creator = get_user_model().objects.get(username=DEFAULT_PO_USERNAME)
        with transaction.atomic():
            last = Ticket.objects.filter(sprint__isnull=True).aggregate(m=Max("priority"))["m"]
            serializer.save(priority=(last or 0) + 1, created_by=creator)
