import { useEffect, useState, type FormEvent } from "react";

import Button from "../../../../components/button/Button";
import Modal from "../../../../components/modal/Modal";
import Notification from "../../../../components/notification/notification";
import type { User } from "../../usersTypes";
import { USER_ROLE_OPTIONS } from "../../usersTypes";
import { updateUser } from "../../usersApi";
import styles from "../createUser/createUser.module.css";

interface EditUserProps {
    user: User | null;
    onClose: () => void;
    onUpdate: (user: User) => void;
}

export default function EditUser({ user, onClose, onUpdate }: EditUserProps) {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [actionError, setActionError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user) {
            setFirstName(user.first_name);
            setLastName(user.last_name);
            setEmail(user.email);
            setSuccessMessage("");
            setActionError("");
        }
    }, [user?.id]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!user || isSubmitting) return;

        setIsSubmitting(true);
        setActionError("");
        try {
            const updatedUser = await updateUser(user.id, {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: email.trim(),
            });
            const name = [updatedUser.first_name, updatedUser.last_name]
                .filter(Boolean)
                .join(" ");
            onUpdate({
                ...user,
                ...updatedUser,
                name: name || updatedUser.username,
            });
            setSuccessMessage("User updated successfully!");
            onClose();
        } catch (error) {
            setActionError(
                error instanceof Error ? error.message : "Failed to update user."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Notification type="success" message={successMessage} />
            <Modal isOpen={user !== null} onClose={onClose} labelledBy="edit-user-title">
                {user && (
                    <>
                        <div className={styles.header}>
                            <div>
                                <span className={styles.eyebrow}>USERS</span>
                                <h2 id="edit-user-title">Edit User</h2>
                            </div>
                        </div>

                        <form noValidate onSubmit={handleSubmit}>
                            <div className={styles.formBody}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="edit-user-first-name">First name</label>
                                    <input
                                        id="edit-user-first-name"
                                        type="text"
                                        autoComplete="given-name"
                                        value={firstName}
                                        onChange={(event) => setFirstName(event.target.value)}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="edit-user-last-name">Last name</label>
                                    <input
                                        id="edit-user-last-name"
                                        type="text"
                                        autoComplete="family-name"
                                        value={lastName}
                                        onChange={(event) => setLastName(event.target.value)}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="edit-user-email">Email</label>
                                    <input
                                        id="edit-user-email"
                                        type="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="edit-user-role">Role</label>
                                    <select
                                        id="edit-user-role"
                                        value={user.role}
                                        disabled
                                    >
                                        {USER_ROLE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {actionError && (
                                    <small className={styles.error} role="alert">
                                        {actionError}
                                    </small>
                                )}
                            </div>

                            <div className={styles.footer}>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={isSubmitting}
                                    onClick={onClose}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    </>
                )}
            </Modal>
        </>
    );
}
