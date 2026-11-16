import { useEffect, useState } from "react";

import styles from "./notification.module.css";

const NOTIFICATION_DURATION_MS = 15_000;

interface NotificationProps {
    type: "success" | "error" | "warning" | "info";
    message: string;
}

export default function Notification({
    type,
    message,
}: NotificationProps) {
    const [isVisible, setIsVisible] = useState(Boolean(message));

    useEffect(() => {
        if (!message) {
            setIsVisible(false);
            return;
        }

        setIsVisible(true);

        const timeoutId = window.setTimeout(
            () => setIsVisible(false),
            NOTIFICATION_DURATION_MS
        );

        return () => window.clearTimeout(timeoutId);
    }, [message, type]);

    if (!message || !isVisible) return null;

    return (
        <div
            role={type === "error" ? "alert" : "status"}
            className={`${styles.notification} ${styles[type]}`}
        >
            {message}
            <button
                type="button"
                className={styles.closeButton}
                aria-label="Close notification"
                onClick={() => setIsVisible(false)}
            >
                ×
            </button>
        </div>
    );
}