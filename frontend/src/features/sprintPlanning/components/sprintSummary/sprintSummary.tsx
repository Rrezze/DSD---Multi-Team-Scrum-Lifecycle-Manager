import type { PlanningTeam, SprintDraft } from "../../sprintPlanningTypes";
import {
    formatSprintDate,
    getSprintDurationDays,
    getSprintStatus,
} from "../../sprintPlanningUtils";
import styles from "./sprintSummary.module.css";

interface SprintSummaryProps {
    sprint: SprintDraft;
    teams: PlanningTeam[];
    selectedTeamId: number | null;
    selectedTeamPoints: number;
    teamCapacity: number | null;
    onTeamChange: (teamId: number | null) => void;
}

export function SprintSummary({
    sprint,
    teams,
    selectedTeamId,
    selectedTeamPoints,
    teamCapacity,
    onTeamChange,
}: SprintSummaryProps) {
    const workloadPercent = teamCapacity
        ? Math.min((selectedTeamPoints / teamCapacity) * 100, 100)
        : 0;
    const sprintDuration = getSprintDurationDays(sprint);
    const durationLabel = sprintDuration % 7 === 0
        ? `${sprintDuration / 7} ${sprintDuration / 7 === 1 ? "week" : "weeks"}`
        : `${sprintDuration} days`;
    const sprintStatus = getSprintStatus(sprint);

    return (
        <section className={styles.summary} aria-label="Sprint details">
            <div className={styles.sprintDates}>
                <span className={styles.calendarIcon} aria-hidden="true">▦</span>
                <div>
                    <strong>
                        {formatSprintDate(sprint.startDate)} – {formatSprintDate(sprint.endDate)}
                    </strong>
                    <span>{durationLabel} · {sprintStatus}</span>
                </div>
            </div>
            <div className={styles.workload}>
                <div className={styles.summaryLabel}>
                    <span>Team workload</span>
                    <strong>{selectedTeamPoints} / {teamCapacity ?? "—"} pts</strong>
                </div>
                <div
                    className={styles.progressTrack}
                    role="progressbar"
                    aria-label="Selected team planned workload"
                    aria-valuemin={0}
                    aria-valuemax={teamCapacity ?? Math.max(selectedTeamPoints, 1)}
                    aria-valuenow={selectedTeamPoints}
                >
                    <span style={{ width: `${workloadPercent}%` }} />
                </div>
            </div>
            <div className={styles.teamSelect}>
                <label htmlFor="team-select">Planning team</label>
                <select
                    id="team-select"
                    value={selectedTeamId ?? ""}
                    onChange={(event) => onTeamChange(
                        event.target.value ? Number(event.target.value) : null
                    )}
                >
                    <option value="">Select a team</option>
                    {teams.map((team) => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                </select>
            </div>
        </section>
    );
}
