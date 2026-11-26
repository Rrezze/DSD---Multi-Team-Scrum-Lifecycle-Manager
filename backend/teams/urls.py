from django.urls import path

from .views import (
    TeamCapacityView,
    TeamDetailView,
    TeamListCreateView,
    TeamMembershipDetailView,
    TeamMembershipListCreateView,
)

urlpatterns = [
    path("teams/", TeamListCreateView.as_view(), name="team-list"),
    path("teams/capacity/", TeamCapacityView.as_view(), name="team-capacity"),
    path("teams/<int:pk>/", TeamDetailView.as_view(), name="team-detail"),
    path("memberships/", TeamMembershipListCreateView.as_view(), name="membership-list"),
    path("memberships/<int:pk>/", TeamMembershipDetailView.as_view(),
         name="membership-detail"),
]