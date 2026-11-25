import { useEffect, useState, type FormEvent } from "react";

import Button from "../../../../components/button/Button";
import Modal from "../../../../components/modal/Modal";
import Notification from "../../../../components/notification/notification";
import EditUser from "../editUser/editUser";
import {
    createUserAbsence,
    deleteUserAbsence,
    getUserAbsences,
    replaceUserAbsence,
} from "../../usersApi";
import {
    getUserRoleLabel,
    toUnavailabilityPeriod,
    UserRole,
    type ApiAbsence,
    type CreateAbsencePayload,
    type UnavailabilityPeriod,
    type User,
} from "../../usersTypes";
import styles from "./viewUser.module.css";

interface ViewUserProps {
    user: User | null;
    onClose: () => void;
    onUserChange: (user: User) => void;
}

type UnavailabilityErrors = Partial<
    Record<"startDate" | "endDate", string>
>;

function getLocalDateValue(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString();
}

function getPeriodDays(startDate: string, endDate: string) {
    const start = new Date(`${startDate}T00:00:00`).getTime();
    const end = new Date(`${endDate}T00:00:00`).getTime();
    return Math.round((end - start) / 86_400_000) + 1;
}

function getPeriodDuration(period: UnavailabilityPeriod) {
    return period.hours === null
        ? `${getPeriodDays(period.startDate, period.endDate)} days`
        : `${period.hours} hours`;
}

const roleClassNames: Record<UserRole, string> = {
    [UserRole.PRODUCT_OWNER]: "productOwner",
    [UserRole.DEVELOPER]: "developer",
    [UserRole.ENGINEERING_MANAGER]: "engineeringManager",
};

