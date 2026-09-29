import type { ReactNode } from 'react';
import styles from './StateMessage.module.css';

interface StateMessageProps {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  role?: 'alert' | 'status';
  dashed?: boolean;
}

/** Shared shell for empty and error states. */
export function StateMessage({ title, body, action, role, dashed = true }: StateMessageProps) {
  return (
    <div className={`${styles.state} ${dashed ? styles.dashed : ''}`} role={role} aria-live={role ? 'assertive' : undefined}>
      <h2 className={styles.title}>{title}</h2>
      {body && <p className={styles.body}>{body}</p>}
      {action}
    </div>
  );
}
