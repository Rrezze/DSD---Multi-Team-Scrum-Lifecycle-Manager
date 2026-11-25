import { useState, type FormEvent } from "react";

import Button from "../../../../components/button/Button";
import Modal from "../../../../components/modal/Modal";
import Notification from "../../../../components/notification/notification";
import { createUser } from "../../usersApi";
import { USER_ROLE_OPTIONS, UserRole, type ApiUser } from "../../usersTypes";
import styles from "./createUser.module.css";

interface CreateUserProps {
    onCreated: (user: ApiUser) => void;
}

export default function CreateUser({ onCreated }: CreateUserProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [username, setUsername] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [errors, setErrors] = useState<Partial<Record<"username", string>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [actionError, setActionError] = useState("");

    const handleOpen = () => {
        setUsername("");
        setFirstName("");
        setLastName("");
        setEmail("");
        setErrors({});
        setActionError("");
        setSuccessMessage("");
        setIsOpen(true);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;

        const newErrors: Partial<Record<"username", string>> = {};
        const trimmedUsername = username.trim();

        if (!trimmedUsername) {
            newErrors.username = "Username is required.";
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            setIsSubmitting(true);
            setActionError("");
            try {
                const user = await createUser({
                    username: trimmedUsername,
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    email: email.trim(),
                });
                onCreated(user);
                setIsOpen(false);
                setSuccessMessage("User created successfully!");
            } catch (error) {
                setActionError(
                    error instanceof Error ? error.message : "Failed to create user."
                );
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <>
            <div className={styles.actions}>
                <Notification type="success" message={successMessage} />
                <Notification type="error" message={actionError} />
                <Button type="button" onClick={handleOpen}>
                    + Create User
                </Button>
            </div>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                labelledBy="create-user-title"
            >
                <div className={styles.header}>
                    <div>
                        <span className={styles.eyebrow}>USERS</span>
                        <h2 id="create-user-title">Create new user</h2>
                        <p>Add a new user to your workspace.</p>
                    </div>
                </div>

                <form noValidate onSubmit={handleSubmit}>
                    <div className={styles.formBody}>
                        <div className={styles.formGroup}>
                            <label htmlFor="create-user-username">Username <span>*</span></label>
                            <input
                                id="create-user-username"
                                type="text"
                                autoComplete="username"
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                aria-invalid={Boolean(errors.username)}
                                aria-describedby={errors.username ? "create-user-username-error" : undefined}
                            />
                            {errors.username && (
                                <small id="create-user-username-error" className={styles.error}>
                                    {errors.username}
                                </small>
                            )}
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="create-user-first-name">First name</label>
                            <input
                                id="create-user-first-name"
                                type="text"
                                autoComplete="given-name"
                                value={firstName}
                                onChange={(event) => setFirstName(event.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="create-user-last-name">Last name</label>
                            <input
                                id="create-user-last-name"
                                type="text"
                                autoComplete="family-name"
                                value={lastName}
                                onChange={(event) => setLastName(event.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="create-user-email">Email</label>
                            <input
                                id="create-user-email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="create-user-role">Role</label>
                            <select
                                id="create-user-role"
                                value={UserRole.DEVELOPER}
                                disabled
                            >
                                {USER_ROLE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={styles.footer}>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Creating..." : "Create User"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
