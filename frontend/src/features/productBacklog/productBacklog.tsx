import { useState } from "react";

import Button from "../../components/button/Button";
import Notification from "../../components/notification/notification";
import CreateTicket from "./components/createTicket/createTicket";
import styles from "./productBacklog.module.css";

export default function ProductBacklog() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const handleOpenModal = () => {
        setSuccessMessage("");
        setIsModalOpen(true);
    };

    const handleTicketCreated = () => {
        setSuccessMessage("Ticket created successfully!");
        setIsModalOpen(false);
    };

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
                    onClick={handleOpenModal}
                >
                    + Create Ticket
                </Button>
            </div>

            <Notification
                type="success"
                message={successMessage}
            />

            <CreateTicket
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleTicketCreated}
            />
        </main>
    );
}
