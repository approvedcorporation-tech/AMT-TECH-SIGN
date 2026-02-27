
import { LoginLogEntry } from '../types';
import { safeStorage } from '../lib/safeStorage';

const LOG_KEY = 'admin_login_log';
const MAX_LOGS = 200;

export const logLoginAttempt = (
  email: string, 
  success: boolean, 
  reason: LoginLogEntry['reason']
) => {
  try {
    const logs: LoginLogEntry[] = JSON.parse(safeStorage.getItem(LOG_KEY) || '[]');
    
    const newEntry: LoginLogEntry = {
      id: Math.random().toString(36).substring(2, 11),
      email,
      timestamp: Date.now(),
      success,
      reason,
      userAgent: navigator.userAgent,
      screen: {
        width: window.screen.width,
        height: window.screen.height
      }
    };

    const updatedLogs = [newEntry, ...logs].slice(0, MAX_LOGS);
    safeStorage.setItem(LOG_KEY, JSON.stringify(updatedLogs));
  } catch (e) {
    console.error("Auth Logging Failed", e);
  }
};

export const getLoginLogs = (): LoginLogEntry[] => {
  try {
    return JSON.parse(safeStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
};

export const clearLoginLogs = () => {
  safeStorage.removeItem(LOG_KEY);
};
