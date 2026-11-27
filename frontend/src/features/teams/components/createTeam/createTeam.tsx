
/**
 * Create Team Modal
 *
 * Allows the Engineering Manager to create a team and select
 * developers who are not currently assigned to another team.
 *
 * The parent component handles API requests and persistence.
 * The shared Modal component handles the dialog overlay and closing.
 */

import { useState } from "react";
import type { FormEvent } from "react";

import Modal from "../../../../components/modal/Modal";
import type { User } from "../../../../types/userTypes";
import type { Team } from "../../teamsTypes";

import styles from "./createTeam.module.css";

interface CreateTeamProps {
    isOpen: boolean;
    availableDevelopers: User[];
    existingTeams: Team[];
    onClose: () => void;

    // Sends validated form data to the parent for backend creation.
    onCreate: (teamData: {
        name: string;
        description: string;
        members: User[];
    }) => Promise<void>;
}

export default function CreateTeam({
    isOpen,
    availableDevelopers,
    existingTeams,
    onClose,
    onCreate,
}: CreateTeamProps) {
    const [teamName, setTeamName] = useState("");
    const [description, setDescription] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter developers by name, email or role.
    const filteredDevelopers = availableDevelopers.filter((user) => {
        const searchValue = searchTerm.trim().toLowerCase();

        return (
            user.name.toLowerCase().includes(searchValue) ||
            user.email.toLowerCase().includes(searchValue) ||
            user.role.toLowerCase().includes(searchValue)
        );
    });

    // Add a developer to the selected members list.
    const handleAddMember = (user: User) => {
        const alreadySelected = selectedMembers.some(
            (member) => member.id === user.id
        );

        if (alreadySelected) return;

        setSelectedMembers((currentMembers) => [...currentMembers, user]);
        setSearchTerm("");
        setDropdownOpen(false);
        setError("");
    };

    // Remove one developer from the selected members list.
    const handleRemoveMember = (userId: number) => {
        setSelectedMembers((currentMembers) =>
            currentMembers.filter((member) => member.id !== userId)
        );
    };

    // Clear all selected developers.
    const handleClearAll = () => {
        setSelectedMembers([]);
    };

    // Generate initials for developer chips.
    const getInitials = (name: string) =>
        name
            .trim()
            .split(/\s+/)
            .map((part) => part[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();

    /**
     * Validate the form and send the team details to the parent.
     *
     * The parent is responsible for creating the team through
     * the backend API and assigning the selected developers.
     */
    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isSubmitting) return;

        const trimmedName = teamName.trim();

        if (!trimmedName) {
            setError("Please enter a team name.");
            return;
        }

        // Team names must be unique, regardless of letter casing.
        const duplicateName = existingTeams.some(
            (team) =>
                team.name.toLowerCase() === trimmedName.toLowerCase()
        );

        if (duplicateName) {
            setError("A team with this name already exists.");
            return;
        }

        if (selectedMembers.length === 0) {
            setError("Please select at least one developer.");
            return;
        }

        try {
            setIsSubmitting(true);
            setError("");

            // Send form data to the parent for backend persistence.
            await onCreate({
                name: trimmedName,
                description: description.trim(),
                members: selectedMembers,
            });
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to create team. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className={styles.createTeamPage}>
                <header className={styles.pageHeader}>
                    <h1 id="create-team-title">Create Team</h1>
                    <p>
                        Create a new team and assign existing developers
                    </p>
                </header>

                <form className={styles.form} onSubmit={handleSubmit}>
                    {/* Team name */}
                    <div className={styles.formGroup}>
                        <label htmlFor="team-name">
                            Team Name <span>*</span>
                        </label>

                        <input
                            id="team-name"
                            type="text"
                            name="teamName"
                            autoComplete="off"
                            placeholder="e.g., Operations Team"
                            value={teamName}
                            onChange={(event) => {
                                setTeamName(event.target.value);
                                setError("");
                            }}
                            maxLength={80}
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Optional team description */}
                    <div className={styles.formGroup}>
                        <label htmlFor="team-description">
                            Description
                        </label>

                        <textarea
                            id="team-description"
                            placeholder="e.g., Responsible for platform services and identity"
                            value={description}
                            onChange={(event) =>
                                setDescription(event.target.value)
                            }
                            rows={3}
                            maxLength={300}
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Developer selection */}
                    <div className={styles.formGroup}>
                        <label htmlFor="developer-search">
                            Add Members <span>*</span>
                        </label>

                        <div className={styles.developerSelect}>
                            <div className={styles.searchWrapper}>
                                <svg
                                    className={styles.searchIcon}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    aria-hidden="true"
                                >
                                    <circle cx="11" cy="11" r="7" />
                                    <path d="m20 20-4-4" />
                                </svg>

                                <input
                                    id="developer-search"
                                    type="search"
                                    placeholder="Search developers..."
                                    value={searchTerm}
                                    onFocus={() => setDropdownOpen(true)}
                                    onChange={(event) => {
                                        setSearchTerm(event.target.value);
                                        setDropdownOpen(true);
                                    }}
                                    autoComplete="off"
                                    disabled={isSubmitting}
                                />

                                <button
                                    type="button"
                                    className={styles.dropdownButton}
                                    onClick={() =>
                                        setDropdownOpen((open) => !open)
                                    }
                                    aria-label="Toggle developer list"
                                    aria-expanded={dropdownOpen}
                                    disabled={isSubmitting}
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </button>
                            </div>

                            {dropdownOpen && (
                                <div
                                    className={styles.dropdownList}
                                    role="group"
                                    aria-label="Available developers"
                                >
                                    {filteredDevelopers.filter(
                                        (user) =>
                                            !selectedMembers.some(
                                                (member) =>
                                                    member.id === user.id
                                            )
                                    ).length > 0 ? (
                                        filteredDevelopers
                                            .filter(
                                                (user) =>
                                                    !selectedMembers.some(
                                                        (member) =>
                                                            member.id === user.id
                                                    )
                                            )
                                            .map((user) => (
                                                <button
                                                    key={user.id}
                                                    type="button"
                                                    className={styles.developerOption}
                                                    onClick={() =>
                                                        handleAddMember(user)
                                                    }
                                                    disabled={isSubmitting}
                                                >
                                                    <span className={styles.optionAvatar}>
                                                        {getInitials(user.name)}
                                                    </span>

                                                    <span className={styles.optionInfo}>
                                                        <strong>{user.name}</strong>
                                                        <small>{user.role}</small>
                                                    </span>
                                                </button>
                                            ))
                                    ) : (
                                        <p className={styles.noResults}>
                                            No available developers found.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Selected developer chips */}
                    <section className={styles.selectedMembers}>
                        <div className={styles.selectedHeader}>
                            <h2>
                                Selected Members ({selectedMembers.length})
                            </h2>

                            {selectedMembers.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleClearAll}
                                    className={styles.clearAllButton}
                                    disabled={isSubmitting}
                                >
                                    Clear All
                                </button>
                            )}
                        </div>

                        {selectedMembers.length > 0 ? (
                            <div className={styles.memberChips}>
                                {selectedMembers.map((user) => (
                                    <div
                                        key={user.id}
                                        className={styles.memberChip}
                                    >
                                        <span className={styles.chipAvatar}>
                                            {getInitials(user.name)}
                                        </span>

                                        <span className={styles.chipName}>
                                            {user.name}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRemoveMember(user.id)
                                            }
                                            aria-label={`Remove ${user.name}`}
                                            disabled={isSubmitting}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.noSelectedMembers}>
                                No developers selected yet.
                            </p>
                        )}
                    </section>

                    {/* Validation and API error feedback */}
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
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className={styles.createButton}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Creating..." : "Create Team"}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
