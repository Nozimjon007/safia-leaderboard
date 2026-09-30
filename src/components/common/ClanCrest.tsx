import type { ClanId } from '../../lib/clans';

interface ClanCrestProps {
  clanId: ClanId;
  size?: number;
  className?: string;
  /** Omit only when a sibling text label already names the clan — otherwise this crest needs its
   * own accessible name (it's the only clan identifier in many compact contexts). */
  title?: string;
}

/** Simple, on-brand crest per clan — geometric shapes in `currentColor`, matching the app's existing
 * silhouette/placeholder icon style (plain shapes, not illustrative art). Color comes from whatever
 * sets `--clan-color` on an ancestor (see styles/clans.css) via `data-clan`. */
export function ClanCrest({ clanId, size = 28, className, title }: ClanCrestProps) {
  return (
    <span
      className={className}
      data-clan={clanId}
      style={{ display: 'inline-flex', color: 'var(--clan-color)', width: size, height: size }}
    >
      <svg viewBox="0 0 32 32" width={size} height={size} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
        {title && <title>{title}</title>}
        <circle cx="16" cy="16" r="15" fill="var(--clan-bg)" stroke="currentColor" strokeWidth="1.5" />
        {clanId === 'golden_crust' && (
          // A simple bread loaf: rounded top, three score marks.
          <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M8 20c0-5.5 3.6-9 8-9s8 3.5 8 9" />
            <path d="M8 20h16" />
            <path d="M13 12.5l1 4M16 11.5v4M19 12.5l-1 4" />
          </g>
        )}
        {clanId === 'saffron_rise' && (
          // A rising sun: arc + rays above a horizon line.
          <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M9 21a7 7 0 0 1 14 0" />
            <path d="M7 21h18" />
            <path d="M16 8v3M10.5 10.5l2 2M21.5 10.5l-2 2" />
          </g>
        )}
        {clanId === 'cinnamon_hearth' && (
          // A flame.
          <path
            fill="currentColor"
            d="M16 8c1.4 2.6-0.6 3.6-0.6 5.6 0 1.2.9 1.8 1.8 1.8 1.4 0 2-1.4 1.8-2.6 2.2 1.4 3.6 4 3.6 6.4 0 3.6-3 6.2-6.6 6.2s-6.6-2.6-6.6-6.2c0-3.6 2-6 3.4-7.8.9-1.1 2.4-2.3 3.2-3.4Z"
          />
        )}
        {clanId === 'honey_bloom' && (
          // A five-petal flower.
          <g fill="currentColor">
            {[0, 72, 144, 216, 288].map((deg) => (
              <ellipse key={deg} cx="16" cy="10.5" rx="3.1" ry="4.6" transform={`rotate(${deg} 16 16)`} opacity="0.92" />
            ))}
            <circle cx="16" cy="16" r="2.6" fill="var(--clan-bg)" stroke="currentColor" strokeWidth="1.3" />
          </g>
        )}
      </svg>
    </span>
  );
}
