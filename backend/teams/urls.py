from django.urls import path

from .views import TeamListView

urlpatterns = [
    path("teams/", TeamListView.as_view(), name="team-list"),
]
