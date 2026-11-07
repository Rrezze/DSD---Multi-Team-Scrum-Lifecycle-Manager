
import { useState } from "react";
import styles from "./CreateTicketModal.module.css";

type CreateTicketModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
};

type TicketType = "EPIC" | "STORY" | "TASK" | "BUG";

export default function CreateTicketModal({
    isOpen,
    onClose,
    onCreated,
}: CreateTicketModalProps) {
    const [ticketType, setTicketType] = useState<TicketType>("STORY");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [estimatePoints, setEstimatePoints] = useState("");
    const [parent, setParent] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState("");

    if (!isOpen) {
        return null;
    }

    const showParentField = ticketType !== "EPIC";
    const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
        newErrors.title = "Ticket title is required.";
    }

    if (!description.trim()) {
        newErrors.description = "Description is required.";
    }

    if (!estimatePoints.trim()) {
        newErrors.estimatePoints = "Estimate points are required.";
    } else {
        const estimate = Number(estimatePoints);

        if (!Number.isInteger(estimate) || estimate <= 0) {
            newErrors.estimatePoints =
                "Estimate must be a positive whole number.";
        }
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
};

const handleSubmit = async () => {
    setApiError("");

    // Validate the form first
    if (!validateForm()) {
        return;
    }

    setIsSubmitting(true);

    try {
        // Prepare the ticket data
        const ticketData = {
            type: ticketType,
            title: title.trim(),
            description: description.trim(),
            estimate_points: Number(estimatePoints),
        };

        // Send the request to Django
        const response = await fetch("/api/tickets/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(ticketData),
        });

        // Read the backend response safely
        const responseText = await response.text();

        let data: { detail?: string } = {};

        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch {
            data = {};
        }

        // Handle errors returned by Django
        if (!response.ok) {
            const errorMessage =
                typeof data.detail === "string"
                    ? data.detail
                    : response.status >= 500
                        ? "Unable to connect to the server. Please try again."
                        : "Unable to create ticket. Please check your information.";

            throw new Error(errorMessage);
        }
        // Ticket created successfully
        //setSuccessMessage("Ticket created successfully!");
        onCreated(); // Notify parent component about the successful creation
        onClose();

        // Clear the form
        setTicketType("STORY");
        setTitle("");
        setDescription("");
        setEstimatePoints("");
        setParent("");
        setErrors({});

    } catch (error) {
        setApiError(
            error instanceof Error
                ? error.message
                : "Something went wrong while creating the ticket."
        );
    } finally {
        setIsSubmitting(false);
    }
};

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
                                {errors.estimatePoints && (
                                    <small className={styles.error}>
                                        {errors.estimatePoints}
                                    </small>
                                )}

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
                            {errors.title && (
                                <small className={styles.error}>{errors.title}</small>
                            )}
                        </div>

                        {/* Parent */}
                        {showParentField && (
                            <div className={styles.formGroup}>
                                <label htmlFor="ticket-parent">
                                    Parent ticket
                                </label>

                                <select
                                    id="ticket-parent"
                                    value={parent}
                                    onChange={(event) => setParent(event.target.value)}
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
                            {errors.description && (
                                <small className={styles.error}>{errors.description}</small>
                            )}
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                {apiError && (
                    <p role="alert" className={styles.error}>
                        {apiError}
                    </p>
                )}
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
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                     >
                          {isSubmitting ? "Creating..." : "Create ticket"}
                            </button>
                </div>
            </div>
        </div>
    );
}
