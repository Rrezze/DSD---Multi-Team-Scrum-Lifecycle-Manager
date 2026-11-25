import { useState } from "react";

import Button from "../../../../components/button/Button";
import Modal from "../../../../components/modal/Modal";
import { deleteUser } from "../../usersApi";
import type { User } from "../../usersTypes";
import confirmationStyles from "../createUser/createUser.module.css";
import styles from "./deleteUser.module.css";
import tableStyles from "../userTable/userTable.module.css";

interface DeleteUserProps {
    user: User;
    onDeleted: (userId: number) => void;
}

export default function DeleteUser({ user, onDeleted }: DeleteUserProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const titleId = `delete-user-title-${user.id}`;

    const handleDelete = async () => {
        if (isDeleting) return;

        setIsDeleting(true);
        setErrorMessage("");
        try {
            await deleteUser(user.id);
            setIsOpen(false);
            onDeleted(user.id);
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : "Failed to delete user."
            );
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <button
                type="button"
                className={tableStyles.deleteButton}
                aria-label={`Delete ${user.username}`}
                title={`Delete ${user.username}`}
                onClick={(event) => {
                    event.stopPropagation();
                    setErrorMessage("");
                    setIsOpen(true);
                }}
            >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" />
                </svg>
            </button>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                labelledBy={titleId}
            >
                <div className={confirmationStyles.header}>
                    <span className={confirmationStyles.eyebrow}>USERS</span>
                    <h2 id={titleId}>Delete user</h2>
                </div>
                <div className={confirmationStyles.formBody}>
                    <p className={styles.confirmationText}>
                        Are you sure you want to delete{" "}
                        <strong>{user.username}</strong>?
                    </p>
                    {errorMessage && (
                        <small className={confirmationStyles.error} role="alert">
                            {errorMessage}
                        </small>
                    )}
                </div>
                <div className={confirmationStyles.footer}>
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={isDeleting}
                        onClick={() => setIsOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="danger"
                        disabled={isDeleting}
                        onClick={() => void handleDelete()}
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                </div>
            </Modal>
        </>
    );
}
