"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Layers, Zap, Globe, UploadCloud, FileSpreadsheet, X, 
  Download, Bug, CheckCircle2, Activity, Server, ShieldCheck, Info, StopCircle, 
  AlertTriangle, UserCheck, ChevronDown
} from "lucide-react";

export default function AusNzRequirementPage() {
  // --- EXISTING STATE ---
  const [mediaType, setMediaType] = useState("Dedicated");
  const [market, setMarket] = useState("AUS");
  const [isDiagnostic, setIsDiagnostic] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("idle");
  const [currentStage, setCurrentStage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [completedStages, setCompletedStages] = useState<string[]>([]);
  const [processedInQaMode, setProcessedInQaMode] = useState(false);

  // --- 🆕 NEW STATE FOR QI & TEAM LOGGING ---
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  // Find this line (around line 25):
  const [qiStats, setQiStats] = useState<{
    current_total: number, 
    last_total: number, 
    is_growth_positive: boolean, 
    multiplier: number,
    latest_file_date: string // 🆕 Add this to state
} | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load team list on mount
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/dashboard/aus-nz/team`)
      .then(res => res.json())
      .then(data => setTeamMembers(data.members || []))
      .catch(err => console.error("Team list fetch failed", err));
  }, []);

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (isProcessing) {
      timerRef.current = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isProcessing]);

  // --- UTILS ---
  const resetPipelineState = () => {
    if (downloadUrl) window.URL.revokeObjectURL(downloadUrl);
    setSelectedFiles([]);
    setElapsedTime(0);
    setCompletedStages([]);
    setDownloadUrl(null);
    setCurrentStage("");
    setErrorMessage(null);
    setStatus("idle");
    setProcessedInQaMode(false);
    setQiStats(null);
    setShowWarningModal(false);
    setShowUserModal(false);
    setSelectedUser("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatTimeDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const cancelProcessing = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setIsProcessing(false);
    setStatus("idle");
    setCurrentStage("⚠️ Processing Cancelled");
    setCompletedStages(prev => [...prev, "❌ Session Terminated"]);
  };

  // --- CORE PIPELINE EXECUTION ---
  const runPipeline = async () => {
    if (selectedFiles.length === 0) return;

    // 🛡️ REINSTATED: MARKET MISMATCH PROTECTION
    const ausKeywords = ["AUS", "AUSTRALIA", "AFL", "NRL", "ALM", "ALW"];
    const nzKeywords = ["NZ", "NEWZEALAND", "WARRIORS", "BREAKERS"];

    const wrongMarketFile = selectedFiles.find(f => {
      const name = f.name.toUpperCase();
      if (market === "AUS") return nzKeywords.some(kw => name.includes(kw));
      if (market === "NZ") return ausKeywords.some(kw => name.includes(kw));
      return false;
    });

    if (wrongMarketFile && !window.confirm(`⚠️ Market Mismatch: Uploaded "${wrongMarketFile.name}" for ${market}. Continue?`)) return;

    abortControllerRef.current = new AbortController();
    setIsProcessing(true);
    setErrorMessage(null);
    setStatus("processing");
    setCompletedStages([]);
    setElapsedTime(0);
    setProcessedInQaMode(isDiagnostic);

    const stages = [
      { msg: "🛰️ Establishing API Handshake...", delay: 100 },
      { msg: "🔐 Verifying Google Cloud Credentials...", delay: 1500 },
      { msg: "📡 Syncing Mapping Tables from Cloud...", delay: 4000 },
      { msg: "🧪 Running Surgical Synthesis...", delay: 8000 },
      { msg: "📊 Finalizing Metrics & Styles...", delay: 12000 },
    ];

    stages.forEach((stage) => {
      setTimeout(() => {
        if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
          setCurrentStage(stage.msg);
          setCompletedStages(prev => [...prev, stage.msg.replace("...", "")]);
        }
      }, stage.delay);
    });

    try {
      const formData = new FormData();
      formData.append("market", market);
      formData.append("media_type", mediaType);
      formData.append("return_diagnostic", isDiagnostic ? "true" : "false");
      selectedFiles.forEach(f => formData.append("files", f));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/dashboard/aus-nz/process`, {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current.signal 
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Synthesis Engine Failure");
      }

      // 🚨 NEW: READ QI STATS FROM HEADERS
      const statsHeader = response.headers.get("X-QI-Stats");
      if (statsHeader) setQiStats(JSON.parse(statsHeader));

      const blob = await response.blob();
      setDownloadUrl(window.URL.createObjectURL(blob));
      setStatus("success");
      setCurrentStage(isDiagnostic ? "✨ QA Synthesis Successful!" : "✨ Synthesis Successful!");
      setCompletedStages(prev => [...prev, isDiagnostic ? "✅ Multi-Tab QA Report Generated" : "✅ Master Report Generated"]);

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setStatus("error");
        setErrorMessage(err.message);
        setCurrentStage("❌ Pipeline Halted");
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  // --- LOGGING & DOWNLOAD FLOW ---
  const handleDownloadClick = () => {
    // If growth isn't positive, show warning first. Otherwise, go straight to Name selection.
    if (qiStats && !qiStats.is_growth_positive && !showUserModal) {
      setShowWarningModal(true);
    } else {
      setShowUserModal(true);
    }
  };

  const finalCommitAndDownload = async () => {
    if (!selectedUser) return alert("Please select your name.");

    try {
      const statusText = qiStats?.is_growth_positive ? "Increased" : "Decreased (Acknowledged)";
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/dashboard/aus-nz/log-qi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: selectedUser,
          media: mediaType,
          market: market,
          multiplier: qiStats?.multiplier,
          qi_value: qiStats?.current_total,
          status: statusText,
          latest_file_date: qiStats?.latest_file_date // 🆕 This fills Column B!
        })
      });
    } catch (e) {
      console.error("Logging failed", e);
    }

    // 2. Trigger the Browser Download
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(':', ' ');
    const fileName = `${processedInQaMode ? 'QA_' : ''}${mediaType}_${market}_${dateStr}_${timeStr}.xlsx`;

    const link = document.createElement("a");
    link.href = downloadUrl!;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    resetPipelineState();
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#F8FAFC] dark:bg-[#050505] font-sans text-slate-900 dark:text-white">
      
      {/* ⚠️ QI GROWTH WARNING MODAL */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0B0F1A] border-2 border-amber-500 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <AlertTriangle className="text-amber-500 mb-4" size={48} />
            <h2 className="text-xl font-black uppercase mb-2">QI Consistency Alert</h2>
            
            {/* 🆕 Visual Date Context */}
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl mb-6 border border-amber-100 dark:border-amber-800">
              <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Data Period</p>
              <p className="text-sm font-bold">
                Latest Date in File: <span className="text-amber-700 dark:text-amber-400">{qiStats?.latest_file_date || "N/A"}</span>
              </p>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Total QI has not increased. <br />
              <span className="font-mono text-xs">Last: {qiStats?.last_total.toLocaleString()}</span> | 
              <span className="font-mono text-xs text-amber-600 font-bold"> New: {qiStats?.current_total.toLocaleString()}</span>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowWarningModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 font-bold rounded-xl text-xs uppercase">Review</button>
              <button onClick={() => { setShowWarningModal(false); setShowUserModal(true); }} className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl text-xs uppercase">Acknowledge</button>
            </div>
          </div>
        </div>
      )}

      {/* 👤 TEAM MEMBER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <UserCheck className="text-indigo-600 mb-4" size={40} />
            <h2 className="text-xl font-black uppercase mb-1">Log Session</h2>
            <p className="text-xs text-slate-500 mb-6">Select your name to update the Master Tracker.</p>
            <div className="relative mb-6">
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl appearance-none font-bold text-sm outline-none focus:border-indigo-500">
                <option value="">Choose name...</option>
                {teamMembers.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            </div>
            <button disabled={!selectedUser} onClick={finalCommitAndDownload} 
              className="w-full py-4 bg-indigo-600 disabled:opacity-30 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform">
              Confirm & Download
            </button>
          </div>
        </div>
      )}

      <header className="w-full px-8 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F1A] flex items-center justify-between sticky top-0 z-20">
  <div className="flex items-center gap-4">
    <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg"><Layers className="h-5 w-5 text-white" /></div>
    <div>
      <h1 className="text-xl font-bold tracking-tight uppercase">AUS NZ Media Processor</h1>
      <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 mt-1 font-mono uppercase tracking-tighter">
        <Globe size={12} className="text-emerald-500" />
        <a 
          href="https://docs.google.com/spreadsheets/d/1BTh_zIm5KqIN35SLOwUX-ernV21nLCaJCuY_BK6USDs/edit?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline transition-colors cursor-pointer"
        >
          Link to Lookup Sheet
        </a>
      </p>
    </div>
  </div>
</header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-8 max-w-[1600px] mx-auto w-full items-start">
        <div className="lg:col-span-4 space-y-6 sticky top-28">
          <section className="bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2"><Zap size={14} className="text-amber-500" /> Execution Control</h3>
            
            <div className="mb-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">1. Media Type</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800">
                {["Dedicated", "IP"].map((t) => (
                  <button 
                    key={t} 
                    disabled={status !== "idle"} 
                    onClick={() => setMediaType(t)} 
                    className={`py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                      mediaType === t 
                        ? "bg-[#1E3A8A] text-white shadow-md shadow-blue-900/20 transform scale-[1.02]" 
                        : "text-slate-400 dark:text-slate-500 hover:text-[#1E3A8A] dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">2. Market</label>
              <div className="grid grid-cols-2 gap-2">
                {["AUS", "NZ"].map(m => (
                  <button key={m} disabled={status !== "idle"} onClick={() => setMarket(m)} 
                    className={`py-2 text-[10px] font-black rounded-lg border transition-all ${market === m ? 'bg-slate-900 dark:bg-indigo-600 text-white border-transparent shadow-lg' : 'border-slate-200 dark:border-slate-800 text-slate-400'}`}>{m}</button>
                ))}
              </div>
            </div>

            {market === "NZ" && (
              <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 leading-relaxed">NZ Market: 1.2381 QI Multiplier auto-applied.</p>
              </div>
            )}

            <div className="mb-6 flex items-center gap-2">
              <input type="checkbox" id="diagnosticToggle" checked={isDiagnostic} onChange={(e) => setIsDiagnostic(e.target.checked)}
                disabled={status !== "idle"} className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer" />
              <label htmlFor="diagnosticToggle" className={`text-[10px] font-black uppercase tracking-widest transition-colors ${status !== "idle" ? "text-slate-300 dark:text-slate-700 cursor-not-allowed" : "text-slate-500 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300"}`}>
                Enable Diagnostic Output (QA Mode)
              </label>
            </div>

            {!isProcessing && status === "idle" ? (
              <button onClick={runPipeline} disabled={selectedFiles.length === 0} 
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 text-white rounded-xl font-black text-xs uppercase shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                START PROCESSING
              </button>
            ) : status === "processing" ? (
              <button onClick={cancelProcessing} 
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-xs uppercase shadow-xl flex items-center justify-center gap-3 transition-all">
                <StopCircle size={18} /> CANCEL PROCESSING
              </button>
            ) : null}

            {(isProcessing || status !== "idle") && (
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <Activity size={14} className={isProcessing ? "animate-pulse text-indigo-500" : "text-emerald-500"} />
                  <span className="text-[11px] font-black uppercase tracking-tight truncate">{currentStage}</span>
                </div>
                <div className="text-[10px] font-bold text-slate-400 ml-7 italic">Elapsed: {formatTimeDisplay(elapsedTime)}</div>
              </div>
            )}
          </section>

          <section className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl min-h-[200px] border border-slate-800">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2"><Server size={14} className="text-indigo-400" /> Live Terminal Activity</h3>
            <div className="space-y-4">
              {completedStages.map((stage, i) => (
                <div key={i} className="flex items-start gap-3 animate-in slide-in-from-left-2 duration-300">
                  <ShieldCheck size={12} className="text-emerald-400 mt-0.5" />
                  <span className="text-[10px] font-bold text-slate-300 uppercase leading-tight tracking-tight">{stage}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm flex flex-col gap-6 items-stretch">
          <div onClick={() => status === "idle" && fileInputRef.current?.click()} className={`group border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center transition-all duration-300 ${status === "idle" ? "hover:border-indigo-500 hover:bg-indigo-50/20 cursor-pointer" : "opacity-50 cursor-not-allowed"} ${selectedFiles.length > 0 ? "py-10" : "py-24"}`}>
            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => e.target.files && setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)])} />
            <UploadCloud size={40} className={`mb-3 transition-transform ${status === "idle" ? "text-indigo-600 group-hover:scale-110" : "text-slate-400"}`} />
            <p className="text-sm font-black uppercase tracking-tighter">Stage {mediaType} Datasets</p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileSpreadsheet size={14} className="text-indigo-500 flex-shrink-0" />
                    <span className="text-[10px] font-black truncate">{file.name}</span>
                  </div>
                  {status === "idle" && <X size={14} className="text-slate-300 hover:text-red-500 cursor-pointer flex-shrink-0 ml-2" onClick={(e) => { e.stopPropagation(); setSelectedFiles(prev => prev.filter((_, i) => i !== idx)); }} />}
                </div>
              ))}
            </div>
          )}

          {status === "error" && (
            <div className="p-5 bg-red-50 dark:bg-red-500/10 border-2 border-red-100 rounded-2xl flex gap-4 animate-in shake duration-500">
              <Bug size={20} className="text-red-600 flex-shrink-0" />
              <div>
                <h4 className="text-[10px] font-black uppercase text-red-600">Engine Exception</h4>
                <p className="text-[10px] font-bold text-red-800 dark:text-red-400 mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4 animate-in slide-in-from-top-4 border-t border-slate-100 dark:border-slate-800 pt-6">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-500" />
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tight">
                  Processing Successful ({formatTimeDisplay(elapsedTime)})
                </span>
              </div>
              
              <div className="flex flex-col gap-3">
                <button onClick={handleDownloadClick} className="w-full py-4 bg-[#059669] hover:bg-[#047857] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.95]">
                  <Download size={18} /> {processedInQaMode ? "Download QA Report" : "Download Final Report"}
                </button>
                <button onClick={resetPipelineState} className="text-[10px] font-black text-slate-400 hover:text-slate-600 mt-2 uppercase tracking-widest">
                  Start New Batch
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}