import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/button/Button";
import Notification from "../../components/notification/notification";
import { login } from "./loginApi";
import { saveSessionUser } from "./loginSession";
import styles from "./login.module.css";

export default function Login() {
    const navigate = useNavigate();
    const input = useRef<HTMLInputElement>(null);
    const [username, setUsername] = useState("");
    const [fieldError, setFieldError] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        document.title = "Log in | ScrumFlow";
    }, []);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isSubmitting) return;
        setSubmitError("");
        if (!username.trim()) {
            setFieldError("Enter your username.");
            input.current?.focus();
            return;
        }

        setIsSubmitting(true);
        try {
            const user = await login(username);
            saveSessionUser(user);
            navigate("/productbacklog", { replace: true, state: { fromLogin: true } });
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : "Unable to log in.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className={styles.page}>
            <header className={styles.brand}>
                <span className={styles.logo} aria-hidden="true"><i /><i /><i /></span>
                <span>ScrumFlow<small>Lifecycle Manager</small></span>
            </header>
            <div className={styles.crumb}>Workspace <span aria-hidden="true">›</span> <strong>Log in</strong></div>
            <div className={styles.rail} aria-hidden="true">
                <span className={styles.watermark}><i /><i /><i /></span>
            </div>
            <main className={styles.main}>
                <section className={styles.card} aria-labelledby="login-title">
                    <h1 id="login-title">Log in</h1>
                    <p id="login-description">Enter your username to open the Product Backlog.</p>
                    <form onSubmit={handleSubmit} noValidate>
                        <label htmlFor="login-username">Username</label>
                        <input id="login-username" name="username" ref={input}
                            autoComplete="username" autoCapitalize="none" spellCheck={false}
                            value={username} placeholder="Enter your username" required
                            readOnly={isSubmitting} aria-invalid={Boolean(fieldError)}
                            aria-describedby={fieldError ? "username-error" : "login-description"}
                            onChange={(event) => {
                                setUsername(event.target.value);
                                setFieldError("");
                                setSubmitError("");
                            }}
                        />
                        {fieldError && <span id="username-error" role="alert" className={styles.error}>{fieldError}</span>}
                        <Button type="submit" className={styles.submit} disabled={isSubmitting}>
                            {isSubmitting ? "Logging in…" : "Log in"}
                        </Button>
                    </form>
                    <span role="status" className={styles.srOnly}>{isSubmitting ? "Checking username." : ""}</span>
                    {submitError && <Notification type="error" message={submitError} />}
                </section>
            </main>
        </div>
    );
}
