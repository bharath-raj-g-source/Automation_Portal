"use client";

import { 
  CheckCircle, 
  Download, 
  FileText, 
  Loader, 
  FileCheck,
  AlertCircle,
  NotebookPen,
  UploadCloud,
  FileSpreadsheet,
  Terminal,
  Settings2
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";

const JapanRateCalculator = () => {
  const [files, setFiles] = useState<{
    bsr: File | null;
    rates: File | null;
    rr: File | null;
    mm: File | null;
  }>({ bsr: null, rates: null, rr: null, mm: null });

  // New configuration state
  const [eventId, setEventId] = useState<string>("1");
  const [season, setSeason] = useState<string>("2026");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(["System initialized. Awaiting parameters and datasets..."]);
  const [timestamp, setTimestamp] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isReady = !!(files.bsr && files.rates && files.rr && files.mm && season);

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
    if (file) setLogs(prev => [...prev, `Loaded ${key.toUpperCase()}: ${file.name}`]);
  };

  const handleRunCalculation = async () => {
    if (!isReady || loading) return;
    
    setLoading(true);
    setStatus('idle');
    setError(null);
    setLogs([
      "Connecting to Japan Rate Engine...", 
      `Config set: Event ID ${eventId}, Season ${season}`,
      "Parsing worksheets..."
    ]);

    const formData = new FormData();
    formData.append('bsr_data', files.bsr!);
    formData.append('master_rates', files.rates!);
    formData.append('rr_file', files.rr!);
    formData.append('mm_file', files.mm!);
    
    // Append the new parameters
    formData.append('event_id', eventId);
    formData.append('season', season);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, ""); 
      const response = await fetch(`${baseUrl}/qc/calculate_japan_bsr_audit`, {
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
              setLogs(prev => [...prev, "COMPLETED: BSR Upload File generated successfully."]);
            } catch (decodingError) {
              setLogs(prev => [...prev, "ERROR: Binary reconstruction failed."]);
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
    <div className="flex flex-col w-full h-screen bg-[#FDFDFD] dark:bg-[#08090A] overflow-hidden text-slate-900 dark:text-slate-100 font-sans">
      <header className="w-full px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F1A] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-red-600 rounded-lg shadow-md shrink-0">
            <NotebookPen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-none">Japan BSR Engine</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase">Automation & Rate Auditor</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 gap-4 min-h-0 overflow-hidden">
        
        {/* CONFIGURATION BAR */}
        <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shrink-0 shadow-sm">
          <Settings2 className="h-5 w-5 text-slate-400 shrink-0" />
          <div className="flex flex-col gap-1 w-64">
            <label className="text-[10px] font-bold uppercase text-slate-500">Event Selection</label>
            <select 
              value={eventId} 
              onChange={(e) => setEventId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="1">J League</option>
              <option value="2">Nippon Professional Baseball</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 w-32">
            <label className="text-[10px] font-bold uppercase text-slate-500">Season</label>
            <input 
              type="number" 
              value={season} 
              onChange={(e) => setSeason(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="e.g. 2026"
            />
          </div>
        </div>

        {/* FILE UPLOAD GRID */}
        <div className="grid grid-cols-4 gap-4 shrink-0">
          {[
            { id: 'bsr', label: 'BSR Raw Data', icon: FileSpreadsheet, color: 'text-red-500' },
            { id: 'rates', label: 'Master Rates (.xlsm)', icon: FileCheck, color: 'text-blue-500' },
            { id: 'rr', label: 'RR File (Rates)', icon: FileText, color: 'text-emerald-500' },
            { id: 'mm', label: 'MM File (Media)', icon: FileText, color: 'text-amber-500' }
          ].map((item) => (
            <label 
              key={item.id}
              htmlFor={item.id}
              className={`flex items-center gap-3 px-4 h-16 border rounded-xl cursor-pointer transition-all
                ${files[item.id as keyof typeof files] 
                  ? 'border-red-500 bg-red-50/20 dark:bg-red-500/5' 
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-red-400'}`}
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
                  {files[item.id as keyof typeof files] ? 'Ready' : 'Upload File'}
                </p>
              </div>
            </label>
          ))}
        </div>

        {/* ACTION & CONSOLE ROW */}
        <div className="grid grid-cols-4 gap-4 shrink-0 h-72">
          
          <div className="col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
             <div className="text-center mb-4">
              <h2 className="text-sm font-bold">Process Logic</h2>
              <p className="text-[10px] text-slate-400">J-League / NPB Engine</p>
            </div>
            
            <button
              onClick={handleRunCalculation}
              disabled={!isReady || loading}
              className={`w-full py-4 rounded-xl font-bold text-xs tracking-widest transition-all flex flex-col items-center justify-center gap-2
                ${status === 'complete' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-red-600 text-white hover:opacity-90 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400'}`}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={18} />
                  <span>AUDITING...</span>
                </>
              ) : status === 'complete' ? (
                <>
                  <CheckCircle size={18} />
                  <span>EXPORT READY</span>
                </>
              ) : (
                <>
                  <UploadCloud size={18} />
                  <span>RUN AUDIT</span>
                </>
              )}
            </button>
            
            {!isReady && !loading && (
              <p className="mt-3 text-[9px] text-amber-600 font-bold uppercase flex items-center gap-1">
                <AlertCircle size={10} /> Pending inputs
              </p>
            )}
          </div>

          <div className="col-span-3 bg-[#0D1117] border border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            <div className="px-3 py-2 bg-[#161B22] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal size={12} className="text-red-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Logs</span>
              </div>
              <div className={`h-1.5 w-1.5 rounded-full ${loading ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
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

        <footer className="shrink-0 flex items-center justify-between px-2 pt-2 text-[9px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-100 dark:border-slate-800">
          <div className="flex gap-4">
            {status === 'complete' && downloadUrl && (
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = downloadUrl;
                  link.download = `Japan_BSR_Upload_${Date.now()}.xlsx`;
                  link.click();
                }}
                className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1 font-black"
              >
                <Download size={10} /> DOWNLOAD FINAL XLSX
              </button>
            )}
            <span>Market: <span className="text-red-500">Japan</span></span>
          </div>
          <span>Last Processed: {timestamp || "None"}</span>
        </footer>
      </main>
    </div>
  );
};

export default JapanRateCalculator;