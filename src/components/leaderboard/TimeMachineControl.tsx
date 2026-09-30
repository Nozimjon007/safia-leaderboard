import { useEffect, useState } from 'react';
import type { Member } from '../../data/types';
import type { TimeMachineState } from '../../hooks/useTimeMachine';
import type { TimeMachineCaption } from '../../lib/timeMachine';
import { categoryLabel, useI18n } from '../../i18n';
import { formatShortDate } from '../../lib/dates';
import { formatSigned } from '../../lib/format';
import styles from './TimeMachineControl.module.css';

const PLAY_INTERVAL_MS = 1000;

interface TimeMachineControlProps {
  tm: TimeMachineState;
  members: readonly Member[];
}

/** Turns a TimeMachineCaption into translated, ready-to-render text — reused by the small read-only
 * banner shown on the profile/compare pages, and by the season detail page's own timeline, wherever
 * the Time Machine's slider itself isn't rendered. */
export function formatTimeMachineCaption(
  caption: TimeMachineCaption,
  members: readonly Member[],
  t: ReturnType<typeof useI18n>['t'],
  locale: string,
): string {
  if (caption.kind === 'first_week') return t('time_machine_caption_first_week');
  if (caption.kind === 'no_notable_change') return t('time_machine_caption_no_change');
  const name = members.find((m) => m.id === caption.memberId)?.name ?? caption.memberId;
  const base = t('time_machine_caption_move', { name, from: caption.fromRank, to: caption.toRank });
  if (caption.category && caption.categoryDelta != null) {
    return t('time_machine_caption_move_category', {
      base,
      category: categoryLabel(t, caption.category),
      delta: formatSigned(caption.categoryDelta, locale),
    });
  }
  return base;
}

/** The Season Time Machine: a 13-ish-week slider that drives every other view from one consistent snapshot. */
export function TimeMachineControl({ tm, members }: TimeMachineControlProps) {
  const { t, locale } = useI18n();
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (tm.seasonOffset >= tm.maxOffset) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => tm.setSeasonOffset(tm.seasonOffset + 1), PLAY_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [playing, tm]);

  if (!tm.active) {
    return (
      <div className={styles.closed}>
        <button type="button" className="btn" onClick={() => tm.setActive(true)}>
          <span aria-hidden="true">🕐</span> {t('time_machine_open')}
        </button>
        <p className={styles.closedHint}>{t('time_machine_subtitle')}</p>
      </div>
    );
  }

  const atEnd = tm.seasonOffset >= tm.maxOffset;

  return (
    <section className={styles.panel} aria-labelledby="time-machine-heading">
      <div className={styles.head}>
        <h2 id="time-machine-heading">{t('time_machine_title')}</h2>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setPlaying(false);
            tm.setActive(false);
          }}
        >
          {t('time_machine_close')}
        </button>
      </div>
      <p className={styles.sub}>{t('time_machine_subtitle')}</p>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.playBtn}
          onClick={() => setPlaying((p) => !p)}
          aria-pressed={playing}
          disabled={atEnd && !playing}
          title={playing ? t('time_machine_pause') : t('time_machine_play')}
        >
          <span aria-hidden="true">{playing ? '⏸' : '▶'}</span>
          <span className="visually-hidden">{playing ? t('time_machine_pause') : t('time_machine_play')}</span>
        </button>
        <input
          type="range"
          min={0}
          max={tm.maxOffset}
          step={1}
          value={tm.seasonOffset}
          onChange={(e) => {
            setPlaying(false);
            tm.setSeasonOffset(Number(e.target.value));
          }}
          aria-label={t('time_machine_week_label')}
          aria-valuetext={t('time_machine_week_n', { n: tm.seasonOffset + 1, total: tm.maxOffset + 1 })}
          className={styles.slider}
        />
        <span className={`${styles.weekLabel} tabular`}>
          {t('time_machine_week_n', { n: tm.seasonOffset + 1, total: tm.maxOffset + 1 })}
          <span className={styles.weekDate}> · {formatShortDate(tm.weekDateISO)}</span>
        </span>
      </div>

      <p key={tm.seasonOffset} className={styles.caption} data-kind={tm.caption.kind} aria-live="polite">
        {formatTimeMachineCaption(tm.caption, members, t, locale)}
      </p>
    </section>
  );
}
