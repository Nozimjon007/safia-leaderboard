import { Link, useLocation } from 'react-router-dom';
import { CATEGORY_KEYS } from '../data/types';
import { categoryLabel, categoryOriginalLabel, useI18n } from '../i18n';
import { useScoringConfig } from '../state/ScoringConfigProvider';
import { formatDateRange } from '../lib/dates';
import { ZoneBadge } from '../components/common/ZoneBadge';
import styles from './ScoringPage.module.css';

export function ScoringPage() {
  const { t, locale } = useI18n();
  const location = useLocation();
  const { config, setConfig, resetConfig, isCustomized } = useScoringConfig();
  const weightSum = CATEGORY_KEYS.reduce((sum, c) => sum + (Number(config.weights[c]) || 0), 0);
  const backHref = { pathname: '/', search: location.search };
  const params = new URLSearchParams(location.search);
  const rawFrom = params.get('from');
  const rawTo = params.get('to');
  const selectedRangeText = rawFrom && rawTo ? formatDateRange(rawFrom, rawTo, locale) : null;

  function setWeight(category: (typeof CATEGORY_KEYS)[number], value: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    setConfig((prev) => ({ ...prev, weights: { ...prev.weights, [category]: clamped } }));
  }

  return (
    <article className={styles.doc}>
      <div className={styles.crumbs}>
        <Link className={styles.backLink} to={backHref}>
          ← {t('back_to_leaderboard')}
        </Link>
      </div>

      <h1 className={styles.h1}>{t('scoring_title')}</h1>

      <div className={styles.warn} role="note">
        <b>{t('scoring_unverified_title')}</b>
        <p>{t('scoring_unverified_body')}</p>
      </div>

      {selectedRangeText && <p className={styles.note}>{t('ranking_selected_period', { range: selectedRangeText })}</p>}

      <h2>{t('ranking_eligibility_title')}</h2>
      <p>{t('ranking_eligibility_body')}</p>

      <h2>{t('ranking_finality_title')}</h2>
      <p>{t('ranking_finality_body')}</p>
      <p className={styles.note}>{t('ranking_search_note')}</p>

      <h2>{t('scoring_overall_title')}</h2>
      <p>{t('scoring_overall_body')}</p>
      <p className={styles.note}>{t('scoring_overall_evidence')}</p>

      <h2>{t('scoring_weights_title')}</h2>
      <div className={styles.weightGrid}>
        {CATEGORY_KEYS.map((c) => (
          <label key={c} className={styles.weightField}>
            {categoryLabel(t, c)}
            <small>{categoryOriginalLabel(t, c)}</small>
            <input
              className="input"
              type="number"
              min={0}
              max={100}
              step={1}
              value={config.weights[c]}
              onChange={(e) => setWeight(c, Number(e.target.value))}
              aria-label={`${categoryLabel(t, c)} ${t('scoring_weights_title')}`}
            />
          </label>
        ))}
      </div>
      <p className={`tabular ${styles.sumLine}`} aria-live="polite">
        {t('scoring_weights_sum', { n: weightSum })}
      </p>
      {isCustomized && (
        <button type="button" className="btn" onClick={resetConfig}>
          {t('scoring_weights_reset')}
        </button>
      )}

      <h2>{t('scoring_categories_title')}</h2>
      <div className={styles.catGrid}>
        {CATEGORY_KEYS.map((c) => (
          <div key={c} className={styles.catCard}>
            <h3>{categoryLabel(t, c)}</h3>
            <p className={styles.catOriginal}>
              {t('scoring_original_label')}: {categoryOriginalLabel(t, c)}
            </p>
            <p>{t('scoring_category_pending')}</p>
          </div>
        ))}
      </div>
      <p className={styles.note}>{t('ranking_category_view_note')}</p>

      <h2>{t('scoring_zones_title')}</h2>
      <p>{t('scoring_zones_body')}</p>
      <div className={styles.zoneGrid}>
        <label className={styles.weightField}>
          {t('scoring_green_from')}
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            value={config.greenThreshold}
            onChange={(e) => setConfig((prev) => ({ ...prev, greenThreshold: Math.max(0, Math.min(100, Number(e.target.value))) }))}
          />
        </label>
        <label className={styles.weightField}>
          {t('scoring_attention_below')}
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            value={config.attentionThreshold}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, attentionThreshold: Math.max(0, Math.min(100, Number(e.target.value))) }))
            }
          />
        </label>
      </div>
      <div className={styles.zonePreview}>
        <ZoneBadge zone="good" />
        <span className={styles.zoneRange}>≥ {config.greenThreshold}</span>
        <ZoneBadge zone="mid" />
        <span className={styles.zoneRange}>
          {config.attentionThreshold}–{config.greenThreshold}
        </span>
        <ZoneBadge zone="low" />
        <span className={styles.zoneRange}>&lt; {config.attentionThreshold}</span>
      </div>

      <h2>{t('scoring_rules_title')}</h2>
      <ul className={styles.ruleList}>
        {(['scoring_rule_1', 'scoring_rule_2', 'scoring_rule_3', 'scoring_rule_4', 'scoring_rule_5', 'scoring_rule_6'] as const).map(
          (key) => (
            <li key={key}>{t(key)}</li>
          ),
        )}
      </ul>

      <h2>{t('scoring_dev_title')}</h2>
      <p lang="en" className={styles.devNote}>
        All data is read through a single <code>DataSource.load()</code> call (see <code>src/data/dataSource.ts</code>). Replace
        the demo implementation with one that calls the real API — reusing whatever authentication/session the app already
        runs under — and resolve the same shape: members (id, display name, area/team, shift, optional photo URL) and, per
        member, one value per category per calendar week (<code>null</code> for a week with no logged value, never 0). Still
        needed before this can go live: the official category definitions and data sources, the real weights (and any extra
        rules) behind the overall score, confirmation of the 80 / 65 zone thresholds and whether they apply to categories too,
        the shift and area/team assignment source, and member photos with permission to display them.
      </p>
    </article>
  );
}
