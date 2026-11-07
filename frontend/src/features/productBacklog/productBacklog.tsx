
import { useState } from "react";

import styles from "./productBacklog.module.css";

import CreateTicketModal from "./components/CreateTicketModal/CreateTicketModal";

export default function ProductBacklog() {

    // Controls whether the Create Ticket modal is visible
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Opens the modal
    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    // Closes the modal
    const handleCloseModal = () => {
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

                <button
                    type="button"
                    className={styles.createButton}
                    onClick={handleOpenModal}
                >
                    + Create Ticket
                </button>
            </div>

            <CreateTicketModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />

        </main>
    );
}
