import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { StateMessage } from '../components/common/StateMessage';

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <StateMessage
      title="404"
      body={t('state_empty_body')}
      action={
        <Link className="btn btnPrimary" to="/">
          {t('back_to_leaderboard')}
        </Link>
      }
    />
  );
}
