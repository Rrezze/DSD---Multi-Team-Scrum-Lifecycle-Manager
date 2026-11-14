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
            "assignees",
            "teams",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "priority",
            "status",
            "sprint",
            "assignees",
            "teams",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        # On edit (PATCH) only the changed fields are sent, so missing ones
        # come from the ticket that is being edited.
        ticket = self.instance
        ticket_type = attrs.get("type", ticket.type if ticket else None)
        parent = attrs["parent"] if "parent" in attrs else (ticket.parent if ticket else None)

        if parent is not None:
            if ticket is not None and parent.pk == ticket.pk:
                raise serializers.ValidationError({"parent": "A ticket cannot be its own parent."})
            allowed = ALLOWED_PARENT_TYPES[ticket_type]
            if not allowed:
                raise serializers.ValidationError({"parent": "An epic cannot have a parent."})
            if parent.type not in allowed:
                names = " or ".join(sorted(t.lower() for t in allowed))
                raise serializers.ValidationError(
                    {"parent": f"A {ticket_type.lower()} can only belong to a {names}."}
                )

        # Changing the type must not break the tickets that are under this one.
        if ticket is not None and "type" in attrs:
            for child in ticket.children.all():
                if ticket_type not in ALLOWED_PARENT_TYPES[child.type]:
                    raise serializers.ValidationError(
                        {"type": f"This ticket has a {child.type.lower()} under it, "
                                 f"so it cannot become a {ticket_type.lower()}."}
                    )
        return attrs


class TicketUpdateSerializer(TicketSerializer):
    """Used for editing a ticket. Same as TicketSerializer, but status can be
    changed too (e.g. moving the ticket on the team board). Priority is only
    changed by reordering the backlog."""

    class Meta(TicketSerializer.Meta):
        read_only_fields = [
            f for f in TicketSerializer.Meta.read_only_fields if f != "status"
        ]


class ReorderBacklogSerializer(serializers.Serializer):
    """The new order of the whole backlog, top first."""

    ticket_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=True)
