
import { AppData, Announcement, Event as AppEvent, Page } from '../types';
import { addLog } from './logService';
import { safeStorage } from '../lib/safeStorage';

const STORAGE_KEY = 'HARDY_SIGNAGE_DATA';

const DEFAULT_DATA: AppData = {
  schoolName: 'Nova Academy',
  theme: {
    id: 'default',
    name: 'Midnight Blue',
    gradientStart: '#000000',
    gradientEnd: '#1e1b4b', // Dark blue
    accentColor: '#3b82f6', // Blue 500
    textColor: '#ffffff',
    logoUrl: '' 
  },
  announcements: [
    {
      id: '1',
      type: 'text',
      title: 'Science Fair Registration',
      content: 'Registration for the annual Science Fair closes this Friday. Please visit the main office to sign up your team!',
      active: true,
      priority: 'high'
    },
    {
      id: '2',
      type: 'image',
      title: 'Student Art Showcase',
      content: 'Join us in the main hall.',
      imageUrl: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2070&auto=format&fit=crop', 
      active: true,
      priority: 'normal'
    }
  ],
  events: [
    { id: '1', title: 'Parent Teacher Conf', time: '16:00', location: 'Auditorium', date: new Date().toISOString(), category: 'Academic' },
    { id: '2', title: 'Basketball Finals', time: '15:30', location: 'Gym', date: new Date().toISOString(), category: 'Sports' },
    { id: '3', title: 'Jazz Band', time: '12:00', location: 'Music Room', date: new Date().toISOString(), category: 'Arts' },
  ],
  eventCategories: [
      { id: 'cat-1', name: 'Academic', icon: 'BookOpen' },
      { id: 'cat-2', name: 'Sports', icon: 'Trophy' },
      { id: 'cat-3', name: 'Arts', icon: 'Palette' },
      { id: 'cat-4', name: 'General', icon: 'Users' }
  ],
  tickerItems: [
    "REMINDER: Early dismissal this Friday at 1:00 PM.",
    "Report cards will be distributed next Monday.",
    "Yearbook sales end on May 30th!"
  ],
  liveCamUrls: [
      'https://webcams.nyctmc.org/api/cameras/4c47eda8-a4a1-4e40-baea-578e0a99e1d8/image',
      'https://webcams.nyctmc.org/api/cameras/9ca4e591-4ac8-471c-8e76-4710b52e6f9b/image',
      'https://webcams.nyctmc.org/api/cameras/a01a8c98-d314-4eb4-bd7c-4a4f80d71c4b/image'
  ], 
  enableLiveCam: true,
  pageDuration: 60,
  pages: [
    {
      id: 'default-page',
      title: 'Core Values',
      type: 'standard',
      content: "## Our Mission\n\n* **Excellence**: We strive for the highest quality in everything we do.\n* **Integrity**: We act with honesty and strong moral principles.\n* **Community**: We foster a supportive and inclusive environment.\n\nVisit our website **www.novaacademy.edu** for more information.",
      imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=2071&auto=format&fit=crop"
    }
  ],
  socials: {
    phone: "(555) 123-4567",
    website: "novaacademy.edu",
    instagram: "@NovaAcademy",
    twitter: "@NovaTweets"
  },
  emergency: {
    active: false,
    message: "EMERGENCY ALERT: PLEASE PROCEED TO THE NEAREST EXIT CALMLY.",
    timestamp: 0,
    includeSiren: false,
    audioData: undefined
  },
  weatherConfig: {
    city: "Far Rockaway",
    lat: 40.6090,
    lon: -73.7630
  },
  customWidgets: [],
  isSafeMode: false
};

export const getStoredData = (): AppData => {
  try {
    const stored = safeStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_DATA };
    
    const parsed = JSON.parse(stored);
    
    // Safety check for critical properties
    if (!parsed.pages || !parsed.theme || !parsed.schoolName) {
        throw new Error("Configuration structure is incomplete or corrupted.");
    }

    // Migrations / Backwards compatibility
    if (!parsed.theme) parsed.theme = DEFAULT_DATA.theme;
    if (!parsed.tickerItems) parsed.tickerItems = DEFAULT_DATA.tickerItems;
    if (parsed.enableLiveCam === undefined) parsed.enableLiveCam = false;
    if (parsed.pageDuration === undefined) parsed.pageDuration = 60;
    
    if (!parsed.liveCamUrls) {
        if (parsed.liveCamUrl) {
            parsed.liveCamUrls = [parsed.liveCamUrl];
        } else {
            parsed.liveCamUrls = DEFAULT_DATA.liveCamUrls;
        }
    }
    delete parsed.liveCamUrl;
    
    delete parsed.homeLayout;
    delete parsed.homeWidgets;

    if (!parsed.pages) {
      parsed.pages = DEFAULT_DATA.pages;
    } else {
        parsed.pages = parsed.pages.map((p: any) => ({
            ...p,
            type: p.type || 'standard'
        }));
    }

    if (parsed.socials === undefined) parsed.socials = DEFAULT_DATA.socials;
    if (parsed.emergency === undefined) parsed.emergency = DEFAULT_DATA.emergency;
    if (parsed.weatherConfig === undefined) parsed.weatherConfig = DEFAULT_DATA.weatherConfig;
    
    if (!parsed.eventCategories) {
        parsed.eventCategories = DEFAULT_DATA.eventCategories;
    } 

    if (!parsed.customWidgets) {
        parsed.customWidgets = DEFAULT_DATA.customWidgets;
    }

    parsed.isSafeMode = false;
    return parsed;
  } catch (error: any) {
    console.error("Critical Storage Failure - Booting in Safe Mode", error);
    addLog({
      level: 'error',
      source: 'StorageService',
      message: `Failed to load data: ${error.message}. System recovered with defaults.`,
      stack: error.stack
    });
    // Return factory defaults but mark as Safe Mode
    return { ...DEFAULT_DATA, isSafeMode: true };
  }
};

export const saveStoredData = (data: AppData): void => {
  try {
    // Never save the safeMode flag to permanent storage
    const { isSafeMode, ...toSave } = data;
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    window.dispatchEvent(new Event('hardy-storage-update'));
  } catch (error) {
    console.error("Failed to save data", error);
  }
};
