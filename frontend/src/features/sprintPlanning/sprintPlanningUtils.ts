import type { PlannedTicket, SprintDraft } from "./sprintPlanningTypes";
import type { ApiSprint } from "./sprintPlanningTypes";

export function formatSprintDate(date: string) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
}

export function toSprintDraft(sprint: ApiSprint): SprintDraft {
    return {
        id: sprint.id,
        name: sprint.name,
        startDate: sprint.start_date,
        endDate: sprint.end_date,
        goal: sprint.goal,
    };
}

export function toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function getTodayDateInputValue(): string {
    return toDateInputValue(new Date());
}

export function addCalendarDays(date: string, days: number): string {
    const result = new Date(`${date}T00:00:00`);
    result.setDate(result.getDate() + days);
    return toDateInputValue(result);
}

export function getSprintDurationDays(sprint: SprintDraft): number {
    const start = new Date(`${sprint.startDate}T00:00:00`);
    const end = new Date(`${sprint.endDate}T00:00:00`);
    return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function getSprintStatus(
    sprint: Pick<SprintDraft, "startDate" | "endDate">,
    today = getTodayDateInputValue()
): "Planning" | "Active" | "Finished" {
    if (today < sprint.startDate) return "Planning";
    if (today <= sprint.endDate) return "Active";
    return "Finished";
}

export function plannedPoints(tickets: PlannedTicket[], teamId: number) {
    return tickets
        .filter((planned) => planned.teamId === teamId)
        .reduce((total, planned) => total + planned.ticket.estimate_points, 0);
}
