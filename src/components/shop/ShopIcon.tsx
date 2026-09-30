import type { ShopCategory } from '../../lib/shop';

/** One small, consistent line-icon per catalog item — the "attractive, consistent product
 * imagery" the spec asks for in place of a bare emoji. Deliberately simple geometric strokes (not
 * photographic), so every item reads at the same visual weight regardless of category. */
function IconPath({ id }: { id: string }) {
  switch (id) {
    case 'embroidered_apron':
      return (
        <>
          <path d="M9 3h6l1 5-2 1v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V9l-2-1 1-5Z" />
          <path d="M9 13h6" />
        </>
      );
    case 'polo_workwear':
      return (
        <>
          <path d="M8 4 4 7l2 3 2-1.5V20h8V8.5L18 10l2-3-4-3-2 2h-4L8 4Z" />
          <path d="M11 4v3l1 1 1-1V4" />
        </>
      );
    case 'jacket':
      return (
        <>
          <path d="M8 3 4 6v15h5V11l3 3 3-3v10h5V6l-4-3-2 3h-2L8 3Z" />
          <path d="M12 9v10" />
        </>
      );
    case 'baking_masterclass':
      return (
        <>
          <path d="M6 10a6 6 0 0 1 12 0v1H6v-1Z" />
          <path d="M5 11h14l-1 3H6l-1-3Z" />
          <path d="M9 21v-4M12 21v-4M15 21v-4" />
          <path d="M18 3v5M16.5 4.5h3" />
        </>
      );
    case 'course_voucher':
      return (
        <>
          <rect x="3.5" y="6" width="17" height="12" rx="1.5" />
          <path d="M3.5 10a2 2 0 0 0 0 4M20.5 10a2 2 0 0 1 0 4" />
          <path d="M12 8v8" strokeDasharray="1.5 2" />
        </>
      );
    case 'ceo_conversation':
      return (
        <>
          <path d="M4 5h11v7H9l-3 3v-3H4V5Z" />
          <path d="M13 10h7v6h-2v3l-3-3h-2v-2" />
        </>
      );
    case 'dinner_with_leadership':
      return (
        <>
          <path d="M7 3v8a2 2 0 1 1-4 0V3M5 11v10" />
          <path d="M12 3c-1.2 0-2 1.8-2 4s.8 4 2 4 2-1.8 2-4-.8-4-2-4Z" />
          <path d="M12 11v10" />
          <path d="M18 3s-1.5 1.5-1.5 4S18 11 18 11s1.5-1.5 1.5-4S18 3 18 3Z" />
          <path d="M18 11v10" />
        </>
      );
    default:
      return <circle cx="12" cy="12" r="7" />;
  }
}

export function ShopIcon({ itemId }: { itemId: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <IconPath id={itemId} />
    </svg>
  );
}

export const CATEGORY_ACCENT_VAR: Record<ShopCategory, string> = {
  merchandise: '--accent',
  learning: '--cat-4',
  experiences: '--cat-5',
};
