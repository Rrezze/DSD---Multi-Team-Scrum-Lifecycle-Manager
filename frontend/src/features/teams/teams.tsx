
/**
 * Teams Overview Page

 */
import { useEffect, useState } from "react";
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";

import TeamList from "./components/teamList/teamList";
import TeamDetails from "./components/teamDetails/teamDetails";
import CreateTeam from "./components/createTeam/createTeam";
import EditTeam from "./components/editTeam/editTeam";
import AddMembers from "./components/addMembers/addMembers";

import MemberPool from "../../components/memberPool/memberPool";
import Notification from "../../components/notification/notification";

import {
    getTeams,
    getMemberships,
    getTeamCapacities,
    createTeam,
    createMembership,
    deleteMembership,
    updateTeam,
    deleteTeam,
} from "./teamsApi";
import type { ApiTeam, Team } from "./teamsTypes";

import type { User } from "../../types/userTypes";

import { getUsers } from "../users/usersApi";
import { UserRole, type ApiUser } from "../users/usersTypes";

import styles from "./teams.module.css";
// Temporary fixed sprint ID created by the backend migration.
// We can make this dynamic when sprint selection is implemented.
const SPRINT_ID = 1;
const MAX_TEAMS = 10;
type NotificationType = "success" | "error" | "warning" | "info";

    interface TeamsNotification {
        type: NotificationType;
        message: string;
    }

/**
 * Converts the backend team response into the structure
 * expected by the Teams page components.
 *
 * Membership information will be populated separately
 * when we connect the Membership API.
 */
function mapApiTeamToTeam(apiTeam: ApiTeam): Team {
    return {
        id: apiTeam.id,
        name: apiTeam.name,
        description: apiTeam.description,
        memberCount: 0,
        members: [],
    };
}
/**
 * Converts the backend ApiUser into the shared User
 * structure expected by the Teams components.
 */
function mapApiUserToUser(apiUser: ApiUser): User {
    return {
        id: apiUser.id,
        name: `${apiUser.first_name} ${apiUser.last_name}`.trim(),
        email: apiUser.email,
        role: apiUser.role,
    };
}

export default function Teams() {
    // Stores teams retrieved from the backend.
    const [teams, setTeams] = useState<Team[]>([]);

    // Tracks whether the initial team request is still running.
    const [isLoading, setIsLoading] = useState(true);

    // Stores all application users.
    const [users, setUsers] = useState<User[]>([]);
    const [activeUser, setActiveUser] = useState<User | null>(null);

    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

    // Controls whether the Create Team modal is visible.
    const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);

    // Stores the team currently being edited.
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);

    // Stores the team for which the Team Details Add Members modal is open.
    const [addingMembersTeam, setAddingMembersTeam] =
        useState<Team | null>(null);

    // Stores the notification currently displayed on the Teams page.
    const [notification, setNotification] =
        useState<TeamsNotification | null>(null);

        /**
         * Loads active teams when the Teams page is mounted.
         *
         * The cancelled flag prevents state updates if the component
         * unmounts before the API request finishes.
         */

        useEffect(() => {
            let cancelled = false;

            async function loadTeamsPage() {
                try {
                    setIsLoading(true);

                    // Fetch teams, developers, memberships and capacity together.
                    const [
                        apiTeams,
                        apiUsers,
                        apiMemberships,
                        apiCapacities,
                    ] = await Promise.all([
                        getTeams(),
                        getUsers({ role: UserRole.DEVELOPER }),
                        getMemberships(undefined, SPRINT_ID),
                        getTeamCapacities(SPRINT_ID),
                    ]);

                    if (cancelled) return;

                    // Convert active backend developers into frontend User objects.
                    const mappedUsers = apiUsers
                        .filter((user) => user.is_active)
                        .map(mapApiUserToUser);

                    // Create a lookup so memberships can be matched to developers.
                    const usersById = new Map(
                        mappedUsers.map((user) => [user.id, user])
                    );

                    // Convert backend teams and attach their sprint-specific members
                    // and calculated capacity.
                    const mappedTeams = apiTeams.map((apiTeam) => {
                        const teamMemberships = apiMemberships.filter(
                            (membership) => membership.team === apiTeam.id
                        );

                        const teamMembers = teamMemberships.flatMap((membership) => {
                            const user = usersById.get(membership.user);

                            // Ignore memberships whose developer is not available.
                            return user
                                ? [{
                                    user,
                                    capacityPoints: membership.capacity_points,
                                }]
                                : [];
                        });


                        const teamCapacity = apiCapacities.find(
                            (capacity) => capacity.team === apiTeam.id
                        );
                        return {
                            ...mapApiTeamToTeam(apiTeam),
                            members: teamMembers,
                            memberCount: teamMembers.length,
                            capacityPoints: teamCapacity?.capacity_points,
                        };
                    });

                    setTeams(mappedTeams);
                    setUsers(mappedUsers);

                    // Select the first team automatically.
                    setSelectedTeamId(mappedTeams[0]?.id ?? null);

                } catch (error) {
                    if (cancelled) return;

                    setNotification({
                        type: "error",
                        message:
                            error instanceof Error
                                ? error.message
                                : "Failed to load Teams data.",
                    });
                } finally {
                    if (!cancelled) {
                        setIsLoading(false);
                    }
                }
            }

            loadTeamsPage();

            return () => {
                cancelled = true;
            };
        }, []);


    // Find the currently selected team.
    const selectedTeam =
        teams.find((team) => team.id === selectedTeamId) ?? null;

    // Find developers who are already assigned to a team.
    const assignedUserIds = new Set(
        teams.flatMap((team) =>
            team.members.map((member) => member.user.id)
        )
    );

    // Only developers who are not assigned to any team can be selected.
    const availableDevelopers = users.filter(
        (user) => !assignedUserIds.has(user.id)
    );

    // Select a team from the left-hand team list.
    const handleSelectTeam = (team: Team) => {
        setSelectedTeamId(team.id);
        setNotification(null);
    };

    // Open the Edit Team modal.
    const handleEditTeam = (team: Team) => {
        setNotification(null);
        setEditingTeam(team);
    };

    // Save the edited team.

