
/**
 * Edit Team Component
 *
 * Allows the Engineering Manager to rename a team,
 * view its members, add developers and remove members.
 */

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import Modal from "../../../../components/modal/Modal";
import AddMembers from "../addMembers/addMembers";

import type { User } from "../../../../types/userTypes";
import type { Team } from "../../teamsTypes";

import styles from "./editTeam.module.css";

interface EditTeamProps {
    isOpen: boolean;
    team: Team;
    availableDevelopers: User[];
    onClose: () => void;
    onSave: (updatedTeam: Team, newUsers: User[]) => void;
}

export default function EditTeam({
    isOpen,
    team,
    availableDevelopers,
    onClose,
    onSave,
}: EditTeamProps) {
    const [teamName, setTeamName] = useState(team.name);
    const [description, setDescription] = useState(team.description);
    const [selectedMembers, setSelectedMembers] = useState<User[]>(
        team.members.map((member) => member.user)
    );

    const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
    const [error, setError] = useState("");

    // Reset temporary changes when a different team is opened.
    useEffect(() => {
        setTeamName(team.name);
        setDescription(team.description);
        setSelectedMembers(team.members.map((member) => member.user));
        setIsAddMembersOpen(false);
        setError("");
    }, [team]);

    // Remove a developer from the temporary member selection.
    const handleRemoveMember = (userId: number) => {
        setSelectedMembers((currentMembers) =>
            currentMembers.filter((member) => member.id !== userId)
        );

        setError("");
    };

    // Add developers selected in the Add Members modal.
    const handleAddMembers = (addedMembers: User[]) => {
        setSelectedMembers((currentMembers) => {
            const existingIds = new Set(
                currentMembers.map((member) => member.id)
            );

            const uniqueMembers = addedMembers.filter(
                (member) => !existingIds.has(member.id)
            );

            return [...currentMembers, ...uniqueMembers];
        });

        setIsAddMembersOpen(false);
        setError("");
    };

    // Validate the form and save the updated team.
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmedName = teamName.trim();

        if (!trimmedName) {
            setError("Team name is required.");
            return;
        }

        if (selectedMembers.length === 0) {
            setError("Please assign at least one developer.");
            return;
        }

        const updatedTeam: Team = {
            ...team,
            name: trimmedName,
            description: description.trim(),
            members: selectedMembers.map((user) => {
                const existingMember = team.members.find(
                    (member) => member.user.id === user.id
                );

                return {
                    user,
                    capacityPoints: existingMember?.capacityPoints,
                };
            }),
            memberCount: selectedMembers.length,
        };

        onSave(updatedTeam, []);
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={() => {
                console.log("Edit Team close clicked");
                onClose();
            }}
            >
                <div className={styles.editTeamPage}>
                    <header className={styles.pageHeader}>
                        <h1 id="edit-team-title">Edit Team</h1>
                        <p>
                            Update team information and manage developers.
                        </p>
                    </header>

                    <form className={styles.form} onSubmit={handleSubmit}>
                        {/* Team name */}
                        <div className={styles.formGroup}>
                            <label htmlFor="edit-team-name">
                                Team Name
                            </label>

                            <input
                                id="edit-team-name"
                                type="text"
                                value={teamName}
                                onChange={(event) =>
                                    setTeamName(event.target.value)
                                }
                                maxLength={80}
                                required
                            />
                        </div>

                        {/* Team description */}
                        <div className={styles.formGroup}>
                            <label htmlFor="edit-team-description">
                                Description
                            </label>

                            <textarea
                                id="edit-team-description"
                                value={description}
                                onChange={(event) =>
                                    setDescription(event.target.value)
                                }
                                rows={3}
                            />
                        </div>

                        {/* Current team members */}
                        <div className={styles.formGroup}>
                            <div className={styles.memberSectionHeader}>
                                <label>
                                    Team Members ({selectedMembers.length})
                                </label>

                                <button
                                    type="button"
                                    className={styles.addMembersButton}
                                    onClick={() =>
                                        setIsAddMembersOpen(true)
                                    }
                                >
                                    + Add Members
                                </button>
                            </div>

                            <div className={styles.selectedMembers}>
                                {selectedMembers.length > 0 ? (
                                    selectedMembers.map((user) => (
                                        <div
                                            key={user.id}
                                            className={styles.memberChip}
                                        >
                                            <div className={styles.memberInfo}>
                                                <strong>{user.name}</strong>
                                                <small>{user.role}</small>
                                            </div>

                                            <button
                                                type="button"
                                                className={styles.removeButton}
                                                aria-label={`Remove ${user.name}`}
                                                onClick={() =>
                                                    handleRemoveMember(user.id)
                                                }
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className={styles.emptyState}>
                                        No developers assigned yet.
                                    </p>
                                )}
                            </div>
                        </div>

                        {error && (
                            <p className={styles.errorMessage} role="alert">
                                {error}
                            </p>
                        )}

                        {/* Form actions */}
                        <div className={styles.formActions}>
                            <button
                                type="button"
                                className={styles.cancelButton}
                                onClick={onClose}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className={styles.saveButton}
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Separate Add Members form */}
            {isAddMembersOpen && (
                <AddMembers
                    teamName={team.name}
                    availableDevelopers={availableDevelopers}
                    onClose={() => setIsAddMembersOpen(false)}
                    onConfirm={handleAddMembers}
                />
            )}
        </>
    );
}
