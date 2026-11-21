import { useState } from "react";

import Button from "../../components/button/Button";
import Notification from "../../components/notification/notification";
import CreateUser from "./components/createUser/createUser";
import EditUser from "./components/editUser/editUser";
import UserTable from "./components/userTable/userTable";
import ViewUser from "./components/viewUser/viewUser";
import type {
    UnavailabilityPeriod,
    User,
    UserFormValues,
    UserRole,
} from "./usersTypes";
import {
    getUserRoleLabel,
    USER_ROLE_OPTIONS,
} from "./usersTypes";
import styles from "./users.module.css";

export default function Users() {
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRole, setSelectedRole] = useState<UserRole | "">("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [successMessage, setSuccessMessage] = useState("");
    const selectedUser =
        users.find((user) => user.id === selectedUserId) ?? null;
    const filteredUsers = users.filter((user) => {
        const searchValue = searchTerm.trim().toLowerCase();
        return (
            (user.name.toLowerCase().includes(searchValue) ||
                getUserRoleLabel(user.role).toLowerCase().includes(searchValue)) &&
            (!selectedRole || user.role === selectedRole)
        );
    });

    const handleCreateModalOpen = () => {
        setSuccessMessage("");
        setIsCreateModalOpen(true);
    };

    const handleEditUser = (user: User) => {
        setSelectedUserId(null);
        setSuccessMessage("");
        setUserToEdit(user);
    };

    const handleCreateUser = (values: UserFormValues) => {
        setUsers((currentUsers) => {
            const nextId = currentUsers.reduce(
                (maxId, user) => Math.max(maxId, user.id),
                0
            ) + 1;

            return [
                ...currentUsers,
                { id: nextId, ...values, unavailabilities: [] },
            ];
        });
        setIsCreateModalOpen(false);
        setSuccessMessage("User created successfully!");
    };

    const handleUpdateUser = (values: UserFormValues) => {
        if (!userToEdit) {
            return;
        }

        setUsers((currentUsers) =>
            currentUsers.map((user) =>
                user.id === userToEdit.id
                    ? { ...user, ...values }
                    : user
            )
        );
        setUserToEdit(null);
        setSuccessMessage("User updated successfully!");
    };

    const handleAddUnavailability = (
        userId: number,
        period: Omit<UnavailabilityPeriod, "id">
    ) => {
        const user = users.find((currentUser) => currentUser.id === userId);
        if (!user) return;

        const nextId = user.unavailabilities.reduce(
            (maxId, currentPeriod) => Math.max(maxId, currentPeriod.id),
            0
        ) + 1;
        const updatedPeriods = [
            ...user.unavailabilities,
            { id: nextId, ...period },
        ];

        setUsers((currentUsers) =>
            currentUsers.map((currentUser) =>
                currentUser.id === userId
                    ? { ...currentUser, unavailabilities: updatedPeriods }
                    : currentUser
            )
        );
        console.log("User unavailability periods:", updatedPeriods);
    };

    const handleRemoveUnavailability = (
        userId: number,
        periodId: number
    ) => {
        const user = users.find((currentUser) => currentUser.id === userId);
        if (!user) return;

        const updatedPeriods = user.unavailabilities.filter(
            (period) => period.id !== periodId
        );

        setUsers((currentUsers) =>
            currentUsers.map((currentUser) =>
                currentUser.id === userId
                    ? { ...currentUser, unavailabilities: updatedPeriods }
                    : currentUser
            )
        );
        console.log("User unavailability periods:", updatedPeriods);
    };

    const handleUpdateUnavailability = (
        userId: number,
        periodId: number,
        values: Omit<UnavailabilityPeriod, "id">
    ) => {
        const user = users.find((currentUser) => currentUser.id === userId);
        if (!user) return;

        const updatedPeriods = user.unavailabilities.map((period) =>
            period.id === periodId ? { ...period, ...values } : period
        );

        setUsers((currentUsers) =>
            currentUsers.map((currentUser) =>
                currentUser.id === userId
                    ? { ...currentUser, unavailabilities: updatedPeriods }
                    : currentUser
            )
        );
        console.log("User unavailability periods:", updatedPeriods);
    };

    return (
        <main className={styles.page}>
            <div className={styles.panelHeader}>
                <div>
                    <h1 className={styles.title}>Users</h1>
                    <p className={styles.description}>
                        Manage users, their roles, and availability.
                    </p>
                </div>
                <Button type="button" onClick={handleCreateModalOpen}>
                    + Create User
                </Button>
            </div>

            <Notification type="success" message={successMessage} />

            <section
                className={styles.memberSummaryCard}
                aria-labelledby="member-summary-title"
            >
                <span className={styles.memberSummaryIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                </span>
                <div>
                    <h2
                        id="member-summary-title"
                        className={styles.memberSummaryTitle}
                    >
                        Total members
                    </h2>
                    <p className={styles.memberSummaryDetails}>
                        <strong>{users.length}</strong>                        
                    </p>
                </div>
            </section>

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

            <UserTable
                users={filteredUsers}
                emptyMessage={
                    searchTerm.trim() || selectedRole
                        ? "No users match these filters."
                        : "No users have been added yet."
                }
                onUserClick={(user) => setSelectedUserId(user.id)}
            />

            <CreateUser
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateUser}
            />

            <EditUser
                user={userToEdit}
                onClose={() => setUserToEdit(null)}
                onUpdate={handleUpdateUser}
            />

            <ViewUser
                user={selectedUser}
                onClose={() => setSelectedUserId(null)}
                onEdit={handleEditUser}
                onAddUnavailability={handleAddUnavailability}
                onRemoveUnavailability={handleRemoveUnavailability}
                onUpdateUnavailability={handleUpdateUnavailability}
            />
        </main>
    );
}
