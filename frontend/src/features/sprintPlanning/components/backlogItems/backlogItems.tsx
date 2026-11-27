import type { DragEvent } from "react";

import type { BacklogTicket, Team } from "../../../productBacklog/productBacklogTypes";
import { SprintTickets } from "../sprintTickets/sprintTickets";
import styles from "./backlogItems.module.css";

interface BacklogItemsProps {
    tickets: BacklogTicket[];
    teams: Team[];
    search: string;
    isLoading: boolean;
    onSearchChange: (search: string) => void;
    onAddTicket: (ticket: BacklogTicket) => void;
    onDropTicket: (ticketId: number) => void;
}

export function BacklogItems({
    tickets,
    teams,
    search,
    isLoading,
    onSearchChange,
    onAddTicket,
    onDropTicket,
}: BacklogItemsProps) {
    const handleDrop = (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        const ticketId = Number(event.dataTransfer.getData("text/plain"));
        if (Number.isInteger(ticketId)) {
            onDropTicket(ticketId);
        }
    };

    return (
        <section
            className={styles.panel}
            aria-labelledby="backlog-heading"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
        >
            <div className={styles.panelHeading}>
                <div>
                    <h2 id="backlog-heading">Backlog items</h2>
                    <p>Available tickets, ordered by priority</p>
                </div>
                <span className={styles.countBadge}>{tickets.length}</span>
            </div>
            <label className={styles.searchBox}>
                <span aria-hidden="true">⌕</span>
                <input
                    type="search"
                    placeholder="Search backlog…"
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    aria-label="Search backlog tickets"
                />
            </label>
            {isLoading ? (
                <p className={styles.loadingState}>Loading backlog…</p>
            ) : (
                <div className={styles.ticketList}>
                    {tickets.map((ticket) => (
                        <SprintTickets
                            key={ticket.id}
                            ticket={ticket}
                            team={teams.find((team) => ticket.teams.includes(team.id))}
                            variant="backlog"
                            onAdd={() => onAddTicket(ticket)}
                        />
                    ))}
                    {!tickets.length && (
                        <p className={styles.emptyState}>
                            {search ? "No tickets match your search." : "No tickets left in the backlog."}
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}
