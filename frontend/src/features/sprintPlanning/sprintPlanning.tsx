import { useCallback, useEffect, useState } from "react";

import Button from "../../components/button/Button";
import Modal from "../../components/modal/Modal";
import Notification from "../../components/notification/notification";
import { BacklogItems } from "./components/backlogItems/backlogItems";
import { SprintSummary } from "./components/sprintSummary/sprintSummary";
import { SprintTasks } from "./components/sprintTasks/sprintTasks";
import { TeamCapacity } from "./components/teamCapacity/teamCapacity";
import SprintForm from "./components/sprintForm/sprintForm";
import {
    createSprint,
    deleteSprint,
    getSprintPlanningData,
    getSprints,
    updateSprint,
} from "./sprintPlanningApi";
import type { PlannedTicket, PlanningTeam, SprintDraft } from "./sprintPlanningTypes";
import type { SprintPayload } from "./sprintPlanningTypes";
import {
    formatSprintDate,
    getTodayDateInputValue,
    toSprintDraft,
} from "./sprintPlanningUtils";
import styles from "./sprintPlanning.module.css";

const sampleTeams: PlanningTeam[] = [
    { id: -1, name: "Platform", description: "", is_active: true, capacity_points: 37 },
    { id: -2, name: "Integration", description: "", is_active: true, capacity_points: 30 },
    { id: -3, name: "Data & Analytics", description: "", is_active: true, capacity_points: 32 },
    { id: -4, name: "QA", description: "", is_active: true, capacity_points: 24 },
    { id: -5, name: "Mobile", description: "", is_active: true, capacity_points: 36 },
];

