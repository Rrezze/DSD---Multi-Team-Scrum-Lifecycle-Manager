const API_ENDPOINTS = {
    TICKETS: "/api/tickets/",
    TICKETS_REORDER: "/api/tickets/reorder/",
    TICKET_DETAIL: (id: number) => `/api/tickets/${id}/`,
    TEAMS: "/api/teams/",
    USERS: "/api/users/",
    USER_DETAIL: (userId: number) => `/api/users/${userId}/`,
    USER_ABSENCES: (userId: number) => `/api/users/${userId}/absences/`,
    ABSENCE_DETAIL: (absenceId: number) => `/api/absences/${absenceId}/`,
};

export default API_ENDPOINTS;