/**
 * Save team information and synchronize membership changes
 * with the backend.
 */
const handleSaveTeam = async (
    updatedTeam: Team,
    newUsers: User[]
) => {
    try {
        // Update the team's name and description in the backend.
        await updateTeam(updatedTeam.id, {
            name: updatedTeam.name,
            description: updatedTeam.description,
        });

        // Find the team's existing memberships for this sprint.
        const existingMemberships = await getMemberships(
            undefined,
            SPRINT_ID
        );

        const teamMemberships = existingMemberships.filter(
            (membership) => membership.team === updatedTeam.id
        );

        const updatedUserIds = new Set(
            updatedTeam.members.map((member) => member.user.id)
        );

        // Identify developers removed through the Edit Team modal.
        const removedMemberships = teamMemberships.filter(
            (membership) => !updatedUserIds.has(membership.user)
        );

        // Delete removed memberships from the backend.
        await Promise.all(
            removedMemberships.map((membership) =>
                deleteMembership(membership.id)
            )
        );

        // Add any new developers if the component supplies them.
        const existingUserIds = new Set(
            teamMemberships.map((membership) => membership.user)
        );

        const membersToAdd = newUsers.filter(
            (user) => !existingUserIds.has(user.id)
        );

        await Promise.all(
            membersToAdd.map((user) =>
                createMembership({
                    user: user.id,
                    team: updatedTeam.id,
                    sprint: SPRINT_ID,
                })
            )
        );

        // Fetch the latest memberships and capacity.
        const [apiMemberships, apiCapacities] = await Promise.all([
            getMemberships(undefined, SPRINT_ID),
            getTeamCapacities(SPRINT_ID),
        ]);

        const updatedMemberships = apiMemberships.filter(
            (membership) => membership.team === updatedTeam.id
        );

        const updatedMembers = updatedMemberships.flatMap((membership) => {
            const user = users.find(
                (existingUser) => existingUser.id === membership.user
            );

            return user
                ? [{
                    user,
                    capacityPoints: membership.capacity_points,
                }]
                : [];
        });

        const teamCapacity = apiCapacities.find(
            (capacity) => capacity.team === updatedTeam.id
        );

        // Update the frontend using the latest backend information.
        setTeams((currentTeams) =>
            currentTeams.map((team) =>
                team.id === updatedTeam.id
                    ? {
                        ...updatedTeam,
                        members: updatedMembers,
                        memberCount: updatedMembers.length,
                        capacityPoints: teamCapacity?.capacity_points,
                    }
                    : team
            )
        );

        setSelectedTeamId(updatedTeam.id);
        setEditingTeam(null);

        setNotification({
            type: "success",
            message: "Team updated successfully!",
        });

        setActiveUser(null);
    } catch (error) {
        // Pass the error back to the modal so it can display it.
        throw error;
    }
};


    // Delete a team after the user confirms the action.

