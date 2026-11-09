
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

import { useCallback, useState, type FormEvent } from "react";

import styles from "./productBacklog.module.css";

import Modal from "../../components/modal/Modal";
import Button from "../../components/button/Button";
import Notification from "../../components/notification/notification";

import { createTicket } from "./productBacklogApi";

import type {
    TicketType,
    CreateTicketPayload,
    TicketFormErrors,
} from "./productBacklogTypes";

export default function ProductBacklog() {

    // Controls modal visibility.
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Stores success messages displayed outside the modal.
    const [successMessage, setSuccessMessage] = useState("");

    // Ticket form state.
    const [ticketType, setTicketType] = useState<TicketType>("STORY");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [estimatePoints, setEstimatePoints] = useState("");
    const [parent, setParent] = useState("");

    // Stores client-side validation errors.
    const [errors, setErrors] = useState<TicketFormErrors>({});

    // Controls form submission.
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Stores errors returned by the backend.
    const [apiError, setApiError] = useState("");

    /**
     * Resets all ticket form fields and validation errors.
     */
    const resetForm = () => {
        setTicketType("STORY");
        setTitle("");
        setDescription("");
        setEstimatePoints("");
        setParent("");
        setErrors({});
        setApiError("");
    };

    /**
     * Opens the Create Ticket modal.
     */
    const handleOpenModal = () => {
        setSuccessMessage("");
        setApiError("");
        setIsModalOpen(true);
    };

    /**
     * Closes the modal and resets the form.
     *
     * Prevents closing while a request is being submitted.
     */
    const handleCloseModal = useCallback(() => {
        if (isSubmitting) return;

        setIsModalOpen(false);
        resetForm();
    }, [isSubmitting]);

    /**
     * Validates the ticket form before submission.
     *
     * @returns True when all validation rules are satisfied.
     */
    const validateForm = (): boolean => {
        const newErrors: TicketFormErrors = {};

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

    /**
     * Handles Create Ticket form submission.
     *
     * On success:
     * - Displays a success notification.
     * - Closes the modal.
     * - Resets the form.
     *
     * On failure:
     * - Displays a backend error notification.
     * - Preserves form values for correction or retry.
     */
    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        setApiError("");

        // Validate before sending the request.
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Prepare request according to the backend API contract.
            const ticketData: CreateTicketPayload = {
                type: ticketType,
                title: title.trim(),
                description: description.trim(),
                estimate_points: Number(estimatePoints),
                parent: parent ? Number(parent) : null,
            };

            // Send request through the feature API service.
            await createTicket(ticketData);

            // Display success notification.
            setSuccessMessage("Ticket created successfully!");

            // Close modal and reset form.
            setIsModalOpen(false);
            resetForm();

        } catch (error) {

            // Display the error returned by the API service.
            setApiError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong while creating the ticket."
            );

        } finally {
            setIsSubmitting(false);
        }
    };

    // Parent selection is unavailable until the parent-ticket API is integrated.
    const showParentField = ticketType !== "EPIC";

    return (
        <main className={styles.page}>

            {/* Page heading and primary action */}
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

            {/* Generic success notification */}
            <Notification
                type="success"
                message={successMessage}
            />

            {/* Create Ticket modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                labelledBy="create-ticket-title"
            >

                {/* Modal header */}
                <div className={styles.ticketHeader}>
                    <div>
                        <span className={styles.eyebrow}>
                            PRODUCT BACKLOG
                        </span>

                        <h2 id="create-ticket-title">
                            Create new ticket
                        </h2>

                        <p className={styles.subtitle}>
                            Add a new item to your product backlog.
                        </p>
                    </div>
                </div>

                {/* Ticket creation form */}
                <form
                    noValidate
                    onSubmit={handleSubmit}
                >
                    <div className={styles.formBody}>
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

                            {/* Estimate Points */}
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
                                        onChange={(event) =>
                                            setEstimatePoints(event.target.value)
                                        }
                                        aria-invalid={!!errors.estimatePoints}
                                        aria-describedby={
                                            errors.estimatePoints
                                                ? "estimate-error"
                                                : undefined
                                        }
                                    />

                                    {errors.estimatePoints && (
                                        <small
                                            id="estimate-error"
                                            className={styles.error}
                                        >
                                            {errors.estimatePoints}
                                        </small>
                                    )}

                                    <span>pts</span>
                                </div>
                            </div>

                            {/* Ticket Title */}
                            <div className={styles.formGroup}>
                                <label htmlFor="ticket-title">
                                    Ticket title <span>*</span>
                                </label>

                                <input
                                    id="ticket-title"
                                    type="text"
                                    placeholder="What needs to be done?"
                                    value={title}
                                    onChange={(event) =>
                                        setTitle(event.target.value)
                                    }
                                    aria-invalid={!!errors.title}
                                    aria-describedby={
                                        errors.title ? "title-error" : undefined
                                    }
                                />

                                {errors.title && (
                                    <small
                                        id="title-error"
                                        className={styles.error}
                                    >
                                        {errors.title}
                                    </small>
                                )}
                            </div>

                            {/* Parent Ticket */}
                            {showParentField && (
                                <div className={styles.formGroup}>
                                    <label htmlFor="ticket-parent">
                                        Parent ticket
                                    </label>

                                    <select
                                        id="ticket-parent"
                                        value={parent}
                                        onChange={(event) =>
                                            setParent(event.target.value)
                                        }
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

                            {/* Ticket Description */}
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
                                    onChange={(event) =>
                                        setDescription(event.target.value)
                                    }
                                    aria-invalid={!!errors.description}
                                    aria-describedby={
                                        errors.description
                                            ? "description-error"
                                            : undefined
                                    }
                                />

                                {errors.description && (
                                    <small
                                        id="description-error"
                                        className={styles.error}
                                    >
                                        {errors.description}
                                    </small>
                                )}
                            </div>

                        </div>
                    </div>

                    {/* Form footer */}
                    <div className={styles.ticketFooter}>

                        {/* Generic API error notification */}
                        <Notification
                            type="error"
                            message={apiError}
                        />

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleCloseModal}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Creating..." : "Create ticket"}
                        </Button>

                    </div>
                </form>

            </Modal>

        </main>
    );
}
