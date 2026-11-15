
import Modal from "../../../../components/modal/Modal";
import Button from "../../../../components/button/Button";
import type { BacklogTicket } from "../../productBacklogTypes";

import styles from "./viewTicket.module.css";

interface TicketDetailsProps {
    ticket: BacklogTicket | null;
    onClose: () => void;
}

export default function TicketDetails({
    ticket,
    onClose
}: TicketDetailsProps) {
    return (
        <Modal
            isOpen={ticket !== null}
            onClose={onClose}
            labelledBy="ticket-details-title"
        >
            {ticket && (
                <div className={styles.container}>
                    <div className={styles.header}>
                        <div className={styles.heading}>
                            <p className={styles.eyebrow}>
                                VIEW TICKET
                            </p>
                            <h2 id="ticket-details-title" className={styles.title}>
                                TICKET #{ticket.id} · {ticket.title.toUpperCase()}
                            </h2>
                        </div>

                        <Button type="button">
                            Edit Ticket
                        </Button>
                    </div>

                    <div className={styles.details}>
                        <div className={styles.field}>
                            <label>Title</label>
                            <p className={styles.fieldValue}>
                                {ticket.title}
                            </p>
                        </div>

                        <div className={styles.field}>
                            <label>Ticket type</label>
                            <p className={styles.fieldValue}>
                                <span
                                    className={`${styles.typeBadge} ${styles[ticket.type.toLowerCase()]}`}
                                >
                                    {ticket.type}
                                </span>
                            </p>
                        </div>

                        <div className={`${styles.field} ${styles.descriptionField}`}>
                            <label>Description</label>
                            <p className={styles.descriptionValue}>
                                {ticket.description || "No description provided."}
                            </p>
                        </div>

                        <div className={styles.field}>
                            <label>Estimate</label>
                            <p className={styles.fieldValue}>
                                {ticket.estimate_points ?? "-"} PTS
                            </p>
                        </div>

                        <div className={styles.field}>
                            <label>Status</label>
                            <p className={`${styles.fieldValue} ${styles.statusValue}`}>
                                {ticket.status.replace(/_/g, " ")}
                            </p>
                        </div>

                        <div className={`${styles.field} ${styles.teams}`}>
                            <label>Teams</label>

                            <div className={styles.teamList}>
                                {ticket.teams.length > 0 ? (
                                    ticket.teams.map((team) => (
                                        <span key={team} className={styles.teamBadge}>
                                            Team #{team}
                                        </span>
                                    ))
                                ) : (
                                    <p className={styles.fieldValue}>No teams assigned</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className={styles.footerDivider} />
                </div>
            )}
        </Modal>
    );
}
