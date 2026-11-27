
/**
 * Add Members Component
 *
 * Displays developers who are not assigned to another team.
 * Allows the Engineering Manager to select multiple developers
 * and add them to the selected team.
 */

import { useState } from "react";
import Modal from "../../../../components/modal/Modal";
import type { User } from "../../../../types/userTypes";
import styles from "./addMembers.module.css";

interface AddMembersProps {
    teamName: string;
    availableDevelopers: User[];
    onClose: () => void;
    onConfirm: (selectedMembers: User[]) => void;
}

export default function AddMembers({
    teamName,
    availableDevelopers,
    onClose,
    onConfirm,
}: AddMembersProps) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Select or deselect a developer.
    const handleToggle = (userId: number) => {
        setSelectedIds((currentIds) =>
            currentIds.includes(userId)
                ? currentIds.filter((id) => id !== userId)
                : [...currentIds, userId]
        );
    };

    // Return the selected developers to the parent component.
    const handleConfirm = () => {
        const selectedMembers = availableDevelopers.filter((user) =>
            selectedIds.includes(user.id)
        );

        onConfirm(selectedMembers);
    };

    return (
        <Modal isOpen={true} onClose={onClose}>
            <div className={styles.addMembersPage}>
                <header className={styles.pageHeader}>
                    <h1 id="add-members-title">Add Members</h1>
                    <p>
                        Select developers to add to <strong>{teamName}</strong>.
                    </p>
                </header>

                <div className={styles.content}>
                    <div className={styles.selectionCount}>
                        {selectedIds.length} developer(s) selected
                    </div>

                    <div className={styles.developerList}>
                        {availableDevelopers.length > 0 ? (
                            availableDevelopers.map((user) => (
                                <label
                                    key={user.id}
                                    className={styles.developerOption}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(user.id)}
                                        onChange={() => handleToggle(user.id)}
                                    />

                                    <div className={styles.developerInfo}>
                                        <strong>{user.name}</strong>
                                        <span>{user.email}</span>
                                        <small>{user.role}</small>
                                    </div>
                                </label>
                            ))
                        ) : (
                            <p className={styles.emptyState}>
                                No available developers to add.
                            </p>
                        )}
                    </div>
                </div>

                <div className={styles.formActions}>
                    <button
                        type="button"
                        className={styles.cancelButton}
                        onClick={onClose}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={handleConfirm}
                        disabled={selectedIds.length === 0}
                    >
                        Confirm Assignment
                    </button>
                </div>
            </div>
        </Modal>
    );
}
