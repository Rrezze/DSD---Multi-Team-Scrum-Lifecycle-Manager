from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import filters, generics
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .serializers import LoginSerializer, UserSerializer


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


# Created by the users.0002_create_default_po migration and used as the
# ticket creator, so it must stay active.
DEFAULT_PO_USERNAME = "po"


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
    but it is no longer listed and can't log in.
    """

    queryset = User.objects.all()
    serializer_class = UserSerializer
    # only partial updates, no PUT
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def perform_destroy(self, instance):
        if instance.username == DEFAULT_PO_USERNAME:
            raise ValidationError({"detail": "The default Product Owner can't be deleted."})
        instance.is_active = False
        instance.save(update_fields=["is_active"])
