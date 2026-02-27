
import { safeStorage } from '../lib/safeStorage';

export interface LogEntry {
    id: string;
    timestamp: number;
    level: 'info' | 'warn' | 'error';
    source: string;
    message: string;
    stack?: string;
}

const LOG_STORAGE_KEY = 'HARDY_SYSTEM_LOGS';
const MAX_LOGS = 50;

export const getLogs = (): LogEntry[] => {
    try {
        const stored = safeStorage.getItem(LOG_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

export const addLog = (log: Omit<LogEntry, 'id' | 'timestamp'>) => {
    try {
        const logs = getLogs();
        const newLog: LogEntry = {
            ...log,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now()
        };
        
        const updatedLogs = [newLog, ...logs].slice(0, MAX_LOGS);
        safeStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(updatedLogs));
        
        // Dispatch event so Admin panel can refresh
        window.dispatchEvent(new CustomEvent('hardy-log-update', { detail: newLog }));
    } catch (e) {
        console.error("Failed to write to system logs", e);
    }
};

export const clearLogs = () => {
    safeStorage.removeItem(LOG_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('hardy-log-update'));
};
