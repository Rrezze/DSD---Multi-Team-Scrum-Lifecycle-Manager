from django.contrib.auth import authenticate
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .serializers import LoginResponseSerializer, LoginSerializer, UserSerializer

# Same message for an unknown email, a wrong password and an inactive user,
# so the API doesn't tell which emails exist.
WRONG_CREDENTIALS = "Wrong email or password."


class LoginView(APIView):
    """Log in with email and password.

    Returns a token and the user. Send the token in every request as
    `Authorization: Token <token>`.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(request=LoginSerializer, responses=LoginResponseSerializer)
    def post(self, request):
        body = LoginSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        email = body.validated_data["email"]
        password = body.validated_data["password"]

        found = User.objects.filter(email__iexact=email).first()
        # authenticate() also refuses inactive users and unusable passwords
        user = found and authenticate(request, username=found.username, password=password)
        if not user:
            raise ValidationError({"detail": WRONG_CREDENTIALS})

        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutView(APIView):
    """Log out: the token stops working."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
