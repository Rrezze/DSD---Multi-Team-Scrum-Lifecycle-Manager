
import { useEffect, useState, type FormEvent } from "react";

import Button from "../../../../components/button/Button";
import Modal from "../../../../components/modal/Modal";

import { getTeams, updateTicket } from "../../productBacklogApi";

import type {
    BacklogTicket,
    UpdateTicketPayload,
    TicketFormErrors,
    TicketType,
    Team,
} from "../../productBacklogTypes";

import styles from "./editTicket.module.css";

interface EditTicketProps {
    ticket: BacklogTicket | null;
    tickets: BacklogTicket[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditTicket({
    ticket,
    tickets,
    onClose,
    onSuccess,
}: EditTicketProps) {

    // 1. State declarations
    const [ticketType, setTicketType] = useState<TicketType>("STORY");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [estimatePoints, setEstimatePoints] = useState("");
    const [status, setStatus] = useState("TODO");
    const [parent, setParent] = useState("");
    const [errors, setErrors] = useState<TicketFormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState("");
    const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
    const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);
    const [isLoadingTeams, setIsLoadingTeams] = useState(false);
    const [teamsError, setTeamsError] = useState("");

    // 2. Populate the form when a ticket is selected
    useEffect(() => {
        if (!ticket) return;

        setTicketType(ticket.type);
        setTitle(ticket.title);
        setDescription(ticket.description ?? "");
        setEstimatePoints(
            ticket.estimate_points !== null
                ? String(ticket.estimate_points)
                : ""
        );
        setStatus(ticket.status);
        setSelectedTeamIds(ticket.teams ?? []);
        setParent(
            ticket.parent !== null ? String(ticket.parent) : ""
        );

        setErrors({});
        setApiError("");
    }, [ticket]);

    // Fetch available teams when the Edit Ticket component loads.
    useEffect(() => {
    let isMounted = true;

    const fetchTeams = async () => {
        try {
            setIsLoadingTeams(true);
            setTeamsError("");

            const data = await getTeams();

            if (isMounted) {
                setAvailableTeams(data);
            }
        } catch (error) {
            if (isMounted) {
                setTeamsError(
                    error instanceof Error
                        ? error.message
                        : "Unable to load teams."
                );
            }
        } finally {
            if (isMounted) {
                setIsLoadingTeams(false);
            }
        }
    };

    void fetchTeams();

    return () => {
        isMounted = false;
    };
}, []);

    // 3. Parent ticket filtering
    const showParentField = ticketType !== "EPIC";

    const allowedParentTypes: TicketType[] =
        ticketType === "STORY"
            ? ["EPIC"]
            : ticketType === "TASK" || ticketType === "BUG"
                ? ["EPIC", "STORY"]
                : [];

    const availableParentTickets = tickets.filter(
        (availableTicket) =>
            availableTicket.id !== ticket?.id &&
            allowedParentTypes.includes(availableTicket.type)
    );

    // 4. Handle ticket type changes
    const handleTicketTypeChange = (newType: TicketType) => {
        setTicketType(newType);

        const selectedParent = tickets.find(
            (availableTicket) =>
                availableTicket.id === Number(parent)
        );

        const allowedTypes: TicketType[] =
            newType === "STORY"
                ? ["EPIC"]
                : newType === "TASK" || newType === "BUG"
                    ? ["EPIC", "STORY"]
                    : [];

        if (
            newType === "EPIC" ||
            (parent &&
                (!selectedParent ||
                    !allowedTypes.includes(selectedParent.type)))
        ) {
            setParent("");
        }
    };

    // 5. Validate the form
    const validateForm = (): boolean => {
        const newErrors: TicketFormErrors = {};

        if (!title.trim()) {
            newErrors.title = "Title is required.";
        }

        const estimate = Number(estimatePoints);

        if (
            !estimatePoints.trim() ||
            !Number.isInteger(estimate) ||
            estimate <= 0
        ) {
            newErrors.estimatePoints =
                "Estimate must be a positive whole number.";
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    // 6. Submit updated ticket
    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (!ticket || !validateForm()) {
            return;
        }

        const payload: UpdateTicketPayload = {
            type: ticketType,
            title: title.trim(),
            description: description.trim(),
            estimate_points: Number(estimatePoints),
            status,
            parent: parent ? Number(parent) : null,
            teams: selectedTeamIds,

        };

        try {
            setIsSubmitting(true);
            setApiError("");

            await updateTicket(ticket.id, payload);

            onSuccess();
            onClose();
        } catch (error) {
            setApiError(
                error instanceof Error
                    ? error.message
                    : "Unable to update the ticket."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // 7. Render Edit Ticket form
    return (
        <Modal
            isOpen={ticket !== null}
            onClose={onClose}
            labelledBy="edit-ticket-title"
        >
            {ticket && (
                <div className={styles.container}>
                    <div className={styles.header}>
                        <p className={styles.eyebrow}>
                            PRODUCT BACKLOG
                        </p>

                        <h2 id="edit-ticket-title">
                            Edit Ticket
                        </h2>

                        <p>Update the details of this ticket.</p>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className={styles.formBody}
                    >
                        <div className={styles.formGrid}>

                            {/* Title */}
                            <div className={`${styles.formGroup}`}>
                                <label htmlFor="edit-title">
                                    Title *
                                </label>

                                <input
                                    id="edit-title"
                                    type="text"
                                    value={title}
                                    onChange={(e) =>
                                        setTitle(e.target.value)
                                    }
                                    placeholder="Enter ticket title"
                                />

                                {errors.title && (
                                    <span className={styles.error}>
                                        {errors.title}
                                    </span>
                                )}
                            </div>

                            {/* Ticket Type */}
                            <div className={styles.formGroup}>
                                <label htmlFor="edit-type">
                                    Ticket Type
                                </label>

                                <select
                                    id="edit-type"
                                    value={ticketType}
                                    onChange={(e) =>
                                        handleTicketTypeChange(
                                            e.target.value as TicketType
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
                                <label htmlFor="edit-estimate">
                                    Estimate Points *
                                </label>

                                <input
                                    id="edit-estimate"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={estimatePoints}
                                    onChange={(e) =>
                                        setEstimatePoints(e.target.value)
                                    }
                                    placeholder="e.g. 5"
                                />

                                {errors.estimatePoints && (
                                    <span className={styles.error}>
                                        {errors.estimatePoints}
                                    </span>
                                )}
                            </div>

                            {/* Description */}
                            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                <label htmlFor="edit-description">
                                    Description
                                </label>

                                <textarea
                                    id="edit-description"
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    placeholder="Describe the ticket..."
                                    rows={4}
                                />
                            </div>

                            {/* Status */}
                            <div className={styles.formGroup}>
                                <label htmlFor="edit-status">
                                    Status
                                </label>

                                <select
                                    id="edit-status"
                                    value={status}
                                    onChange={(e) =>
                                        setStatus(e.target.value)
                                    }
                                >
                                    <option value="TODO">To Do</option>
                                    <option value="IN_PROGRESS">
                                        In Progress
                                    </option>
                                    <option value="WAITING_FOR_QA">
                                        Waiting for QA
                                    </option>
                                    <option value="IN_QA">In QA</option>
                                    <option value="DONE">Done</option>
                                </select>
                            </div>

                            {/* Parent Ticket */}
                            {showParentField && (
                                <div className={styles.formGroup}>
                                    <label htmlFor="edit-parent">
                                        Parent Ticket
                                    </label>

                                    <select
                                        id="edit-parent"
                                        value={parent}
                                        onChange={(e) =>
                                            setParent(e.target.value)
                                        }
                                    >
                                        <option value="">
                                            No parent selected
                                        </option>

                                        {availableParentTickets.map(
                                            (parentTicket) => (
                                                <option
                                                    key={parentTicket.id}
                                                    value={parentTicket.id}
                                                >
                                                    {parentTicket.title} (
                                                    #{parentTicket.id} -{" "}
                                                    {parentTicket.type})
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>
                                )}
                            {/* Assigned Teams - Multiple Team Selection */}
                            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                <label>Assigned Teams</label>

                                {isLoadingTeams ? (
                                    <p>Loading teams...</p>
                                ) : teamsError ? (
                                    <p role="alert" className={styles.error}>
                                        {teamsError}
                                    </p>
                                ) : availableTeams.length === 0 ? (
                                    <p className={styles.noTeams}>
                                        No teams available.
                                    </p>
                                ) : (
                                    <div className={styles.teamList}>
                                        {availableTeams.map((team) => {
                                            const isSelected = selectedTeamIds.includes(team.id);

                                            // An inactive team can remain assigned,
                                            // but cannot be newly selected.
                                            const isDisabled = !team.is_active && !isSelected;

                                            return (
                                                <label
                                                    key={team.id}
                                                    className={styles.teamBadge}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        disabled={isDisabled}
                                                        onChange={(e) => {
                                                            setSelectedTeamIds((currentTeams) =>
                                                                e.target.checked
                                                                    ? [...currentTeams, team.id]
                                                                    : currentTeams.filter(
                                                                        (id) => id !== team.id
                                                                    )
                                                            );
                                                        }}
                                                    />

                                                    <span>{team.name}</span>

                                                    {!team.is_active && (
                                                        <span>(Inactive)</span>
                                                    )}
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* API Error */}
                        {apiError && (
                            <div className={styles.apiError}>
                                {apiError}
                            </div>
                        )}

                        {/* Form Actions */}
                        <div className={styles.ticketFooter}>
                            <Button
                                type="button"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting
                                    ? "Saving..."
                                    : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </Modal>
    );
}
