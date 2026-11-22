
/**
 * Team List Component
 *
 * Displays the available teams and allows the user
 * to select a team to view its details.
 */

import { useState } from "react";
import type { Team } from "../../teamsTypes";
import styles from "./teamList.module.css";

interface TeamListProps {
    teams: Team[];
    selectedTeamId: number | null;
    onSelectTeam: (team: Team) => void;
}

export default function TeamList({
    teams,
    selectedTeamId,
    onSelectTeam,
}: TeamListProps) {
    const [searchTerm, setSearchTerm] = useState("");

    // Filter teams by name while the user types.
    const filteredTeams = teams.filter((team) =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Generate initials without including the word "Team".
    const getTeamInitials = (name: string) => {
        const words = name
            .replace(/&/g, "")
            .split(/\s+/)
            .filter(Boolean)

        return words
            .slice(0, 2)
            .map((word) => word[0])
            .join("")
            .toUpperCase();
    };

    return (
        <section className={styles.teamList}>
            <div className={styles.header}>
                <h2>Teams</h2>
                <span className={styles.teamCount}>{teams.length}</span>
            </div>

            <div className={styles.searchContainer}>
                <svg
                    className={styles.searchIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                </svg>

                <input
                    type="search"
                    placeholder="Search teams..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    aria-label="Search teams"
                    className={styles.searchInput}
                />
            </div>

            <div className={styles.teamItems}>
                {filteredTeams.length > 0 ? (
                    filteredTeams.map((team) => (
                        <button
                            key={team.id}
                            type="button"
                            className={`${styles.teamCard} ${
                                selectedTeamId === team.id
                                    ? styles.selected
                                    : ""
                            }`}
                            onClick={() => onSelectTeam(team)}
                            aria-pressed={selectedTeamId === team.id}
                        >
                            <span className={styles.teamAvatar}>
                                {getTeamInitials(team.name)}
                            </span>

                            <span className={styles.teamInfo}>
                                <span className={styles.teamName}>
                                    {team.name}
                                </span>

                                <span className={styles.memberCount}>
                                    {team.memberCount} members
                                </span>
                            </span>

                            <span
                                className={styles.selectArrow}
                                aria-hidden="true"
                            >
                                ›
                            </span>
                        </button>
                    ))
                ) : (
                    <p className={styles.emptyMessage}>
                        No teams found.
                    </p>
                )}
            </div>
        </section>
    );
}