/**
 * Delete a team after user confirmation.
 * The backend is responsible for deleting the team record.
 */
const handleDeleteTeam = async (team: Team) => {
    const confirmed = window.confirm(
        `Are you sure you want to delete "${team.name}"?`
    );

    if (!confirmed) return;

    try {
        // Delete the team from the backend.
        await deleteTeam(team.id);

        // Remove the deleted team from the frontend state.
        const updatedTeams = teams.filter(
            (existingTeam) => existingTeam.id !== team.id
        );

        setTeams(updatedTeams);

        // Select another team if the deleted team was selected.
        if (selectedTeamId === team.id) {
            setSelectedTeamId(updatedTeams[0]?.id ?? null);
        }

        setNotification({
            type: "success",
            message: `"${team.name}" deleted successfully!`,
        });

        setActiveUser(null);
    } catch (error) {
        setNotification({
            type: "error",
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to delete team.",
        });
    }
};


/**
 * Remove a developer from a team and delete the corresponding
 * membership record from the backend.
 */
const handleRemoveMember = async (teamId: number, userId: number) => {
    try {
        // Find the actual membership record for this team, user and sprint.
        const memberships = await getMemberships(undefined, SPRINT_ID);

        const membership = memberships.find(
            (item) => item.team === teamId && item.user === userId
        );

        if (!membership) {
            setNotification({
                type: "error",
                message: "Could not find this team membership.",
            });
            return;
        }

        // Delete the membership from the backend.
        await deleteMembership(membership.id);

        // Retrieve updated memberships and team capacities.
        const [updatedMemberships, updatedCapacities] = await Promise.all([
            getMemberships(undefined, SPRINT_ID),
            getTeamCapacities(SPRINT_ID),
        ]);

        // Rebuild the selected team's members from backend data.
        const teamMemberships = updatedMemberships.filter(
            (item) => item.team === teamId
        );

        const teamMembers = teamMemberships.flatMap((item) => {
            const user = users.find(
                (existingUser) => existingUser.id === item.user
            );

            return user
                ? [{
                    user,
                    capacityPoints: item.capacity_points,
                }]
                : [];
        });

        const teamCapacity = updatedCapacities.find(
            (capacity) => capacity.team === teamId
        );

        // Update the UI with the latest backend membership data.
        setTeams((currentTeams) =>
            currentTeams.map((team) =>
                team.id === teamId
                    ? {
                        ...team,
                        members: teamMembers,
                        memberCount: teamMembers.length,
                        capacityPoints: teamCapacity?.capacity_points,
                    }
                    : team
            )
        );

        setNotification({
            type: "success",
            message: "Team member removed successfully!",
        });

        setActiveUser(null);
    } catch (error) {
        setNotification({
            type: "error",
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to remove team member.",
        });
    }
};


     // Store the developer being dragged so DragOverlay can display the card.
    const handleDragStart = (event: DragStartEvent) => {
    const draggedUser = event.active.data.current?.user as User | undefined;

    setActiveUser(draggedUser ?? null);
};

    // Assign a dragged developer to the currently selected team.

// Assign a dragged developer to the selected team and save the membership.
const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Continue only when the developer is dropped in the team drop zone.
    if (!over || over.id !== "team-drop-zone") return;

    const draggedUser = active.data.current?.user as User | undefined;

    if (!draggedUser || !selectedTeam) return;

    // Prevent assigning a developer who already belongs to a team.
    const alreadyAssigned = teams.some((team) =>
        team.members.some((member) => member.user.id === draggedUser.id)
    );

    if (alreadyAssigned) return;

    try {
        // Save the developer-to-team assignment in the backend.
        await createMembership({
            user: draggedUser.id,
            team: selectedTeam.id,
            sprint: SPRINT_ID,
        });

        // Fetch the latest membership and capacity information.
        const [apiMemberships, apiCapacities] = await Promise.all([
            getMemberships(undefined, SPRINT_ID),
            getTeamCapacities(SPRINT_ID),
        ]);

        // Find all members belonging to the selected team.
        const teamMemberships = apiMemberships.filter(
            (membership) => membership.team === selectedTeam.id
        );

        // Match each membership with its frontend user.
        const teamMembers = teamMemberships.flatMap((membership) => {
            const user = users.find(
                (existingUser) => existingUser.id === membership.user
            );

            return user
                ? [{
                    user,
                    capacityPoints: membership.capacity_points,
                }]
                : [];
        });

        // Get the newly calculated total team capacity.
        const teamCapacity = apiCapacities.find(
            (capacity) => capacity.team === selectedTeam.id
        );

        // Update the UI using the backend's latest data.
        setTeams((currentTeams) =>
            currentTeams.map((team) =>
                team.id === selectedTeam.id
                    ? {
                        ...team,
                        members: teamMembers,
                        memberCount: teamMembers.length,
                        capacityPoints: teamCapacity?.capacity_points,
                    }
                    : team
            )
        );

        setNotification({
            type: "success",
            message: `${draggedUser.name} was added to ${selectedTeam.name}.`,
        });
    } catch (error) {
        setNotification({
            type: "error",
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to add developer to the team.",
        });
    }
};


    // Add the newly created team to the list and select it.
