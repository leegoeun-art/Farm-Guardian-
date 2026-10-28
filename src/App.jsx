import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MapPage from './pages/MapPage.jsx';
import PestPage from './pages/PestPage.jsx';
import VerdictPage from './pages/VerdictPage.jsx';
import RecordsPage from './pages/RecordsPage.jsx';
import FieldSetupPage from './pages/FieldSetupPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import VectorPage from './pages/VectorPage.jsx';
import NewFieldPage from './pages/NewFieldPage.jsx';

function AppRoutes() {
  const { state } = useApp();
  const authed = !!state.user;

  return (
    <Routes>
      <Route path="/login" element={authed ? <Navigate to="/map" replace /> : <LoginPage />} />
      <Route path="/map" element={authed ? <MapPage /> : <Navigate to="/login" replace />} />
      <Route path="/pest" element={authed ? <PestPage /> : <Navigate to="/login" replace />} />
      <Route path="/verdict" element={authed ? <VerdictPage /> : <Navigate to="/login" replace />} />
      <Route path="/records" element={authed ? <RecordsPage /> : <Navigate to="/login" replace />} />
      <Route path="/setup" element={authed ? <FieldSetupPage /> : <Navigate to="/login" replace />} />
      <Route path="/dashboard" element={authed ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="/vector" element={authed ? <VectorPage /> : <Navigate to="/login" replace />} />
      <Route path="/new-field" element={authed ? <NewFieldPage /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={authed ? '/map' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app-frame">
          <div className="app-screen">
            <AppRoutes />
          </div>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
