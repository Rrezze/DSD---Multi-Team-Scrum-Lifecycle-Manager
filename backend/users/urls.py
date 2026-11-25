from django.urls import path

from .views import (
    AbsenceDeleteView,
    AbsenceListView,
    LoginView,
    UserAbsenceListCreateView,
    UserDetailView,
    UserListCreateView,
)

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("users/", UserListCreateView.as_view(), name="user-list"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),
    path("users/<int:user_pk>/absences/", UserAbsenceListCreateView.as_view(),
         name="user-absences"),
    path("absences/", AbsenceListView.as_view(), name="absence-list"),
    path("absences/<int:pk>/", AbsenceDeleteView.as_view(), name="absence-delete"),
]
