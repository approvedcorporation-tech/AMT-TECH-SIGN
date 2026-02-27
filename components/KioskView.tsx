
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { AppData, WeatherData, Page } from '../types';
import { Clock, Calendar, CloudSun, AlertCircle, Settings, Sun, Cloud, CloudSun as CloudSunIcon, CloudRain, CloudSnow, Phone, Globe, Instagram, Twitter, ChevronLeft, ChevronRight, LayoutTemplate, ShieldAlert } from 'lucide-react';
import { getStoredData } from '../services/storageService';
import { GridRenderer } from './WidgetSystem';

interface KioskViewProps {
  onExit: () => void;
}

const APP_VERSION = "v1.6.0";

// Helper to check if we are on the "Home" index
const IS_HOME = 0;
const EVENTS_PER_SET = 4;

const KioskView: React.FC<KioskViewProps> = ({ onExit }) => {
  const [data, setData] = useState<AppData>(getStoredData());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Internal state for components
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [eventSetIndex, setEventSetIndex] = useState(0);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  
  // Page Rotation State
  const [currentViewIndex, setCurrentViewIndex] = useState(0); // 0 is Home, 1+ are Pages
  const viewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const announcementTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived Data
  const enabledPages = useMemo(() => (data.pages || []).filter(p => p.enabled !== false), [data.pages]);
  const totalViews = 1 + enabledPages.length;
  const activeAnnouncements = useMemo(() => data.announcements.filter(a => a.active), [data.announcements]);
  
  // Total sets of events based on EVENTS_PER_SET (e.g. 4 events per 5 seconds)
  const totalEventSets = Math.ceil(data.events.length / EVENTS_PER_SET);

  // Load Data & Listen for Updates
  useEffect(() => {
    const handleStorageUpdate = () => setData(getStoredData());
    window.addEventListener('hardy-storage-update', handleStorageUpdate);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => {
        window.removeEventListener('hardy-storage-update', handleStorageUpdate);
        window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Event Auto-Scroll (Every 5 seconds)
  useEffect(() => {
    if (totalEventSets <= 1) return;
    eventTimerRef.current = setInterval(() => {
      setEventSetIndex(prev => (prev + 1) % totalEventSets);
    }, 5000);
    return () => { if (eventTimerRef.current) clearInterval(eventTimerRef.current); };
  }, [totalEventSets]);

  // Weather Fetching
  useEffect(() => {
    const fetchWeather = async () => {
        try {
            const { lat, lon } = data.weatherConfig;
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&current_weather=true&temperature_unit=fahrenheit&timezone=auto`);
            const json = await res.json();
            if (json.current_weather && json.daily) {
                setWeather({
                    current: { temp: Math.round(json.current_weather.temperature), code: json.current_weather.weathercode },
                    daily: json.daily.time.slice(0, 3).map((date: string, i: number) => ({
                        date, max: Math.round(json.daily.temperature_2m_max[i]), min: Math.round(json.daily.temperature_2m_min[i]), code: json.daily.weathercode[i]
                    }))
                });
            }
        } catch (e) { console.error("Weather error", e); }
    };
    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 600000); 
    return () => clearInterval(weatherInterval);
  }, [data.weatherConfig]);

  // View Rotation
  const rotateView = useCallback(() => {
      setCurrentViewIndex(prev => (prev + 1) % totalViews);
  }, [totalViews]);

  useEffect(() => {
      let duration = data.pageDuration || 60;
      if (currentViewIndex > 0) {
          const page = enabledPages[currentViewIndex - 1];
          if (page && page.duration) duration = page.duration;
      }
      if (viewTimerRef.current) clearInterval(viewTimerRef.current);
      viewTimerRef.current = setInterval(rotateView, duration * 1000);
      return () => { if (viewTimerRef.current) clearInterval(viewTimerRef.current); };
  }, [currentViewIndex, data.pageDuration, rotateView, enabledPages]);

  // Announcement Slider
  const nextAnnouncement = useCallback(() => {
      if (activeAnnouncements.length === 0) return;
      setAnnouncementIndex(prev => (prev + 1) % activeAnnouncements.length);
  }, [activeAnnouncements.length]);

  const prevAnnouncement = useCallback(() => {
      if (activeAnnouncements.length === 0) return;
      setAnnouncementIndex(prev => (prev - 1 + activeAnnouncements.length) % activeAnnouncements.length);
  }, [activeAnnouncements.length]);

  const resetAnnouncementTimer = useCallback(() => {
      if (announcementTimerRef.current) clearInterval(announcementTimerRef.current);
      announcementTimerRef.current = setInterval(nextAnnouncement, 8000);
  }, [nextAnnouncement]);

  useEffect(() => {
      resetAnnouncementTimer();
      return () => { if (announcementTimerRef.current) clearInterval(announcementTimerRef.current); };
  }, [resetAnnouncementTimer]);

  const handleManualSlide = (direction: 'next' | 'prev') => {
      if (direction === 'next') nextAnnouncement();
      else prevAnnouncement();
      resetAnnouncementTimer();
  };

  const handleManualPageChange = (direction: 'next' | 'prev') => {
      setCurrentViewIndex(prev => (direction === 'next' ? (prev + 1) % totalViews : (prev - 1 + totalViews) % totalViews));
  };

  const theme = data.theme;

  const getWeatherIcon = (code: number, className: string) => {
    if (code <= 1) return <Sun className={className} />;
    if (code <= 3) return <CloudSunIcon className={className} />;
    if (code <= 48) return <Cloud className={className} />;
    if (code <= 67) return <CloudRain className={className} />;
    if (code <= 77) return <CloudSnow className={className} />;
    return <CloudSunIcon className={className} />;
  }

  const visibleEvents = useMemo(() => {
    const start = eventSetIndex * EVENTS_PER_SET;
    return data.events.slice(start, start + EVENTS_PER_SET);
  }, [data.events, eventSetIndex]);

  const TickerContent = () => (
    <div className="flex gap-16 items-center px-6">
        {data.tickerItems.map((item, idx) => (
            <React.Fragment key={idx}>
                <span className="flex items-center gap-4 whitespace-nowrap">
                    {idx === 0 && <AlertCircle className="w-5 h-5 fill-current shrink-0" style={{color: 'var(--accent-color)'}} />}
                    <span className="font-bold text-[clamp(1rem,1.4vw,1.3rem)]">{item}</span>
                </span>
                <span className="w-2 h-2 rounded-full opacity-30 shrink-0" style={{backgroundColor: 'var(--accent-color)'}}></span>
            </React.Fragment>
        ))}
    </div>
  );

  return (
    <div 
      className="w-screen h-screen overflow-hidden flex flex-col relative select-none bg-black" 
      style={{ 
        background: `linear-gradient(160deg, var(--gradient-start) 0%, var(--gradient-end) 100%)`, 
        color: 'var(--text-primary)' 
      }}
    >
      
      <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] animate-pulse opacity-10 -z-10" style={{backgroundColor: 'var(--accent-color)'}}></div>

      <button onClick={onExit} className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white/5 text-white/30 border border-white/10 hover:bg-white/10 transition-colors group">
        <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform" />
      </button>

      {data.isSafeMode && (
          <div className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-orange-600 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl animate-pulse">
              <ShieldAlert className="w-3 h-3" /> Safe Mode Active
          </div>
      )}

      {totalViews > 1 && (
        <div className="fixed bottom-32 right-10 z-50 flex gap-3">
             <button onClick={() => handleManualPageChange('prev')} className="p-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md transition-all active:scale-95 shadow-lg group">
                <ChevronLeft className="w-6 h-6 opacity-70 group-hover:opacity-100" />
             </button>
             <div className="px-4 py-2 rounded-full bg-black/40 border border-white/5 backdrop-blur-md flex items-center justify-center font-bold font-mono text-sm opacity-60">
                {currentViewIndex + 1} / {totalViews}
             </div>
             <button onClick={() => handleManualPageChange('next')} className="p-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md transition-all active:scale-95 shadow-lg group">
                <ChevronRight className="w-6 h-6 opacity-70 group-hover:opacity-100" />
             </button>
        </div>
      )}

      <header className="flex justify-between items-center px-10 py-6 shrink-0 z-20 h-auto">
        <div className="flex items-center gap-6">
          {theme.logoUrl ? (
              <img src={theme.logoUrl} className="h-16 w-auto object-contain" alt="Logo" />
          ) : (
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-900/50" style={{backgroundColor: 'var(--accent-color)'}}>{data.schoolName.charAt(0)}</div>
          )}
          <div className="flex flex-col">
              <h1 className="text-[clamp(1.5rem,3vw,2.5rem)] font-black tracking-tight leading-none drop-shadow-lg">{data.schoolName}</h1>
          </div>
        </div>
        <div className="text-right flex flex-col justify-center">
            <div className="text-[clamp(2.5rem,5.5vw,4.5rem)] font-black tracking-tighter tabular-nums leading-none drop-shadow-lg">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm font-bold opacity-60 uppercase tracking-[0.2em] mt-1">{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(currentTime)}</div>
        </div>
      </header>

      <div className="flex justify-center shrink-0 z-30 mb-8 px-10 h-auto">
         <div 
           className="glass-panel px-10 py-4 rounded-full flex items-center gap-12 shadow-2xl border backdrop-blur-3xl bg-white/5"
           style={{ borderColor: 'var(--glass-border)' }}
         >
            {data.socials.phone && (
                <div className="flex items-center gap-4 font-bold text-xl uppercase tracking-wider shrink-0">
                    <Phone className="w-6 h-6" style={{color: 'var(--accent-color)'}} />
                    <span className="text-white/95">{data.socials.phone}</span>
                </div>
            )}
            {data.socials.website && (
                <>
                <div className="w-px h-8 bg-white/20 shrink-0"></div>
                <div className="flex items-center gap-4 font-bold text-xl uppercase tracking-wider shrink-0">
                    <Globe className="w-6 h-6 text-indigo-400" />
                    <span className="text-white/95">{data.socials.website}</span>
                </div>
                </>
            )}
            {(data.socials.instagram || data.socials.twitter) && <div className="w-px h-8 bg-white/20 shrink-0"></div>}
            <div className="flex items-center gap-8 shrink-0">
                {data.socials.instagram && <div className="flex items-center gap-3 text-xl font-bold opacity-90"><Instagram className="w-6 h-6" /> {data.socials.instagram}</div>}
                {data.socials.twitter && <div className="flex items-center gap-3 text-xl font-bold opacity-90"><Twitter className="w-6 h-6" /> {data.socials.twitter}</div>}
            </div>
         </div>
      </div>

      <main className="flex-1 min-0 relative w-full px-10 pb-8 overflow-hidden flex flex-col">
        <div className="h-full flex transition-transform duration-[800ms] cubic-bezier(0.25, 1, 0.5, 1) min-h-0 will-change-transform" 
             style={{ width: `${totalViews * 100}%`, transform: `translate3d(-${(currentViewIndex / totalViews) * 100}%, 0, 0)` }}>
            
            <div className="w-full h-full shrink-0 flex gap-6 min-h-0 min-w-0" style={{ width: `${100 / totalViews}%` }}>
                <div 
                  className="flex-[1.8] h-full min-h-0 glass-panel rounded-[2.5rem] overflow-hidden relative border shadow-2xl group flex flex-col justify-center"
                  style={{ borderColor: 'var(--glass-border)' }}
                >
                    <div className="absolute inset-0 transition-opacity duration-500 ease-in-out">
                         {activeAnnouncements[announcementIndex] ? (
                             <>
                                {activeAnnouncements[announcementIndex].imageUrl ? (
                                    <>
                                        <img src={activeAnnouncements[announcementIndex].imageUrl} className="w-full h-full object-cover" alt="Hero" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                                    </>
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-900/40 to-slate-900" />
                                )}

                                <div className="absolute bottom-0 left-0 right-0 p-10 pb-12 flex flex-col justify-end h-full">
                                    <div className="transform transition-all duration-500 translate-y-0">
                                        {activeAnnouncements[announcementIndex].priority === 'high' && (
                                            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-widest mb-4 uppercase bg-red-600 text-white shadow-lg shadow-red-900/40 w-max">
                                                IMPORTANT
                                            </span>
                                        )}
                                        <h2 className="text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-[1.1] mb-4 drop-shadow-xl tracking-tighter line-clamp-3">
                                            {activeAnnouncements[announcementIndex].title}
                                        </h2>
                                        <p className="text-[clamp(1.2rem,2vw,1.8rem)] text-white/90 font-medium leading-relaxed max-w-4xl line-clamp-4 drop-shadow-md">
                                            {activeAnnouncements[announcementIndex].content}
                                        </p>
                                    </div>
                                </div>
                             </>
                         ) : (
                             <div className="w-full h-full flex items-center justify-center text-white/20 font-black text-2xl uppercase tracking-widest">
                                 No Active Announcements
                             </div>
                         )}
                    </div>

                    <button onClick={(e) => { e.stopPropagation(); handleManualSlide('prev'); }} 
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/20 backdrop-blur-md text-white/50 hover:text-white transition-all z-20">
                        <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleManualSlide('next'); }} 
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/20 backdrop-blur-md text-white/50 hover:text-white transition-all z-20">
                        <ChevronRight className="w-8 h-8" />
                    </button>

                    <div className="absolute bottom-6 left-0 w-full flex justify-center gap-2 z-30 px-10">
                        {activeAnnouncements.map((_, i) => (
                            <button key={i} onClick={(e) => { e.stopPropagation(); setAnnouncementIndex(i); resetAnnouncementTimer(); }} 
                                    className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${i === announcementIndex ? 'w-8 bg-white' : 'w-1.5 bg-white/20 hover:bg-white/40'}`} />
                        ))}
                    </div>
                </div>

                <div className="flex-1 h-full flex flex-col gap-6 min-h-0 min-w-0">
                    <div 
                      className="flex-[1.2] glass-panel rounded-[2.5rem] p-8 flex flex-col border shadow-2xl overflow-hidden min-h-0 relative"
                      style={{ borderColor: 'var(--glass-border)' }}
                    >
                        <div className="flex items-center justify-between opacity-60 mb-6 shrink-0">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5" style={{color: 'var(--accent-color)'}} />
                                <h3 className="text-xs font-black uppercase tracking-[0.25em]">Upcoming Events</h3>
                            </div>
                            <div className="flex gap-1">
                                {Array.from({length: totalEventSets}).map((_, i) => (
                                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${i === eventSetIndex ? 'bg-white scale-125' : 'bg-white/20'}`}></div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden min-h-0 relative">
                             <div className="flex flex-col gap-2 transition-all duration-700 ease-in-out animate-in fade-in slide-in-from-bottom-4" key={eventSetIndex}>
                                {visibleEvents.map(evt => (
                                    <div key={evt.id} className="flex gap-8 items-center py-5 px-3 border-b border-white/5 last:border-0 group hover:bg-white/5 rounded-3xl transition-colors">
                                        <div className="w-24 h-24 rounded-3xl bg-white/5 flex flex-col items-center justify-center shrink-0 border border-white/5 group-hover:bg-white/10 transition-colors shadow-inner">
                                            <span className="text-sm font-black uppercase tracking-widest leading-none mb-1" style={{color: 'var(--accent-color)'}}>{new Date(evt.date).toLocaleDateString('en-US', {weekday:'short'}).toUpperCase()}</span>
                                            <span className="text-5xl font-black leading-none tracking-tighter">{new Date(evt.date).getDate()}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-3xl font-black truncate leading-none mb-2 group-hover:text-blue-300 transition-colors tracking-tight">{evt.title}</h4>
                                            <div className="flex items-center gap-4 opacity-50 text-sm font-bold uppercase tracking-wider">
                                                <div className="flex items-center gap-1.5"><Clock className="w-4 h-4"/> {evt.time}</div>
                                                <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
                                                <span className="truncate" style={{color: 'var(--accent-color)'}}>{evt.category}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {data.events.length === 0 && <div className="text-white/20 text-center py-10 font-bold text-xl">No Events Scheduled</div>}
                            </div>
                        </div>
                    </div>

                    <div 
                      className="flex-1 glass-panel rounded-[2.5rem] p-8 flex flex-col border shadow-2xl justify-between min-h-0 relative overflow-hidden"
                      style={{ borderColor: 'var(--glass-border)' }}
                    >
                        <div className="flex justify-between items-start shrink-0 z-10">
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black opacity-40 uppercase tracking-[0.3em] mb-1">{data.weatherConfig.city.toUpperCase()}</span>
                                <span className="text-[clamp(3.5rem,6vw,5.5rem)] font-black tracking-tighter leading-none">{weather?.current.temp || '--'}°</span>
                             </div>
                             <div className="p-4 bg-white/5 rounded-2xl border border-white/5 shadow-lg backdrop-blur-sm">
                                {weather ? getWeatherIcon(weather.current.code, "w-10 h-10 text-yellow-400") : <Sun className="w-10 h-10 opacity-10 animate-pulse" />}
                             </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mt-6 flex-1 min-h-0 z-10">
                            {weather?.daily.map((day, i) => (
                                <div key={i} className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white/5 border border-white/5 shadow-sm h-full">
                                    <span className="text-[11px] font-black opacity-50 uppercase mb-2 tracking-widest">{new Date(day.date).toLocaleDateString('en-US', {weekday:'short'}).toUpperCase()}</span>
                                    {getWeatherIcon(day.code, "w-10 h-10 mb-2 opacity-90 text-white")}
                                    <span className="text-xl font-black">{day.max}°</span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="absolute -bottom-6 -right-6 opacity-5 pointer-events-none">
                            {weather ? getWeatherIcon(weather.current.code, "w-48 h-48") : <Sun className="w-48 h-48" />}
                        </div>
                    </div>
                </div>
            </div>

            {enabledPages.map(page => (
                <div key={page.id} className="w-full h-full shrink-0 flex min-h-0 min-w-0 px-2" style={{ width: `${100 / totalViews}%` }}>
                    {page.type === 'grid' && page.layout ? (
                        <GridRenderer key={page.id} layout={page.layout} widgets={page.widgets || {}} appData={data} width={windowWidth - 80} />
                    ) : (
                        <div className="w-full flex gap-8">
                            <div 
                              className="flex-[1.6] glass-panel rounded-[2.5rem] p-16 flex flex-col justify-center border shadow-3xl min-w-0"
                              style={{ borderColor: 'var(--glass-border)' }}
                            >
                                <h2 className="text-[clamp(3.5rem,6vw,5.5rem)] font-black leading-tight mb-10 tracking-tight">{page.title}</h2>
                                <div className="prose prose-invert max-w-none text-[clamp(1.5rem,2.8vw,2.2rem)] leading-relaxed opacity-90 font-medium overflow-y-auto no-scrollbar">
                                    {page.content}
                                </div>
                            </div>
                            <div 
                              className="flex-1 glass-panel rounded-[2.5rem] overflow-hidden border shadow-3xl shrink-0"
                              style={{ borderColor: 'var(--glass-border)' }}
                            >
                                {page.imageUrl && <img src={page.imageUrl} className="w-full h-full object-cover" alt="Page" />}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
      </main>

      <footer className="flex flex-col shrink-0 z-40 bg-black/80 backdrop-blur-xl border-t border-white/10 mt-auto">
         <div className="h-16 w-full relative overflow-hidden flex items-center">
            <div className="flex w-max animate-marquee items-center">
                <TickerContent />
                <TickerContent />
                <TickerContent />
            </div>
        </div>
        <div className="h-6 w-full bg-black/40 flex items-center justify-between px-6 text-[10px] font-bold text-white/30 uppercase tracking-widest border-t border-white/5">
             <div className="flex items-center gap-3">
                 <span>{data.schoolName}</span>
                 <div className="flex items-center gap-1.5 opacity-50">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                    <span>{APP_VERSION}</span>
                 </div>
             </div>
             <span>Designed & coded by Hardy</span>
        </div>
      </footer>
      
      <style>{`
        .animate-marquee { animation: marquee 60s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        html, body { overflow-x: hidden !important; background-color: #000; }
      `}</style>
    </div>
  );
};

export default KioskView;
