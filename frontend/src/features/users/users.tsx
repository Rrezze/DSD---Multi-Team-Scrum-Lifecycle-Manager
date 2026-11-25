import { useCallback, useEffect, useState } from "react";

import Button from "../../components/button/Button";
import { getUserAbsences, getUsers } from "./usersApi";
import CreateUser from "./components/createUser/createUser";
import UserTable from "./components/userTable/userTable";
import ViewUser from "./components/viewUser/viewUser";
import type {
    ApiUser,
    User,
} from "./usersTypes";
import { toUnavailabilityPeriod } from "./usersTypes";
import styles from "./users.module.css";

function toUser(apiUser: ApiUser): User {
    const name = [apiUser.first_name, apiUser.last_name]
        .filter(Boolean)
        .join(" ");

    return {
        ...apiUser,
        name: name || apiUser.username,
        unavailabilities: [],
        unavailabilitiesLoaded: false,
    };
}

export default function Users() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [userFetchError, setUserFetchError] = useState("");
    const [isLoadingAbsences, setIsLoadingAbsences] = useState(false);
    const [absenceFetchError, setAbsenceFetchError] = useState("");
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    const fetchAbsencesForUsers = useCallback(async (usersToLoad: User[]) => {
        setIsLoadingAbsences(true);
        setAbsenceFetchError("");

        const results = await Promise.allSettled(
            usersToLoad.map((user) => getUserAbsences(user.id))
        );
        const resultsByUserId = new Map(
            usersToLoad.map((user, index) => [user.id, results[index]] as const)
        );
        const failedCount = results.filter(
            (result) => result.status === "rejected"
        ).length;

        setUsers((currentUsers) =>
            currentUsers.map((currentUser) => {
                const result = resultsByUserId.get(currentUser.id);
                if (!result || result.status === "rejected") {
                    return currentUser;
                }

                return {
                    ...currentUser,
                    unavailabilities: result.value.map(toUnavailabilityPeriod),
                    unavailabilitiesLoaded: true,
                };
            })
        );
        if (failedCount > 0) {
            setAbsenceFetchError(
                `Failed to load absences for ${failedCount} user${failedCount === 1 ? "" : "s"}.`
            );
        }
        setIsLoadingAbsences(false);
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            setIsLoadingUsers(true);
            setUserFetchError("");
            setAbsenceFetchError("");
            const data = await getUsers();
            const usersWithNoAbsences = data.map(toUser);
            setUsers(usersWithNoAbsences);
            await fetchAbsencesForUsers(usersWithNoAbsences);
        } catch (error) {
            setUserFetchError(
                error instanceof Error ? error.message : "Failed to load users."
            );
        } finally {
            setIsLoadingUsers(false);
        }
    }, [fetchAbsencesForUsers]);

    useEffect(() => {
        void fetchUsers();
    }, [fetchUsers]);

    const selectedUser =
        users.find((user) => user.id === selectedUserId) ?? null;
    const handleUserCreated = (apiUser: ApiUser) => {
        const createdUser = {
            ...toUser(apiUser),
            unavailabilitiesLoaded: true,
        };
        setUsers((currentUsers) =>
            [...currentUsers, createdUser].sort((first, second) =>
                first.username.localeCompare(second.username)
            )
        );
    };

    const handleUserChange = (updatedUser: User) => {
        setUsers((currentUsers) =>
            currentUsers.map((user) =>
                user.id === updatedUser.id
                    ? updatedUser
                    : user
            )
        );
    };

    const handleUserDeleted = (userId: number) => {
        setUsers((currentUsers) =>
            currentUsers.filter((user) => user.id !== userId)
        );
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
                <CreateUser onCreated={handleUserCreated} />
            </div>

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

            {absenceFetchError && (
                <div role="alert">
                    <p>{absenceFetchError}</p>
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={isLoadingAbsences}
                        onClick={() =>
                            void fetchAbsencesForUsers(
                                users.filter((user) => !user.unavailabilitiesLoaded)
                            )
                        }
                    >
                        {isLoadingAbsences ? "Retrying..." : "Retry absences"}
                    </Button>
                </div>
            )}

            {isLoadingUsers ? (
                <p>Loading users...</p>
            ) : userFetchError ? (
                <div role="alert">
                    <p>{userFetchError}</p>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void fetchUsers()}
                    >
                        Retry
                    </Button>
                </div>
            ) : (
                <UserTable
                    users={users}
                    onUserClick={(user) => setSelectedUserId(user.id)}
                    onUserDelete={handleUserDeleted}
                />
            )}

            <ViewUser
                user={selectedUser}
                onClose={() => setSelectedUserId(null)}
                onUserChange={handleUserChange}
            />
        </main>
    );
}
