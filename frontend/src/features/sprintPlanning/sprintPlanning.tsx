import { useCallback, useEffect, useState } from "react";

import Button from "../../components/button/Button";
import type { Team } from "../productBacklog/productBacklogTypes";
import { BacklogItems } from "./components/backlogItems/backlogItems";
import { SprintSummary } from "./components/sprintSummary/sprintSummary";
import { SprintTasks } from "./components/sprintTasks/sprintTasks";
import { TeamCapacity } from "./components/teamCapacity/teamCapacity";
import { getSprintPlanningData } from "./sprintPlanningApi";
import type { PlannedTicket, SprintDraft } from "./sprintPlanningTypes";
import { createNextSprint } from "./sprintPlanningUtils";
import styles from "./sprintPlanning.module.css";

const initialSprints: SprintDraft[] = [
    { id: 3, name: "Sprint 3", startDate: "2026-11-02", endDate: "2026-11-15" },
    { id: 4, name: "Sprint 4", startDate: "2026-11-16", endDate: "2026-11-29" },
    { id: 5, name: "Sprint 5", startDate: "2026-11-30", endDate: "2026-12-13" },
    { id: 6, name: "Sprint 6", startDate: "2026-12-14", endDate: "2026-12-27" },
    { id: 7, name: "Sprint 7", startDate: "2026-12-28", endDate: "2027-01-10" },
];

const sampleTeams: Team[] = [
    { id: -1, name: "Platform", description: "", is_active: true, base_capacity_points: 37 },
    { id: -2, name: "Integration", description: "", is_active: true, base_capacity_points: 30 },
    { id: -3, name: "Data & Analytics", description: "", is_active: true, base_capacity_points: 32 },
    { id: -4, name: "QA", description: "", is_active: true, base_capacity_points: 24 },
    { id: -5, name: "Mobile", description: "", is_active: true, base_capacity_points: 36 },
];

export default function SprintPlanning() {
    const [tickets, setTickets] = useState<Awaited<ReturnType<typeof getSprintPlanningData>>["tickets"]>([]);
    const [teams, setTeams] = useState<Awaited<ReturnType<typeof getSprintPlanningData>>["teams"]>([]);
    const [sprints, setSprints] = useState<SprintDraft[]>(initialSprints);
    const [selectedSprintId, setSelectedSprintId] = useState(5);
    const [plannedBySprint, setPlannedBySprint] = useState<Record<number, PlannedTicket[]>>(
        Object.fromEntries(initialSprints.map((sprint) => [sprint.id, []]))
    );
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const loadPlanningData = useCallback(async () => {
        setIsLoading(true);
        setError("");
        try {
            const data = await getSprintPlanningData();
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

    useEffect(() => {
        void loadPlanningData();
    }, [loadPlanningData]);

    const sprint = sprints.find((item) => item.id === selectedSprintId) ?? initialSprints[2];
    const plannedTickets = plannedBySprint[selectedSprintId] ?? [];
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
    const teamCapacity = selectedTeam?.base_capacity_points ?? null;

    const updatePlannedTickets = (update: (current: PlannedTicket[]) => PlannedTicket[]) => {
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

    const handleCreateSprint = () => {
        const nextSprint = createNextSprint(sprints);
        setSprints((current) => [...current, nextSprint]);
        setPlannedBySprint((current) => ({ ...current, [nextSprint.id]: [] }));
        setSelectedSprintId(nextSprint.id);
    };

    return (
        <main className={styles.page}>
            <header className={styles.pageHeader}>
                <div>
                    <h1 className={styles.title}>Sprint Planning</h1>
                    <p className={styles.description}>
                        Shape your team&apos;s next sprint and balance the workload.
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <Button type="button" onClick={handleCreateSprint}>
                        + New sprint
                    </Button>
                    <div className={styles.sprintPicker}>
                        <label className={styles.visuallyHidden} htmlFor="sprint-select">
                            Select sprint
                        </label>
                        <select
                            id="sprint-select"
                            value={selectedSprintId}
                            onChange={(event) => setSelectedSprintId(Number(event.target.value))}
                        >
                            {sprints.map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.menuWrap}>
                        <button
                            type="button"
                            className={styles.moreButton}
                            onClick={() => setIsMenuOpen((open) => !open)}
                            aria-label="Sprint options"
                            aria-expanded={isMenuOpen}
                        >
                            ⋯
                        </button>
                        {isMenuOpen && (
                            <div className={styles.menu}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        updatePlannedTickets(() => []);
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    Clear draft tasks
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>
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

            {error && (
                <div className={styles.errorBanner} role="alert">
                    <span>{error}</span>
                    <Button type="button" variant="secondary" onClick={() => void loadPlanningData()}>
                        Retry
                    </Button>
                </div>
            )}

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
        </main>
    );
}
