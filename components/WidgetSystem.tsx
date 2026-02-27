
import React, { useEffect, useState, useMemo, useRef } from 'react';
import RGL from 'react-grid-layout';
import { WidgetConfig, GridItemConfig, AppData } from '../types';
import { safeFetch } from '../services/cacheService';
import { fetchLiveNews } from '../services/geminiService';
import { Clock, CloudSun, Newspaper, Quote, Rocket, Calendar, Megaphone, AlertTriangle, Image as ImageIcon, Globe, Database, Sun, Cloud, CloudRain, CloudSnow, Trophy, Palette, BookOpen, Music, FlaskConical, Calculator, Laptop, GraduationCap, Bus, Briefcase, Users, Star, ExternalLink } from 'lucide-react';
import _ from 'lodash';
import ErrorBoundary from './ErrorBoundary';

// Use Responsive directly for maximum control over layout stability
const Responsive = (RGL as any).Responsive;

interface WidgetProps {
  config: WidgetConfig;
  appData?: AppData;
  className?: string;
  style?: React.CSSProperties;
}

const getEventIcon = (categoryName: string, categories: any[]) => {
      const categoryDef = categories?.find(c => c.name === categoryName);
      const iconName = categoryDef ? categoryDef.icon : 'Users';
      const iconProps = { className: "w-full h-full text-white" }; 

      switch (iconName) {
        case 'Trophy': return <Trophy {...iconProps} className="w-full h-full text-orange-400" />;
        case 'Palette': return <Palette {...iconProps} className="w-full h-full text-purple-400" />;
        case 'BookOpen': return <BookOpen {...iconProps} className="w-full h-full text-blue-400" />;
        case 'Music': return <Music {...iconProps} className="w-full h-full text-pink-400" />;
        case 'FlaskConical': return <FlaskConical {...iconProps} className="w-full h-full text-green-400" />;
        case 'Calculator': return <Calculator {...iconProps} className="w-full h-full text-yellow-400" />;
        case 'Laptop': return <Laptop {...iconProps} className="w-full h-full text-cyan-400" />;
        case 'GraduationCap': return <GraduationCap {...iconProps} className="w-full h-full text-indigo-400" />;
        case 'Bus': return <Bus {...iconProps} className="w-full h-full text-yellow-500" />;
        case 'Briefcase': return <Briefcase {...iconProps} className="w-full h-full text-slate-400" />;
        case 'Star': return <Star {...iconProps} className="w-full h-full text-yellow-200" />;
        default: return <Users {...iconProps} className="w-full h-full text-slate-300" />;
      }
};

const getWeatherIcon = (code: number, className: string) => {
    if (code <= 1) return <Sun className={className} />;
    if (code <= 3) return <CloudSun className={className} />;
    if (code <= 48) return <Cloud className={className} />;
    if (code <= 67) return <CloudRain className={className} />;
    if (code <= 77) return <CloudSnow className={className} />;
    if (code <= 82) return <CloudRain className={className} />;
    return <CloudSun className={className} />;
};

const WidgetFrame: React.FC<{ title?: string; icon?: React.ElementType; children: React.ReactNode; className?: string; hideHeader?: boolean }> = ({ title, icon: Icon, children, className, hideHeader }) => (
  <div className={`glass-panel rounded-[2rem] w-full h-full flex flex-col overflow-hidden relative ${className} bg-slate-900/40 border border-white/10 shadow-xl`}>
    {!hideHeader && title && (
      <div className="px-5 pt-5 pb-2 flex items-center justify-between shrink-0 opacity-80 z-10">
         <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-blue-400" />}
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white/80">{title}</h3>
         </div>
      </div>
    )}
    <div className="flex-1 min-h-0 relative w-full h-full">
      {children}
    </div>
  </div>
);

