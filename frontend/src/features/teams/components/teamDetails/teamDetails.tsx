
/**
 * Team Details Component
 *
 * Displays the selected team's information, total capacity,
 * member list, team actions and developer drop zone.
 */

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";

import type { Team } from "../../teamsTypes";
import styles from "./teamDetails.module.css";

interface TeamDetailsProps {
    team: Team | null;
    onEditTeam: (team: Team) => void;
    onDeleteTeam: (team: Team) => void;
    onRemoveMember: (teamId: number, userId: number) => void;
    onAddMembers: (team: Team) => void;

}

/**
 * Generate initials for the selected team.
 * Examples: Platform Team = PT, Data & Analytics Team = DA.
 */
function getTeamInitials(name: string): string {
    const words = name
        .replace(/&/g, "")
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 2 && words[1].toLowerCase() === "team") {
        return words.map((word) => word[0]).join("").toUpperCase();
    }

    const meaningfulWords = words.filter(
        (word) => word.toLowerCase() !== "team"
    );

    return meaningfulWords
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();
}

/**
 * Generate initials for a developer's avatar.
 */
function getMemberInitials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

export default function TeamDetails({
    team,
    onEditTeam,
    onDeleteTeam,
    onRemoveMember,
    onAddMembers,
}: TeamDetailsProps) {
    // Controls the visibility of the three-dot actions menu.
    const [menuOpen, setMenuOpen] = useState(false);

    // Register the developer drop zone with the drag-and-drop system.
    const { setNodeRef, isOver } = useDroppable({
        id: "team-drop-zone",
    });

    if (!team) {
        return (
            <section className={styles.teamDetails}>
                <div className={styles.emptyState}>
                    <h2>No team selected</h2>
                    <p>Select a team to view its members and capacity.</p>
                </div>
            </section>
        );
    }

    return (
        <section className={styles.teamDetails}>
            {/* Selected team heading */}
            <div className={styles.teamHeader}>
                <div className={styles.teamIdentity}>
                    <div className={styles.teamAvatar}>
                        {getTeamInitials(team.name)}
                    </div>

                    <div className={styles.teamHeading}>
                        <h2>{team.name}</h2>
                        <p>{team.description}</p>
                    </div>
                </div>

                {/* Three-dot team actions */}
                <div className={styles.menuContainer}>
                    <button
                        type="button"
                        className={styles.menuButton}
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-label="Team actions"
                        aria-expanded={menuOpen}
                        aria-haspopup="true"
                    >
                        <span aria-hidden="true">•••</span>
                    </button>

                    {menuOpen && (
                        <div className={styles.actionMenu}>
                            {/* Edit team */}
                            <button
                                type="button"
                                className={styles.iconAction}
                                onClick={() => {
                                    setMenuOpen(false);
                                    onEditTeam(team);
                                }}
                                aria-label="Edit team"
                                title="Edit team"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.9"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                                </svg>
                            </button>

                            {/* Delete team */}
                            <button
                                type="button"
                                className={`${styles.iconAction} ${styles.deleteAction}`}
                                onClick={() => {
                                    setMenuOpen(false);
                                    onDeleteTeam(team);
                                }}
                                aria-label="Delete team"
                                title="Delete team"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.9"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M3 6h18" />
                                    <path d="M8 6V4h8v2" />
                                    <path d="m19 6-1 14H6L5 6" />
                                    <path d="M10 11v5M14 11v5" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Total team capacity */}
            <div className={styles.capacityCard}>
                <div className={styles.capacityIcon}>
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
                        <path d="m3 12 9 5 9-5" />
                        <path d="m3 16 9 5 9-5" />
                    </svg>
                </div>

                <span className={styles.capacityLabel}>
                    Total Team Capacity
                </span>

                <div className={styles.capacityDivider} />

                <strong className={styles.capacityValue}>
                    {team.capacityPoints !== undefined
                        ? `${team.capacityPoints} PTS`
                        : "—"}
                </strong>
            </div>

            {/* Team members */}
            <div className={styles.membersSection}>
                <div className={styles.membersHeader}>
                    <div className={styles.membersTitle}>
                        <h3>Team Members</h3>
                    </div>

                    <button
                        type="button"
                        className={styles.addMembersButton}
                        onClick={() => onAddMembers(team)}
                        title="Use drag and drop to add developers"
                    >
                        + Add Members
                    </button>
                </div>

                {team.members.length > 0 ? (
                    <div className={styles.membersTable}>
                        <div className={styles.tableHeader}>
                            <span>MEMBER</span>
                            <span>ROLE</span>
                            <span>CAPACITY</span>

                            <span />
                        </div>


                    {team.members.map((member) => (
                        <div
                            className={styles.memberRow}
                            key={member.user.id}
                        >
                            {/* Member name and avatar */}
                            <div className={styles.memberIdentity}>
                                <div className={styles.memberAvatar}>
                                    {getMemberInitials(member.user.name)}
                                </div>

                                <span className={styles.memberName}>
                                    {member.user.name}
                                </span>
                            </div>

                            {/* Member role */}
                            <span className={styles.memberRole}>
                                {member.user.role}
                            </span>

                            {/* Individual capacity points */}
                            <span className={styles.memberCapacity}>
                                {member.capacityPoints !== undefined
                                    ? `${member.capacityPoints} PTS`
                                    : "—"}
                            </span>

                            {/* Remove member action */}
                            <button
                                type="button"
                                className={styles.removeMemberButton}
                                onClick={() =>
                                    onRemoveMember(team.id, member.user.id)
                                }
                                aria-label={`Remove ${member.user.name} from ${team.name}`}
                                title="Remove member"
                            >
                                ×
                            </button>
                        </div>
                    ))}

                    </div>
                ) : (
                    <p className={styles.emptyMembers}>
                        No members assigned to this team yet.
                    </p>
                )}
            </div>

            {/* Developer drop zone */}
            <div
                ref={setNodeRef}
                className={`${styles.dropZone} ${
                    isOver ? styles.dropZoneActive : ""
                }`}
            >
                <span className={styles.dropIcon} aria-hidden="true">
                    ↓
                </span>

                <span>
                    {isOver
                        ? "Release to add developer to team"
                        : "Drop developers here to add to team"}
                </span>
            </div>
        </section>
    );
}
