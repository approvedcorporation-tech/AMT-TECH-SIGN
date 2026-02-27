import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AppData, ViewMode, Announcement, Event, Page, WidgetConfig, GridItemConfig, CustomWidgetDefinition, LoginLogEntry } from '../types';
import { getStoredData, saveStoredData } from '../services/storageService';
import { rewriteAnnouncement, generateTheme, analyzeNewsletter } from '../services/geminiService';
import { extractTextFromPdf } from '../services/pdfService';
import { safeStorage } from '../lib/safeStorage';
import { 
  Monitor, Save, Plus, Trash2, Wand2, Calendar, Megaphone, 
  Loader2, Palette, ImageIcon, FileText, Smartphone, Database, 
  Sparkles, FileUp, LayoutGrid, Instagram, Twitter, 
  ArrowUp, ArrowDown, Settings2, HeartPulse, 
  Terminal, Trash, Shield, Copy, Camera, CloudSun, LogOut, AlertTriangle,
  ChevronRight, Globe, Clock, ShieldCheck, Mail, Lock, CheckCircle, Info, XCircle, Phone
} from 'lucide-react';
import RGL from 'react-grid-layout';
import _ from 'lodash';
import { WIDGET_TYPES, WIDGET_LABELS, GridRenderer } from './WidgetSystem';
import AdminConfigEditor from './AdminConfigEditor';
import { getLogs, clearLogs, LogEntry } from '../services/logService';
import { useSimpleAuth } from '../context/SimpleAuthContext';
import { getLoginLogs, clearLoginLogs } from '../services/authLogService';
import ErrorBoundary from './ErrorBoundary';

const Responsive = (RGL as any).Responsive;

interface AdminProps {
  changeView: (mode: ViewMode) => void;
}

const APP_VERSION = "v1.6.0";
const MAX_FILE_SIZE_MB = 10;
const ANALYSIS_TIMEOUT_MS = 45000;

