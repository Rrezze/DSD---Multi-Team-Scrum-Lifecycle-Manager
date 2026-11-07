from rest_framework import serializers

from .models import Ticket

# Which ticket types each type may have as its parent (epic -> story -> task/bug).
ALLOWED_PARENT_TYPES = {
    Ticket.Type.EPIC: set(),
    Ticket.Type.STORY: {Ticket.Type.EPIC},
    Ticket.Type.TASK: {Ticket.Type.STORY, Ticket.Type.EPIC},
    Ticket.Type.BUG: {Ticket.Type.STORY, Ticket.Type.EPIC},
}


class TicketSerializer(serializers.ModelSerializer):
    """Ticket as sent to and returned by the API.

    The client only sends type, title, description, estimate_points and parent.
    Everything else is set by the backend and is read-only.
    """

    class Meta:
        model = Ticket
        fields = [
            "id",
            "type",
            "title",
            "description",
            "estimate_points",
            "parent",
            "priority",
            "status",
            "sprint",
            "assignee",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "priority",
            "status",
            "sprint",
            "assignee",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        ticket_type = attrs.get("type")
        parent = attrs.get("parent")
        if parent is not None:
            allowed = ALLOWED_PARENT_TYPES[ticket_type]
            if not allowed:
                raise serializers.ValidationError({"parent": "An epic cannot have a parent."})
            if parent.type not in allowed:
                names = " or ".join(sorted(t.lower() for t in allowed))
                raise serializers.ValidationError(
                    {"parent": f"A {ticket_type.lower()} can only belong to a {names}."}
                )
        return attrs