export default function SprintPlanning() {
    const [tickets, setTickets] = useState<Awaited<ReturnType<typeof getSprintPlanningData>>["tickets"]>([]);
    const [teams, setTeams] = useState<Awaited<ReturnType<typeof getSprintPlanningData>>["teams"]>([]);
    const [sprints, setSprints] = useState<SprintDraft[]>([]);
    const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);
    const [plannedBySprint, setPlannedBySprint] = useState<Record<number, PlannedTicket[]>>({});
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSprintsLoading, setIsSprintsLoading] = useState(true);
    const [error, setError] = useState("");
    const [notification, setNotification] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSprint, setEditingSprint] = useState<SprintDraft | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const loadPlanningData = useCallback(async (sprintId: number) => {
        setIsLoading(true);
        setError("");
        try {
            const data = await getSprintPlanningData(sprintId);
            setTickets(data.tickets);
            setTeams(data.teams);
            setSelectedTeamId((current) =>
                current
                    ?? data.teams.find((team) => team.is_active)?.id
                    ?? (data.teams.length === 0 ? sampleTeams[0].id : null)
            );
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : "Failed to load sprint planning data."
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadSprints = useCallback(async () => {
        setIsSprintsLoading(true);
        setError("");
        try {
            const apiSprints = await getSprints();
            const loadedSprints = apiSprints.map(toSprintDraft);
            setSprints(loadedSprints);
            setSelectedSprintId((current) =>
                loadedSprints.some((item) => item.id === current)
                    ? current
                    : loadedSprints[0]?.id ?? null
            );
            setIsLoading(false);
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : "Failed to load sprints."
            );
            setIsLoading(false);
        } finally {
            setIsSprintsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadSprints();
    }, [loadSprints]);

    useEffect(() => {
        if (selectedSprintId === null) return;
        void loadPlanningData(selectedSprintId);
    }, [loadPlanningData, selectedSprintId]);

    const sprint = sprints.find((item) => item.id === selectedSprintId) ?? null;
    const plannedTickets = selectedSprintId === null ? [] : plannedBySprint[selectedSprintId] ?? [];
    const usingSampleTeams = teams.length === 0 && !isLoading;
    const availableTeams = usingSampleTeams ? sampleTeams : teams;
    const activeTeams = availableTeams.filter((team) => team.is_active);
    const visiblePlannedTickets = selectedTeamId === null
        ? plannedTickets
        : plannedTickets.filter((planned) => planned.teamId === selectedTeamId);
    const plannedTicketIds = new Set(plannedTickets.map(({ ticket }) => ticket.id));
    const selectedTeam = availableTeams.find((team) => team.id === selectedTeamId);
    const backlogTickets = tickets.filter((ticket) => {
        if (plannedTicketIds.has(ticket.id)) return false;
        const searchTerm = search.trim().toLowerCase();
        return !searchTerm
            || ticket.title.toLowerCase().includes(searchTerm)
            || ticket.description.toLowerCase().includes(searchTerm);
    });
    const selectedTeamPoints = selectedTeamId === null
        ? 0
        : plannedTickets
            .filter((planned) => planned.teamId === selectedTeamId)
            .reduce((total, planned) => total + planned.ticket.estimate_points, 0);
    const teamCapacity = selectedTeam?.capacity_points ?? null;
    const canDeleteSprint = sprint !== null
        && sprint.startDate > getTodayDateInputValue();

    const updatePlannedTickets = (update: (current: PlannedTicket[]) => PlannedTicket[]) => {
        if (selectedSprintId === null) return;
        setPlannedBySprint((current) => ({
            ...current,
            [selectedSprintId]: update(current[selectedSprintId] ?? []),
        }));
    };

    const addTicket = (ticket: (typeof tickets)[number]) => {
        updatePlannedTickets((current) =>
            current.some((item) => item.ticket.id === ticket.id)
                ? current
                : [...current, { ticket, teamId: selectedTeamId }]
        );
    };

    const addTicketById = (ticketId: number) => {
        const ticket = tickets.find((item) => item.id === ticketId);
        if (!ticket) return false;
        addTicket(ticket);
        return true;
    };

    const removeTicket = (ticketId: number) => {
        updatePlannedTickets((current) =>
            current.filter((item) => item.ticket.id !== ticketId)
        );
    };

    const openCreateForm = () => {
        setNotification(null);
        setEditingSprint(null);
        setIsFormOpen(true);
        setIsMenuOpen(false);
    };

    const openEditForm = () => {
        setNotification(null);
        setEditingSprint(sprint);
        setIsFormOpen(true);
        setIsMenuOpen(false);
    };

    const handleSubmitSprint = async (payload: SprintPayload) => {
        try {
            if (editingSprint) {
                const updated = await updateSprint(editingSprint.id, payload);
                const updatedSprint = toSprintDraft(updated);
                setSprints((current) =>
                    current
                        .map((item) => item.id === updatedSprint.id ? updatedSprint : item)
                        .sort((a, b) => a.startDate.localeCompare(b.startDate))
                );
                setSelectedSprintId(updatedSprint.id);
                setNotification({
                    type: "success",
                    message: "Sprint updated successfully.",
                });
                return;
            }

            const created = await createSprint(payload);
            const createdSprint = toSprintDraft(created);
            setSprints((current) =>
                [...current, createdSprint].sort((a, b) => a.startDate.localeCompare(b.startDate))
            );
            setPlannedBySprint((current) => ({ ...current, [createdSprint.id]: [] }));
            setSelectedSprintId(createdSprint.id);
            setNotification({
                type: "success",
                message: "Sprint created successfully.",
            });
        } catch (submitError) {
            setNotification({
                type: "error",
                message: submitError instanceof Error
                    ? submitError.message
                    : "Unable to save the sprint.",
            });
            throw submitError;
        }
    };

    const handleDeleteSprint = async () => {
        if (isDeleting || selectedSprintId === null) return;
        setIsDeleting(true);
        setDeleteError("");
        setNotification(null);
        try {
            await deleteSprint(selectedSprintId);
            const remaining = sprints.filter((item) => item.id !== selectedSprintId);
            setSprints(remaining);
            setPlannedBySprint((current) => {
                const next = { ...current };
                delete next[selectedSprintId];
                return next;
            });
            setSelectedSprintId(remaining[0]?.id ?? null);
            setIsDeleteOpen(false);
            setNotification({
                type: "success",
                message: "Sprint deleted successfully.",
            });
        } catch (deleteFailure) {
            const message = deleteFailure instanceof Error
                ? deleteFailure.message
                : "Failed to delete the sprint.";
            setDeleteError(message);
            setNotification({ type: "error", message });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <main className={styles.page}>
            {notification && (
                <Notification
                    key={`${notification.type}-${notification.message}`}
                    type={notification.type}
                    message={notification.message}
                />
            )}
            <header className={styles.pageHeader}>
                <div>
                    <h1 className={styles.title}>Sprint Planning</h1>
                    <p className={styles.description}>
                        Shape your team&apos;s next sprint and balance the workload.
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <Button type="button" onClick={openCreateForm}>
                        + New sprint
                    </Button>
                    <div className={styles.sprintPicker}>
                        <label className={styles.visuallyHidden} htmlFor="sprint-select">
                            Select sprint
                        </label>
                        <select
                            id="sprint-select"
                            value={selectedSprintId ?? ""}
                            disabled={isSprintsLoading || sprints.length === 0}
                            onChange={(event) => setSelectedSprintId(Number(event.target.value))}
                        >
                            {sprints.length === 0 && <option value="">No sprints available</option>}
                            {sprints.map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                    </div>
                    {sprint && (
                        <div className={styles.menuWrap}>
                            <button
                                type="button"
                                className={styles.moreButton}
                                onClick={() => setIsMenuOpen((open) => !open)}
                                aria-label="Sprint options"
                                aria-expanded={isMenuOpen}
                                aria-haspopup="true"
                            >
                                <span aria-hidden="true">•••</span>
                            </button>
                            {isMenuOpen && (
                                <div className={styles.actionMenu}>
                                    <button
                                        type="button"
                                        className={styles.iconAction}
                                        onClick={openEditForm}
                                        aria-label="Edit sprint"
                                        title="Edit sprint"
                                    >
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.9"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            aria-hidden="true"
                                        >
                                            <path d="M12 20h9" />
                                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                                        </svg>
                                    </button>
                                    {canDeleteSprint && (
                                        <button
                                            type="button"
                                            className={`${styles.iconAction} ${styles.deleteAction}`}
                                            onClick={() => {
                                                setDeleteError("");
                                                setNotification(null);
                                                setIsDeleteOpen(true);
                                                setIsMenuOpen(false);
                                            }}
                                            aria-label="Delete sprint"
                                            title="Delete sprint"
                                        >
                                            <svg
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.9"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                aria-hidden="true"
                                            >
                                                <path d="M3 6h18" />
                                                <path d="M8 6V4h8v2" />
                                                <path d="m19 6-1 14H6L5 6" />
                                                <path d="M10 11v5M14 11v5" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </header>
            {error && (
                <div className={styles.errorBanner} role="alert">
                    <span>{error}</span>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => selectedSprintId === null
                            ? void loadSprints()
                            : void loadPlanningData(selectedSprintId)}
                    >
                        Retry
                    </Button>
                </div>
            )}

            {sprint ? (
                <>
                    <SprintSummary
                        sprint={sprint}
                        teams={activeTeams}
                        selectedTeamId={selectedTeamId}
                        selectedTeamPoints={selectedTeamPoints}
                        teamCapacity={teamCapacity}
                        onTeamChange={setSelectedTeamId}
                    />
                    <TeamCapacity
                        teams={activeTeams}
                        plannedTickets={plannedTickets}
                        selectedTeamId={selectedTeamId}
                        usingSampleTeams={usingSampleTeams}
                        onTeamSelect={setSelectedTeamId}
                    />
                    <div className={styles.planningGrid}>
                        <SprintTasks
                            key={selectedSprintId}
                            sprintName={sprint.name}
                            teamName={selectedTeam?.name ?? "Select a team"}
                            tickets={visiblePlannedTickets}
                            teams={availableTeams}
                            isLoading={isLoading}
                            onRemoveTicket={removeTicket}
                            onDropTicket={addTicketById}
                        />
                        <BacklogItems
                            tickets={backlogTickets}
                            teams={availableTeams}
                            search={search}
                            isLoading={isLoading}
                            onSearchChange={setSearch}
                            onAddTicket={addTicket}
                            onDropTicket={removeTicket}
                        />
                    </div>
                </>
            ) : (
                <p className={styles.emptyState}>
                    {isSprintsLoading ? "Loading sprints..." : "No sprints yet. Create a sprint to start planning."}
                </p>
            )}

            <SprintForm
                key={editingSprint?.id ?? "create-sprint"}
                isOpen={isFormOpen}
                sprint={editingSprint}
                sprints={sprints}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleSubmitSprint}
            />

            <Modal
                isOpen={isDeleteOpen && sprint !== null}
                onClose={() => {
                    if (!isDeleting) setIsDeleteOpen(false);
                }}
                labelledBy="delete-sprint-title"
            >
                <div className={styles.deleteDialog}>
                    <header className={styles.deleteHeader}>
                        <p className={styles.deleteEyebrow}>SPRINT PLANNING</p>
                        <h2 id="delete-sprint-title">Delete {sprint?.name}?</h2>
                    </header>
                    <p className={styles.deleteText}>
                        {sprint && (
                            <>
                                {sprint.name} ({formatSprintDate(sprint.startDate)} –{" "}
                                {formatSprintDate(sprint.endDate)}) has not started yet.
                                <br />
                                Its {plannedTickets.length} planned{" "}
                                {plannedTickets.length === 1 ? "ticket" : "tickets"} from all teams
                                will go back to the product backlog.
                                <br />
                                The sprint will be removed for all teams.
                            </>
                        )}
                    </p>
                    {deleteError && (
                        <p className={styles.deleteError} role="alert">{deleteError}</p>
                    )}
                    <footer className={styles.deleteActions}>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={isDeleting}
                            onClick={() => setIsDeleteOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            disabled={isDeleting}
                            onClick={() => void handleDeleteSprint()}
                        >
                            {isDeleting ? "Deleting..." : "Delete sprint"}
                        </Button>
                    </footer>
                </div>
            </Modal>
        </main>
    );
}
