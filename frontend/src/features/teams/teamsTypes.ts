
/**
 * Teams feature - Type Definitions
 *
 * Contains types specific to team management.
 */

import type { User } from "../../types/userTypes";

/**
 * Represents a member assigned to a team.
 */
export interface TeamMember {
    user: User;
    capacityPoints?: number;
}

/**
 * Represents a team in the selected sprint.
 */
export interface Team {
    id: number;
    name: string;
    description: string;

    // Number of members displayed in the Teams list.
    memberCount: number;

    // Actual member details available for this team.
    members: TeamMember[];

    // Total team capacity in story points.
    capacityPoints?: number;
}
