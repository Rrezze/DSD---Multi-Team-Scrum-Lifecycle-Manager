from django.urls import path

from .views import (
    TeamDetailView,
    TeamListCreateView,
    TeamMembershipDetailView,
    TeamMembershipListCreateView,
)

urlpatterns = [
    path("teams/", TeamListCreateView.as_view(), name="team-list"),
    path("teams/<int:pk>/", TeamDetailView.as_view(), name="team-detail"),
    path("memberships/", TeamMembershipListCreateView.as_view(), name="membership-list"),
    path("memberships/<int:pk>/", TeamMembershipDetailView.as_view(),
         name="membership-detail"),
]