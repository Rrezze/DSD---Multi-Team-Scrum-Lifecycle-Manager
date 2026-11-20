
/**
 * Teams Overview Page
 *
 * Coordinates the Team List, Team Details, and MemberPool components.
 * Handles local team management, developer drag-and-drop assignment,
 * and the Create Team, Edit Team, and Add Members modals.
 */

import { useState } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";

import TeamList from "./components/teamList/teamList";
import TeamDetails from "./components/teamDetails/teamDetails";
import CreateTeam from "./components/createTeam/createTeam";
import EditTeam from "./components/editTeam/editTeam";
import AddMembers from "./components/addMembers/addMembers";

import MemberPool from "../../components/memberPool/memberPool";
import Notification from "../../components/notification/notification";

import { mockTeams, mockUsers } from "./teamsMockData";

import type { Team } from "./teamsTypes";
import type { User } from "../../types/userTypes";

import styles from "./teams.module.css";

export default function Teams() {
    // Stores all teams currently displayed on the page.
    const [teams, setTeams] = useState<Team[]>(mockTeams);

    // Stores all application users.
    const [users, setUsers] = useState<User[]>(mockUsers);

    // Stores the ID of the currently selected team.
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(
        mockTeams[0]?.id ?? null
    );

    // Controls whether the Create Team modal is visible.
    const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);

    // Stores the team currently being edited.
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);

    // Stores the team for which the Team Details Add Members modal is open.
    const [addingMembersTeam, setAddingMembersTeam] =
        useState<Team | null>(null);

    // Displays feedback messages after user actions.
    const [message, setMessage] = useState("");

    // Stores the success message displayed after an operation.
    const [successMessage, setSuccessMessage] = useState("");

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
        setMessage("");
    };

    // Open the Edit Team modal.
    const handleEditTeam = (team: Team) => {
        setMessage("");
        setEditingTeam(team);
    };

    // Save the edited team.
    const handleSaveTeam = (
        updatedTeam: Team,
        newUsers: User[]
    ) => {
        // Update only the team that was edited.
        setTeams((currentTeams) =>
            currentTeams.map((team) =>
                team.id === updatedTeam.id ? updatedTeam : team
            )
        );

        // Keep any newly registered mock users if provided by a caller.
        setUsers((currentUsers) => {
            const existingIds = new Set(
                currentUsers.map((user) => user.id)
            );

            return [
                ...currentUsers,
                ...newUsers.filter((user) => !existingIds.has(user.id)),
            ];
        });

        setSelectedTeamId(updatedTeam.id);
        setEditingTeam(null);

        setMessage("");
        setSuccessMessage("Team updated successfully!");
    };

    // Delete a team after the user confirms the action.
    const handleDeleteTeam = (team: Team) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${team.name}"?`
        );

        if (!confirmed) return;

        const updatedTeams = teams.filter(
            (existingTeam) => existingTeam.id !== team.id
        );

        setTeams(updatedTeams);

        // Select another team if the deleted team was selected.
        if (selectedTeamId === team.id) {
            setSelectedTeamId(updatedTeams[0]?.id ?? null);
        }

        setMessage(`"${team.name}" was removed from the mock data.`);
    };

    // Remove a developer from a team.
    const handleRemoveMember = (teamId: number, userId: number) => {
        setTeams((currentTeams) =>
            currentTeams.map((team) => {
                if (team.id !== teamId) return team;

                const removedMember = team.members.find(
                    (member) => member.user.id === userId
                );

                const updatedMembers = team.members.filter(
                    (member) => member.user.id !== userId
                );

                return {
                    ...team,
                    members: updatedMembers,
                    memberCount: Math.max(0, team.memberCount - 1),

                    // Update total capacity if the removed member had capacity data.
                    capacityPoints:
                        team.capacityPoints !== undefined &&
                        removedMember?.capacityPoints !== undefined
                            ? team.capacityPoints - removedMember.capacityPoints
                            : team.capacityPoints,
                };
            })
        );

        setMessage("Team member removed from the mock data.");
    };

    // Assign a dragged developer to the currently selected team.
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || over.id !== "team-drop-zone") return;

        const draggedUser = active.data.current?.user as User | undefined;

        if (!draggedUser || !selectedTeam) return;

        // Prevent assigning a developer who is already in a team.
        const alreadyAssigned = teams.some((team) =>
            team.members.some(
                (member) => member.user.id === draggedUser.id
            )
        );

        if (alreadyAssigned) return;

        setTeams((currentTeams) =>
            currentTeams.map((team) => {
                if (team.id !== selectedTeam.id) return team;

                return {
                    ...team,
                    members: [
                        ...team.members,
                        { user: draggedUser },
                    ],
                    memberCount: team.memberCount + 1,
                };
            })
        );

        setMessage(
            `${draggedUser.name} was added to ${selectedTeam.name}.`
        );
    };

    // Add the newly created team to the list and select it.
    const handleCreateTeam = (newTeam: Team) => {
        setTeams((currentTeams) => [...currentTeams, newTeam]);

        setSelectedTeamId(newTeam.id);

        // Close the Create Team modal after successful creation.
        setIsCreateTeamOpen(false);

        setMessage("");
        setSuccessMessage("Team created successfully!");
    };

    // Add selected existing developers from the Team Details modal.
    const handleAddMembersToTeam = (addedMembers: User[]) => {
        if (!addingMembersTeam) return;

        setTeams((currentTeams) =>
            currentTeams.map((team) => {
                if (team.id !== addingMembersTeam.id) return team;

                // Prevent adding developers who are already team members.
                const existingIds = new Set(
                    team.members.map((member) => member.user.id)
                );

                const uniqueMembers = addedMembers.filter(
                    (user) => !existingIds.has(user.id)
                );

                return {
                    ...team,
                    members: [
                        ...team.members,
                        ...uniqueMembers.map((user) => ({ user })),
                    ],
                    memberCount: team.memberCount + uniqueMembers.length,
                };
            })
        );

        setSelectedTeamId(addingMembersTeam.id);
        setAddingMembersTeam(null);

        setMessage("");
        setSuccessMessage("Team members added successfully!");
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
                    >
                        + New Team
                    </button>
                </div>
            </header>

            {/* General feedback message */}
            {message && (
                <p className={styles.feedbackMessage} role="status">
                    {message}
                </p>
            )}

            {/* Success notification */}
            {successMessage && (
                <Notification
                    key={successMessage}
                    type="success"
                    message={successMessage}
                />
            )}

            {/* Team list, team details and unassigned developers */}
            <DndContext onDragEnd={handleDragEnd}>
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
            </DndContext>

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
