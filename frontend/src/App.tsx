import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from './store';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import ActionsPage from './pages/ActionsPage';
import FinancesPage from './pages/FinancesPage';
import JobsPage from './pages/JobsPage';
import EducationPage from './pages/EducationPage';
import TransportationPage from './pages/TransportationPage';
import HousingPage from './pages/HousingPage';
import PitcherPage from './pages/PitcherPage';
import ScrapbookPage from './pages/ScrapbookPage';

export default function App() {
  const isInGame = useSelector((state: RootState) => state.auth.isInGame);
  const isAlive = useSelector((state: RootState) => state.auth.isAlive);

  if (!isInGame) {
    return (
      <Routes>
        <Route path="*" element={<HomePage />} />
      </Routes>
    );
  }

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
        {/* Scrapbook only accessible after death */}
        <Route
          path="/scrapbook"
          element={isAlive ? <Navigate to="/" replace /> : <ScrapbookPage />}
        />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </AppShell>
  );
}
