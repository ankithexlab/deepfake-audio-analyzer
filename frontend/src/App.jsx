import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import WorkbenchPage from './pages/WorkbenchPage';
import ForensicsPage from './pages/ForensicsPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import ModelSpecsPage from './pages/ModelSpecsPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { checkHealth, getModelInfo } from './services/api';

// Helper component to scroll to top on route transitions
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Route guard for protected app routes
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-spinner" />
        <p>Verifying secure session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
}

// Route guard for public auth pages (login, signup)
function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-spinner" />
        <p>Verifying secure session...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
}

// App shell layout for authenticated sessions
function AuthenticatedLayout({
  mobileMenuOpen,
  setMobileMenuOpen,
  apiStatus,
  modelInfo
}) {
  return (
    <div className="app-shell">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        apiStatus={apiStatus}
        modelInfo={modelInfo}
      />
      <div className="app-main-viewport">
        <TopHeader onOpenMobile={() => setMobileMenuOpen(true)} />
        <main className="main-content">
          <Outlet />
        </main>
        <Footer apiStatus={apiStatus} modelInfo={modelInfo} />
      </div>
    </div>
  );
}

function AppContent() {
  // Shared backend state
  const [apiStatus, setApiStatus] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);

  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Shared active audio analysis session
  const [currentFile, setCurrentFile] = useState(null);
  const [fileRecord, setFileRecord] = useState(null);
  const [preprocessingData, setPreprocessingData] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadSystemStatus() {
      try {
        const health = await checkHealth();
        if (isMounted) {
          setApiStatus(health.data);
          if (health.data?.model) {
            setModelInfo(health.data.model);
          } else {
            const info = await getModelInfo();
            if (isMounted) setModelInfo(info);
          }
        }
      } catch (err) {
        console.warn('Backend API connection warning:', err);
        if (isMounted) setApiStatus({ status: 'error' });
      }
    }
    loadSystemStatus();
    return () => { isMounted = false; };
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public Routes (Login / Signup) */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <div className="auth-shell">
                <LoginPage />
              </div>
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <div className="auth-shell">
                <SignupPage />
              </div>
            </PublicRoute>
          }
        />

        {/* Authenticated Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AuthenticatedLayout
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                apiStatus={apiStatus}
                modelInfo={modelInfo}
              />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route
            path="/workbench"
            element={
              <WorkbenchPage
                currentFile={currentFile}
                setCurrentFile={setCurrentFile}
                fileRecord={fileRecord}
                setFileRecord={setFileRecord}
                preprocessingData={preprocessingData}
                setPreprocessingData={setPreprocessingData}
                analysisResult={analysisResult}
                setAnalysisResult={setAnalysisResult}
              />
            }
          />
          <Route
            path="/upload"
            element={
              <WorkbenchPage
                currentFile={currentFile}
                setCurrentFile={setCurrentFile}
                fileRecord={fileRecord}
                setFileRecord={setFileRecord}
                preprocessingData={preprocessingData}
                setPreprocessingData={setPreprocessingData}
                analysisResult={analysisResult}
                setAnalysisResult={setAnalysisResult}
              />
            }
          />
          <Route
            path="/forensics"
            element={
              <ForensicsPage
                preprocessingData={preprocessingData}
                fileRecord={fileRecord}
                analysisResult={analysisResult}
              />
            }
          />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/models" element={<ModelSpecsPage modelInfo={modelInfo} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
