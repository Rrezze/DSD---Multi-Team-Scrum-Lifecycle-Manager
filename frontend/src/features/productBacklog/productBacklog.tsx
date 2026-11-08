
import { useState } from "react";

import styles from "./productBacklog.module.css";

import CreateTicketModal from './createTicketModal';

export default function ProductBacklog() {

    // Controls whether the Create Ticket modal is visible
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // Opens the modal
    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    // Closes the modal
    const handleCloseModal = () => {
        setIsModalOpen(false);
    };
    const handleTicketCreated = () => {
    setSuccessMessage("Ticket created successfully!");
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

                <button
                    type="button"
                    className={styles.createButton}
                    onClick={handleOpenModal}
                >
                    + Create Ticket
                </button>
            </div>
            {successMessage && (
                    <p role="status" className={styles.successMessage}>
                        {successMessage}
                    </p>
                )}

            <CreateTicketModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onCreated={handleTicketCreated}
            />

        </main>
    );
}
