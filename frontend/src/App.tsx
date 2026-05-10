import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from './store';
import AppShell from './components/layout/AppShell';
import SetupShell from './components/layout/SetupShell';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import HomePage from './pages/HomePage';
import ActionsPage from './pages/ActionsPage';
import FinancesPage from './pages/FinancesPage';
import JobsPage from './pages/JobsPage';
import EducationPage from './pages/EducationPage';
import TransportationPage from './pages/TransportationPage';
import HousingPage from './pages/HousingPage';
import PitcherPage from './pages/PitcherPage';
import ScrapbookPage from './pages/ScrapbookPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import ProfileReviewPage from './pages/ProfileReviewPage';

export default function App() {
  const token = useSelector((state: RootState) => state.auth.token);
  const isInGame = useSelector((state: RootState) => state.auth.isInGame);
  const isAlive = useSelector((state: RootState) => state.auth.isAlive);
  const isInitialized = useSelector((state: RootState) => state.auth.isInitialized);

  // Not logged in → login page
  if (!token) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  // Logged in but not in a game → lobby
  if (!isInGame) {
    return (
      <Routes>
        <Route path="*" element={<LobbyPage />} />
      </Routes>
    );
  }

  // In a game but not yet initialized → profile setup workflow
  if (!isInitialized) {
    return (
      <Routes>
        <Route
          path="/setup/*"
          element={
            <SetupShell>
              <Routes>
                <Route path="jobs" element={<JobsPage />} />
                <Route path="education" element={<EducationPage />} />
                <Route path="profile" element={<ProfileSetupPage />} />
                <Route path="review" element={<ProfileReviewPage />} />
                <Route path="*" element={<Navigate to="/setup/jobs" replace />} />
              </Routes>
            </SetupShell>
          }
        />
        <Route path="*" element={<Navigate to="/setup/jobs" replace />} />
      </Routes>
    );
  }

  // In a game → full app shell
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/actions" element={<ActionsPage />} />
        <Route path="/finances" element={<FinancesPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/education" element={<EducationPage />} />
        <Route path="/transportation" element={<TransportationPage />} />
        <Route path="/housing" element={<HousingPage />} />
        <Route path="/pitcher" element={<PitcherPage />} />
        <Route path="/scrapbook"
          element={isAlive ? <Navigate to="/" replace /> : <ScrapbookPage />}
        />
        <Route path="/setup/*" element={<Navigate to="/" replace />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </AppShell>
  );
}
