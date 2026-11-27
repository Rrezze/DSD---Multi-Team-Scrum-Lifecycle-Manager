import type { PlannedTicket, PlanningTeam } from "../../sprintPlanningTypes";
import { plannedPoints } from "../../sprintPlanningUtils";
import styles from "./teamCapacity.module.css";

interface TeamCapacityProps {
    teams: PlanningTeam[];
    plannedTickets: PlannedTicket[];
    selectedTeamId: number | null;
    usingSampleTeams: boolean;
    onTeamSelect: (teamId: number) => void;
}

export function TeamCapacity({
    teams,
    plannedTickets,
    selectedTeamId,
    usingSampleTeams,
    onTeamSelect,
}: TeamCapacityProps) {
    return (
        <section className={styles.section} aria-labelledby="capacity-heading">
            <div className={styles.sectionHeading}>
                <div>
                    <h2 id="capacity-heading">Team capacity</h2>
                    <p>
                        {usingSampleTeams
                            ? "Sample team capacities for planning"
                            : "Planned points compared with each team’s capacity"}
                    </p>
                </div>
                <span className={styles.legend}>PLANNED / AVAILABLE</span>
            </div>
            <div className={styles.capacityList}>
                {teams.length ? teams.map((team) => {
                    const points = plannedPoints(plannedTickets, team.id);
                    const capacity = team.capacity_points;
                    const percent = capacity
                        ? Math.min((points / capacity) * 100, 100)
                        : 0;
                    const overCapacity = capacity !== null && points > capacity;

                    return (
                        <button
                            type="button"
                            key={team.id}
                            className={`${styles.capacityCard} ${selectedTeamId === team.id ? styles.selectedCapacity : ""}`}
                            onClick={() => onTeamSelect(team.id)}
                            aria-pressed={selectedTeamId === team.id}
                        >
                            <span className={styles.capacityCardHeading}>
                                <strong>{team.name}</strong>
                                <span className={overCapacity ? styles.overCapacity : ""}>
                                    {points} / {capacity ?? "—"}
                                </span>
                            </span>
                            <span className={styles.capacityTrack}>
                                <span
                                    className={overCapacity ? styles.overCapacityBar : ""}
                                    style={{ width: `${percent}%` }}
                                />
                            </span>
                            <span className={styles.capacityFoot}>
                                {capacity === null
                                    ? "Capacity not set"
                                    : overCapacity
                                        ? `${points - capacity} pts over capacity`
                                        : `${capacity - points} pts available`}
                            </span>
                        </button>
                    );
                }) : (
                    <p className={styles.emptyState}>
                        No active teams yet. Add a team to see planned and available points.
                    </p>
                )}
            </div>
        </section>
    );
}
