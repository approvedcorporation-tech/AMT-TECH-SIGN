
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminSession } from '../types';
import { safeStorage } from '../lib/safeStorage';

interface SimpleAuthContextType {
  session: AdminSession | null;
  login: (email: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

const SESSION_KEY = 'admin_session';

export const SimpleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AdminSession | null>(null);

  useEffect(() => {
    const stored = safeStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const parsed: AdminSession = JSON.parse(stored);
        if (Date.now() < parsed.expiresAt) {
          setSession(parsed);
        } else {
          safeStorage.removeItem(SESSION_KEY);
        }
      } catch {
        safeStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  const login = (email: string) => {
    const now = Date.now();
    const newSession: AdminSession = {
      email,
      method: 'passcode',
      createdAt: now,
      expiresAt: now + (8 * 60 * 60 * 1000) // 8 hours
    };
    safeStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
  };

  const logout = () => {
    safeStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  return (
    <SimpleAuthContext.Provider value={{ 
      session, 
      login, 
      logout, 
      isAuthenticated: !!session && Date.now() < session.expiresAt 
    }}>
      {children}
    </SimpleAuthContext.Provider>
  );
};

export const useSimpleAuth = () => {
  const context = useContext(SimpleAuthContext);
  if (!context) throw new Error('useSimpleAuth must be used within SimpleAuthProvider');
  return context;
};
