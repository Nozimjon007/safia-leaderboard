import type { CSSProperties } from 'react';
import type { ClanId } from '../../lib/clans';
import { CLAN_COLOR_VAR } from '../../lib/clans';
import { initialsOf } from './Avatar';
import styles from './PortraitFallback.module.css';

interface PortraitFallbackProps {
  name: string;
  /** Tints the panel with the member's clan color when known — falls back to the everyday gold
   * accent so this never depends on clan data being present. */
  clanId?: ClanId | null;
  className?: string;
}

/**
 * The deliberate answer to "never leave an empty photo cavity": for a demo employee without a
 * licensed portrait, this fills the whole reserved space with a real, intentional design — bold
 * initials in the Safia League display face over a warm gradient and a soft radial "flour dust"
 * texture — never a shrunken generic icon floating in white space.
 */
export function PortraitFallback({ name, clanId, className }: PortraitFallbackProps) {
  const colorVar = clanId ? `var(${CLAN_COLOR_VAR[clanId]})` : 'var(--medal-gold)';
  return (
    <div className={`${styles.fallback} ${className ?? ''}`} aria-hidden="true" style={{ '--portrait-color': colorVar } as CSSProperties}>
      <span className={styles.grain} />
      <span className={styles.ring} />
      <span className={styles.initials}>{initialsOf(name)}</span>
    </div>
  );
}
