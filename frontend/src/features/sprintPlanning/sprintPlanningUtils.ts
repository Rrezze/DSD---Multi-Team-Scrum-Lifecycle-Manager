import type { PlannedTicket, SprintDraft } from "./sprintPlanningTypes";

export function formatSprintDate(date: string) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
}

export function createNextSprint(sprints: SprintDraft[]): SprintDraft {
    const latestSprint = sprints.reduce((latest, sprint) =>
        sprint.endDate > latest.endDate ? sprint : latest
    );
    const start = new Date(`${latestSprint.endDate}T00:00:00`);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 13);
    const sprintNumber = Math.max(...sprints.map((sprint) => sprint.id)) + 1;
    const toDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    return {
        id: sprintNumber,
        name: `Sprint ${sprintNumber}`,
        startDate: toDateString(start),
        endDate: toDateString(end),
    };
}

export function plannedPoints(tickets: PlannedTicket[], teamId: number) {
    return tickets
        .filter((planned) => planned.teamId === teamId)
        .reduce((total, planned) => total + planned.ticket.estimate_points, 0);
}
