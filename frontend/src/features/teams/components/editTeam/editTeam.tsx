
/**
 * Edit Team Component
 *
 * Allows the Engineering Manager to rename a team,
 * update its description, view its members and remove members.
 */

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import Modal from "../../../../components/modal/Modal";

import type { User } from "../../../../types/userTypes";
import type { Team } from "../../teamsTypes";

import styles from "./editTeam.module.css";

interface EditTeamProps {
    isOpen: boolean;
    team: Team;
    availableDevelopers: User[];
    onClose: () => void;
    onSave: (updatedTeam: Team, newUsers: User[]) => Promise<void>;
}

export default function EditTeam({
    isOpen,
    team,
    onClose,
    onSave,
}: EditTeamProps) {
    const [teamName, setTeamName] = useState(team.name);
    const [description, setDescription] = useState(team.description);
    const [selectedMembers, setSelectedMembers] = useState<User[]>(
        team.members.map((member) => member.user)
    );

    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Reset temporary changes when a different team is opened.
    useEffect(() => {
        setTeamName(team.name);
        setDescription(team.description);
        setSelectedMembers(team.members.map((member) => member.user));
        setError("");
        setIsSaving(false);
    }, [team]);

    // Remove a developer from the temporary member selection.
    const handleRemoveMember = (userId: number) => {
        setSelectedMembers((currentMembers) =>
            currentMembers.filter((member) => member.id !== userId)
        );

        setError("");
    };

    // Validate and save the updated team.
    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

        try {
            setIsSaving(true);
            setError("");

            await onSave(updatedTeam, []);
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : "Failed to save team changes."
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className={styles.editTeamPage}>
                <header className={styles.pageHeader}>
                    <h1 id="edit-team-title">Edit Team</h1>
                    <p>
                        Update team information and view assigned developers.
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
                            disabled={isSaving}
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
                            disabled={isSaving}
                        />
                    </div>

                    {/* Current team members */}
                    <div className={styles.formGroup}>
                        <div className={styles.memberSectionHeader}>
                            <label>
                                Team Members ({selectedMembers.length})
                            </label>
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
                                            disabled={isSaving}
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
                            disabled={isSaving}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className={styles.saveButton}
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
