import { useState, type KeyboardEvent } from "react";

import {
    getUserRoleLabel,
    USER_ROLE_OPTIONS,
    UserRole,
    type User,
} from "../../usersTypes";
import DeleteUser from "../deleteUser/deleteUser";
import styles from "./userTable.module.css";

interface UserTableProps {
    users: User[];
    onUserClick: (user: User) => void;
    onUserDelete: (userId: number) => void;
}

const roleClassNames: Record<UserRole, string> = {
    [UserRole.PRODUCT_OWNER]: "productOwner",
    [UserRole.DEVELOPER]: "developer",
    [UserRole.ENGINEERING_MANAGER]: "engineeringManager",
};

function getUnavailabilityDays(user: User) {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;

    return user.unavailabilities.reduce((totalDays, period) => {
        const start = Date.parse(`${period.startDate}T00:00:00Z`);
        const end = Date.parse(`${period.endDate}T00:00:00Z`);
        return totalDays + Math.floor((end - start) / millisecondsPerDay) + 1;
    }, 0);
}

export default function UserTable({
    users,
    onUserClick,
    onUserDelete,
}: UserTableProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRole, setSelectedRole] = useState<UserRole | "">("");
    const searchValue = searchTerm.trim().toLowerCase();
    const filteredUsers = [...users]
        .sort((first, second) => first.id - second.id)
        .filter((user) =>
            (user.name.toLowerCase().includes(searchValue) ||
                user.username.toLowerCase().includes(searchValue) ||
                user.email.toLowerCase().includes(searchValue) ||
                getUserRoleLabel(user.role).toLowerCase().includes(searchValue)) &&
            (!selectedRole || user.role === selectedRole)
        );

    const handleRowKeyDown = (
        event: KeyboardEvent<HTMLTableRowElement>,
        user: User
    ) => {
        if (event.target !== event.currentTarget) return;

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onUserClick(user);
        }
    };

    return (
        <div className={styles.userTable}>
            <div className={styles.toolbar}>
                <div className={styles.searchContainer}>
                    <span className={styles.searchIcon} aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-4-4" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search users by name..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        aria-label="Search users"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            className={styles.clearSearchButton}
                            onClick={() => setSearchTerm("")}
                            aria-label="Clear search"
                        >
                            ×
                        </button>
                    )}
                </div>

                <div className={styles.filterGroup}>
                    <label htmlFor="user-role-filter">Role</label>
                    <select
                        id="user-role-filter"
                        value={selectedRole}
                        onChange={(event) => {
                            const nextRole = USER_ROLE_OPTIONS.find(
                                (option) => option.value === event.target.value
                            );
                            setSelectedRole(nextRole?.value ?? "");
                        }}
                    >
                        <option value="">All Roles</option>
                        {USER_ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {filteredUsers.length === 0 ? (
                <div className={styles.emptyState}>
                    {users.length === 0
                        ? "No users have been added yet."
                        : "No users match these filters."}
                </div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th scope="col">NAME</th>
                                <th scope="col">USERNAME</th>
                                <th scope="col">ROLE</th>
                                <th scope="col">UNAVAILABILITY</th>
                                <th scope="col">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => {
                                const unavailableDays = getUnavailabilityDays(user);

                                return (
                                    <tr
                                        key={user.id}
                                        className={styles.clickableRow}
                                        tabIndex={0}
                                        aria-label={`View ${user.name}`}
                                        onClick={() => onUserClick(user)}
                                        onKeyDown={(event) => handleRowKeyDown(event, user)}
                                    >
                                        <td className={styles.nameCell}>{user.name}</td>
                                        <td>{user.username}</td>
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
                                                    {user.unavailabilities.length === 1 ? "period" : "periods"}{" "}
                                                    ({unavailableDays}{" "}
                                                    {unavailableDays === 1 ? "day" : "days"})
                                                </span>
                                            ) : (
                                                "—"
                                            )}
                                        </td>
                                        <td>
                                            <DeleteUser
                                                user={user}
                                                onDeleted={onUserDelete}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
