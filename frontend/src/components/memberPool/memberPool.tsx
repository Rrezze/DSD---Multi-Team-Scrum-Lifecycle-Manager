
/**
 * MemberPool Component
 *
 * Displays developers who are available to be assigned to a team.
 * Each developer can be dragged into a team's member drop zone.
 */

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { CSSProperties } from "react";

import type { User } from "../../types/userTypes";
import styles from "./memberPool.module.css";

interface MemberPoolProps {
    users: User[];
    title?: string;
    onSelectMember?: (user: User) => void;
}

/**
 * Individual draggable developer card.
 *
 * Each card has a unique drag ID and carries its user data
 * so the drop zone can identify which developer was dragged.
 */
function DraggableDeveloper({
    user,
    onSelectMember,
}: {
    user: User;
    onSelectMember?: (user: User) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging,
    } = useDraggable({
        id: `developer-${user.id}`,
        data: {
            user,
        },
    });

    // Apply the drag position while the developer is being moved.
    const dragStyle: CSSProperties = {
        transform: transform
            ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            : undefined,
        opacity: isDragging ? 0 : 1,
        cursor: isDragging ? "grabbing" : "grab",
    };

    return (
        <div
            ref={setNodeRef}
            className={styles.memberCard}
            style={dragStyle}
            {...attributes}
            {...listeners}
            role="button"
            tabIndex={0}
            onClick={() => onSelectMember?.(user)}
            aria-label={`Drag ${user.name} to assign to a team`}
        >
            <div className={styles.avatar}>
                {user.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
            </div>

            <div className={styles.memberInfo}>
                <span className={styles.memberName}>
                    {user.name}
                </span>

                <span className={styles.memberRole}>
                    {user.role}
                </span>
            </div>
        </div>
    );
}

export default function MemberPool({
    users,
    title = "Available Developers",
    onSelectMember,
}: MemberPoolProps) {
    // Stores the search text entered by the user.
    const [searchTerm, setSearchTerm] = useState("");

    // Filter developers by name, email or role.
    const filteredUsers = users.filter((user) => {
        const searchValue = searchTerm.toLowerCase();

        return (
            user.name.toLowerCase().includes(searchValue) ||
            user.email.toLowerCase().includes(searchValue) ||
            user.role.toLowerCase().includes(searchValue)
        );
    });

    return (
        <section className={styles.memberPool}>
            <div className={styles.header}>
                <h2>{title}</h2>
                <span className={styles.userCount}>{users.length}</span>
            </div>

            {/* Developer search */}
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
                    placeholder="Search developers..."
                    aria-label="Search developers"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className={styles.searchInput}
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

            {/* Available developers */}
            <div className={styles.memberList}>
                {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                        <DraggableDeveloper
                            key={user.id}
                            user={user}
                            onSelectMember={onSelectMember}
                        />
                    ))
                ) : (
                    <p className={styles.emptyMessage}>
                        No developers found.
                    </p>
                )}
            </div>
        </section>
    );
}