const WeatherWidget: React.FC<WidgetProps> = ({ config, appData }) => {
  const [data, setData] = useState<any>(null);
  const city = config.settings?.city || appData?.weatherConfig.city || 'New York';
  const lat = config.settings?.lat || appData?.weatherConfig.lat || 40.71;
  const lon = config.settings?.lon || appData?.weatherConfig.lon || -74.00;

  useEffect(() => {
    const fetchWeather = async () => {
        const res = await safeFetch(
            `weather_widget_${city}`,
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&current_weather=true&temperature_unit=fahrenheit&timezone=auto`,
            900 
        );
        if (res) setData(res);
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 600000); 
    return () => clearInterval(interval);
  }, [city, lat, lon]);

  if (!data) return <WidgetFrame title="Weather" icon={CloudSun}><div className="flex items-center justify-center h-full animate-pulse opacity-50 text-xs font-bold uppercase">Loading...</div></WidgetFrame>;

  const forecast = data.daily.time.slice(0, 3).map((date: string, i: number) => ({
        date,
        max: Math.round(data.daily.temperature_2m_max[i]),
        min: Math.round(data.daily.temperature_2m_min[i]),
        code: data.daily.weathercode[i]
  }));

  return (
    <WidgetFrame title={city} icon={CloudSun} hideHeader>
       <div className="flex flex-col h-full p-6 relative justify-between">
            <div className="flex items-center justify-between mb-2 z-10">
                 <div className="flex items-center gap-2">
                    <CloudSun className="w-4 h-4 text-yellow-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider opacity-70">{city}</h3>
                 </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                         <span className="text-6xl font-black tracking-tighter leading-none">{Math.round(data.current_weather.temperature)}°</span>
                         <span className="text-[10px] font-bold opacity-50 mt-1 uppercase tracking-widest pl-1">Current</span>
                    </div>
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md shadow-lg border border-white/5">
                        {getWeatherIcon(data.current_weather.weathercode, "w-10 h-10 text-yellow-400")}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {forecast.map((day: any, i: number) => (
                        <div key={i} className="flex flex-col items-center p-2 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-[9px] font-bold opacity-70 mb-1 uppercase tracking-wider">{new Date(day.date).toLocaleDateString('en-US', {weekday: 'short'})}</span>
                            {getWeatherIcon(day.code, "w-6 h-6 opacity-90 mb-1")}
                            <div className="flex gap-1 text-xs font-bold">
                                <span>{day.max}°</span>
                                <span className="opacity-40">{day.min}°</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
       </div>
    </WidgetFrame>
  );
};

const FeaturedAnnouncementWidget: React.FC<WidgetProps> = ({ appData }) => {
    const activeAnnouncements = appData?.announcements.filter(a => a.active) || [];
    const [playlistIndex, setPlaylistIndex] = useState(0);

    useEffect(() => {
        if (activeAnnouncements.length <= 1) return;
        const interval = setInterval(() => {
          setPlaylistIndex(prev => (prev + 1) % activeAnnouncements.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [activeAnnouncements.length]);

    const currentAnnouncement = activeAnnouncements[playlistIndex];

    if (!currentAnnouncement) {
        return <WidgetFrame><div className="flex items-center justify-center h-full opacity-50 text-xs font-bold uppercase">No Announcements</div></WidgetFrame>;
    }

    return (
        <div className="glass-panel w-full h-full rounded-[2rem] overflow-hidden group relative flex flex-col justify-center bg-slate-900 border border-white/10">
            <div className="relative w-full h-full flex flex-col justify-center z-10">
                {currentAnnouncement.imageUrl ? (
                    <div className="absolute inset-0">
                        <img src={currentAnnouncement.imageUrl} className="w-full h-full object-cover opacity-80" alt="Background" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-5">
                             <h2 className="text-lg font-black text-white mb-1 line-clamp-1 leading-tight">{currentAnnouncement.title}</h2>
                             <p className="text-xs text-white opacity-80 line-clamp-2 leading-relaxed">{currentAnnouncement.content}</p>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 flex flex-col justify-center h-full">
                        <h2 className="text-xl font-black mb-2 line-clamp-2 leading-tight">{currentAnnouncement.title}</h2>
                        <p className="text-sm opacity-80 line-clamp-3 leading-relaxed">{currentAnnouncement.content}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const EventsWidget: React.FC<WidgetProps> = ({ appData }) => {
    const events = appData?.events || [];
    const [setIndex, setSetIndex] = useState(0);
    const eventsPerSet = 3;
    const totalSets = Math.ceil(events.length / eventsPerSet);

    useEffect(() => {
        if (totalSets <= 1) return;
        const interval = setInterval(() => {
          setSetIndex(prev => (prev + 1) % totalSets);
        }, 5000);
        return () => clearInterval(interval);
    }, [totalSets]);

    const visibleEvents = useMemo(() => {
      const start = setIndex * eventsPerSet;
      return events.slice(start, start + eventsPerSet);
    }, [events, setIndex]);

    return (
        <WidgetFrame title="Upcoming Events" icon={Calendar}>
             <div className="h-full overflow-hidden flex flex-col gap-2 p-5 pt-0">
                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-700" key={setIndex}>
                  {visibleEvents.map((evt) => (
                      <div key={evt.id} className="flex gap-3 items-center p-2.5 rounded-xl bg-white/5 border border-white/5 min-h-[70px] hover:bg-white/10 transition-colors shrink-0">
                          <div className="flex flex-col items-center justify-center bg-white/10 w-10 h-10 rounded-lg shrink-0 border border-white/5">
                              <span className="text-[8px] font-black opacity-80 text-blue-400 uppercase leading-none mb-0.5">{new Date(evt.date).toLocaleDateString('en-US', {weekday: 'short'})}</span>
                              <span className="text-sm font-black leading-none">{new Date(evt.date).getDate()}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold truncate leading-tight mb-0.5">{evt.title}</h4>
                              <div className="flex items-center gap-2 opacity-50 text-[10px] font-bold uppercase tracking-wider">
                                  <span>{evt.time}</span>
                                  <span className="w-1 h-1 rounded-full bg-white/50"></span>
                                  <span className="truncate">{evt.category}</span>
                              </div>
                          </div>
                      </div>
                  ))}
                </div>
                {events.length === 0 && <div className="text-center opacity-40 mt-10 text-xs font-bold uppercase tracking-widest">No Upcoming Events</div>}
             </div>
        </WidgetFrame>
    );
};

const QUOTES = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" }
];

const QuoteWidget: React.FC<WidgetProps> = () => {
    const [quote, setQuote] = useState(QUOTES[0]);
    useEffect(() => {
        setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
        const interval = setInterval(() => {
            setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
        }, 60000); 
        return () => clearInterval(interval);
    }, []);

    return (
        <WidgetFrame title="Daily Wisdom" icon={Quote}>
            <div className="p-6 flex flex-col justify-center h-full text-center">
                <p className="text-xl font-serif font-medium leading-relaxed mb-3">"{quote.text}"</p>
                <p className="text-xs font-black opacity-50 uppercase tracking-widest text-blue-300">- {quote.author}</p>
            </div>
        </WidgetFrame>
    );
};

const NasaWidget: React.FC<WidgetProps> = () => {
    const [data, setData] = useState<any>(null);
    useEffect(() => {
        const fetchApod = async () => {
            const res = await safeFetch('nasa_apod', 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY', 3600);
            if (res) setData(res);
        };
        fetchApod();
    }, []);

    if (!data) return <WidgetFrame title="NASA APOD" icon={Rocket}><div className="flex items-center justify-center h-full opacity-50 text-xs font-bold uppercase">Loading Space...</div></WidgetFrame>;

    return (
        <WidgetFrame hideHeader>
            <div className="relative w-full h-full group">
                <img src={data.url} alt={data.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                <div className="absolute bottom-0 left-0 p-5">
                    <div className="flex items-center gap-2 mb-1 text-[10px] font-black uppercase tracking-widest text-blue-400">
                        <Rocket className="w-3 h-3" /> NASA Picture of the Day
                    </div>
                    <h3 className="text-lg font-black leading-tight line-clamp-2">{data.title}</h3>
                </div>
            </div>
        </WidgetFrame>
    );
};

const NewsWidget: React.FC<WidgetProps> = () => {
    const [news, setNews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const newsScrollRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const loadNews = async () => {
            setLoading(true);
            const liveNews = await fetchLiveNews();
            if (liveNews && liveNews.length > 0) {
                setNews(liveNews);
            }
            setLoading(false);
        };
        loadNews();
        // Refresh every hour
        const interval = setInterval(loadNews, 3600000);
        return () => clearInterval(interval);
    }, []);

    // AUTO-SCROLL LOGIC FOR NEWS
    useEffect(() => {
        const el = newsScrollRef.current;
        if (!el || news.length < 4) return;

        const speedPx = 0.8;
        const tickMs = 50;
        const pauseMsAtBottom = 4000;
        let paused = false;
        let timer: any;

        const step = () => {
            if (!el || paused) return;
            const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 5;

            if (atBottom) {
                paused = true;
                setTimeout(() => {
                    if (!el) return;
                    el.scrollTo({ top: 0, behavior: 'smooth' });
                    setTimeout(() => { paused = false; }, 1500);
                }, pauseMsAtBottom);
                return;
            }
            el.scrollTop += speedPx;
        };

        timer = setInterval(step, tickMs);
        return () => clearInterval(timer);
    }, [news.length]);

    return (
        <WidgetFrame title="Education & Campus News" icon={Newspaper}>
            <div ref={newsScrollRef} className="flex flex-col gap-0 h-full overflow-y-auto no-scrollbar">
                {news.length > 0 ? (
                    news.map((item, i) => (
                        <div key={i} className="p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors shrink-0">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-[8px] font-black text-blue-400 uppercase tracking-widest border border-blue-500/20">{item.source}</span>
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="opacity-30 hover:opacity-100 transition-opacity">
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                            <h4 className="text-sm font-bold leading-snug line-clamp-2 text-white/90">{item.title}</h4>
                        </div>
                    ))
                ) : (
                    loading ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-40 p-10 text-center">
                            <Newspaper className="w-8 h-8 mb-2 animate-pulse text-blue-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Searching World News...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-40 p-10 text-center">
                            <AlertTriangle className="w-8 h-8 mb-2 text-yellow-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">News temporary unavailable</span>
                        </div>
                    )
                )}
                {news.length > 0 && (
                    <div className="p-4 pt-2 shrink-0">
                        <div className="flex items-center gap-2 opacity-20 text-[8px] font-black uppercase tracking-tighter">
                            <Globe className="w-2.5 h-2.5" /> Powered by Google Search Grounding
                        </div>
                    </div>
                )}
                {news.length > 0 && <div className="h-8 shrink-0"></div>}
            </div>
        </WidgetFrame>
    );
};

const CustomApiWidget: React.FC<WidgetProps> = ({ config }) => {
    const [value, setValue] = useState<string>('--');
    const { endpoint, jsonPath, prefix, suffix, name } = config.settings || {};

    useEffect(() => {
        if (!endpoint) return;
        const fetchData = async () => {
            const res: any = await safeFetch(`custom_widget_${config.id}`, endpoint, config.refreshSeconds || 60);
            if (res && jsonPath) {
                const val = _.get(res, jsonPath);
                if (val !== undefined) setValue(String(val));
            }
        };
        fetchData();
        const interval = setInterval(fetchData, (config.refreshSeconds || 60) * 1000);
        return () => clearInterval(interval);
    }, [endpoint, jsonPath, config.refreshSeconds]);

    return (
        <WidgetFrame title={name || config.title || "Data"} icon={Database}>
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <span className="text-3xl font-black tracking-tight">
                    {prefix}{value}{suffix}
                </span>
                {name && <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-2">{name}</span>}
            </div>
        </WidgetFrame>
    );
}

const ClockWidget: React.FC<WidgetProps> = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <WidgetFrame hideHeader>
        <div className="flex flex-col items-center justify-center h-full bg-slate-900/50">
            <span className="text-5xl font-black tabular-nums tracking-tighter">{time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            <span className="text-sm font-bold opacity-60 mt-2 uppercase tracking-widest">{time.toLocaleDateString([], {weekday: 'long', month: 'short', day: 'numeric'})}</span>
        </div>
    </WidgetFrame>
  );
};

const TextWidget: React.FC<WidgetProps> = ({ config }) => (
    <WidgetFrame title={config.title || "Text"} icon={Megaphone}>
        <div className="p-6 prose prose-invert prose-sm max-w-none">
            {config.settings?.text ? (
                <div className="whitespace-pre-wrap font-bold leading-relaxed">{config.settings.text}</div>
            ) : (
                <div className="opacity-40 italic text-xs">No text content set. Edit in Admin Panel.</div>
            )}
        </div>
    </WidgetFrame>
);

const ImageWidget: React.FC<WidgetProps> = ({ config }) => (
    <WidgetFrame hideHeader>
        {config.settings?.url ? (
            <img src={config.settings.url} className="w-full h-full object-cover" alt="Widget" />
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 text-white/30 p-4 text-center">
                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-[10px] font-bold uppercase tracking-widest">No Image Set</span>
            </div>
        )}
    </WidgetFrame>
);

const COMPONENT_MAP: Record<string, React.FC<WidgetProps>> = {
  clock: ClockWidget,
  weather: WeatherWidget,
  featured_announcements: FeaturedAnnouncementWidget,
  nasa: NasaWidget,
  quote: QuoteWidget,
  news: NewsWidget,
  events: EventsWidget,
  text: TextWidget,
  image: ImageWidget,
  custom_api: CustomApiWidget
};

export const GridRenderer: React.FC<{ layout: GridItemConfig[], widgets: Record<string, WidgetConfig>, appData: AppData, width: number }> = ({ layout, widgets, appData, width }) => {
    
    // CRITICAL: Synchronize layouts across all breakpoints to prevent auto-compacting and overlap
    // Using a strictly computed coordinate map to ensure what you see in designer is what you see in kiosk
    const synchronizedLayouts = useMemo(() => {
        const cleanLayout = layout.map(l => ({
            i: l.i,
            x: Math.floor(Number(l.x)),
            y: Math.floor(Number(l.y)),
            w: Math.floor(Number(l.w)),
            h: Math.floor(Number(l.h))
        }));
        return {
            lg: cleanLayout,
            md: cleanLayout,
            sm: cleanLayout,
            xs: cleanLayout,
            xxs: cleanLayout
        };
    }, [layout]);

    // Constant aspect ratio logic (Cell Width / Cell Height)
    // Locked to a specific ratio to ensure the grid does not "squish" on wide screens
    const dynamicRowHeight = (width / 12) / 1.2;

    return (
        <div className="w-full h-full overflow-hidden">
            {Responsive ? (
                <Responsive
                    className="layout"
                    layouts={synchronizedLayouts}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }} 
                    rowHeight={dynamicRowHeight}
                    width={width}
                    isDraggable={false}
                    isResizable={false}
                    margin={[20, 20]}
                    containerPadding={[0, 0]}
                    useCSSTransforms={true}
                    compactType={null} 
                    preventCollision={true}
                >
                    {layout.map(item => {
                        const widgetConfig = widgets[item.i];
                        if (!widgetConfig) return <div key={item.i} />;
                        const Component = COMPONENT_MAP[widgetConfig.type] || COMPONENT_MAP.text;
                        return (
                            <div key={item.i} className="select-none h-full w-full">
                                <ErrorBoundary componentName={`Widget: ${widgetConfig.type} (${item.i})`}>
                                    <Component config={widgetConfig} appData={appData} />
                                </ErrorBoundary>
                            </div>
                        );
                    })}
                </Responsive>
            ) : null}
        </div>
    );
};

export const WIDGET_TYPES = Object.keys(COMPONENT_MAP).filter(t => t !== 'custom_api');
export const WIDGET_LABELS: Record<string, string> = {
    clock: "Clock",
    weather: "Weather",
    featured_announcements: "Slideshow",
    nasa: "NASA Space",
    quote: "Daily Quote",
    news: "Campus News",
    events: "Events List",
    text: "Rich Text",
    image: "Static Image",
    custom_api: "API Data"
};
