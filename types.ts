
export enum ViewMode {
  KIOSK = 'KIOSK',
  ADMIN = 'ADMIN'
}

export interface AdminSession {
  email: string;
  method: 'passcode';
  createdAt: number;
  expiresAt: number;
}

export interface LoginLogEntry {
  id: string;
  email: string;
  timestamp: number;
  success: boolean;
  reason: 'invalid_email_domain' | 'wrong_passcode' | 'success' | 'unknown';
  userAgent: string;
  screen: {
    width: number;
    height: number;
  };
}

export interface Theme {
  id: string;
  name: string;
  gradientStart: string;
  gradientEnd: string;
  accentColor: string;
  textColor: string;
  logoUrl?: string;
}

export interface Announcement {
  id: string;
  type: 'text' | 'image';
  title: string;
  content: string;
  imageUrl?: string;
  active: boolean;
  priority: 'low' | 'normal' | 'high';
}

export interface CategoryDefinition {
  id: string;
  name: string;
  icon: string;
}

export type EventCategory = string; 

export interface Event {
  id: string;
  title: string;
  time: string;
  location: string;
  date: string;
  category: EventCategory;
}

export type WidgetType = 'clock' | 'weather' | 'announcements' | 'events' | 'nasa' | 'quote' | 'news' | 'text' | 'image' | 'custom_api';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title?: string;
  refreshSeconds: number;
  settings?: any;
}

export interface GridItemConfig {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CustomWidgetDefinition {
  id: string;
  name: string;
  endpoint: string;
  jsonPath: string;
  refreshSeconds: number;
  prefix?: string;
  suffix?: string;
}

export interface Page {
  id: string;
  title: string;
  type: 'standard' | 'grid';
  content?: string;
  imageUrl?: string;
  layout?: GridItemConfig[];
  widgets?: Record<string, WidgetConfig>;
  duration?: number;
  enabled?: boolean;
}

export interface WeatherConfig {
  city: string;
  lat: number;
  lon: number;
}

export interface WeatherData {
  current: {
    temp: number;
    code: number;
  };
  daily: Array<{
    date: string;
    max: number;
    min: number;
    code: number;
  }>;
}

export interface Socials {
  phone: string;
  website: string;
  instagram: string;
  twitter: string;
}

export interface EmergencyAlert {
  active: boolean;
  message: string;
  timestamp: number;
  includeSiren: boolean;
  audioData?: string;
}

export interface AppData {
  schoolName: string;
  theme: Theme;
  announcements: Announcement[];
  events: Event[];
  eventCategories: CategoryDefinition[];
  tickerItems: string[];
  liveCamUrls: string[]; 
  enableLiveCam: boolean;
  pageDuration: number;
  pages: Page[];
  socials: Socials;
  emergency: EmergencyAlert;
  weatherConfig: WeatherConfig;
  customWidgets: CustomWidgetDefinition[];
  isSafeMode?: boolean;
}
