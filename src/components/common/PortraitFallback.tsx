import type { CSSProperties } from 'react';
import { hashHue, initialsOf } from './Avatar';
import styles from './PortraitFallback.module.css';

interface PortraitFallbackProps {
  id: string;
  name: string;
  className?: string;
}

/**
 * The deliberate answer to "never leave an empty photo cavity": for a demo employee without a
 * licensed portrait, this fills the whole reserved space with a real, intentional design — bold
 * monogram initials in the Safia Atelier display face over a warm per-person gradient, a fine
 * medallion ring, a soft grain texture, and a small wheat-sprig mark — never a shrunken generic icon
 * floating in white space, and never a fabricated photo of a real person standing in for someone
 * who doesn't exist.
 *
 * The color is hashed from the member's id (see Avatar.tsx's hashHue) — the same hue Avatar falls
 * back to everywhere else, so one person reads as the same person in a table row, a card, and here,
 * never a color tied to their clan (already shown by the crest right alongside this).
 */
export function PortraitFallback({ id, name, className }: PortraitFallbackProps) {
  return (
    <div className={`${styles.fallback} ${className ?? ''}`} aria-hidden="true" style={{ '--av-h': hashHue(id) } as CSSProperties}>
      <span className={styles.grain} />
      <span className={styles.ring} />
      <span className={styles.ringInner} />
      <span className={styles.initials}>{initialsOf(name)}</span>
      <svg className={styles.sprig} viewBox="0 0 48 20" aria-hidden="true">
        <path d="M4 18c8-10 16-14 40-14" />
        <path d="M12 13c1.5-3 4-4.5 6-5M20 9.5c1.5-3 4-4.5 6-5M28 6.5c1.5-2.5 3.5-4 5.5-4.5" />
      </svg>
    </div>
  );
}
