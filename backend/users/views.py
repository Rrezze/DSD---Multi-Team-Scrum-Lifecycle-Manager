from drf_spectacular.utils import extend_schema
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
