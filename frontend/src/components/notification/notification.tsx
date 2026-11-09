import styles from "./notification.module.css";

interface NotificationProps {
    type: "success" | "error" | "warning" | "info";
    message: string;
}

export default function Notification({
    type,
    message,
}: NotificationProps) {
    if (!message) return null;

    return (
        <div
            role={type === "error" ? "alert" : "status"}
            className={`${styles.notification} ${styles[type]}`}
        >
            {message}
        </div>
    );
}