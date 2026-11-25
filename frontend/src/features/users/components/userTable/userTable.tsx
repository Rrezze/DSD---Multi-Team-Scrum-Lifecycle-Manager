import type { KeyboardEvent } from "react";

import {
    getUserRoleLabel,
    type User,
    type UserRole,
} from "../../usersTypes";
import styles from "./userTable.module.css";

interface UserTableProps {
    users: User[];
    emptyMessage: string;
    onUserClick: (user: User) => void;
}

const roleClassNames: Record<UserRole, string> = {
    PRODUCT_OWNER: "productOwner",
    DEVELOPER: "developer",
    ENGINEERING_MANAGER: "engineeringManager",
};

export default function UserTable({
    users,
    emptyMessage,
    onUserClick,
}: UserTableProps) {
    const handleRowKeyDown = (
        event: KeyboardEvent<HTMLTableRowElement>,
        user: User
    ) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onUserClick(user);
        }
    };

    if (users.length === 0) {
        return (
            <div className={styles.emptyState}>
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th scope="col">ID</th>
                        <th scope="col">NAME</th>
                        <th scope="col">ROLE</th>
                        <th scope="col">UNAVAILABILITY</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user, index) => (
                        <tr
                            key={user.id}
                            className={styles.clickableRow}
                            tabIndex={0}
                            aria-label={`View ${user.name}`}
                            onClick={() => onUserClick(user)}
                            onKeyDown={(event) => handleRowKeyDown(event, user)}
                        >
                            <td>{index + 1}</td>
                            <td className={styles.nameCell}>{user.name}</td>
                            <td>
                                <span
                                    className={`${styles.roleBadge} ${styles[roleClassNames[user.role]]}`}
                                >
                                    {getUserRoleLabel(user.role)}
                                </span>
                            </td>
                            <td>
                                {user.unavailabilities.length > 0 ? (
                                    <span className={styles.periodCount}>
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <rect x="3" y="5" width="18" height="16" rx="2" />
                                            <path d="M16 3v4M8 3v4M3 11h18" />
                                        </svg>
                                        {user.unavailabilities.length}{" "}
                                        {user.unavailabilities.length === 1 ? "period" : "periods"}
                                    </span>
                                ) : (
                                    "—"
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
