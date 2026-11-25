from django.urls import path

from .views import TeamDetailView, TeamListCreateView

urlpatterns = [
    path("teams/", TeamListCreateView.as_view(), name="team-list"),
    path("teams/<int:pk>/", TeamDetailView.as_view(), name="team-detail"),
]