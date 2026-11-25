from rest_framework import serializers

from .models import DEFAULT_PO_USERNAME, Absence, User


class UserSerializer(serializers.ModelSerializer):
    """A user as sent to and returned by the API. There is no password:
    login only needs the username for now."""

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role", "is_active"]
        read_only_fields = ["id", "is_active"]

    def validate_username(self, value):
        # Login ignores upper/lower case, so "Ana" and "ana" can't both exist.
        others = User.objects.filter(username__iexact=value)
        if self.instance is not None:
            others = others.exclude(pk=self.instance.pk)
        if others.exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value):
        # Two active users can't share an email. Empty email is allowed for
        # many users, and a deactivated user doesn't block its old email.
        if not value:
            return value
        others = User.objects.filter(is_active=True, email__iexact=value)
        if self.instance is not None:
            others = others.exclude(pk=self.instance.pk)
        if others.exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate(self, attrs):
        # The default PO can be renamed (first/last name, email), but its
        # username and role must stay, the backend relies on them.
        user = self.instance
        if user is not None and user.username == DEFAULT_PO_USERNAME:
            if attrs.get("username", user.username) != user.username:
                raise serializers.ValidationError(
                    {"username": "The default Product Owner's username can't be changed."}
                )
            if attrs.get("role", user.role) != User.Role.PRODUCT_OWNER:
                raise serializers.ValidationError(
                    {"role": "The default Product Owner's role can't be changed."}
                )
        return attrs

    def create(self, validated_data):
        # create_user leaves the user without a usable password
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()


MAX_HOURS_PER_DAY = 8


class AbsenceSerializer(serializers.ModelSerializer):
    """An absence of a user. The user comes from the URL (or from the
    absence when editing), never from the body."""

    class Meta:
        model = Absence
        fields = ["id", "user", "start_date", "end_date", "reason", "hours"]
        read_only_fields = ["id", "user"]

    def validate(self, attrs):
        # On edit (PATCH) only the changed fields are sent, so the missing
        # ones come from the absence that is being edited.
        absence = self.instance
        user = absence.user if absence is not None else self.context["user"]
        if not user.is_active:
            raise serializers.ValidationError("This user is deactivated.")

        def current(name):
            if name in attrs:
                return attrs[name]
            return getattr(absence, name) if absence is not None else None

        start, end, hours = current("start_date"), current("end_date"), current("hours")
        if end < start:
            raise serializers.ValidationError(
                {"end_date": "The absence can't end before it starts."}
            )
        if hours is not None:
            if start != end:
                raise serializers.ValidationError(
                    {"hours": "Hours can only be set for a one-day absence."}
                )
            if not 1 <= hours <= MAX_HOURS_PER_DAY:
                raise serializers.ValidationError(
                    {"hours": f"Hours must be between 1 and {MAX_HOURS_PER_DAY}."}
                )
        # Two absences of the same user on the same days would count twice.
        # When editing, the absence itself doesn't count.
        overlapping = user.absences.filter(start_date__lte=end, end_date__gte=start)
        if absence is not None:
            overlapping = overlapping.exclude(pk=absence.pk)
        if overlapping.exists():
            raise serializers.ValidationError(
                "This user already has an absence in this period."
            )
        return attrs