const handleCreateTeam = async (teamData: {
    name: string;
    description: string;
    members: User[];
}) => {
    // Prevent creating more than the allowed number of active teams.
    if (teams.length >= MAX_TEAMS) {
        throw new Error(
            `Maximum of ${MAX_TEAMS} teams reached. Delete an existing team to create a new one.`
        );
    }
    // First, save the team in the backend.
    const createdApiTeam = await createTeam({
        name: teamData.name,
        description: teamData.description,
    });

    // Next, create a membership for each selected developer.
    // Promise.allSettled allows us to identify partial failures
    // without accidentally creating the team again.
    const membershipResults = await Promise.allSettled(
        teamData.members.map((member) =>
            createMembership({
                user: member.id,
                team: createdApiTeam.id,
                sprint: SPRINT_ID,
            })
        )
    );

    // Retrieve the saved memberships and updated team capacity.
    const [apiMemberships, apiCapacities] = await Promise.all([
        getMemberships(undefined, SPRINT_ID),
        getTeamCapacities(SPRINT_ID),
    ]);

    // Match the selected developers with their saved memberships.
    const teamMemberships = apiMemberships.filter(
        (membership) => membership.team === createdApiTeam.id
    );

    const teamMembers = teamMemberships.flatMap((membership) => {
        const user = teamData.members.find(
            (member) => member.id === membership.user
        );

        return user
            ? [{
                user,
                capacityPoints: membership.capacity_points,
            }]
            : [];
    });

    const teamCapacity = apiCapacities.find(
        (capacity) => capacity.team === createdApiTeam.id
    );

    // Convert the backend response into the frontend Team format.
    const newTeam: Team = {
        ...mapApiTeamToTeam(createdApiTeam),
        members: teamMembers,
        memberCount: teamMembers.length,
        capacityPoints: teamCapacity?.capacity_points,
    };

    setTeams((previousTeams) => [...previousTeams, newTeam]);
    setSelectedTeamId(createdApiTeam.id);
    setIsCreateTeamOpen(false);

    // Report whether every selected developer was assigned successfully.
    const failedAssignments = membershipResults.filter(
        (result) => result.status === "rejected"
    ).length;

    if (failedAssignments > 0) {
        setNotification({
            type: "warning",
            message: `Team created, but ${failedAssignments} developer assignment(s) failed.`,
        });
    } else {
        setNotification({
            type: "success",
            message: "Team created and developers assigned successfully!",
        });
    }
};

// Add selected existing developers from the Team Details modal.

