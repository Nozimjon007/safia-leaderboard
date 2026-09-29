import type { CSSProperties } from 'react';
import styles from './Avatar.module.css';

interface AvatarProps {
  id: string;
  name: string;
  photoUrl: string | null;
  size?: number;
  className?: string;
}

function hashHue(seed: string): number {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function Avatar({ id, name, photoUrl, size = 40, className }: AvatarProps) {
  const style = {
    '--av-h': hashHue(id),
    width: size,
    height: size,
    fontSize: Math.round(size * 0.36),
  } as CSSProperties;

  if (photoUrl) {
    return (
      <span className={`${styles.avatar} ${className ?? ''}`} style={style}>
        <img src={photoUrl} alt="" loading="lazy" />
      </span>
    );
  }
  return (
    <span className={`${styles.avatar} ${className ?? ''}`} style={style} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}
