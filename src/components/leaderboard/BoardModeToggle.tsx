import type { BoardMode } from '../../data/types';
import { useI18n } from '../../i18n';

interface BoardModeToggleProps {
  mode: BoardMode;
  onChange: (mode: BoardMode) => void;
}

/** The Season Results hero's Solo/Clans switch — reuses the app's shared .segment control style
 * (see BoardToolbar's metric/view segments) rather than inventing a new toggle treatment. */
export function BoardModeToggle({ mode, onChange }: BoardModeToggleProps) {
  const { t } = useI18n();
  return (
    <div className="segment" role="group" aria-label={t('board_mode_group_label')}>
      <button type="button" aria-pressed={mode === 'solo'} onClick={() => onChange('solo')}>
        {t('board_mode_solo')}
      </button>
      <button type="button" aria-pressed={mode === 'clans'} onClick={() => onChange('clans')}>
        {t('board_mode_clans')}
      </button>
    </div>
  );
}
