
import React, { useState, useEffect } from 'react';
import { AppData } from '../types';
import { Braces, Download, Copy, CheckCircle, AlertCircle, RefreshCw, FileText, Info } from 'lucide-react';

interface AdminConfigEditorProps {
    appData: AppData;
}

const APP_VERSION = "v1.3.0";

const AdminConfigEditor: React.FC<AdminConfigEditorProps> = ({ appData }) => {
    const [jsonValue, setJsonValue] = useState<string>('');
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({ type: 'idle', message: '' });
    const [isCopying, setIsCopying] = useState(false);

    useEffect(() => {
        // Initial load uses current AppData from props (which reflects local storage)
        const initialJson = JSON.stringify(appData, null, 4);
        setJsonValue(initialJson);
    }, [appData]);

    const handleFetchFromPath = async () => {
        setStatus({ type: 'idle', message: 'Fetching...' });
        try {
            const response = await fetch('/config.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}: Config file not found on server.`);
            const data = await response.json();
            setJsonValue(JSON.stringify(data, null, 4));
            setStatus({ type: 'success', message: 'Successfully fetched config.json from server.' });
        } catch (err: any) {
            setStatus({ type: 'error', message: err.message });
        }
    };

    const validateJson = () => {
        try {
            JSON.parse(jsonValue);
            setStatus({ type: 'success', message: 'JSON structure is valid.' });
            return true;
        } catch (err: any) {
            setStatus({ type: 'error', message: `Invalid JSON: ${err.message}` });
            return false;
        }
    };

    const copyToClipboard = () => {
        if (!validateJson()) return;
        navigator.clipboard.writeText(jsonValue);
        setIsCopying(true);
        setTimeout(() => setIsCopying(false), 2000);
    };

    const downloadJson = () => {
        if (!validateJson()) return;
        const blob = new Blob([jsonValue], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'config.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <Braces className="w-5 h-5 text-blue-500" />
                        JSON System Configuration
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Direct Data Access Engine</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleFetchFromPath} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-200 transition-all">
                        <RefreshCw className="w-3 h-3" /> Fetch /config.json
                    </button>
                    <button onClick={copyToClipboard} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-200 transition-all">
                        {isCopying ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        {isCopying ? 'Copied!' : 'Copy to Clipboard'}
                    </button>
                    <button onClick={downloadJson} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                        <Download className="w-3 h-3" /> Download config.json
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-[500px] flex flex-col glass-panel rounded-[2rem] overflow-hidden border border-slate-100 shadow-inner bg-slate-950">
                <div className="bg-slate-900 px-6 py-2 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="ml-4 text-[10px] font-mono text-slate-500 font-bold tracking-widest uppercase">Editor Console</span>
                    </div>
                    <button onClick={validateJson} className="text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 tracking-widest px-3 py-1 bg-blue-500/10 rounded-lg">Validate JSON</button>
                </div>
                <textarea 
                    value={jsonValue} 
                    onChange={(e) => setJsonValue(e.target.value)}
                    className="flex-1 w-full bg-transparent text-blue-100 font-mono text-sm p-8 focus:outline-none resize-none custom-scroll leading-relaxed"
                    spellCheck={false}
                    placeholder="{ ... }"
                />
            </div>

            <div className="flex items-center justify-between">
                <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all ${
                    status.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 
                    status.type === 'success' ? 'bg-green-50 border-green-100 text-green-600' : 
                    'bg-slate-50 border-slate-100 text-slate-400'
                }`}>
                    {status.type === 'error' && <AlertCircle className="w-5 h-5" />}
                    {status.type === 'success' && <CheckCircle className="w-5 h-5" />}
                    {status.type === 'idle' && <Info className="w-5 h-5" />}
                    <span className="text-sm font-bold">{status.message || 'Waiting for input...'}</span>
                </div>
                
                <div className="text-right flex flex-col items-end opacity-40">
                    <span className="text-[10px] font-black uppercase tracking-widest">Digital Signage OS {APP_VERSION}</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] mt-1 text-slate-500">Designed & coded by Hardy</span>
                </div>
            </div>
        </div>
    );
};

export default AdminConfigEditor;
