
/**
 * Teams feature - Mock Data
 *
 * Temporary sample data for developing the Teams Overview UI.
 * This data will later be replaced with information from the backend API.
 */

import type { User } from "../../types/userTypes";
import type { Team } from "./teamsTypes";

/**
 * Sample developers available in the application.
 */
export const mockUsers: User[] = [
    { id: 1, name: "Maya Chen", email: "maya.chen@example.com", role: "Senior Engineer" },
    { id: 2, name: "Owen Brooks", email: "owen.brooks@example.com", role: "Backend Engineer" },
    { id: 3, name: "Emma Rivera", email: "emma.rivera@example.com", role: "Full Stack Engineer" },
    { id: 4, name: "Jacob Lee", email: "jacob.lee@example.com", role: "QA Engineer" },
    { id: 5, name: "Sofia Park", email: "sofia.park@example.com", role: "DevOps Engineer" },
    { id: 6, name: "Liam Hart", email: "liam.hart@example.com", role: "Developer" },
    { id: 7, name: "Nora Kim", email: "nora.kim@example.com", role: "Developer" },
    { id: 8, name: "Aiden Reed", email: "aiden.reed@example.com", role: "Developer" },
    { id: 9, name: "Tara Singh", email: "tara.singh@example.com", role: "Developer" },
    { id: 10, name: "Mia Lee", email: "mia.lee@example.com", role: "Developer" },
];

/**
 * Sample teams for the Teams Overview page.
 *
 * Platform Team contains the detailed member information
 * shown in the supplied wireframe.
 */
export const mockTeams: Team[] = [
    {
        id: 1,
        name: "Platform Team",
        description: "Core services & identity",
        memberCount: 5,
        capacityPoints: 37,
        members: [
            { user: mockUsers[0], capacityPoints: 8 },
            { user: mockUsers[1], capacityPoints: 8 },
            { user: mockUsers[2], capacityPoints: 13 },
            { user: mockUsers[3], capacityPoints: 4 },
            { user: mockUsers[4], capacityPoints: 4 },
        ],
    },
    {
        id: 2,
        name: "Integration Team",
        description: "System integrations and external services.",
        memberCount: 4,
        members: [],
    },
    {
        id: 3,
        name: "Mobile Team",
        description: "Mobile application development.",
        memberCount: 4,
        members: [],
    },
    {
        id: 4,
        name: "Data & Analytics Team",
        description: "Data processing and analytics.",
        memberCount: 5,
        members: [],
    },
    {
        id: 5,
        name: "Quality Assurance Team",
        description: "Software quality and testing.",
        memberCount: 4,
        members: [],
    },
    {
        id: 6,
        name: "DevOps Team",
        description: "Infrastructure and deployment.",
        memberCount: 3,
        members: [],
    },
];

/**
 * Developers who are not assigned to a team in the sample data.
 */
export const mockUnassignedDevelopers: User[] = mockUsers.slice(5);
