import styles from "./modal.module.css";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    labelledBy?: string;
    children: React.ReactNode;
}

export default function Modal({
    isOpen,
    onClose,
    children,
}: ModalProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div
            className={styles.overlay}
            onClick={onClose}
        >
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="Close modal"
                >
                    ×
                </button>

                {children}
            </div>
        </div>
    );
}
