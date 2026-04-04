"use client";

import { 
  CheckCircle, 
  Download, 
  FileText, 
  Loader, 
  AlertCircle,
  UploadCloud,
  FileSpreadsheet,
  Terminal,
  Globe,
  Database
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";

const IntlRateCalculator = () => {
  // Now requires all 3 files for the Dual-Engine processing
  const [files, setFiles] = useState<{
    intl: File | null;
    cpm: File | null;
    euro: File | null;
  }>({ intl: null, cpm: null, euro: null });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(["System ready. Awaiting file uploads..."]);
  const [timestamp, setTimestamp] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isReady = !!(files.intl && files.cpm && files.euro);

  // Auto-scroll the console
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    return () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); };
  }, [downloadUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof typeof files) => {
    const file = e.target.files?.[0] || null;
    setFiles(prev => ({ ...prev, [key]: file }));
    setStatus('idle');
    if (file) setLogs(prev => [...prev, `Uploaded ${key.toUpperCase()}: ${file.name}`]);
  };

  const handleRunCalculation = async () => {
    if (!isReady || loading) return;
    
    setLoading(true);
    setStatus('idle');
    setError(null);
    setLogs(["Connecting to International Dual-Engine...", "Establishing stream..."]);

    const formData = new FormData();
    formData.append('intl_data', files.intl!);
    formData.append('cpm_file', files.cpm!);
    formData.append('euro_file', files.euro!); // Added the third file

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, ""); 
      const response = await fetch(`${baseUrl}/qc/calculate_intl_final_audit`, {
        method: 'POST',
        body: formData,
      });

      if (!response.body) throw new Error("No response body from server.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = ""; 

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const parts = streamBuffer.split("\n\n");
        streamBuffer = parts.pop() || "";

        for (const part of parts) {
          const trimmedLine = part.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith("data: ")) {
            const msg = trimmedLine.replace("data: ", "");
            setLogs(prev => [...prev, msg]);
          } 
          else if (trimmedLine.startsWith("file: ")) {
            const base64Data = trimmedLine.substring(6).replace(/\s/g, ""); 
            
            try {
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
              });
              
              setDownloadUrl(URL.createObjectURL(blob));
              setTimestamp(new Date().toLocaleTimeString());
              setStatus('complete');
            } catch (decodingError) {
              console.error("Base64 error:", decodingError);
              setLogs(prev => [...prev, "ERROR: Base64 decoding failed. Data corrupted."]);
            }
          }
        }
      }
    } catch (err: any) {
      setError("Calculation failed.");
      setLogs(prev => [...prev, `ERROR: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-screen bg-[#FDFDFD] dark:bg-[#08090A] overflow-hidden text-slate-900 dark:text-slate-100">
      {/* 1. HEADER */}
      <header className="w-full px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F1A] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-600 rounded-lg shadow-md shrink-0">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-none">Intl Rate Engine</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase">Dual CPM & Euro Processor</p>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col p-4 gap-4 min-h-0 overflow-hidden">
        
        {/* TOP: FILE UPLOAD GRID (Changed to 3 columns) */}
        <div className="grid grid-cols-3 gap-4 shrink-0">
          {[
            { id: 'intl', label: 'Rates + Ratings Data', icon: FileSpreadsheet, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/5', border: 'border-indigo-500' },
            { id: 'cpm', label: 'CPM Macro File', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/5', border: 'border-amber-500' },
            { id: 'euro', label: 'EURO Macro File', icon: Database, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/5', border: 'border-emerald-500' }
          ].map((item) => (
            <label 
              key={item.id}
              htmlFor={item.id}
              className={`flex items-center gap-3 px-4 h-16 border rounded-xl cursor-pointer transition-all
                ${files[item.id as keyof typeof files] 
                  ? `${item.border} ${item.bg}` 
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-400'}`}
            >
              <input type="file" id={item.id} className="hidden" onChange={(e) => handleFileChange(e, item.id as keyof typeof files)} />
              <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-800 ${item.color} shrink-0`}>
                <item.icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold truncate">
                  {files[item.id as keyof typeof files]?.name || item.label}
                </p>
                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-tight">
                  {files[item.id as keyof typeof files] ? 'Verified' : 'Select File'}
                </p>
              </div>
            </label>
          ))}
        </div>

        {/* BOTTOM: ACTION & CONSOLE ROW */}
        <div className="grid grid-cols-4 gap-4 shrink-0 h-64">
          
          {/* LEFT: EXECUTION PANEL */}
          <div className="col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
             <div className="text-center mb-4">
              <h2 className="text-sm font-bold">Process Engine</h2>
              <p className="text-[10px] text-slate-400">Dual-Routing Pipeline</p>
            </div>
            
            <button
              onClick={handleRunCalculation}
              disabled={!isReady || loading}
              className={`w-full py-4 rounded-xl font-bold text-xs tracking-widest transition-all flex flex-col items-center justify-center gap-2
                ${status === 'complete' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-900 dark:bg-indigo-600 text-white hover:opacity-90 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400'}`}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={18} />
                  <span>WORKING...</span>
                </>
              ) : status === 'complete' ? (
                <>
                  <CheckCircle size={18} />
                  <span>SUCCESS</span>
                </>
              ) : (
                <>
                  <UploadCloud size={18} />
                  <span>RUN CALC</span>
                </>
              )}
            </button>
            
            {!isReady && !loading && (
              <p className="mt-3 text-[9px] text-amber-500 font-bold uppercase flex items-center gap-1">
                <AlertCircle size={10} /> Requires 3 Files
              </p>
            )}
          </div>

          {/* RIGHT: LIVE CONSOLE */}
          <div className="col-span-3 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal size={12} className="text-indigo-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live Console</span>
              </div>
              <div className={`h-1.5 w-1.5 rounded-full ${loading ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 p-3 font-mono text-[10px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800"
            >
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-600 shrink-0">[{new Date().toLocaleTimeString([], {hour12: false})}]</span>
                  <span className={log.includes('ERROR') ? 'text-rose-400' : log.includes('COMPLETED') ? 'text-emerald-400' : 'text-slate-300'}>
                    {log}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="shrink-0 flex items-center justify-between px-2 pt-2 text-[9px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-100 dark:border-slate-800">
          <div className="flex gap-4">
            {status === 'complete' && downloadUrl && (
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = downloadUrl;
                  link.download = `Intl_Audit_Results_${Date.now()}.xlsx`;
                  link.click();
                }}
                className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1 font-black"
              >
                <Download size={10} /> SAVE FILE
              </button>
            )}
            <span>Status: <span className={loading ? "text-amber-500" : "text-emerald-500"}>{loading ? "Active" : "Idle"}</span></span>
          </div>
          <span>Last Run: {timestamp || "N/A"}</span>
        </footer>
      </main>
    </div>
  );
};

export default IntlRateCalculator;