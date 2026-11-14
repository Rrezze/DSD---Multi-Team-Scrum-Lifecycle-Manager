import { useState, type FormEvent } from "react";

import Button from "../../../../components/button/Button";
import Modal from "../../../../components/modal/Modal";
import Notification from "../../../../components/notification/notification";
import { createTicket } from "../../productBacklogApi";
import type {
    CreateTicketPayload,
    TicketFormErrors,
    TicketType,
} from "../../productBacklogTypes";
import styles from "./createTicket.module.css";

interface CreateTicketProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateTicket({
    isOpen,
    onClose,
    onSuccess,
}: CreateTicketProps) {
    const [ticketType, setTicketType] = useState<TicketType>("STORY");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [estimatePoints, setEstimatePoints] = useState("");
    const [parent, setParent] = useState("");
    const [errors, setErrors] = useState<TicketFormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState("");

    const resetForm = () => {
        setTicketType("STORY");
        setTitle("");
        setDescription("");
        setEstimatePoints("");
        setParent("");
        setErrors({});
        setApiError("");
    };

    const handleCloseModal = () => {
        if (isSubmitting) return;

        resetForm();
        onClose();
    };

    const validateForm = (): boolean => {
        const newErrors: TicketFormErrors = {};

        if (!title.trim()) {
            newErrors.title = "Ticket title is required.";
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

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        setApiError("");

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const ticketData: CreateTicketPayload = {
                type: ticketType,
                title: title.trim(),
                description: description.trim(),
                estimate_points: Number(estimatePoints),
                parent: parent ? Number(parent) : null,
            };

            await createTicket(ticketData);
            resetForm();
            onSuccess();
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

    const showParentField = ticketType !== "EPIC";

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleCloseModal}
            labelledBy="create-ticket-title"
        >
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

            <form noValidate onSubmit={handleSubmit}>
                <div className={styles.formBody}>
                    <div className={styles.formGrid}>
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

                        <div
                            className={`${styles.formGroup} ${styles.fullWidth}`}
                        >
                            <label htmlFor="ticket-description">
                                Description
                            </label>

                            <textarea
                                id="ticket-description"
                                rows={5}
                                placeholder="Describe the work, requirements and acceptance criteria..."
                                value={description}
                                onChange={(event) =>
                                    setDescription(event.target.value)
                                }
                            />                            
                        </div>
                    </div>
                </div>

                <div className={styles.ticketFooter}>                   

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
                <Notification
                    type="error"
                    message={apiError}
                />
            </form>
        </Modal>
    );
}