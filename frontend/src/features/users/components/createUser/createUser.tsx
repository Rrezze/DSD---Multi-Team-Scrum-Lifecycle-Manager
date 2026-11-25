import { useEffect, useState, type FormEvent } from "react";

import Button from "../../../../components/button/Button";
import Modal from "../../../../components/modal/Modal";
import {
    USER_ROLE_OPTIONS,
    type UserFormValues,
    type UserRole,
} from "../../usersTypes";
import styles from "./createUser.module.css";

interface CreateUserProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (values: UserFormValues) => void;
}

export default function CreateUser({
    isOpen,
    onClose,
    onCreate,
}: CreateUserProps) {
    const [name, setName] = useState("");
    const [role, setRole] = useState<UserRole>("DEVELOPER");
    const [errors, setErrors] = useState<Partial<UserFormValues>>({});

    useEffect(() => {
        if (isOpen) {
            setName("");
            setRole("DEVELOPER");
            setErrors({});
        }
    }, [isOpen]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const newErrors: Partial<UserFormValues> = {};
        const trimmedName = name.trim();

        if (!trimmedName) {
            newErrors.name = "Name is required.";
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            onCreate({ name: trimmedName, role });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} labelledBy="create-user-title">
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
                        <label htmlFor="create-user-name">Name <span>*</span></label>
                        <input
                            id="create-user-name"
                            type="text"
                            autoComplete="name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            aria-invalid={Boolean(errors.name)}
                            aria-describedby={errors.name ? "create-user-name-error" : undefined}
                        />
                        {errors.name && (
                            <small id="create-user-name-error" className={styles.error}>
                                {errors.name}
                            </small>
                        )}
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="create-user-role">Role <span>*</span></label>
                        <select
                            id="create-user-role"
                            value={role}
                            disabled
                            onChange={(event) => {
                                const nextRole = USER_ROLE_OPTIONS.find(
                                    (option) => option.value === event.target.value
                                );
                                if (nextRole) setRole(nextRole.value);
                            }}
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
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit">Create User</Button>
                </div>
            </form>
        </Modal>
    );
}
