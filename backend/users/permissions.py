from django.conf import settings
from rest_framework.permissions import BasePermission

from .models import User


class LoginRequiredIfEnabled(BasePermission):
    """Default for every endpoint. With REQUIRE_LOGIN on, the request needs a
    valid token. With it off, requests without a token work as before."""

    def has_permission(self, request, view):
        return request.user.is_authenticated or not settings.REQUIRE_LOGIN


class HasRole(BasePermission):
    """Only users with one of `roles` may use the endpoint.

    With REQUIRE_LOGIN off, requests without a token are still let through,
    so the frontend keeps working until the login page is connected.
    """

    roles = ()
    message = "You don't have the role needed for this action."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return not settings.REQUIRE_LOGIN
        return request.user.role in self.roles


class IsProductOwner(HasRole):
    roles = (User.Role.PRODUCT_OWNER,)
    message = "Only the Product Owner can do this."


class IsEngineeringManager(HasRole):
    roles = (User.Role.ENGINEERING_MANAGER,)
    message = "Only an Engineering Manager can do this."
