import { useEffect, useState, type FormEvent } from "react";

import Button from "../../../../components/button/Button";
import Modal from "../../../../components/modal/Modal";
import {
    USER_ROLE_OPTIONS,
    type User,
    type UserFormValues,
    type UserRole,
} from "../../usersTypes";
import styles from "../createUser/createUser.module.css";

interface EditUserProps {
    user: User | null;
    onClose: () => void;
    onUpdate: (values: UserFormValues) => void;
}

export default function EditUser({ user, onClose, onUpdate }: EditUserProps) {
    const [name, setName] = useState("");
    const [role, setRole] = useState<UserRole>("DEVELOPER");
    const [errors, setErrors] = useState<Partial<UserFormValues>>({});

    useEffect(() => {
        setName(user?.name ?? "");
        setRole(user?.role ?? "DEVELOPER");
        setErrors({});
    }, [user]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const newErrors: Partial<UserFormValues> = {};
        const trimmedName = name.trim();

        if (!trimmedName) {
            newErrors.name = "Name is required.";
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            onUpdate({ name: trimmedName, role });
        }
    };

    return (
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
                                <label htmlFor="edit-user-name">Name <span>*</span></label>
                                <input
                                    id="edit-user-name"
                                    type="text"
                                    autoComplete="name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    aria-invalid={Boolean(errors.name)}
                                    aria-describedby={errors.name ? "edit-user-name-error" : undefined}
                                />
                                {errors.name && (
                                    <small id="edit-user-name-error" className={styles.error}>
                                        {errors.name}
                                    </small>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="edit-user-role">Role <span>*</span></label>
                                <select
                                    id="edit-user-role"
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
                            <Button type="submit">Save Changes</Button>
                        </div>
                    </form>
                </>
            )}
        </Modal>
    );
}
