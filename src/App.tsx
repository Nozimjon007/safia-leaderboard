import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider, useI18n } from './i18n';
import { ThemeProvider } from './theme/ThemeProvider';
import { ScoringConfigProvider } from './state/ScoringConfigProvider';
import { DatasetProvider } from './state/DatasetProvider';
import { Header } from './components/layout/Header';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { MemberProfilePage } from './pages/MemberProfilePage';
import { ComparePage } from './pages/ComparePage';
import { SeasonsPage } from './pages/SeasonsPage';
import { RewardsPage } from './pages/RewardsPage';
import { ScoringPage } from './pages/ScoringPage';
import { NotFoundPage } from './pages/NotFoundPage';
import styles from './App.module.css';

function SkipLink() {
  const { t } = useI18n();
  return (
    <a className="skip-link" href="#main">
      {t('skip_to_content')}
    </a>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LeaderboardPage />} />
      <Route path="/member/:id" element={<MemberProfilePage />} />
      <Route path="/compare" element={<ComparePage />} />
      <Route path="/seasons" element={<SeasonsPage />} />
      <Route path="/rewards" element={<RewardsPage />} />
      <Route path="/scoring" element={<ScoringPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <ScoringConfigProvider>
          <DatasetProvider>
            <BrowserRouter>
              <SkipLink />
              <Header />
              <main id="main" className={`container ${styles.main}`} tabIndex={-1}>
                <AppRoutes />
              </main>
            </BrowserRouter>
          </DatasetProvider>
        </ScoringConfigProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
