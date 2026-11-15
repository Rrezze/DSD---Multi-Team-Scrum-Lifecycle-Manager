
/**
 * Product Backlog Page
 *
 * Responsible for displaying the Product Backlog page
 * and managing the Create Ticket form.
 *
 * Architecture:
 * - Shared Modal provides the modal container.
 * - Shared Button provides reusable button styling.
 * - Shared Notification displays success and error messages.
 * - productBacklogApi handles backend communication.
 * - productBacklogTypes provides feature-specific TypeScript types.
 *
 * All ticket form JSX, state management and validation
 * are maintained within this feature page.
 */

import { useCallback, useState, useEffect} from "react";

import styles from "./productBacklog.module.css";
import Button from "../../components/button/Button";
import Notification from "../../components/notification/notification";
import CreateTicket from "./components/createTicket/createTicket";
import { getBacklogTickets } from "./productBacklogApi";
import ViewTicket from "./components/viewTicket/viewTicket";

import type {
   BacklogTicket
} from "./productBacklogTypes";
import ProductBacklogTable from "./components/productBacklogTable/productBacklogTable";
export default function ProductBacklog() {

    const [tickets, setTickets] = useState<BacklogTicket[]>([]);
    const [isLoadingTickets, setIsLoadingTickets] = useState(true);
    const [ticketFetchError, setTicketFetchError] = useState("");
    const [selectedTicket, setSelectedTicket] = useState<BacklogTicket | null>(null);
    // Controls modal visibility.
    const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);

    // Stores success messages displayed outside the modal.
    const [successMessage, setSuccessMessage] = useState("");

    const handleCreateTicketModalOpen = () => {
        setSuccessMessage("");
        setIsCreateTicketModalOpen(true);
    };

    const handleTicketCreated = () => {
        setSuccessMessage("Ticket created successfully!");
        setIsCreateTicketModalOpen(false);
    };
    const handleTicketClick = (ticket: BacklogTicket) => {
        setSelectedTicket(ticket);
    };

    const fetchTickets = useCallback(async () => {
        try {
            setIsLoadingTickets(true);
            setTicketFetchError("");

            const data = await getBacklogTickets();

            setTickets(data);
        } catch (error) {
            setTicketFetchError(
                error instanceof Error
                    ? error.message
                    : "Failed to load backlog tickets."
            );
        } finally {
            setIsLoadingTickets(false);
        }
    }, []);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    return (
        <main className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>
                        Product Backlog
                    </h1>

                    <p className={styles.description}>
                        Manage and organize your product backlog tickets.
                    </p>
                </div>

                <Button
                    type="button"
                    onClick={handleCreateTicketModalOpen}
                >
                    + Create Ticket
                </Button>
            </div>

            <Notification
                type="success"
                message={successMessage}
            />
            {/* Product Backlog table */}
            {isLoadingTickets ? (
                <p>Loading backlog tickets...</p>
            ) : ticketFetchError ? (
                <div role="alert">
                    <p>{ticketFetchError}</p>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={fetchTickets}
                    >
                        Retry
                    </Button>
                </div>
            ) : (
                <ProductBacklogTable tickets={tickets} onTicketClick={handleTicketClick} />
            )}
            {/* Create Ticket modal */}


            <CreateTicket
                isOpen={isCreateTicketModalOpen}
                onClose={() => setIsCreateTicketModalOpen(false)}
                onSuccess={handleTicketCreated}
            />
            <ViewTicket
                ticket={selectedTicket}
                onClose={() => setSelectedTicket(null)}
            />

        </main>
    );
}

