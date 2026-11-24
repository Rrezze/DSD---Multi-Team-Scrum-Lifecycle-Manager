const API_ENDPOINTS = {
    LOGIN: "/api/auth/login/",
    TICKETS: "/api/tickets/",
    TICKETS_REORDER: "/api/tickets/reorder/",
    TICKET_DETAIL: (id: number) => `/api/tickets/${id}/`,
    TEAMS: "/api/teams/",

};

export default API_ENDPOINTS;