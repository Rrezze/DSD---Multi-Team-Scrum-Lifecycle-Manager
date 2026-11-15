from drf_spectacular.utils import extend_schema
from rest_framework.generics import ListAPIView

from .models import Team
from .serializers import TeamSerializer


@extend_schema(
    summary="List teams",
    description="All past and present teams, ordered by name. "
                "Inactive teams have is_active=false.",
)
class TeamListView(ListAPIView):
    serializer_class = TeamSerializer
    queryset = Team.objects.order_by("name")