const handleAddMembersToTeam = async (addedMembers: User[]) => {
    if (!addingMembersTeam) return;

    try {
        // Save each selected developer as a membership in the backend.
        const results = await Promise.allSettled(
            addedMembers.map((user) =>
                createMembership({
                    user: user.id,
                    team: addingMembersTeam.id,
                    sprint: SPRINT_ID,
                })
            )
        );

        // Fetch the latest memberships and calculated capacities.
        const [apiMemberships, apiCapacities] = await Promise.all([
            getMemberships(undefined, SPRINT_ID),
            getTeamCapacities(SPRINT_ID),
        ]);

        // Find all memberships belonging to the selected team.
        const teamMemberships = apiMemberships.filter(
            (membership) => membership.team === addingMembersTeam.id
        );

        // Map backend memberships to frontend team members.
        const teamMembers = teamMemberships.flatMap((membership) => {
            const user = users.find(
                (existingUser) => existingUser.id === membership.user
            );

            return user
                ? [{
                    user,
                    capacityPoints: membership.capacity_points,
                }]
                : [];
        });

        // Retrieve the updated total team capacity.
        const teamCapacity = apiCapacities.find(
            (capacity) => capacity.team === addingMembersTeam.id
        );

        // Update the selected team using the latest backend data.
        setTeams((currentTeams) =>
            currentTeams.map((team) =>
                team.id === addingMembersTeam.id
                    ? {
                        ...team,
                        members: teamMembers,
                        memberCount: teamMembers.length,
                        capacityPoints: teamCapacity?.capacity_points,
                    }
                    : team
            )
        );

        setSelectedTeamId(addingMembersTeam.id);
        setAddingMembersTeam(null);

        const failedAssignments = results.filter(
            (result) => result.status === "rejected"
        ).length;

        setNotification({
            type: failedAssignments > 0 ? "warning" : "success",
            message:
                failedAssignments > 0
                    ? `${addedMembers.length - failedAssignments} developer(s) added. ${failedAssignments} assignment(s) failed.`
                    : "Team members added successfully!",
        });
    } catch (error) {
        setNotification({
            type: "error",
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to add team members.",
        });
    }
};


    return (
        <main className={styles.teamsPage}>
            {/* Page heading and actions */}
            <header className={styles.pageHeader}>
                <div>
                    <h1>Teams</h1>
                    <p>Manage teams and their members.</p>
                </div>

                <div className={styles.pageActions}>
                    <label htmlFor="sprint-select">Sprint</label>

                    <select
                        id="sprint-select"
                        defaultValue="sprint-5"
                        disabled
                    >
                        <option value="sprint-5">Sprint 5</option>
                    </select>

                    <button
                        type="button"
                        className={styles.newTeamButton}
                        onClick={() => setIsCreateTeamOpen(true)}
                        disabled={teams.length >= MAX_TEAMS}
                        title={
                            teams.length >= MAX_TEAMS
                                ? `Maximum of ${MAX_TEAMS} teams reached`
                                : "Create a new team"
                        }
                    >
                        + New Team
                    </button>
                </div>
            </header>

            {notification && (
                <Notification
                    key={`${notification.type}-${notification.message}`}
                    type={notification.type}
                    message={notification.message}
                />
            )}
            {isLoading && (
            <p className={styles.loadingMessage}>
                Loading teams...
            </p>
            )}

            {/* Team list, team details and unassigned developers */}
            {!isLoading && (
            <DndContext
                onDragStart={handleDragStart}
                onDragEnd={(event) => {
                    handleDragEnd(event);
                    setActiveUser(null);
                }}
                onDragCancel={() => setActiveUser(null)}
            >
                <div className={styles.teamsLayout}>
                    <TeamList
                        teams={teams}
                        selectedTeamId={selectedTeamId}
                        onSelectTeam={handleSelectTeam}
                    />

                    <TeamDetails
                        team={selectedTeam}
                        onEditTeam={handleEditTeam}
                        onDeleteTeam={handleDeleteTeam}
                        onRemoveMember={handleRemoveMember}
                        onAddMembers={setAddingMembersTeam}
                    />

                    <MemberPool
                        users={availableDevelopers}
                        title="Not in a Team"
                    />
                </div>
                <DragOverlay>
                    {activeUser ? (
                        <div className={styles.dragOverlayCard}>
                            <strong>{activeUser.name}</strong>
                            <span>{activeUser.role}</span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
            )}

            {/* Create Team modal */}
            {isCreateTeamOpen && (
                <CreateTeam
                    isOpen={isCreateTeamOpen}
                    availableDevelopers={availableDevelopers}
                    existingTeams={teams}
                    onClose={() => setIsCreateTeamOpen(false)}
                    onCreate={handleCreateTeam}
                />
            )}

            {/* Edit Team modal */}
            {editingTeam && (
                <EditTeam
                    isOpen={true}
                    team={editingTeam}
                    availableDevelopers={availableDevelopers}
                    onClose={() => setEditingTeam(null)}
                    onSave={handleSaveTeam}
                />
            )}

            {/* Add Members modal opened from Team Details */}
            {addingMembersTeam && (
                <AddMembers
                    teamName={addingMembersTeam.name}
                    availableDevelopers={availableDevelopers}
                    onClose={() => setAddingMembersTeam(null)}
                    onConfirm={handleAddMembersToTeam}
                />
            )}
        </main>
    );
}
