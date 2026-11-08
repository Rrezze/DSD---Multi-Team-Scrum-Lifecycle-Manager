
/**
 * Product Backlog Page
 *
 * Responsible for displaying the Product Backlog page
 * and managing the Create Ticket form.
 *
 * Architecture:
 * - Shared Modal provides the modal container.
 * - Shared Button provides reusable button styling.
 * - productBacklogApi handles backend communication.
 * - productBacklogTypes provides feature-specific TypeScript types.
 *
 * All ticket form JSX, state management and validation
 * are maintained within this feature page.
 */

import { useState } from "react";

import styles from "./productBacklog.module.css";

import Modal from "../../components/modal/Modal";
import Button from "../../components/button/Button";

import { createTicket } from "./productBacklogApi";

import type {
    TicketType,
    CreateTicketPayload,
    TicketFormErrors,
} from "./productBacklogTypes";

export default function ProductBacklog() {

    // Controls the visibility of the Create Ticket modal.
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Displays a confirmation message after successful ticket creation.
    const [successMessage, setSuccessMessage] = useState("");

    // Stores the values entered into the ticket form.
    const [ticketType, setTicketType] = useState<TicketType>("STORY");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [estimatePoints, setEstimatePoints] = useState("");
    const [parent, setParent] = useState("");

    // Stores validation errors for individual form fields.
    const [errors, setErrors] = useState<TicketFormErrors>({});

    // Controls the submission state of the form.
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Stores errors returned during ticket creation.
    const [apiError, setApiError] = useState("");

    /**
     * Opens the Create Ticket modal.
     */
    const handleOpenModal = () => {
        setSuccessMessage("");
        setApiError("");
        setIsModalOpen(true);
    };

    /**
     * Closes the Create Ticket modal.
     */
    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    /**
     * Resets all form fields and validation messages.
     *
     * Called after a ticket has been created successfully.
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
     * Validates the ticket form before submission.
     *
     * Validation rules:
     * - Ticket title is required.
     * - Description is required.
     * - Estimate points must be a positive whole number.
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
     * Handles the Create Ticket form submission.
     *
     * Validates the form, prepares the ticket payload,
     * and calls the Product Backlog API service.
     *
     * On success:
     * - Displays a success message.
     * - Closes the modal.
     * - Resets the form.
     *
     * On failure:
     * - Displays an error message.
     * - Preserves the entered form values for correction or retry.
     */
    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        setApiError("");

        // Validate the form before communicating with the backend.
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Prepare the ticket data according to the backend API contract.
            const ticketData: CreateTicketPayload = {
                type: ticketType,
                title: title.trim(),
                description: description.trim(),
                estimate_points: Number(estimatePoints),
            };

            // Create the ticket using the feature-specific API service.
            await createTicket(ticketData);

            // Notify the user that the ticket was created successfully.
            setSuccessMessage("Ticket created successfully!");

            // Close the modal and reset the form after success.
            setIsModalOpen(false);
            resetForm();

        } catch (error) {
            // Display a readable error without losing the entered form data.
            setApiError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong while creating the ticket."
            );

        } finally {
            // Re-enable form submission after the request completes.
            setIsSubmitting(false);
        }
    };

    // Parent selection is currently unavailable because the parent-ticket
    // listing API has not yet been integrated.
    const showParentField = ticketType !== "EPIC";

    return (
        <main className={styles.page}>

            {/* Product Backlog page heading and primary action */}
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

            {/* Displays a success message after ticket creation */}
            {successMessage && (
                <p
                    role="status"
                    className={styles.successMessage}
                >
                    {successMessage}
                </p>
            )}

            {/* Shared Modal containing the Product Backlog ticket form */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            >

                {/* Ticket form header */}
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
                                    />

                                    {errors.estimatePoints && (
                                        <small className={styles.error}>
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
                                />

                                {errors.title && (
                                    <small className={styles.error}>
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
                                />

                                {errors.description && (
                                    <small className={styles.error}>
                                        {errors.description}
                                    </small>
                                )}
                            </div>

                        </div>
                    </div>

                    {/* Form footer and submission actions */}
                    <div className={styles.ticketFooter}>

                        {/* Displays errors returned by the API */}
                        {apiError && (
                            <p
                                role="alert"
                                className={styles.apiError}
                            >
                                {apiError}
                            </p>
                        )}

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
