import { useState, type FormEvent } from "react";

import Button from "../../../../components/button/Button";
import Modal from "../../../../components/modal/Modal";
import type { SprintDraft, SprintPayload } from "../../sprintPlanningTypes";
import {
    addCalendarDays,
    formatSprintDate,
    getSprintDurationDays,
    getTodayDateInputValue,
} from "../../sprintPlanningUtils";
import styles from "./sprintForm.module.css";

interface SprintFormProps {
    isOpen: boolean;
    sprint: SprintDraft | null;
    sprints: SprintDraft[];
    onClose: () => void;
    onSubmit: (payload: SprintPayload) => Promise<void>;
}

const durationOptions = [7, 14, 21, 28];

function getDefaultStartDate(sprints: SprintDraft[]): string {
    const today = getTodayDateInputValue();
    const latestEndDate = sprints.reduce(
        (latest, sprint) => sprint.endDate > latest ? sprint.endDate : latest,
        ""
    );
    if (!latestEndDate) return today;
    const dayAfterLastSprint = addCalendarDays(latestEndDate, 1);
    return dayAfterLastSprint > today ? dayAfterLastSprint : today;
}

export default function SprintForm({
    isOpen,
    sprint,
    sprints,
    onClose,
    onSubmit,
}: SprintFormProps) {
    const initialDuration = sprint ? getSprintDurationDays(sprint) : 14;
    const [name, setName] = useState(sprint?.name ?? "");
    const [startDate, setStartDate] = useState(
        sprint?.startDate ?? getDefaultStartDate(sprints)
    );
    const [duration, setDuration] = useState(
        durationOptions.includes(initialDuration) ? String(initialDuration) : "custom"
    );
    const [customDuration, setCustomDuration] = useState(
        durationOptions.includes(initialDuration) ? 14 : initialDuration
    );
    const [goal, setGoal] = useState(sprint?.goal ?? "");
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const durationDays = duration === "custom" ? customDuration : Number(duration);
    const endDate = startDate && Number.isInteger(durationDays) && durationDays > 0
        ? addCalendarDays(startDate, durationDays - 1)
        : "";

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Enter a sprint name.");
            return;
        }
        if (trimmedName.length > 100) {
            setError("Sprint names must be 100 characters or fewer.");
            return;
        }
        if (!startDate || !endDate) {
            setError("Choose a start date and a valid sprint duration.");
            return;
        }
        if (durationDays < 1 || durationDays > 365) {
            setError("Sprint duration must be between 1 and 365 days.");
            return;
        }

        const overlaps = sprints.some((existing) =>
            existing.id !== sprint?.id
            && startDate <= existing.endDate
            && endDate >= existing.startDate
        );
        if (overlaps) {
            setError("This sprint overlaps with another sprint. Choose different dates.");
            return;
        }

        setIsSaving(true);
        try {
            await onSubmit({
                name: trimmedName,
                start_date: startDate,
                end_date: endDate,
                goal: goal.trim(),
            });
            onClose();
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Unable to save the sprint."
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            labelledBy="sprint-form-title"
        >
            <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
                <header className={styles.header}>
                    <p className={styles.eyebrow}>SPRINT PLANNING</p>
                    <h2 id="sprint-form-title">
                        {sprint ? "Edit sprint" : "Create sprint"}
                    </h2>
                    <p>Set the sprint dates and goal for all teams.</p>
                </header>

                <label className={styles.field}>
                    <span>Sprint name <span className={styles.required}>*</span></span>
                    <input
                        autoFocus
                        maxLength={100}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="e.g. Sprint 8"
                        required
                    />
                </label>

                <div className={styles.dateFields}>
                    <label className={styles.field}>
                        <span>Start date <span className={styles.required}>*</span></span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(event) => setStartDate(event.target.value)}
                            required
                        />
                    </label>
                    <label className={styles.field}>
                        <span>Duration</span>
                        <select
                            value={duration}
                            onChange={(event) => setDuration(event.target.value)}
                        >
                            {durationOptions.map((days) => (
                                <option key={days} value={days}>
                                    {days / 7} {days === 7 ? "week" : "weeks"}
                                </option>
                            ))}
                            <option value="custom">Custom</option>
                        </select>
                    </label>
                </div>

                {duration === "custom" && (
                    <label className={styles.field}>
                        <span>Duration in days</span>
                        <input
                            type="number"
                            min={1}
                            max={365}
                            value={customDuration}
                            onChange={(event) => setCustomDuration(Number(event.target.value))}
                        />
                    </label>
                )}

                <label className={styles.field}>
                    <span>End date</span>
                    <input
                        type="text"
                        value={endDate ? formatSprintDate(endDate) : ""}
                        readOnly
                        aria-label="Calculated end date"
                    />
                    <small>Calculated from the start date and duration.</small>
                </label>

                <label className={styles.field}>
                    <span>Sprint goal</span>
                    <textarea
                        value={goal}
                        onChange={(event) => setGoal(event.target.value)}
                        rows={3}
                        placeholder="What should the team achieve?"
                    />
                </label>

                <p className={styles.notice}>
                    This sprint will be available to all active teams.
                </p>

                {error && <p className={styles.error} role="alert">{error}</p>}

                <footer className={styles.actions}>
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? "Saving..." : sprint ? "Save changes" : "Create sprint"}
                    </Button>
                </footer>
            </form>
        </Modal>
    );
}