const AdminDashboard: React.FC<AdminProps> = ({ changeView }) => {
  const { session, logout } = useSimpleAuth();
  const [data, setData] = useState<AppData>(getStoredData());
  const [activeTab, setActiveTab] = useState<'announcements' | 'events' | 'pages' | 'appearance' | 'ticker' | 'livecam' | 'contact' | 'weather' | 'widgets' | 'import' | 'config' | 'health' | 'security'>('announcements');
  const [isSaving, setIsSaving] = useState(false);
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>(getLogs());
  const [loginLogs, setLoginLogs] = useState<LoginLogEntry[]>([]);
  const [tickerInput, setTickerInput] = useState('');

  // Use ID instead of index for stable page editing
  const [editingLayoutPageId, setEditingLayoutPageId] = useState<string | null>(null); 
  
  // AI Import Specific State
  const [importStatus, setImportStatus] = useState<string>('idle');
  const [importStep, setImportStep] = useState<number>(0);
  const [previewData, setPreviewData] = useState<{announcements: any[], events: any[]} | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const importTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [designerWidth, setDesignerWidth] = useState(1200);
  const designerContainerRef = useRef<HTMLDivElement>(null);
  const [newWidgetDef, setNewWidgetDef] = useState<Partial<CustomWidgetDefinition>>({ refreshSeconds: 60 });

  const refreshFromStorage = useCallback(() => {
    setData(getStoredData());
  }, []);

  useEffect(() => {
    refreshFromStorage();
    const handleLogUpdate = () => setSystemLogs(getLogs());
    window.addEventListener('hardy-log-update', handleLogUpdate);
    window.addEventListener('hardy-storage-update', refreshFromStorage);
    return () => {
      window.removeEventListener('hardy-log-update', handleLogUpdate);
      window.removeEventListener('hardy-storage-update', refreshFromStorage);
    };
  }, [refreshFromStorage]);

  useEffect(() => {
    if (activeTab === 'security') {
      setLoginLogs(getLoginLogs());
    }
  }, [activeTab]);

  useEffect(() => {
      if (editingLayoutPageId === null || !designerContainerRef.current) return;
      const updateWidth = () => {
          if (designerContainerRef.current) setDesignerWidth(designerContainerRef.current.offsetWidth);
      };
      const resizeObserver = new ResizeObserver(updateWidth);
      resizeObserver.observe(designerContainerRef.current);
      updateWidth();
      return () => resizeObserver.disconnect();
  }, [editingLayoutPageId]);

  const handleSave = () => {
    setIsSaving(true);
    saveStoredData(data);
    setTimeout(() => setIsSaving(false), 800);
  };

  const cancelImport = useCallback(() => {
    if (importTimeoutRef.current) clearTimeout(importTimeoutRef.current);
    setImportStatus('idle');
    setImportStep(0);
    setPreviewData(null);
  }, []);

  const handlePdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          alert(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
          return;
      }
      setImportStatus('processing');
      setImportStep(1);
      importTimeoutRef.current = setTimeout(() => {
          if (importStatus === 'processing') {
              cancelImport();
              alert("Import timed out.");
          }
      }, ANALYSIS_TIMEOUT_MS);
      try {
          setImportStep(2);
          const text = await extractTextFromPdf(file);
          setImportStep(3);
          await new Promise(r => setTimeout(r, 400));
          setImportStep(4);
          const result = await analyzeNewsletter(text);
          setImportStep(5);
          setPreviewData(result);
          setImportStatus('preview');
      } catch (err: any) {
          setImportStatus('idle');
          setImportStep(0);
          if (err.name !== 'AbortError') {
             alert(err.message || "An error occurred during import.");
          }
      } finally {
          if (importTimeoutRef.current) clearTimeout(importTimeoutRef.current);
      }
  };

  const handleFactoryReset = () => {
      if (window.confirm("Factory reset? This will erase all data.")) {
          safeStorage.clear();
          window.location.reload();
      }
  };

  const handleImageUpload = (file: File, callback: (base64: string) => void) => {
      const reader = new FileReader();
      reader.onloadend = () => typeof reader.result === 'string' && callback(reader.result);
      reader.readAsDataURL(file);
  };

  const deleteImportItem = (type: 'announcements' | 'events', index: number) => {
      if (!previewData) return;
      const updated = { ...previewData };
      updated[type] = [...(updated[type] || [])];
      updated[type].splice(index, 1);
      setPreviewData(updated);
  };

  const commitImport = () => {
      if (!previewData) return;
      const newAnnouncements = [...(data.announcements || [])];
      const newEvents = [...(data.events || [])];
      
      previewData.announcements?.forEach((a: any) => {
          newAnnouncements.unshift({
              id: Math.random().toString(36).substr(2, 9),
              type: 'text',
              title: a.title || 'Extracted Notice',
              content: a.content || '',
              active: true,
              priority: a.priority || 'normal'
          });
      });
      
      previewData.events?.forEach((e: any) => {
          newEvents.unshift({
              id: Math.random().toString(36).substr(2, 9),
              title: e.title || 'Extracted Event',
              time: e.time || '12:00',
              location: e.location || 'Campus',
              date: e.date || new Date().toISOString(),
              category: e.category || 'General'
          });
      });
      
      setData({ ...data, announcements: newAnnouncements, events: newEvents });
      setPreviewData(null);
      setImportStatus('idle');
      setImportStep(0);
      setActiveTab('announcements');
  };

  const togglePage = (id: string) => {
      const newPages = (data.pages || []).map(p => p.id === id ? { ...p, enabled: !p.enabled } : p);
      setData({ ...data, pages: newPages });
  };

  const addWidget = (type: string, customDefId?: string) => {
      if (editingLayoutPageId === null) return;
      const newPages = (data.pages || []).map(p => {
          if (p.id !== editingLayoutPageId) return p;
          const widgetId = `${type}-${Date.now()}`;
          const newWidget: WidgetConfig = {
              id: widgetId,
              type: type as any,
              title: customDefId ? undefined : WIDGET_LABELS[type] || type,
              refreshSeconds: 60,
              settings: {}
          };
          const newItem: GridItemConfig = { i: widgetId, x: 0, y: 0, w: 4, h: 4 };
          return {
              ...p,
              type: 'grid' as const,
              layout: [...(p.layout || []), newItem],
              widgets: { ...(p.widgets || {}), [widgetId]: newWidget }
          };
      });
      setData({ ...data, pages: newPages });
  };

  const layoutCtx = useMemo(() => 
    (data.pages || []).find(p => p.id === editingLayoutPageId), 
    [data.pages, editingLayoutPageId]
  );
  
  const designerLayouts = useMemo(() => {
    const safeLayout = (layoutCtx?.layout || []).filter(l => l && l.i);
    return { lg: safeLayout };
  }, [layoutCtx]);

  if (layoutCtx) {
      const dynamicRowHeight = (designerWidth / 12) / 1.2;
      return (
          <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col text-white font-sans">
              <div className="h-20 border-b border-white/10 flex items-center justify-between px-10 bg-black">
                   <div className="flex items-center gap-4">
                       <LayoutGrid className="w-6 h-6" style={{ color: 'var(--accent-color)' }} />
                       <h2 className="text-xl font-black uppercase tracking-widest">{layoutCtx.title}</h2>
                       <span className="text-[10px] font-black px-2 py-1 rounded text-white" style={{ backgroundColor: 'var(--accent-color)' }}>DESIGNER</span>
                   </div>
                   <div className="flex items-center gap-6">
                       <button onClick={() => setEditingLayoutPageId(null)} className="px-6 py-2 hover:bg-white/10 rounded-xl font-bold transition-all border border-white/10">Exit Designer</button>
                       <button onClick={handleSave} style={{ backgroundColor: 'var(--accent-color)' }} className="hover:opacity-90 px-8 py-2 rounded-xl font-black text-sm flex items-center gap-2 shadow-xl shadow-green-900/20 text-white">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} SAVE LAYOUT
                       </button>
                   </div>
              </div>
              <div className="flex-1 flex overflow-hidden">
                  <div className="w-80 bg-slate-900 border-r border-white/10 flex flex-col overflow-hidden shrink-0 p-6 space-y-3">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Add Widget</h3>
                      {WIDGET_TYPES.map(type => (
                          <button key={type} onClick={() => addWidget(type)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left">
                              <div className="font-bold text-sm">{WIDGET_LABELS[type]}</div>
                          </button>
                      ))}
                  </div>
                  <div className="flex-1 bg-black/90 p-10 overflow-hidden flex flex-col items-center justify-center relative">
                      <div className="w-full max-w-[1400px] aspect-video bg-slate-900 rounded-[2rem] border-4 border-dashed border-white/10 relative shadow-2xl overflow-hidden" ref={designerContainerRef}>
                            <Responsive
                                className="layout h-full w-full"
                                layouts={designerLayouts}
                                breakpoints={{ lg: 1200 }}
                                cols={{ lg: 12 }}
                                rowHeight={dynamicRowHeight}
                                width={designerWidth}
                                onLayoutChange={(layout: any) => {
                                    const safeLayout = (layout || []).filter((l: any) => l && l.i).map((l:any) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }));
                                    const newPages = (data.pages || []).map(p => {
                                        if (p.id !== editingLayoutPageId) return p;
                                        return {
                                            ...p,
                                            layout: safeLayout
                                        };
                                    });
                                    setData({ ...data, pages: newPages });
                                }}
                                draggableHandle=".drag-handle"
                                compactType={null} 
                                preventCollision={true}
                                margin={[20, 20]}
                            >
                                {(layoutCtx.layout || []).map(item => (
                                    <div key={item.i} className="rounded-3xl border-2 bg-slate-800 shadow-xl overflow-hidden border-white/5 flex flex-col relative group/item">
                                        <div className="bg-slate-900 p-2 flex items-center justify-between drag-handle cursor-move">
                                            <span className="text-[9px] font-black uppercase text-white/50">{layoutCtx.widgets?.[item.i]?.title || layoutCtx.widgets?.[item.i]?.type || 'Widget'}</span>
                                            <button onClick={() => {
                                              const newPages = (data.pages || []).map(p => {
                                                  if (p.id !== editingLayoutPageId) return p;
                                                  const newLayout = (p.layout || []).filter(l => l.i !== item.i);
                                                  const newWidgets = { ...(p.widgets || {}) };
                                                  return { ...p, layout: newLayout, widgets: newWidgets };
                                              });
                                              setData({...data, pages: newPages});
                                            }} className="text-red-400 hover:text-red-500 p-1 opacity-0 group-hover/item:opacity-100 transition-opacity"><Trash2 className="w-3 h-3"/></button>
                                        </div>
                                        <div className="flex-1 flex flex-col items-center justify-center opacity-30 select-none">
                                            <div className="text-xl font-black uppercase tracking-tighter">{layoutCtx.widgets?.[item.i]?.type}</div>
                                        </div>
                                    </div>
                                ))}
                            </Responsive>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'announcements':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{(data.announcements || []).length} Items</p>
              <button onClick={() => setData({...data, announcements: [{id: Date.now().toString(), type: 'text', title: 'New Announcement', content: '', active: true, priority: 'normal'}, ...(data.announcements || [])]})} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 flex items-center gap-2 transition-all">
                <Plus className="w-4 h-4" /> Add New
              </button>
            </div>
            {(data.announcements || []).map((item, i) => (
              <div key={item.id} className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 flex gap-6 group hover:border-blue-100 transition-all">
                <div className="w-32 h-32 rounded-2xl bg-slate-200 shrink-0 overflow-hidden relative shadow-inner">
                  {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon className="w-8 h-8" /></div>}
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer text-white text-[9px] font-black uppercase transition-opacity">
                    Change
                    <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], (b64) => { 
                      const n = [...(data.announcements || [])]; 
                      n[i].imageUrl = b64; 
                      setData({...data, announcements: n}); 
                    })} />
                  </label>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <input className="flex-1 bg-transparent text-xl font-black text-slate-800 border-none p-0 focus:ring-0" placeholder="Title" value={item.title} onChange={(e) => { 
                      const n = [...(data.announcements || [])]; 
                      n[i].title = e.target.value; 
                      setData({...data, announcements: n}); 
                    }} />
                    <div className="flex gap-2">
                      <button onClick={() => { 
                        const n = [...(data.announcements || [])]; 
                        n[i].priority = n[i].priority === 'high' ? 'normal' : 'high'; 
                        setData({...data, announcements: n}); 
                      }} className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${item.priority === 'high' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500'}`}>High priority</button>
                      <button onClick={() => { 
                        const n = [...(data.announcements || [])]; 
                        n.splice(i, 1); 
                        setData({...data, announcements: n}); 
                      }} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <textarea className="w-full bg-white p-4 rounded-2xl border border-slate-200 text-sm resize-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all" rows={2} value={item.content} onChange={(e) => { 
                    const n = [...(data.announcements || [])]; 
                    n[i].content = e.target.value; 
                    setData({...data, announcements: n}); 
                  }} />
                  <div className="flex items-center justify-between">
                    <button onClick={async () => { 
                      const n = [...(data.announcements || [])]; 
                      n[i].content = await rewriteAnnouncement(n[i].content); 
                      setData({...data, announcements: n}); 
                    }} className="flex items-center gap-2 text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest transition-colors">
                      <Wand2 className="w-3.5 h-3.5" /> AI Rewrite
                    </button>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <span className="text-[10px] font-black uppercase text-slate-400">Published</span>
                      <div onClick={() => { 
                        const n = [...(data.announcements || [])]; 
                        n[i].active = !n[i].active; 
                        setData({...data, announcements: n}); 
                      }} className={`w-10 h-6 rounded-full p-1 transition-colors ${item.active ? 'bg-green-500' : 'bg-slate-200'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${item.active ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'events':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{(data.events || []).length} Upcoming</p>
              <button onClick={() => setData({...data, events: [...(data.events || []), {id: Date.now().toString(), title: 'New Event', time: '12:00', location: 'TBD', date: new Date().toISOString(), category: 'General'}]})} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 flex items-center gap-2 transition-all">
                <Plus className="w-4 h-4" /> Add Event
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {(data.events || []).map((evt, i) => (
                <div key={evt.id} className="p-4 bg-slate-50 border border-slate-100 rounded-3xl flex items-center gap-6 group hover:border-blue-100 transition-all">
                  <div className="w-16 h-16 rounded-2xl bg-white flex flex-col items-center justify-center border border-slate-100 shadow-sm shrink-0 relative overflow-hidden">
                    <input type="date" className="absolute inset-0 opacity-0 cursor-pointer" value={evt.date?.split('T')[0] || ''} onChange={(e) => { 
                      const n = [...(data.events || [])]; 
                      n[i].date = new Date(e.target.value).toISOString(); 
                      setData({...data, events: n}); 
                    }} />
                    <span className="text-[9px] font-black text-red-500 uppercase">{new Date(evt.date || Date.now()).toLocaleDateString('en-US', {weekday:'short'}).toUpperCase()}</span>
                    <span className="text-2xl font-black text-slate-800">{new Date(evt.date || Date.now()).getDate()}</span>
                  </div>
                  <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-5"><input className="w-full bg-transparent font-black text-slate-800 border-none p-0 focus:ring-0" value={evt.title} onChange={(e) => { 
                      const n = [...(data.events || [])]; 
                      n[i].title = e.target.value; 
                      setData({...data, events: n}); 
                    }} placeholder="Event Title" /></div>
                    <div className="col-span-2"><input type="time" className="w-full bg-transparent font-bold text-slate-500 text-sm border-none p-0 focus:ring-0" value={evt.time} onChange={(e) => { 
                      const n = [...(data.events || [])]; 
                      n[i].time = e.target.value; 
                      setData({...data, events: n}); 
                    }} /></div>
                    <div className="col-span-3">
                      <select className="w-full bg-transparent font-black text-[10px] text-slate-400 uppercase tracking-widest border-none p-0 focus:ring-0" value={evt.category} onChange={(e) => { 
                        const n = [...(data.events || [])]; 
                        n[i].category = e.target.value; 
                        setData({...data, events: n}); 
                      }}>
                        {['Academic', 'Sports', 'Arts', 'General'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button onClick={() => { 
                        const n = [...(data.events || [])]; 
                        n.splice(i, 1); 
                        setData({...data, events: n}); 
                      }} className="p-2 text-slate-200 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'pages':
        return (
          <div className="space-y-12">
            <div className="flex justify-between items-center mb-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kiosk Rotation</p>
              <button onClick={() => setData({...data, pages: [...(data.pages || []), {id: Date.now().toString(), title: 'New Page', type: 'standard', content: '## Page Content', enabled: true}]})} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 flex items-center gap-2 transition-all">
                <Plus className="w-4 h-4" /> Create Page
              </button>
            </div>
            {(data.pages || []).map((page, i) => (
              <div key={page.id} className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 relative group/page">
                <div className="flex justify-between items-center mb-8 pb-8 border-b border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-500 text-xs">{i + 1}</div>
                    <input className="bg-transparent font-black text-2xl text-slate-800 border-none focus:ring-0 p-0" value={page.title} onChange={(e) => { 
                      const n = [...(data.pages || [])]; 
                      n[i].title = e.target.value; 
                      setData({...data, pages: n}); 
                    }} />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => {
                      const newPages = (data.pages || []).map(p => p.id === page.id ? { ...p, type: 'grid' as const } : p);
                      setData({ ...data, pages: newPages });
                      setEditingLayoutPageId(page.id);
                    }} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 shadow-lg shadow-black/10"><LayoutGrid className="w-4 h-4" /> Layout Designer</button>
                    <button onClick={() => togglePage(page.id)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${page.enabled ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                      {page.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button onClick={() => { 
                      const n = [...(data.pages || [])]; 
                      n.splice(i, 1); 
                      setData({...data, pages: n}); 
                    }} className="p-2 text-slate-200 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className={page.type === 'grid' ? 'opacity-50 pointer-events-none' : ''}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Main Content (Markdown)</label>
                    <textarea className="w-full h-40 bg-white p-6 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none" value={page.content} onChange={(e) => { 
                      const n = [...(data.pages || [])]; 
                      n[i].content = e.target.value; 
                      setData({...data, pages: n}); 
                    }} />
                    {page.type === 'grid' && (
                      <div className="mt-2 text-[9px] font-black text-blue-500 uppercase tracking-tighter flex items-center gap-1">
                        <Info className="w-2.5 h-2.5"/> Active Layout: Designer content overrides markdown.
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Hero Visual</label>
                    <div className="w-full h-40 rounded-2xl bg-slate-200 overflow-hidden relative group/img cursor-pointer">
                      {page.imageUrl ? <img src={page.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon className="w-10 h-10" /></div>}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-[9px] font-black uppercase">
                        Upload Image
                        <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], (b64) => { 
                          const n = [...(data.pages || [])]; 
                          n[i].imageUrl = b64; 
                          setData({...data, pages: n}); 
                        })} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'import':
        return (
          <div className="flex flex-col h-full min-h-[500px] items-center justify-center text-center p-12 bg-slate-50 rounded-[2.5rem] relative">
            {importStatus === 'processing' ? (
              <div className="flex flex-col items-center animate-in fade-in duration-500">
                <div className="w-20 h-20 rounded-3xl bg-blue-100 flex items-center justify-center mb-6 border-4 border-blue-500 animate-pulse">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                </div>
                <h3 className="text-2xl font-black mb-2">Signage Pipeline Active</h3>
                <p className="text-slate-500 font-bold mb-8 uppercase text-[10px] tracking-widest">
                  Step {importStep} of 5: {
                    importStep === 1 ? 'Uploading metadata...' :
                    importStep === 2 ? 'Deconstructing PDF...' :
                    importStep === 3 ? 'Refining extracted text...' :
                    importStep === 4 ? 'Gemini AI reasoning...' :
                    'Formatting results...'
                  }
                </p>
                <div className="w-64 h-1.5 bg-slate-200 rounded-full mb-10 overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${(importStep/5)*100}%` }}></div>
                </div>
                <button onClick={cancelImport} className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all">
                  <XCircle className="w-4 h-4" /> Abort Process
                </button>
              </div>
            ) : (
              <>
                <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/20 rotate-3">
                  <FileUp className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-4">AI Document Import</h3>
                <p className="text-slate-500 text-lg max-w-xl mb-10 font-medium">Upload a school bulletin (PDF). Our high-performance engine extracts events and notices automatically.</p>
                <div className="relative group">
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf" onChange={handlePdfImport} />
                  <div className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-4 group-hover:bg-slate-800 transition-all shadow-xl shadow-black/20">
                    <FileUp className="w-5 h-5" /> Select PDF Bulletin
                  </div>
                </div>
                <div className="mt-8 flex gap-8 items-center justify-center opacity-40">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><Info className="w-3.5 h-3.5"/> Max 10MB</div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><Info className="w-3.5 h-3.5"/> Max 15 Pages</div>
                </div>
              </>
            )}
            {previewData && (
              <div className="absolute inset-0 bg-white z-[60] flex flex-col p-12 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="flex justify-between items-center mb-10 shrink-0">
                  <div><h3 className="text-3xl font-black tracking-tight">Import Verification</h3><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Verify and refine AI extraction results</p></div>
                  <div className="flex gap-4">
                    <button onClick={() => setPreviewData(null)} className="px-6 py-3 bg-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Discard</button>
                    <button onClick={commitImport} className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:brightness-110 transition-all">Commit to Signage</button>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-10 overflow-hidden">
                  <div className="flex flex-col h-full bg-slate-50 rounded-[2rem] p-8 border border-slate-100 overflow-hidden">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-2"><Megaphone className="w-3.5 h-3.5" /> Notices ({(previewData.announcements || []).length})</h4>
                    <div className="flex-1 overflow-y-auto pr-4 space-y-4 no-scrollbar">
                      {(previewData.announcements || []).map((a: any, i: number) => (
                        <div key={i} className="p-5 bg-white rounded-2xl border border-slate-200 group relative shadow-sm hover:border-blue-200 transition-all">
                          <button onClick={() => deleteImportItem('announcements', i)} className="absolute top-4 right-4 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                          <h5 className="font-black text-sm mb-2 text-slate-800 leading-tight">{a.title}</h5>
                          <div className="text-xs text-slate-500 leading-relaxed font-medium">
                            {a.content?.length > 300 && !isExpanded ? (
                              <>
                                {a.content.substring(0, 300)}...
                                <button onClick={() => setIsExpanded(true)} className="text-blue-500 font-bold ml-1">Show more</button>
                              </>
                            ) : (
                              <>
                                {a.content}
                                {a.content?.length > 300 && <button onClick={() => setIsExpanded(false)} className="text-blue-500 font-bold ml-1">Show less</button>}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col h-full bg-slate-50 rounded-[2rem] p-8 border border-slate-100 overflow-hidden">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Schedule ({(previewData.events || []).length})</h4>
                    <div className="flex-1 overflow-y-auto pr-4 space-y-3 no-scrollbar">
                      {(previewData.events || []).map((e: any, i: number) => (
                        <div key={i} className="p-4 bg-white rounded-2xl border border-slate-200 group relative flex items-center gap-4 hover:border-blue-200 transition-all shadow-sm">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-blue-600 font-black text-xs border border-slate-100">{i+1}</div>
                          <div className="flex-1">
                            <h5 className="font-black text-sm text-slate-800 truncate mb-0.5">{e.title}</h5>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">{e.date} • {e.time}</p>
                          </div>
                          <button onClick={() => deleteImportItem('events', i)} className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'appearance':
        return (
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-8">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">School Identity</label>
                <input 
                  className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-black text-lg focus:ring-2" 
                  style={{'--tw-ring-color': 'var(--accent-color)'} as any} 
                  value={data.schoolName} 
                  onChange={(e) => setData({...data, schoolName: e.target.value})} 
                />
              </div>

              {/* RESTORED SOCIAL IDENTITY FIELDS */}
              <div className="space-y-6">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Contact & Social Presence</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Phone</label>
                    <input 
                      className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2" 
                      value={data.socials?.phone || ''} 
                      onChange={(e) => setData({...data, socials: {...data.socials, phone: e.target.value}})} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Website</label>
                    <input 
                      className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2" 
                      value={data.socials?.website || ''} 
                      onChange={(e) => setData({...data, socials: {...data.socials, website: e.target.value}})} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Instagram</label>
                    <input 
                      className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2" 
                      value={data.socials?.instagram || ''} 
                      onChange={(e) => setData({...data, socials: {...data.socials, instagram: e.target.value}})} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Twitter</label>
                    <input 
                      className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2" 
                      value={data.socials?.twitter || ''} 
                      onChange={(e) => setData({...data, socials: {...data.socials, twitter: e.target.value}})} 
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl">
                <h3 className="font-black text-xl mb-2 flex items-center gap-2"><Wand2 className="w-5 h-5" /> AI Theme Engine</h3>
                <p className="text-sm opacity-80 mb-6">Describe your brand colors and mood...</p>
                <div className="flex gap-3">
                  <input id="themePrompt" className="flex-1 bg-white/20 border-white/20 placeholder-white/50 text-white rounded-xl text-sm px-4 py-3" placeholder="e.g. Electric Blue and Slate..." />
                  <button onClick={async () => { 
                    const promptEl = document.getElementById('themePrompt') as HTMLInputElement;
                    if(!promptEl?.value) return; 
                    const theme = await generateTheme(promptEl.value); 
                    setData({...data, theme: { ...(data.theme || {}), ...theme }}); 
                  }} className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-black text-xs uppercase shadow-lg hover:scale-105 active:scale-95 transition-all">Generate</button>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Gradient Start</label><input type="color" className="h-14 w-full rounded-2xl cursor-pointer border-4 border-white shadow-lg" value={data.theme?.gradientStart || '#000000'} onChange={(e) => setData({...data, theme: {...data.theme, gradientStart: e.target.value}})} /></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Gradient End</label><input type="color" className="h-14 w-full rounded-2xl cursor-pointer border-4 border-white shadow-lg" value={data.theme?.gradientEnd || '#1e1b4b'} onChange={(e) => setData({...data, theme: {...data.theme, gradientEnd: e.target.value}})} /></div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Primary Accent</label>
                <div className="flex gap-4">
                  <input type="color" className="h-14 w-14 rounded-2xl cursor-pointer border-4 border-white shadow-lg shrink-0" value={data.theme?.accentColor || '#3b82f6'} onChange={(e) => setData({...data, theme: {...data.theme, accentColor: e.target.value}})} />
                  <input className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-mono font-black text-slate-500 uppercase" value={data.theme?.accentColor} readOnly />
                </div>
              </div>
              <div className="p-6 bg-slate-100 rounded-[2rem] border border-slate-200">
                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Logo Branding</h4>
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-white border border-slate-300 flex items-center justify-center p-2 relative overflow-hidden shadow-inner">
                    {data.theme?.logoUrl ? <img src={data.theme.logoUrl} className="w-full h-full object-contain" /> : <ImageIcon className="text-slate-200 w-8 h-8" />}
                  </div>
                  <label className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 cursor-pointer transition-colors">
                    Upload Logo
                    <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], (b64) => setData({...data, theme: {...data.theme, logoUrl: b64}}))} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
      case 'ticker':
        return (
          <div className="space-y-10">
            <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Ticker Content</h3>
              <div className="flex gap-3 mb-8">
                <input className="flex-1 bg-white p-4 rounded-2xl border border-slate-200 font-bold" placeholder="Add scrolling message..." value={tickerInput} onChange={(e) => setTickerInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (setData({...data, tickerItems: [...(data.tickerItems || []), tickerInput]}), setTickerInput(''))} />
                <button onClick={() => { if(tickerInput) { setData({...data, tickerItems: [...(data.tickerItems || []), tickerInput]}); setTickerInput(''); }}} style={{backgroundColor: 'var(--accent-color)'}} className="px-8 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-black/10"><Plus className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                {(data.tickerItems || []).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 group">
                    <div className="flex-1 text-sm font-bold text-slate-700">{item}</div>
                    <button onClick={() => { const n = [...(data.tickerItems || [])]; n.splice(idx, 1); setData({...data, tickerItems: n}); }} className="p-2 text-slate-200 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'livecam':
        return (
          <div className="space-y-8">
            <div className="p-6 bg-slate-50 rounded-3xl flex items-center justify-between border border-slate-100">
              <div><h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Active Surveillance Streams</h4><p className="text-xs text-slate-400 font-bold">Display live feeds on rotation</p></div>
              <button onClick={() => setData({...data, enableLiveCam: !data.enableLiveCam})} className={`w-12 h-7 rounded-full p-1 transition-colors ${data.enableLiveCam ? 'bg-green-500' : 'bg-slate-300'}`}><div className={`w-5 h-5 bg-white rounded-full transition-transform ${data.enableLiveCam ? 'translate-x-5' : 'translate-x-0'}`} /></button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {(data.liveCamUrls || []).map((url, i) => (
                <div key={i} className="flex gap-4">
                  <input className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono text-xs font-bold text-slate-400" value={url} onChange={(e) => { const n = [...(data.liveCamUrls || [])]; n[i] = e.target.value; setData({...data, liveCamUrls: n}); }} />
                  <button onClick={() => { const n = [...(data.liveCamUrls || [])]; n.splice(i, 1); setData({...data, liveCamUrls: n}); }} className="p-4 text-slate-200 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
                </div>
              ))}
              <button onClick={() => setData({...data, liveCamUrls: [...(data.liveCamUrls || []), '']})} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors">+ Link New Camera Feed</button>
            </div>
          </div>
        );
      case 'widgets':
        return (
          <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
            <h3 className="text-xl font-black mb-8">Registered Data Sources</h3>
            <div className="grid grid-cols-2 gap-6 mb-10">
              <input className="bg-white p-4 rounded-2xl border border-slate-200 text-xs font-bold" placeholder="Source Label" value={newWidgetDef.name || ''} onChange={(e) => setNewWidgetDef({...newWidgetDef, name: e.target.value})} />
              <input className="bg-white p-4 rounded-2xl border border-slate-200 text-xs font-bold" placeholder="API Endpoint" value={newWidgetDef.endpoint || ''} onChange={(e) => setNewWidgetDef({...newWidgetDef, endpoint: e.target.value})} />
              <input className="bg-white p-4 rounded-2xl border border-slate-200 text-xs font-bold" placeholder="JSON Resolver Path" value={newWidgetDef.jsonPath || ''} onChange={(e) => setNewWidgetDef({...newWidgetDef, jsonPath: e.target.value})} />
              <button onClick={() => { if(newWidgetDef.name && newWidgetDef.endpoint) { setData({...data, customWidgets: [...(data.customWidgets || []), {...newWidgetDef, id: Date.now().toString()} as any]}); setNewWidgetDef({refreshSeconds: 60}); }}} style={{backgroundColor: 'var(--accent-color)'}} className="bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Connect Source</button>
            </div>
            <div className="space-y-4">
              {(data.customWidgets || []).map((w, idx) => (
                <div key={w.id} className="p-5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                  <div><h5 className="font-black text-slate-800">{w.name}</h5><p className="text-[10px] text-slate-400 font-mono truncate max-w-sm">{w.endpoint}</p></div>
                  <button onClick={() => { const n = [...(data.customWidgets || [])]; n.splice(idx, 1); setData({...data, customWidgets: n}); }} className="p-2 text-slate-200 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-10">
              <div><h3 className="text-xl font-black">Authentication Audit</h3><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Recent Administrative Sessions</p></div>
              <button onClick={() => { if(confirm('Clear history?')) { clearLoginLogs(); setLoginLogs([]); }}} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase">Wipe Logs</button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <table className="w-full text-left">
                <thead className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                  <tr><th className="pb-4">Timestamp</th><th className="pb-4">Account</th><th className="pb-4">Status</th><th className="pb-4">Device</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(loginLogs || []).map(log => (
                    <tr key={log.id} className="text-sm">
                      <td className="py-4 text-slate-400 font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-4 font-bold text-slate-700">{log.email}</td>
                      <td className="py-4"><span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${log.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{log.success ? 'Success' : 'Failed'}</span></td>
                      <td className="py-4 text-xs text-slate-400 truncate max-w-[200px]">{log.userAgent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'health':
        return (
          <div className="flex flex-col h-full gap-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="p-8 bg-green-50 border border-green-100 rounded-[2rem] flex flex-col items-center text-center">
                <HeartPulse className="w-12 h-12 text-green-500 mb-4" />
                <h3 className="text-xl font-black text-green-900">System Core Stable</h3>
                <p className="text-sm text-green-700 mt-2">All signage subsystems report optimal status.</p>
              </div>
              <div className="p-8 bg-red-50 border border-red-100 rounded-[2rem] flex flex-col items-center text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-xl font-black text-red-900">Emergency Protocol</h3>
                <button onClick={handleFactoryReset} className="mt-4 px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Factory Reset</button>
              </div>
            </div>
            <div className="flex-1 bg-slate-950 rounded-[2.5rem] p-6 flex flex-col overflow-hidden border border-white/5">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-2"><Terminal className="w-3 h-3" /> Event Console Output</span>
                <button onClick={() => { clearLogs(); setSystemLogs([]); }} className="text-xs text-slate-600 hover:text-white transition-colors">Clear</button>
              </div>
              <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2 no-scrollbar">
                {(systemLogs || []).map(log => (
                  <div key={log.id} className={`p-3 rounded-xl border ${log.level === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                    <div className="flex gap-2 mb-1"><span className="opacity-40">{new Date(log.timestamp).toLocaleTimeString()}</span><span className="font-bold">[{log.source}]</span></div>
                    <p className="opacity-90">{log.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'config':
        return <AdminConfigEditor appData={data} />;
      default:
        return <div>Tab not found.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans select-none">
      <aside className="w-72 bg-slate-950 text-white flex flex-col fixed h-full z-10 shadow-2xl">
        <div className="p-8 border-b border-white/5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg overflow-hidden" style={{backgroundColor: 'var(--accent-color)'}}>
              {data.theme?.logoUrl ? <img src={data.theme.logoUrl} className="w-full h-full object-contain p-1" /> : data.schoolName.charAt(0)}
          </div>
          <h1 className="text-lg font-black tracking-tight leading-tight line-clamp-2">{data.schoolName}</h1>
        </div>
        
        <nav className="flex-1 p-6 space-y-8 overflow-y-auto no-scrollbar">
          <div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-4">Core</h3>
            <div className="space-y-1">
              {[
                { id: 'announcements', icon: Megaphone, label: 'Announcements' },
                { id: 'events', icon: Calendar, label: 'Events' },
                { id: 'pages', icon: FileText, label: 'Secondary Pages' },
                { id: 'import', icon: Sparkles, label: 'AI Import' },
              ].map((item) => (
                <button key={item.id} onClick={() => setActiveTab(item.id as any)} 
                  style={activeTab === item.id ? { backgroundColor: 'var(--accent-color)' } : {}}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-sm font-bold ${activeTab === item.id ? 'text-white shadow-lg shadow-black/20' : 'hover:bg-white/5 text-slate-500'}`}
                >
                  <item.icon className="w-5 h-5" /> {item.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-4">Maintenance</h3>
            <div className="space-y-1">
              {[
                { id: 'appearance', icon: Palette, label: 'Visual Theme' },
                { id: 'ticker', icon: LayoutGrid, label: 'Ticker Bar' },
                { id: 'livecam', icon: Camera, label: 'Live Cameras' },
                { id: 'widgets', icon: Database, label: 'External Data' },
              ].map((item) => (
                <button key={item.id} onClick={() => setActiveTab(item.id as any)} 
                  style={activeTab === item.id ? { backgroundColor: 'var(--accent-color)' } : {}}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-sm font-bold ${activeTab === item.id ? 'text-white shadow-lg shadow-black/20' : 'hover:bg-white/5 text-slate-500'}`}
                >
                  <item.icon className="w-5 h-5" /> {item.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-4">System</h3>
            <div className="space-y-1">
              {[
                { id: 'security', icon: Shield, label: 'Audit Logs' },
                { id: 'health', icon: HeartPulse, label: 'System Health' },
                { id: 'config', icon: Settings2, label: 'Raw Config' },
              ].map((item) => (
                <button key={item.id} onClick={() => setActiveTab(item.id as any)} 
                  style={activeTab === item.id ? { backgroundColor: 'var(--accent-color)' } : {}}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-sm font-bold ${activeTab === item.id ? 'text-white shadow-lg shadow-black/20' : 'hover:bg-white/5 text-slate-500'}`}
                >
                  <item.icon className="w-5 h-5" /> {item.label}
                </button>
              ))}
            </div>
          </div>
        </nav>
        <div className="p-6 border-t border-white/5">
            <button onClick={() => changeView(ViewMode.KIOSK)} style={{ backgroundColor: 'var(--accent-color)' }} className="w-full flex items-center justify-center gap-2 text-white py-4 rounded-2xl font-black text-sm shadow-xl hover:brightness-110 transition-all">
                <Monitor className="w-5 h-5" /> LAUNCH KIOSK
            </button>
        </div>
      </aside>

      <main className="flex-1 ml-72 flex flex-col min-h-screen relative bg-slate-50/50">
        <header className="h-16 px-12 flex items-center justify-between bg-white/50 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
            <div className="flex items-center gap-4">
                <div className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">OS Active {APP_VERSION}</span>
                </div>
            </div>

            {/* RESTORED BRAND CONTACT BAR */}
            <div className="hidden xl:flex items-center gap-8 bg-slate-100/50 px-6 py-2 rounded-2xl border border-slate-200/50">
                {data.socials?.phone && (
                    <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{data.socials.phone}</span>
                    </div>
                )}
                {data.socials?.website && (
                    <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{data.socials.website}</span>
                    </div>
                )}
                <div className="flex items-center gap-4 border-l border-slate-300 pl-4 ml-2">
                    {data.socials?.instagram && <Instagram className="w-3.5 h-3.5 text-slate-400" />}
                    {data.socials?.twitter && <Twitter className="w-3.5 h-3.5 text-slate-400" />}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="text-[9px] font-black uppercase text-slate-400">Authenticated Staff</p>
                    <p className="text-xs font-black text-slate-700">{session?.email}</p>
                </div>
                <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><LogOut className="w-5 h-5" /></button>
            </div>
        </header>

        <div className="flex-1 p-12 max-w-6xl mx-auto w-full pb-24">
            <div className="flex justify-between items-start mb-12">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">{_.startCase(activeTab)}</h2>
              {['config', 'health', 'security', 'import'].indexOf(activeTab) === -1 && (
                <button onClick={handleSave} style={{ backgroundColor: 'var(--accent-color)' }} className="text-white px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-blue-900/10 hover:brightness-110 transition-all">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} SAVE CHANGES
                </button>
              )}
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 min-h-[600px] p-8 overflow-hidden relative">
                <ErrorBoundary key={activeTab} componentName={`Admin Tab: ${activeTab}`}>
                  {renderActiveTab()}
                </ErrorBoundary>
            </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
