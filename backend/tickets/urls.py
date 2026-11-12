from django.urls import path

from .views import TicketDetailView, TicketListCreateView

urlpatterns = [
    path("tickets/", TicketListCreateView.as_view(), name="ticket-list"),
    path("tickets/<int:pk>/", TicketDetailView.as_view(), name="ticket-detail"),
]
