import { UpdateNotice } from './components/UpdateNotice';
import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { TitleBar } from './components/TitleBar';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { DialogProvider } from './contexts/DialogContext';
import { useMenuAction } from './hooks/useMenuAction';
import type { MenuAction } from '@shared/ipc/types';
import { SCREEN_BY_ID } from './screens-registry';

function AppContent() {
  const [activeScreen, setActiveScreen] = useState('home');
  const [visitedScreens, setVisitedScreens] = useState<Set<string>>(new Set(['home']));

  // Screens stay mounted after their first visit, so switching back keeps their state.
  useEffect(() => {
    setVisitedScreens((prev) => {
      if (prev.has(activeScreen)) return prev;
      return new Set(prev).add(activeScreen);
    });
  }, [activeScreen]);

  const handleMenuAction = useCallback((action: MenuAction) => {
    if (action === 'settings:open') setActiveScreen('settings');
  }, []);
  useMenuAction(handleMenuAction);

  return (
    <div className="flex flex-col h-screen w-screen bg-app-base">
      <TitleBar />
      <UpdateNotice />
      <div className="flex flex-1 min-h-0">
        <Sidebar activeScreen={activeScreen} onScreenChange={setActiveScreen} />
        <main className="flex-1 bg-app-base overflow-auto">
          {Array.from(visitedScreens).map((screenId) => {
            const screen = SCREEN_BY_ID[screenId];
            if (!screen) return null;
            const Screen = screen.Component;
            const isActive = screenId === activeScreen;
            return (
              <div key={screenId} style={{ display: isActive ? 'contents' : 'none' }}>
                <Screen />
              </div>
            );
          })}
        </main>
      </div>
      <StatusBar />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <DialogProvider>
          <AppContent />
        </DialogProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
