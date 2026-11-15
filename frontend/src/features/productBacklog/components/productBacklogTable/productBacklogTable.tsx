
import * as React from "react";

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";

import {
    SortableContext,
    useSortable,
    arrayMove,
    verticalListSortingStrategy,
    sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import type { BacklogTicket } from "../../productBacklogTypes";
import { reorderBacklogTickets } from "../../productBacklogApi";

import Notification from "../../../../components/notification/notification";

import styles from "./ProductBacklogTable.module.css";

interface ProductBacklogTableProps {
    tickets: BacklogTicket[];
    onTicketClick: (ticket: BacklogTicket) => void;
}

interface SortableTicketRowProps {
    ticket: BacklogTicket;
    onTicketClick: (ticket: BacklogTicket) => void;
}
/**
 * A single sortable ticket row.
 */
function SortableTicketRow({ ticket, onTicketClick }: SortableTicketRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: ticket.id,
    });

    const rowStyle: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: "relative",
        zIndex: isDragging ? 1 : undefined,
    };

    return (
        <tr ref={setNodeRef} style={rowStyle} onClick={() => onTicketClick(ticket)}>
            {/* Ticket ID and drag handle */}
            <td>
                <div className={styles.ticketNumberCell}>
                    <span className={styles.ticketNumber}>
                        {ticket.id}
                    </span>

                    <button
                        type="button"
                        className={styles.dragHandle}
                        aria-label={`Drag ticket ${ticket.id} to reorder`}
                        title="Drag to reorder"
                        onClick={(event) => event.stopPropagation()}
                        {...attributes}
                        {...listeners}
                    >
                        ⠿
                    </button>
                </div>
            </td>

            {/* Ticket type */}
            <td>
                <span
                    className={`${styles.typeBadge} ${styles[ticket.type.toLowerCase()]}`}
                >
                    {ticket.type}
                </span>
            </td>

            {/* Ticket title */}
            <td>
                <span className={styles.ticketTitle}>
                    {ticket.title}
                </span>
            </td>

            {/* Parent ticket */}
            <td>
                {ticket.parent ?? "-"}
            </td>

            {/* Assigned team */}
            <td>
                {ticket.teams.length > 0
                    ? ticket.teams.join(", ")
                    : "-"}
            </td>

            {/* Estimate points */}
            <td className={styles.pointsCell}>
                {ticket.estimate_points ?? "-"} pts
            </td>

            {/* Status */}
            <td>
                <span className={styles.statusBadge}>
                    {ticket.status.replace(/_/g, " ")}
                </span>
            </td>
        </tr>
    );
}

export default function ProductBacklogTable({
    tickets,
    onTicketClick
}: ProductBacklogTableProps) {
    const [orderedTickets, setOrderedTickets] =
        React.useState<BacklogTicket[]>(tickets);

    const [isSavingOrder, setIsSavingOrder] =
        React.useState(false);

    const [reorderNotification, setReorderNotification] =
        React.useState<{
            type: "success" | "error";
            message: string;
        } | null>(null);

    // Synchronize local state with tickets fetched from the backend.
    React.useEffect(() => {
        setOrderedTickets(tickets);
    }, [tickets]);

    // Configure mouse and keyboard dragging.
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    /**
     * Persist the new ticket order after dragging.
     */
    const handleDragEnd = async (event: DragEndEvent) => {
        setReorderNotification(null);

        const { active, over } = event;

        if (!over || active.id === over.id || isSavingOrder) {
            return;
        }

        const oldIndex = orderedTickets.findIndex(
            (ticket) => ticket.id === active.id
        );

        const newIndex = orderedTickets.findIndex(
            (ticket) => ticket.id === over.id
        );

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        const previousTickets = orderedTickets;

        const reorderedTickets = arrayMove(
            orderedTickets,
            oldIndex,
            newIndex
        );

        const updatedTickets = reorderedTickets.map(
            (ticket, index) => ({
                ...ticket,
                priority: index + 1,
            })
        );

        // Update the UI immediately.
        setOrderedTickets(updatedTickets);
        setIsSavingOrder(true);

        try {
            const ticketIds = updatedTickets.map(
                (ticket) => ticket.id
            );

            const savedTickets = await reorderBacklogTickets(ticketIds);

            setOrderedTickets(savedTickets);

            setReorderNotification({
                type: "success",
                message: "Backlog order updated successfully!",
            });
        } catch (error) {
            // Restore the original order if saving fails.
            setOrderedTickets(previousTickets);

            setReorderNotification({
                type: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to save the new ticket order.",
            });
        } finally {
            setIsSavingOrder(false);
        }
    };

    if (orderedTickets.length === 0) {
        return (
            <div className={styles.emptyState}>
                No tickets found in the product backlog.
            </div>
        );
    }

    return (
        <div className={styles.tableContainer}>
            {/* Reorder notification */}
            {reorderNotification && (
                <Notification
                    type={reorderNotification.type}
                    message={reorderNotification.message}
                />
            )}

            {isSavingOrder && (
                <p className={styles.savingMessage}>
                    Saving new ticket order...
                </p>
            )}

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>TYPE</th>
                            <th>TITLE</th>
                            <th>PARENT</th>
                            <th>TEAM</th>
                            <th>PTS</th>
                            <th>STATUS</th>
                        </tr>
                    </thead>

                    <SortableContext
                        items={orderedTickets.map(
                            (ticket) => ticket.id
                        )}
                        strategy={verticalListSortingStrategy}
                    >
                        <tbody>
                            {orderedTickets.map((ticket) => (
                                <SortableTicketRow
                                    key={ticket.id}
                                    ticket={ticket}
                                    onTicketClick={onTicketClick}
                                />
                            ))}
                        </tbody>
                    </SortableContext>
                </table>
            </DndContext>
        </div>
    );
}
