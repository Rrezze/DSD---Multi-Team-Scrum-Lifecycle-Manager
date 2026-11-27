from django.urls import path

from .views import SprintDetailView, SprintListCreateView

urlpatterns = [
    path("sprints/", SprintListCreateView.as_view(), name="sprint-list"),
    path("sprints/<int:pk>/", SprintDetailView.as_view(), name="sprint-detail"),
]
