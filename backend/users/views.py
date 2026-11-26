from datetime import date

from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import filters, generics
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DEFAULT_PO_USERNAME, Absence, User
from .serializers import AbsenceSerializer, LoginSerializer, UserSerializer
from django.db import transaction
from teams.models import TeamMembership


class LoginView(APIView):
    """Log in with a username.

    Returns the user (name and role) so the frontend can save it and show
    or hide actions based on the role. There is no password or token for
    now, and every API endpoint works without logging in.
    """

    @extend_schema(request=LoginSerializer, responses=UserSerializer)
    def post(self, request):
        body = LoginSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        user = User.objects.filter(
            username__iexact=body.validated_data["username"].strip(), is_active=True
        ).first()
        if user is None:
            raise ValidationError({"username": "User not found."})
        return Response(UserSerializer(user).data)


@extend_schema_view(
    get=extend_schema(
        parameters=[
            OpenApiParameter(
                "role", OpenApiTypes.STR, enum=User.Role.values,
                description="Only users with this role.",
            ),
        ]
    )
)
class UserListCreateView(generics.ListCreateAPIView):
    """Users of the organization.

    GET returns the active users, ordered by username. Optional filters:
    ?role= and ?search= (username, first name, last name and email,
    case-insensitive). POST creates a user (username is required).
    """

    serializer_class = UserSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["username", "first_name", "last_name", "email"]

    def get_queryset(self):
        queryset = User.objects.filter(is_active=True)
        role = self.request.query_params.get("role")
        if role is not None:
            if role not in User.Role.values:
                raise ValidationError(
                    {"role": f"Unknown role '{role}'. Use one of: {', '.join(User.Role.values)}."}
                )
            queryset = queryset.filter(role=role)
        return queryset.order_by("username")


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """One user.

    GET returns the user (also when deactivated, for the history). PATCH
    edits username, name, email or role. DELETE deactivates the user: it
    stays in the database so its tickets and teams keep their history,
    but it is no longer listed and can't log in. It is also removed from
    its teams in current and future sprints; past sprints keep it.
    """

    queryset = User.objects.all()
    serializer_class = UserSerializer
    # only partial updates, no PUT
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def perform_destroy(self, instance):
        if instance.username == DEFAULT_PO_USERNAME:
            raise ValidationError({"detail": "The default Product Owner can't be deleted."})
        with transaction.atomic():
            instance.is_active = False
            instance.save(update_fields=["is_active"])
            # A sprint that hasn't ended yet is current or future.
            TeamMembership.objects.filter(
                user=instance, sprint__end_date__gte=date.today()
            ).delete()


class UserAbsenceListCreateView(generics.ListCreateAPIView):
    """Absences of one user.

    GET returns the user's absences, oldest first. POST adds one:
    start_date and end_date are required, reason and hours are optional
    (hours only for a one-day absence). Absences of the same user can't
    overlap.
    """

    serializer_class = AbsenceSerializer

    def get_user(self):
        return get_object_or_404(User, pk=self.kwargs["user_pk"])

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # API schema generation
            return Absence.objects.none()
        return self.get_user().absences.all()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if "user_pk" in self.kwargs:  # not set when the API schema is generated
            context["user"] = self.get_user()
        return context

    def perform_create(self, serializer):
        serializer.save(user=serializer.context["user"])


def _parse_date(name, value):
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise ValidationError({name: f"'{value}' is not a date. Use YYYY-MM-DD."})


@extend_schema_view(
    get=extend_schema(
        parameters=[
            OpenApiParameter(
                "users", OpenApiTypes.STR,
                description="Comma-separated user ids, e.g. 1,2,3. Without it, all users.",
            ),
            OpenApiParameter(
                "from", OpenApiTypes.DATE,
                description="Only absences that end on or after this date.",
            ),
            OpenApiParameter(
                "to", OpenApiTypes.DATE,
                description="Only absences that start on or before this date.",
            ),
        ]
    )
)
class AbsenceListView(generics.ListAPIView):
    """Absences of several users at once, e.g. everyone in a team.

    ?users=1,2,3 picks the users, ?from= and ?to= keep only the absences
    that overlap that period (for example a sprint). Ordered by user and
    start date.
    """

    serializer_class = AbsenceSerializer

    def get_queryset(self):
        queryset = Absence.objects.all()
        params = self.request.query_params

        users = params.get("users")
        if users is not None:
            ids = [part.strip() for part in users.split(",") if part.strip()]
            if not ids or not all(part.isdigit() for part in ids):
                raise ValidationError({"users": "Use comma-separated user ids, e.g. 1,2,3."})
            queryset = queryset.filter(user_id__in=[int(part) for part in ids])

        start = params.get("from")
        end = params.get("to")
        if start is not None:
            queryset = queryset.filter(end_date__gte=_parse_date("from", start))
        if end is not None:
            queryset = queryset.filter(start_date__lte=_parse_date("to", end))
        if start is not None and end is not None and end < start:
            raise ValidationError({"to": "'to' can't be before 'from'."})

        return queryset.order_by("user_id", "start_date", "id")


class AbsenceDetailView(generics.UpdateAPIView, generics.DestroyAPIView):
    """One absence.

    PATCH edits it (start_date, end_date, reason, hours) with the same rules
    as adding one; if the new values are not valid, nothing changes.
    DELETE removes it (the x next to it on the Users page).
    """

    queryset = Absence.objects.all()
    serializer_class = AbsenceSerializer
    # only partial updates, no PUT
    http_method_names = ["patch", "delete", "options"]
