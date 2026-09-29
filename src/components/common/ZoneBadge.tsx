import type { Zone } from '../../data/types';
import type { TranslationKey } from '../../i18n/locales/en';
import { useI18n } from '../../i18n';
import { zoneBgVar, zoneColorVar, zoneGlyph } from '../../lib/zoneStyle';
import styles from './ZoneBadge.module.css';

export function ZoneBadge({ zone, className }: { zone: Zone; className?: string }) {
  const { t } = useI18n();
  const label = t(`zone_${zone}` as TranslationKey);
  return (
    <span
      className={`${styles.badge} ${className ?? ''}`}
      style={{ color: zoneColorVar(zone), background: zoneBgVar(zone) }}
    >
      <span aria-hidden="true">{zoneGlyph(zone)}</span> {label}
    </span>
  );
}