export default function ViewUser({
    user,
    onClose,
    onUserChange,
}: ViewUserProps) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [errors, setErrors] = useState<UnavailabilityErrors>({});
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isEditUserOpen, setIsEditUserOpen] = useState(false);
    const [editingPeriodId, setEditingPeriodId] = useState<number | null>(null);
    const [isLoadingAbsences, setIsLoadingAbsences] = useState(false);
    const [absenceFetchError, setAbsenceFetchError] = useState("");
    const [absenceActionError, setAbsenceActionError] = useState("");
    const [absenceRetryCount, setAbsenceRetryCount] = useState(0);
    const [isSubmittingAbsence, setIsSubmittingAbsence] = useState(false);
    const [deletingAbsenceId, setDeletingAbsenceId] = useState<number | null>(null);
    const today = getLocalDateValue(new Date());

    useEffect(() => {
        setStartDate("");
        setEndDate("");
        setErrors({});
        setIsUpdateModalOpen(false);
        setIsEditUserOpen(false);
        setEditingPeriodId(null);
        setAbsenceFetchError("");
        setAbsenceActionError("");
    }, [user?.id]);

    useEffect(() => {
        if (!user || user.unavailabilitiesLoaded) return;

        let isActive = true;
        setIsLoadingAbsences(true);
        setAbsenceFetchError("");

        void getUserAbsences(user.id)
            .then((absences) => {
                if (!isActive) return;
                onUserChange({
                    ...user,
                    unavailabilities: absences.map(toUnavailabilityPeriod),
                    unavailabilitiesLoaded: true,
                });
            })
            .catch((error: unknown) => {
                if (!isActive) return;
                setAbsenceFetchError(
                    error instanceof Error
                        ? error.message
                        : "Failed to load user absences."
                );
            })
            .finally(() => {
                if (isActive) setIsLoadingAbsences(false);
            });

        return () => {
            isActive = false;
        };
    }, [user?.id, user?.unavailabilitiesLoaded, absenceRetryCount]);

    const handleRemoveUnavailability = async (periodId: number) => {
        if (!user || deletingAbsenceId !== null) return;

        setDeletingAbsenceId(periodId);
        setAbsenceActionError("");
        try {
            await deleteUserAbsence(periodId);
            const updatedPeriods = user.unavailabilities.filter(
                (period) => period.id !== periodId
            );
            onUserChange({ ...user, unavailabilities: updatedPeriods });
            console.log("User unavailability periods:", updatedPeriods);
        } catch (error) {
            setAbsenceActionError(
                error instanceof Error
                    ? error.message
                    : "Failed to remove the absence."
            );
        } finally {
            setDeletingAbsenceId(null);
        }
    };

    const handleAddUnavailability = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        const nextErrors: UnavailabilityErrors = {};

        if (!startDate) {
            nextErrors.startDate = "Start date is required.";
        } else if (editingPeriodId === null && startDate < today) {
            nextErrors.startDate = "Start date must be today or later.";
        }

        if (!endDate) {
            nextErrors.endDate = "End date is required.";
        } else if (startDate && endDate < startDate) {
            nextErrors.endDate = "End date must be on or after the start date.";
        }

        setErrors(nextErrors);
        if (
            Object.keys(nextErrors).length > 0 ||
            !user ||
            isSubmittingAbsence ||
            !user.unavailabilitiesLoaded
        ) return;

        setIsSubmittingAbsence(true);
        setAbsenceActionError("");
        try {
            let savedAbsence: ApiAbsence;
            if (editingPeriodId === null) {
                savedAbsence = await createUserAbsence(user.id, {
                    start_date: startDate,
                    end_date: endDate,
                });
            } else {
                const existing = user.unavailabilities.find(
                    (period) => period.id === editingPeriodId
                );
                if (!existing) {
                    throw new Error("The absence being edited could not be found.");
                }

                const replacement: CreateAbsencePayload = {
                    start_date: startDate,
                    end_date: endDate,
                    reason: existing.reason,
                    hours: startDate === endDate ? existing.hours : null,
                };
                savedAbsence = await replaceUserAbsence(
                    user.id,
                    {
                        id: existing.id,
                        user: user.id,
                        start_date: existing.startDate,
                        end_date: existing.endDate,
                        reason: existing.reason,
                        hours: existing.hours,
                    },
                    replacement
                );
            }

            const savedPeriod = toUnavailabilityPeriod(savedAbsence);
            const updatedPeriods = editingPeriodId === null
                ? [...user.unavailabilities, savedPeriod]
                : user.unavailabilities.map((period) =>
                    period.id === editingPeriodId ? savedPeriod : period
                );
            onUserChange({
                ...user,
                unavailabilities: updatedPeriods,
                unavailabilitiesLoaded: true,
            });
            console.log("User unavailability periods:", updatedPeriods);
            setStartDate("");
            setEndDate("");
            setEditingPeriodId(null);
            setIsUpdateModalOpen(false);
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : "Failed to save the absence.";
            setAbsenceActionError(message);

            if (editingPeriodId !== null) {
                try {
                    const absences = await getUserAbsences(user.id);
                    onUserChange({
                        ...user,
                        unavailabilities: absences.map(toUnavailabilityPeriod),
                        unavailabilitiesLoaded: true,
                    });
                } catch (refreshError) {
                    const refreshMessage = refreshError instanceof Error
                        ? refreshError.message
                        : "Failed to refresh user absences.";
                    setAbsenceActionError(
                        `${message} Could not refresh the absence list: ${refreshMessage}`
                    );
                }
            }
        } finally {
            setIsSubmittingAbsence(false);
        }
    };

    const upcomingPeriods = (user?.unavailabilities ?? [])
        .filter((period) => period.endDate >= today)
        .sort((first, second) =>
            first.startDate.localeCompare(second.startDate)
        );
    const initials = user?.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();

    return (
        <>
            <Notification type="error" message={absenceActionError} />
            <Modal
                isOpen={user !== null && !isEditUserOpen}
                onClose={onClose}
                labelledBy="user-details-title"
            >
                {user && (
                    <div className={styles.container}>
                        <div className={styles.header}>
                            <div className={styles.userHeading}>
                                <span className={styles.avatar} aria-hidden="true">
                                    {initials}
                                </span>
                                <div>
                                <p className={styles.eyebrow}>VIEW USER</p>
                                <h2 id="user-details-title" className={styles.title}>
                                    {user.name}
                                </h2>
                                    <span
                                        className={`${styles.roleBadge} ${styles[roleClassNames[user.role]]}`}
                                    >
                                        {getUserRoleLabel(user.role)}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.headerActions}>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={isLoadingAbsences}
                                    onClick={() => setIsEditUserOpen(true)}
                                >
                                    Edit User
                                </Button>
                                <Button
                                    type="button"
                                    disabled={isLoadingAbsences || Boolean(absenceFetchError)}
                                    onClick={() => setIsUpdateModalOpen(true)}
                                >
                                    Manage Unavailability
                                </Button>
                            </div>
                        </div>

                        <div className={styles.details}>
                            <div className={styles.field}>
                                <label>User ID</label>
                                <p>{user.id}</p>
                            </div>
                            <div className={styles.field}>
                                <label>Username</label>
                                <p>{user.username}</p>
                            </div>
                            <div className={styles.field}>
                                <label>First name</label>
                                <p>{user.first_name || "—"}</p>
                            </div>
                            <div className={styles.field}>
                                <label>Last name</label>
                                <p>{user.last_name || "—"}</p>
                            </div>
                            <div className={styles.field}>
                                <label>Email</label>
                                <p>{user.email || "—"}</p>
                            </div>
                            <div className={styles.field}>
                                <label>Role</label>
                                <p>{getUserRoleLabel(user.role)}</p>
                            </div>
                        </div>

                        <section className={styles.unavailability}>
                            <div className={styles.unavailabilityHeader}>
                                <h3>Unavailability ({upcomingPeriods.length})</h3>
                            </div>
                            {isLoadingAbsences ? (
                                <p>Loading absences...</p>
                            ) : absenceFetchError ? (
                                <div role="alert">
                                    <p>{absenceFetchError}</p>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() =>
                                            setAbsenceRetryCount((count) => count + 1)
                                        }
                                    >
                                        Retry
                                    </Button>
                                </div>
                            ) : upcomingPeriods.length > 0 ? (
                                <ul className={styles.chipList}>
                                    {upcomingPeriods.map((period) => (
                                        <li key={period.id} className={styles.chip}>
                                            <span className={styles.periodIcon} aria-hidden="true">
                                                <svg viewBox="0 0 24 24">
                                                    <rect x="3" y="5" width="18" height="16" rx="2" />
                                                    <path d="M16 3v4M8 3v4M3 11h18" />
                                                </svg>
                                            </span>
                                            <span className={styles.periodDates}>
                                                {formatDate(period.startDate)} – {formatDate(period.endDate)}
                                            </span>
                                            {period.reason && (
                                                <span className={styles.periodReason}>
                                                    {period.reason}
                                                </span>
                                            )}
                                            <span className={styles.periodDuration}>
                                                {getPeriodDuration(period)}
                                            </span>
                                            <button
                                                type="button"
                                                className={styles.removeChip}
                                                aria-label={`Remove unavailability ${period.startDate} to ${period.endDate}`}
                                                disabled={deletingAbsenceId !== null}
                                                onClick={() =>
                                                    void handleRemoveUnavailability(period.id)
                                                }
                                            >
                                                ×
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className={styles.emptyPeriods}>
                                    No upcoming unavailability periods.
                                </p>
                            )}
                        </section>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={user !== null && isUpdateModalOpen && !isLoadingAbsences && !absenceFetchError}
                onClose={() => {
                    setIsUpdateModalOpen(false);
                    onClose();
                }}
                labelledBy="update-unavailability-title"
            >
                {user && (
                    <>
                        <div className={styles.manageHeader}>
                            <span className={styles.manageIcon} aria-hidden="true">
                                <svg viewBox="0 0 24 24">
                                    <rect x="3" y="5" width="18" height="16" rx="2" />
                                    <path d="M16 3v4M8 3v4M3 11h18" />
                                </svg>
                            </span>
                            <h2 id="update-unavailability-title">
                                Manage Unavailability
                            </h2>
                            <p>
                                Add, edit, or remove unavailability periods for {user.name}.
                            </p>
                        </div>

                        <div className={styles.manageContent}>
                            <form
                                className={styles.manageForm}
                                onSubmit={handleAddUnavailability}
                            >
                                <h3>
                                    {editingPeriodId === null
                                        ? "Add Unavailability"
                                        : "Edit Unavailability"}
                                </h3>
                                <div className={styles.dateField}>
                                    <label htmlFor="unavailability-start">
                                        Start date <span>*</span>
                                    </label>
                                    <input
                                        id="unavailability-start"
                                        type="date"
                                        min={editingPeriodId === null ? today : undefined}
                                        value={startDate}
                                        onChange={(event) =>
                                            setStartDate(event.target.value)
                                        }
                                        aria-invalid={Boolean(errors.startDate)}
                                        aria-describedby={
                                            errors.startDate
                                                ? "unavailability-start-error"
                                                : undefined
                                        }
                                    />
                                    {errors.startDate && (
                                        <small
                                            id="unavailability-start-error"
                                            className={styles.error}
                                        >
                                            {errors.startDate}
                                        </small>
                                    )}
                                </div>
                                <div className={styles.dateField}>
                                    <label htmlFor="unavailability-end">
                                        End date <span>*</span>
                                    </label>
                                    <input
                                        id="unavailability-end"
                                        type="date"
                                        min={startDate || today}
                                        value={endDate}
                                        onChange={(event) =>
                                            setEndDate(event.target.value)
                                        }
                                        aria-invalid={Boolean(errors.endDate)}
                                        aria-describedby={
                                            errors.endDate
                                                ? "unavailability-end-error"
                                                : undefined
                                        }
                                    />
                                    {errors.endDate && (
                                        <small
                                            id="unavailability-end-error"
                                            className={styles.error}
                                        >
                                            {errors.endDate}
                                        </small>
                                    )}
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isSubmittingAbsence}
                                >
                                    {editingPeriodId === null
                                        ? "+ Add Period"
                                        : "Save Changes"}
                                </Button>
                            </form>

                            <section className={styles.existingPeriods}>
                                <h3>Existing Periods ({upcomingPeriods.length})</h3>
                                {upcomingPeriods.length === 0 ? (
                                    <p className={styles.emptyPeriods}>
                                        No upcoming periods.
                                    </p>
                                ) : (
                                    <ul className={styles.periodList}>
                                        {upcomingPeriods.map((period) => (
                                            <li key={period.id} className={styles.periodRow}>
                                                <span className={styles.periodIcon} aria-hidden="true">
                                                    <svg viewBox="0 0 24 24">
                                                        <rect x="3" y="5" width="18" height="16" rx="2" />
                                                        <path d="M16 3v4M8 3v4M3 11h18" />
                                                    </svg>
                                                </span>
                                                <span className={styles.periodDates}>
                                                    {formatDate(period.startDate)} – {formatDate(period.endDate)}
                                                </span>
                                                {period.reason && (
                                                    <span className={styles.periodReason}>
                                                        {period.reason}
                                                    </span>
                                                )}
                                                <span className={styles.periodDuration}>
                                                    {getPeriodDuration(period)}
                                                </span>
                                                <button
                                                    type="button"
                                                    className={styles.periodAction}
                                                    aria-label={`Edit unavailability ${period.startDate} to ${period.endDate}`}
                                                    onClick={() => {
                                                        setEditingPeriodId(period.id);
                                                        setStartDate(period.startDate);
                                                        setEndDate(period.endDate);
                                                        setErrors({});
                                                    }}
                                                >
                                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                                        <path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`${styles.periodAction} ${styles.deletePeriod}`}
                                                    aria-label={`Delete unavailability ${period.startDate} to ${period.endDate}`}
                                                    disabled={deletingAbsenceId !== null}
                                                    onClick={() =>
                                                        void handleRemoveUnavailability(period.id)
                                                    }
                                                >
                                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                                        <path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" />
                                                    </svg>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </div>
                    </>
                )}
            </Modal>

            <EditUser
                user={isEditUserOpen ? user : null}
                onClose={() => {
                    setIsEditUserOpen(false);
                    onClose();
                }}
                onUpdate={onUserChange}
            />
        </>
    );
}
