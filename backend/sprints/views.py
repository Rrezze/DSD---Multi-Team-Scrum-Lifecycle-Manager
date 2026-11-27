from rest_framework import generics

from .models import Sprint
from .serializers import SprintSerializer


class SprintListCreateView(generics.ListCreateAPIView):
    """List sprints in start-date order or create a sprint."""

    serializer_class = SprintSerializer

    def get_queryset(self):
        return Sprint.objects.all().order_by("start_date")


class SprintDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, partially update, or delete a sprint."""

    queryset = Sprint.objects.all()
    serializer_class = SprintSerializer
    http_method_names = ["get", "patch", "delete"]
