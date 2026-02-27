
import React, { useState, useEffect, useCallback } from 'react';
import KioskView from './components/KioskView';
import AdminDashboard from './components/AdminDashboard';
import { ViewMode, AppData } from './types';
import AppErrorBoundary from './components/AppErrorBoundary';
import { SimpleAuthProvider } from './context/SimpleAuthContext';
import AdminGuard from './components/AdminGuard';
import { getStoredData } from './services/storageService';

/**
 * ThemeSync manages the global CSS variables for the entire application.
 * It ensures that --accent-color and gradients are consistently applied across Kiosk, Admin, and Login.
 */
const ThemeSync: React.FC = () => {
  const applyTheme = useCallback(() => {
    const data = getStoredData();
    const theme = data.theme;
    const root = document.documentElement;
    
    root.style.setProperty('--accent-color', theme.accentColor);
    root.style.setProperty('--gradient-start', theme.gradientStart);
    root.style.setProperty('--gradient-end', theme.gradientEnd);
    root.style.setProperty('--text-primary', theme.textColor || '#ffffff');
    root.style.setProperty('--glass-border', `${theme.accentColor}33`);
  }, []);

  useEffect(() => {
    applyTheme();
    window.addEventListener('hardy-storage-update', applyTheme);
    return () => window.removeEventListener('hardy-storage-update', applyTheme);
  }, [applyTheme]);

  return null;
};

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.KIOSK);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'admin') {
        setViewMode(ViewMode.ADMIN);
    }
  }, []);

  const toggleView = (mode: ViewMode) => {
    setViewMode(mode);
  };
  
  const handleLogoClick = (e: React.MouseEvent) => {
      if (e.detail === 3) {
          toggleView(ViewMode.ADMIN);
      }
  };

  return (
    <AppErrorBoundary>
      <SimpleAuthProvider>
        <ThemeSync />
        {viewMode === ViewMode.KIOSK ? (
            <div onClick={handleLogoClick}>
                 <KioskView onExit={() => toggleView(ViewMode.ADMIN)} />
            </div>
        ) : (
            <AdminGuard>
              <AdminDashboard changeView={toggleView} />
            </AdminGuard>
        )}
      </SimpleAuthProvider>
    </AppErrorBoundary>
  );
};

export default App;
