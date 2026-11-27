import type { DragEvent } from "react";

import type { BacklogTicket } from "../../../productBacklog/productBacklogTypes";
import type { PlanningTeam } from "../../sprintPlanningTypes";
import styles from "./sprintTickets.module.css";

interface SprintTicketsProps {
    ticket: BacklogTicket;
    team?: PlanningTeam;
    variant?: "sprint" | "backlog";
    onRemove?: () => void;
    onAdd?: () => void;
    isRecentlyAdded?: boolean;
}

export function SprintTickets({
    ticket,
    team,
    variant = "sprint",
    onRemove,
    onAdd,
    isRecentlyAdded = false,
}: SprintTicketsProps) {
    const handleDragStart = (event: DragEvent<HTMLElement>) => {
        event.dataTransfer.setData("text/plain", String(ticket.id));
        event.dataTransfer.effectAllowed = "move";
    };

    return (
        <article
            className={`${styles.ticketCard} ${variant === "backlog" ? styles.backlogTicket : ""} ${isRecentlyAdded ? styles.newlyAdded : ""}`}
            draggable
            onDragStart={handleDragStart}
        >
            <span className={styles.dragGrip} aria-hidden="true">⠿</span>
            <div className={styles.ticketContent}>
                <div className={styles.ticketTitleRow}>
                    <span className={`${styles.typeBadge} ${styles[ticket.type.toLowerCase()]}`}>
                        {ticket.type}
                    </span>
                    <h3>{ticket.title}</h3>
                </div>
                <div className={styles.ticketMeta}>
                    <span>#{ticket.id}</span>
                    {team && <span>{team.name}</span>}
                    <span className={styles.statusBadge}>
                        {ticket.status.replace(/_/g, " ")}
                    </span>
                </div>
            </div>
            <strong className={styles.ticketPoints}>
                {ticket.estimate_points} pts
            </strong>
            {onRemove && (
                <button
                    type="button"
                    className={styles.removeButton}
                    onClick={onRemove}
                    aria-label={`Remove ${ticket.title} from sprint`}
                    title="Return to backlog"
                >
                    ×
                </button>
            )}
            {onAdd && (
                <button
                    type="button"
                    className={styles.addButton}
                    onClick={onAdd}
                    aria-label={`Add ${ticket.title} to sprint`}
                >
                    + Add
                </button>
            )}
        </article>
    );
}
