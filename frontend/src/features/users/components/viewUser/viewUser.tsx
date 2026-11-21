import { useEffect, useState, type FormEvent } from "react";

import Button from "../../../../components/button/Button";
import Modal from "../../../../components/modal/Modal";
import {
    getUserRoleLabel,
    type UnavailabilityPeriod,
    type User,
    type UserRole,
} from "../../usersTypes";
import styles from "./viewUser.module.css";

interface ViewUserProps {
    user: User | null;
    onClose: () => void;
    onEdit: (user: User) => void;
    onAddUnavailability: (
        userId: number,
        period: Omit<UnavailabilityPeriod, "id">
    ) => void;
    onRemoveUnavailability: (userId: number, periodId: number) => void;
    onUpdateUnavailability: (
        userId: number,
        periodId: number,
        period: Omit<UnavailabilityPeriod, "id">
    ) => void;
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

const roleClassNames: Record<UserRole, string> = {
    PRODUCT_OWNER: "productOwner",
    DEVELOPER: "developer",
    ENGINEERING_MANAGER: "engineeringManager",
};

export default function ViewUser({
    user,
    onClose,
    onEdit,
    onAddUnavailability,
    onRemoveUnavailability,
    onUpdateUnavailability,
}: ViewUserProps) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [errors, setErrors] = useState<UnavailabilityErrors>({});
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [editingPeriodId, setEditingPeriodId] = useState<number | null>(null);
    const today = getLocalDateValue(new Date());

    useEffect(() => {
        setStartDate("");
        setEndDate("");
        setErrors({});
        setIsUpdateModalOpen(false);
        setEditingPeriodId(null);
    }, [user?.id]);

    const handleAddUnavailability = (event: FormEvent<HTMLFormElement>) => {
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
        if (Object.keys(nextErrors).length > 0 || !user) return;

        if (editingPeriodId === null) {
            onAddUnavailability(user.id, { startDate, endDate });
        } else {
            onUpdateUnavailability(user.id, editingPeriodId, {
                startDate,
                endDate,
            });
        }
        setStartDate("");
        setEndDate("");
        setEditingPeriodId(null);
        setIsUpdateModalOpen(false);
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
            <Modal
                isOpen={user !== null}
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
                                    onClick={() => onEdit(user)}
                                >
                                    Edit User
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setIsUpdateModalOpen(true)}
                                >
                                    Manage Availability
                                </Button>
                            </div>
                        </div>

                        <div className={styles.details}>
                            <div className={styles.field}>
                                <label>User ID</label>
                                <p>{user.id}</p>
                            </div>
                            <div className={styles.field}>
                                <label>Name</label>
                                <p>{user.name}</p>
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
                            {upcomingPeriods.length > 0 ? (
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
                                            <span className={styles.periodDuration}>
                                                {getPeriodDays(period.startDate, period.endDate)} days
                                            </span>
                                            <button
                                                type="button"
                                                className={styles.removeChip}
                                                aria-label={`Remove unavailability ${period.startDate} to ${period.endDate}`}
                                                onClick={() =>
                                                    onRemoveUnavailability(
                                                        user.id,
                                                        period.id
                                                    )
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
                isOpen={user !== null && isUpdateModalOpen}
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
                                <Button type="submit">
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
                                                <span className={styles.periodDuration}>
                                                    {getPeriodDays(period.startDate, period.endDate)} days
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
                                                    onClick={() =>
                                                        onRemoveUnavailability(user.id, period.id)
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
        </>
    );
}
