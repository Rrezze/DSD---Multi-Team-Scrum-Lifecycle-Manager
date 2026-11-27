import { useState, type DragEvent } from "react";

import type { Team } from "../../../productBacklog/productBacklogTypes";
import type { PlannedTicket } from "../../sprintPlanningTypes";
import { SprintTickets } from "../sprintTickets/sprintTickets";
import styles from "./sprintTasks.module.css";

interface SprintTasksProps {
    sprintName: string;
    teamName: string;
    tickets: PlannedTicket[];
    teams: Team[];
    isLoading: boolean;
    onRemoveTicket: (ticketId: number) => void;
    onDropTicket: (ticketId: number) => boolean;
}

export function SprintTasks({
    sprintName,
    teamName,
    tickets,
    teams,
    isLoading,
    onRemoveTicket,
    onDropTicket,
}: SprintTasksProps) {
    const [isDropActive, setIsDropActive] = useState(false);
    const [recentlyAddedTicketId, setRecentlyAddedTicketId] = useState<number | null>(null);

    const handleDrop = (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        setIsDropActive(false);
        const ticketId = Number(event.dataTransfer.getData("text/plain"));
        if (!Number.isInteger(ticketId)) return;

        if (onDropTicket(ticketId)) {
            setRecentlyAddedTicketId(ticketId);
        }
    };

    return (
        <section
            className={styles.panel}
            aria-labelledby="planned-heading"
            onDragEnter={() => setIsDropActive(true)}
            onDragOver={(event) => {
                event.preventDefault();
                setIsDropActive(true);
            }}
            onDragLeave={(event) => {
                const relatedTarget = event.relatedTarget;
                if (
                    !(relatedTarget instanceof Node)
                    || !event.currentTarget.contains(relatedTarget)
                ) {
                    setIsDropActive(false);
                }
            }}
            onDrop={handleDrop}
        >
            <div className={styles.panelHeading}>
                <div>
                    <h2 id="planned-heading">Sprint tasks</h2>
                    <p>{sprintName} · {teamName} · drag tickets from the backlog</p>
                </div>
                <span className={styles.countBadge}>{tickets.length} tickets</span>
            </div>
            {isLoading ? (
                <p className={styles.loadingState}>Loading sprint planning data…</p>
            ) : (
                <>
                    <div className={styles.ticketList}>
                        {tickets.map(({ ticket, teamId }) => (
                            <SprintTickets
                                key={ticket.id}
                                ticket={ticket}
                                team={teams.find((team) => team.id === teamId)}
                                isRecentlyAdded={ticket.id === recentlyAddedTicketId}
                                onRemove={() => onRemoveTicket(ticket.id)}
                            />
                        ))}
                    </div>
                    <div
                        className={`${styles.dropHint} ${tickets.length === 0 ? styles.emptyDropHint : ""} ${isDropActive ? styles.dropActive : ""}`}
                    >
                        <span aria-hidden="true">↓</span>
                        {tickets.length === 0
                            ? `Drop a backlog ticket here to add it to ${sprintName}`
                            : `Drop more tickets here to add them to ${sprintName}`}
                    </div>
                </>
            )}
        </section>
    );
}
