import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import { AppLayout } from './components/AppLayout';
import { RequireAuth } from './components/RequireAuth';
import { EditRacePage } from './pages/EditRacePage';
import { LoginPage } from './pages/LoginPage';
import { NewRacePage } from './pages/NewRacePage';
import { RaceRegistrationPage } from './pages/RaceRegistrationPage';
import { RaceResultsPage } from './pages/RaceResultsPage';
import { RegistrationSuccessPage } from './pages/RegistrationSuccessPage';
import { HomePage } from './pages/HomePage';
import { ResultsPage, ImprintPage, PrivacyPage } from './pages/RoutePages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        <Route element={<AppLayout />}>
          <Route element={<HomePage />} path="/" />
          <Route element={<RaceRegistrationPage />} path="/register" />
          <Route element={<RegistrationSuccessPage />} path="/registration-success" />
          <Route element={<ResultsPage />} path="/results" />
          <Route
            element={
              <RequireAuth>
                <NewRacePage />
              </RequireAuth>
            }
            path="/races/new"
          />
          <Route
            element={
              <RequireAuth>
                <EditRacePage />
              </RequireAuth>
            }
            path="/races/:raceId/edit"
          />
          <Route
            element={
              <RequireAuth>
                <RaceResultsPage />
              </RequireAuth>
            }
            path="/races/:raceId/results"
          />
          <Route element={<LoginPage />} path="/login" />
          <Route element={<ImprintPage />} path="/imprint" />
          <Route element={<PrivacyPage />} path="/privacy" />
          <Route element={<Navigate replace to="/" />} path="*" />
        </Route>
      </Routes>
    </QueryClientProvider>
  );
}

export default App;
