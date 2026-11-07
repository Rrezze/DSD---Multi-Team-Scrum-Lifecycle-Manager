
import { useState } from "react";
import styles from "./CreateTicketModal.module.css";

type CreateTicketModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

type TicketType = "EPIC" | "STORY" | "TASK" | "BUG";

export default function CreateTicketModal({
    isOpen,
    onClose,
}: CreateTicketModalProps) {
    const [ticketType, setTicketType] = useState<TicketType>("STORY");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [estimatePoints, setEstimatePoints] = useState("");
    const [parent, setParent] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (!isOpen) {
        return null;
    }

    const showParentField = ticketType !== "EPIC";

    return (
        <div className={styles.overlay}>
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <span className={styles.eyebrow}>
                            PRODUCT BACKLOG
                        </span>

                        <h2 id="modal-title">Create new ticket</h2>

                        <p className={styles.subtitle}>
                            Add a new item to your product backlog.
                        </p>
                    </div>

                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>

                {/* Form */}
                <div className={styles.body}>
                    <div className={styles.formGrid}>

                        {/* Ticket Type */}
                        <div className={styles.formGroup}>
                            <label htmlFor="ticket-type">
                                Ticket type <span>*</span>
                            </label>

                            <select
                                id="ticket-type"
                                value={ticketType}
                                onChange={(event) =>
                                    setTicketType(
                                        event.target.value as TicketType
                                    )
                                }
                            >
                                <option value="EPIC">Epic</option>
                                <option value="STORY">Story</option>
                                <option value="TASK">Task</option>
                                <option value="BUG">Bug</option>
                            </select>
                        </div>

                        {/* Estimate */}
                        <div className={styles.formGroup}>
                            <label htmlFor="ticket-estimate">
                                Estimate points <span>*</span>
                            </label>

                            <div className={styles.estimateWrapper}>
                                <input
                                    id="ticket-estimate"
                                    type="number"
                                    min="1"
                                    step="1"
                                    placeholder="5"
                                    value={estimatePoints}
                                    onChange={(event) => setEstimatePoints(event.target.value)}
                                    required
                                />

                                <span>pts</span>
                            </div>
                        </div>

                        {/* Title */}
                        <div className={styles.formGroup}>
                            <label htmlFor="ticket-title">
                                Ticket title <span>*</span>
                            </label>

                            <input
                                id="ticket-title"
                                type="text"
                                placeholder="What needs to be done?"
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                required
                            />
                        </div>

                        {/* Parent */}
                        {showParentField && (
                            <div className={styles.formGroup}>
                                <label htmlFor="ticket-parent">
                                    Parent ticket
                                </label>

                                <select
                                    id="ticket-parent"
                                    defaultValue=""
                                    disabled
                                >
                                    <option value="">
                                        Parent options coming soon
                                    </option>
                                </select>

                                <small>
                                    Optionally select an existing Epic or Story.
                                </small>
                            </div>
                        )}

                        {/* Description */}
                        <div
                            className={`${styles.formGroup} ${styles.fullWidth}`}
                        >
                            <label htmlFor="ticket-description">
                                Description <span>*</span>
                            </label>

                            <textarea
                                id="ticket-description"
                                rows={5}
                                placeholder="Describe the work, requirements and acceptance criteria..."
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                required
                            />
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button
                        type="button"
                        className={styles.cancelButton}
                        onClick={onClose}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className={styles.createButton}
                    >
                        Create ticket
                    </button>
                </div>
            </div>
        </div>
    );
}
