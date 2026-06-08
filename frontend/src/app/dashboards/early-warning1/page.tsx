"use client";

import React, { useState, useMemo } from "react";
import { useRunEarlyWarningAnalysis1Mutation } from "@/state/api"; 
import { 
  FileSpreadsheet, Loader2, Search, Clock, Layers, 
  Filter, X, Calendar, Globe, Tv, Activity, Eraser, MapPin, AlertTriangle, AlertCircle
} from "lucide-react";

// --- SUB-COMPONENTS ---
const SearchableList = ({ label, icon, options, selected, onChange }: any) => { 
  const [query, setQuery] = useState(""); 
  const filteredOptions = options.filter((opt: string) => opt.toLowerCase().includes(query.toLowerCase())); 
  
  return ( 
    <div> 
      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 flex items-center justify-between group"> 
        <span className="flex items-center gap-2">{icon} {label}</span> 
        {selected.length > 0 && ( 
          <span className="text-[9px] text-blue-500 cursor-pointer hover:underline" onClick={() => onChange([])}>Clear ({selected.length})</span> 
        )} 
      </label> 
      <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700 shadow-inner"> 
        <div className="relative mb-2"> 
          <Search size={12} className="absolute left-2 top-2 text-slate-400"/> 
          <input type="text" placeholder={`Search ${label}...`} className="w-full text-[10px] pl-7 pr-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-400" value={query} onChange={(e) => setQuery(e.target.value)} /> 
        </div> 
        <div className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar"> 
          {filteredOptions.length > 0 ? ( 
            filteredOptions.map((opt: string) => ( 
              <label key={opt} className="flex items-center gap-2 text-[10px] p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded cursor-pointer transition-colors group"> 
                <input type="checkbox" className="rounded border-slate-300 dark:border-slate-500 text-blue-600 focus:ring-0 bg-white dark:bg-slate-800 cursor-pointer w-3 h-3" checked={selected.includes(opt)} onChange={(e) => { if(e.target.checked) onChange([...selected, opt]); else onChange(selected.filter((x: string) => x !== opt)); }} /> 
                <span className="truncate select-none text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" title={opt}>{opt}</span> 
              </label> 
            )) 
          ) : ( <div className="text-[9px] text-slate-400 text-center py-2 italic">No matches found</div> )} 
        </div> 
      </div> 
    </div> 
  ); 
};

// --- TIME FORMATTING HELPERS ---
const formatTime = (ts: number, tz: string) => {
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
  if (tz && tz !== 'Local') options.timeZone = tz;
  return new Intl.DateTimeFormat('en-GB', options).format(ts);
};
const formatDateStr = (ts: number, tz: string) => {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (tz && tz !== 'Local') options.timeZone = tz;
  return new Intl.DateTimeFormat('en-GB', options).format(ts);
};
const formatFullDate = (ts: number, tz: string) => {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
  if (tz && tz !== 'Local') options.timeZone = tz;
  return new Intl.DateTimeFormat('en-GB', options).format(ts);
};

const getMarketTimezone = (market: string) => {
  if (!market) return null;
  const m = market.toLowerCase();
  if (m.includes('uk') || m.includes('great britain') || m.includes('gb') || m.includes('england')) return 'Europe/London';
  if (m.includes('us') || m.includes('america') || m.includes('united states') || m.includes('usa')) return 'America/New_York';
  if (m.includes('india') || m.includes('ind')) return 'Asia/Kolkata';
  if (m.includes('aus') || m.includes('australia')) return 'Australia/Sydney';
  if (m.includes('japan')) return 'Asia/Tokyo';
  if (m.includes('brazil') || m.includes('arg') || m.includes('argentina') || m.includes('latam')) return 'America/Argentina/Buenos_Aires';
  if (m.includes('germany') || m.includes('france') || m.includes('italy') || m.includes('spain') || m.includes('europe')) return 'Europe/Berlin';
  if (m.includes('mexico')) return 'America/Mexico_City';
  if (m.includes('canada')) return 'America/Toronto'; 
  return null; 
};

// Define anomaly names to keep them consistent
const ANOMALY_LIVE_MISS = "Potential Live Miss";
const ANOMALY_EARLY_REPEAT = "Early Overlap (Likely Repeat)";

const EarlyWarningPage1 = () => {
  const [bsaFile, setBsaFile] = useState<File | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  
  // Default includes Live and both Anomaly Types!
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["Live", ANOMALY_LIVE_MISS, ANOMALY_EARLY_REPEAT]); 
  const [globalSearch, setGlobalSearch] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [timezone, setTimezone] = useState<string>("Local");

  const [runAnalysis, { data, isLoading }] = useRunEarlyWarningAnalysis1Mutation();

  const handleUpload = async () => {
    if (!bsaFile) return;
    const formData = new FormData();
    formData.append("bsa_file", bsaFile);
    try { await runAnalysis(formData).unwrap(); } catch (err) { console.error("Upload failed", err); }
  };

  const { timelineData, filterOptions, officialSchedule } = useMemo(() => {
    const responseData = data as any; 
    if (!responseData?.timeline_view || responseData.timeline_view.length === 0) {
      return { timelineData: null, filterOptions: { markets: [], channels: [], programTypes: [] }, officialSchedule: [] };
    }

    const processedSchedule = (responseData.official_schedule || []).map((s: any) => ({
      ...s,
      startTs: new Date(`${s.Start_Datetime}Z`).getTime(),
      endTs: new Date(`${s.End_Datetime}Z`).getTime()
    }));

    const parsedEvents = responseData.timeline_view.map((d: any) => {
      const startTs = new Date(`${d.Start_Datetime}Z`).getTime();
      const endTs = new Date(`${d.End_Datetime}Z`).getTime();
      const originalProgType = String(d["Type of program"] || 'Blank').trim();
      
      let anomalyType = null;
      let matchedSessionName = null;

      // TWO-TIER ANOMALY DETECTION
      if (originalProgType.toLowerCase() !== 'live') {
        for (const session of processedSchedule) {
          const overlapStart = Math.max(startTs, session.startTs);
          const overlapEnd = Math.min(endTs, session.endTs);
          const overlapDuration = overlapEnd - overlapStart;
          
          // Overlap threshold: 15 minutes (900,000 ms)
          if (overlapDuration > 900000) {
            // Check if it starts more than 90 mins (5,400,000 ms) before the official start
            const startsTooEarly = (session.startTs - startTs) > 5400000;

            if (startsTooEarly) {
              anomalyType = ANOMALY_EARLY_REPEAT;
            } else {
              anomalyType = ANOMALY_LIVE_MISS;
            }
            
            matchedSessionName = session.Session;
            break; // Stop checking once we find an overlap
          }
        }
      }

      const finalProgType = anomalyType ? anomalyType : originalProgType;
      
      return {
        ...d,
        marketChannel: `${d.Market || 'Unknown'} - ${d["TV-Channel"] || d["TV Channel"] || 'Unknown'}`,
        progType: finalProgType,
        originalProgType,
        anomalyType,
        matchedSessionName,
        localStartStr: d.Local_Start_Str || 'N/A', 
        localEndStr: d.Local_End_Str || 'N/A', 
        startTs,
        endTs,
        duration: endTs - startTs
      };
    }).filter((d: any) => !isNaN(d.startTs) && !isNaN(d.endTs) && d.duration > 0);

    const markets = Array.from(new Set(parsedEvents.map((ev: any) => ev.Market || 'Unknown'))).sort() as string[];
    const channels = Array.from(new Set(parsedEvents.map((ev: any) => ev["TV-Channel"] || ev["TV Channel"] || 'Unknown'))).sort() as string[];
    const programTypes = Array.from(new Set(parsedEvents.map((ev: any) => ev.progType))).sort() as string[];

    const filteredEvents = parsedEvents.filter((ev: any) => {
      const matchMarket = selectedMarkets.length === 0 || selectedMarkets.includes(ev.Market);
      const matchChannel = selectedChannels.length === 0 || selectedChannels.includes(ev["TV-Channel"] || ev["TV Channel"]);
      const matchType = selectedTypes.length === 0 || selectedTypes.some(t => t.toLowerCase() === ev.progType.toLowerCase());
      const matchSearch = !globalSearch || ev.marketChannel.toLowerCase().includes(globalSearch.toLowerCase()) || (ev.Competition && ev.Competition.toLowerCase().includes(globalSearch.toLowerCase()));
      
      const filterStart = startDate ? new Date(startDate).getTime() : 0;
      const filterEnd = endDate ? new Date(endDate).getTime() + 86400000 : Infinity; 
      const matchDate = ev.endTs >= filterStart && ev.startTs <= filterEnd;

      return matchMarket && matchChannel && matchType && matchSearch && matchDate;
    });

    if (filteredEvents.length === 0) {
      return { timelineData: null, filterOptions: { markets, channels, programTypes }, officialSchedule: processedSchedule };
    }

    const minTs = Math.min(...filteredEvents.map((d: any) => d.startTs));
    const maxTs = Math.max(...filteredEvents.map((d: any) => d.endTs));
    
    const grouped = filteredEvents.reduce((acc: any, curr: any) => {
      if (!acc[curr.marketChannel]) acc[curr.marketChannel] = [];
      acc[curr.marketChannel].push(curr);
      return acc;
    }, {});

    const sortedKeys = Object.keys(grouped).sort();

    const ticks = [];
    let currentTs = minTs - (minTs % (3600000 * 3)); 
    while (currentTs <= maxTs + (3600000 * 3)) { 
      ticks.push(currentTs);
      currentTs += (3600000 * 3); 
    }

    return { 
      timelineData: { minTs, maxTs, totalSpan: maxTs - minTs, grouped, sortedKeys, ticks },
      filterOptions: { markets, channels, programTypes },
      officialSchedule: processedSchedule
    };
  }, [data, selectedMarkets, selectedChannels, selectedTypes, globalSearch, startDate, endDate]);

  const getTimelineColor = (ev: any) => {
    // 1. Check for Anomalies First
    if (ev.anomalyType === ANOMALY_LIVE_MISS) {
      return { bg: 'animated-warning-red', border: 'border-rose-700 shadow-[0_0_8px_rgba(225,29,72,0.6)]', text: 'text-white' };
    }
    if (ev.anomalyType === ANOMALY_EARLY_REPEAT) {
      return { bg: 'animated-warning-orange', border: 'border-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.5)]', text: 'text-white' };
    }
    
    // 2. Standard Check
    if (ev.progType.toLowerCase() !== 'live') return { bg: 'bg-[#AAB7B8]', border: 'border-[#95A5A6]', text: 'text-slate-800' };
    
    const c = (ev.Competition || "").toLowerCase();
    if (c.includes('practice 1')) return { bg: 'bg-[#5DADE2]', border: 'border-[#3498DB]', text: 'text-white' };
    if (c.includes('practice 2')) return { bg: 'bg-[#3498DB]', border: 'border-[#2980B9]', text: 'text-white' };
    if (c.includes('practice 3')) return { bg: 'bg-[#2ECC71]', border: 'border-[#27AE60]', text: 'text-white' };
    if (c.includes('qualifying')) return { bg: 'bg-[#F39C12]', border: 'border-[#D68910]', text: 'text-white' };
    if (c.includes('race') || c.includes('grand prix')) return { bg: 'bg-[#E74C3C]', border: 'border-[#C0392B]', text: 'text-white' };
    return { bg: 'bg-slate-400', border: 'border-slate-500', text: 'text-white' };
  };

  return (
    <div className="flex flex-col w-full h-[calc(100vh-64px)] bg-[#F8FAFC] dark:bg-[#0B0C0E] transition-colors duration-300">
      
      {/* INJECTED CSS FOR ANIMATIONS */}
      <style>{`
        @keyframes slide-stripes {
          0% { background-position: 0 0; }
          100% { background-position: 28px 0; }
        }
        .animated-schedule-bg {
          background-image: repeating-linear-gradient(-45deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.08) 10px, rgba(59, 130, 246, 0.18) 10px, rgba(59, 130, 246, 0.18) 20px);
          background-size: 28px 28px;
          animation: slide-stripes 2s linear infinite;
        }
        .animated-warning-red {
          background-image: repeating-linear-gradient(45deg, #e11d48, #e11d48 10px, #be123c 10px, #be123c 20px);
          background-size: 28px 28px;
          animation: slide-stripes 1.5s linear infinite;
        }
        .animated-warning-orange {
          background-image: repeating-linear-gradient(45deg, #f59e0b, #f59e0b 10px, #d97706 10px, #d97706 20px);
          background-size: 28px 28px;
          animation: slide-stripes 1.5s linear infinite;
        }
      `}</style>

      <div className="flex flex-1 overflow-hidden">
        
        {/* --- SIDEBAR FILTERS --- */}
        {data && (
          <div className={`${showFilters ? 'w-72 border-r opacity-100' : 'w-0 border-r-0 opacity-0'} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out flex flex-col z-20 overflow-hidden shrink-0 shadow-sm`}>
            <div className={`flex flex-col h-full w-72 ${showFilters ? 'visible' : 'invisible'}`}>
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="font-bold flex items-center gap-2 text-xs uppercase tracking-tight text-slate-700 dark:text-slate-200"><Filter size={14} /> Filters</h2>
                <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={16}/></button>
              </div>
              
              <div className="p-4 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 flex items-center gap-2"><Calendar size={12}/> Monitoring Period</label>
                  <div className="flex flex-col gap-2">
                    <input type="date" className="w-full text-[10px] p-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none transition-colors" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <input type="date" className="w-full text-[10px] p-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none transition-colors" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800"/>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 flex items-center gap-2"><Activity size={12}/> Program Type</label>
                  <div className="space-y-1">
                    {filterOptions.programTypes.map((type) => {
                      const isRedWarning = type === ANOMALY_LIVE_MISS;
                      const isOrangeWarning = type === ANOMALY_EARLY_REPEAT;
                      return (
                        <label key={type} className="flex items-center gap-2 text-[10px] p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors group">
                          <input type="checkbox" className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-0 bg-white dark:bg-slate-700 cursor-pointer w-3 h-3" checked={selectedTypes.includes(type)} onChange={(e) => { if(e.target.checked) setSelectedTypes([...selectedTypes, type]); else setSelectedTypes(selectedTypes.filter(x => x !== type)); }} />
                          <span className={`group-hover:text-blue-600 dark:group-hover:text-blue-400 
                            ${isRedWarning ? 'text-rose-600 font-bold' : isOrangeWarning ? 'text-amber-600 font-bold' : 'text-slate-600 dark:text-slate-300'} 
                            ${selectedTypes.includes(type) && !isRedWarning && !isOrangeWarning ? 'font-bold text-blue-600 dark:text-blue-400' : ''}`}>
                            {isRedWarning && <AlertTriangle size={10} className="inline mr-1 -mt-0.5" />}
                            {isOrangeWarning && <AlertCircle size={10} className="inline mr-1 -mt-0.5" />}
                            {type}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800"/>
                <SearchableList label="Market" icon={<Globe size={12}/>} options={filterOptions.markets} selected={selectedMarkets} onChange={setSelectedMarkets} />
                <SearchableList label="Channel" icon={<Tv size={12}/>} options={filterOptions.channels} selected={selectedChannels} onChange={setSelectedChannels} />

                <button onClick={() => { setSelectedMarkets([]); setSelectedChannels([]); setSelectedTypes(["Live", ANOMALY_LIVE_MISS, ANOMALY_EARLY_REPEAT]); setStartDate(""); setEndDate(""); setGlobalSearch(""); }} className="w-full py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-rose-500 dark:hover:text-rose-400 transition-all flex items-center justify-center gap-2 mt-4">
                  <Eraser size={12}/> Reset Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- MAIN CONTENT --- */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10 shrink-0">
            <div className="flex justify-between items-center">
              
              <div className="flex items-center gap-3">
                {!showFilters && data && (
                  <button onClick={() => setShowFilters(true)} className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-colors">
                    <Filter size={16} className="text-slate-600 dark:text-slate-300" />
                  </button>
                )}
                <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
                  <Layers className="text-blue-600 dark:text-blue-500 shrink-0" size={20}/> Early Warning Dashboard
                </h1>
              </div>
              
              <div className="flex gap-3 items-center">
                
                {data && (
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <MapPin size={14} className="text-slate-400" />
                    <select className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                      <option value="Local">Dashboard Time (Local)</option>
                      <option value="UTC">UTC</option>
                      <option value="Europe/London">London (BST)</option>
                      <option value="America/New_York">New York (EST)</option>
                      <option value="Asia/Kolkata">India (IST)</option>
                    </select>
                  </div>
                )}

                {data && (
                  <div className="relative w-64 hidden md:block">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400"/>
                    <input type="text" placeholder="Search events..." className="w-full text-xs pl-8 pr-8 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} />
                    {globalSearch && <button onClick={() => setGlobalSearch("")} className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
                  </div>
                )}

                <input type="file" id="bsa" className="hidden" onChange={(e) => setBsaFile(e.target.files?.[0] || null)} />
                <label htmlFor="bsa" className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-transparent dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500 rounded-lg text-xs font-bold cursor-pointer transition-all">
                  <FileSpreadsheet size={16} className={bsaFile ? "text-emerald-500" : "text-slate-400"} />
                  <span className="truncate max-w-[150px]">{bsaFile ? bsaFile.name : 'Upload Schedule'}</span>
                </label>
                
                <button onClick={handleUpload} disabled={!bsaFile || isLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-xs font-bold disabled:opacity-50 shadow-md transition-all">
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Plot Timeline
                </button>
              </div>

            </div>
          </div>

          {/* Timeline Visualization */}
          <div className="flex-1 overflow-hidden p-4 bg-[#F8FAFC] dark:bg-[#0B0C0E]">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full w-full">
              
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                  <Clock size={16} className="text-blue-500"/> Live Broadcast Timeline
                </span>
                
                {timelineData && (
                  <div className="flex items-center gap-3">
                    
                    <div className="flex items-center gap-1.5 mr-2">
                       <span className="w-4 h-2.5 rounded-sm shadow-sm animated-schedule-bg border border-blue-400 border-dashed"></span>
                       <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Official Schedule Zone</span>
                    </div>

                    <div className="flex items-center gap-3 border-l border-slate-300 dark:border-slate-600 pl-3 mr-2">
                      <div className="flex items-center gap-1.5">
                         <span className="w-4 h-2.5 rounded-sm shadow-sm animated-warning-red border border-rose-700"></span>
                         <span className="text-[10px] font-bold text-rose-600 uppercase flex items-center gap-1"><AlertTriangle size={10}/> Live Miss</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                         <span className="w-4 h-2.5 rounded-sm shadow-sm animated-warning-orange border border-amber-600"></span>
                         <span className="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-1"><AlertCircle size={10}/> Early Repeat</span>
                      </div>
                    </div>

                    {[{ label: "Live Race", color: "bg-[#E74C3C]" }, { label: "Live Quali", color: "bg-[#F39C12]" }, { label: "Live Practice", color: "bg-[#5DADE2]" }].map((item) => (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-sm shadow-sm ${item.color}`}></span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!timelineData ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 bg-[#F8FAFC] dark:bg-[#0B0C0E]">
                  {data ? (
                    <>
                      <Layers size={48} className="opacity-20" />
                      <p className="text-sm">No events match your current filters.</p>
                    </>
                  ) : (
                    <>
                      <Layers size={48} className="opacity-20" />
                      <p className="text-sm">Upload an Excel schedule to generate the timeline.</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-auto custom-scrollbar relative">
                  
                  <div className="relative inline-flex flex-col min-w-full">
                    
                    <div className="absolute top-0 bottom-0 left-56 right-0 pointer-events-none z-0">
                      
                      {timelineData.ticks.map((tick: number) => {
                        const isNewDay = new Date(tick).getHours() === 0;
                        const leftPct = ((tick - timelineData.minTs) / timelineData.totalSpan) * 100;
                        return <div key={`bg-${tick}`} className={`absolute top-0 bottom-0 border-l ${isNewDay ? 'border-slate-300 dark:border-slate-600 border-dashed z-10' : 'border-slate-100 dark:border-slate-800/50'}`} style={{ left: `${leftPct}%` }} />;
                      })}

                      {officialSchedule.map((session: any, i: number) => {
                         const leftPct = ((session.startTs - timelineData.minTs) / timelineData.totalSpan) * 100;
                         const widthPct = ((session.endTs - session.startTs) / timelineData.totalSpan) * 100;
                         if (leftPct > 100 || leftPct + widthPct < 0) return null; 
                         
                         return (
                           <div 
                             key={`sch-${i}`} 
                             className="absolute top-0 bottom-0 border-x-2 border-dashed border-blue-400 dark:border-blue-500 animated-schedule-bg" 
                             style={{ left: `${Math.max(0, leftPct)}%`, width: `${Math.min(100 - leftPct, widthPct)}%` }}
                           >
                               <div className="sticky top-14 left-0 right-0 mx-auto w-max bg-white/95 dark:bg-slate-900/95 text-blue-700 dark:text-blue-400 text-[10px] font-black px-2 py-1 rounded shadow-md border border-blue-300 dark:border-blue-700 mt-2 z-10 backdrop-blur-md">
                                  Official {session.Session}
                               </div>
                           </div>
                         )
                      })}
                    </div>

                    <div className="relative z-10 flex flex-col w-full">
                      
                      <div className="sticky top-0 z-40 flex h-14 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="w-56 shrink-0 sticky left-0 z-50 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 px-3 flex items-center shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Market - Channel</span>
                        </div>
                        <div className="flex-1 relative min-w-[800px]">
                          {timelineData.ticks.map((tick: number, index: number) => {
                            const isNewDay = index === 0 || formatDateStr(tick, timezone) !== formatDateStr(timelineData.ticks[index-1], timezone);
                            const leftPct = ((tick - timelineData.minTs) / timelineData.totalSpan) * 100;
                            return (
                              <div key={`head-${tick}`} className={`absolute top-0 bottom-0 border-l px-2 pt-1 flex flex-col ${isNewDay ? 'border-slate-400 dark:border-slate-500 bg-slate-200/50 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700'}`} style={{ left: `${leftPct}%` }}>
                                <span className={`text-[9px] font-bold uppercase tracking-wider ${isNewDay ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                  {formatDateStr(tick, timezone)}
                                </span>
                                <span className={`text-[11px] font-black mt-0.5 ${isNewDay ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                  {formatTime(tick, timezone)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {timelineData.sortedKeys.map((channelLabel: string) => (
                        <div key={channelLabel} className="flex relative hover:bg-slate-100/50 dark:hover:bg-slate-800/50 h-12 border-b border-slate-100 dark:border-slate-800/50 transition-colors group">
                          
                          <div className="w-56 shrink-0 bg-white dark:bg-slate-900 sticky left-0 z-30 border-r border-slate-200 dark:border-slate-700 flex items-center px-3 shadow-[2px_0_5px_rgba(0,0,0,0.02)] group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate group-hover:text-blue-600 transition-colors" title={channelLabel}>{channelLabel}</span>
                          </div>
                          
                          <div className="flex-1 relative min-w-[800px]">
                            {timelineData.grouped[channelLabel].map((ev: any, idx: number) => {
                              const leftPct = ((ev.startTs - timelineData.minTs) / timelineData.totalSpan) * 100;
                              const widthPct = (ev.duration / timelineData.totalSpan) * 100;
                              const colors = getTimelineColor(ev);
                              
                              const marketTz = getMarketTimezone(ev.Market);
                              const dashTimeStr = `${formatFullDate(ev.startTs, timezone)} - ${formatTime(ev.endTs, timezone)}`;
                              const localTimeStr = `\n\n📌 Local Broadcast Time (${ev.Market}):\n${ev.localStartStr} - ${ev.localEndStr}`;
                              
                              let anomalyWarning = '';
                              if (ev.anomalyType === ANOMALY_LIVE_MISS) {
                                anomalyWarning = `\n\n🚨 ANOMALY: Missed Live!\nThis is coded as '${ev.originalProgType}' but overlaps with the Official '${ev.matchedSessionName}' session.`;
                              } else if (ev.anomalyType === ANOMALY_EARLY_REPEAT) {
                                anomalyWarning = `\n\n⚠️ REVIEW: Early Overlap\nThis is coded as '${ev.originalProgType}'. It overlaps '${ev.matchedSessionName}' but started very early. Likely a repeat block.`;
                              }

                              return (
                                <div 
                                  key={idx} 
                                  className={`absolute top-2 bottom-2 rounded shadow-sm border flex items-center justify-center overflow-hidden cursor-pointer hover:brightness-110 hover:shadow-md hover:z-20 transition-all ${colors.bg} ${colors.border}`}
                                  style={{ left: `${Math.max(0, leftPct)}%`, width: `${Math.min(100 - leftPct, widthPct)}%` }}
                                  title={`[${ev.Market}] ${ev.Competition || 'Event'}\nCoded Type: ${ev.originalProgType}${anomalyWarning}\n\n⏱️ Dashboard Time (${timezone}):\n${dashTimeStr}${ev.localStartStr !== 'Unknown' ? localTimeStr : ''}`}
                                >
                                  {widthPct > 4 && (
                                    <span className={`text-[9px] font-bold px-1 truncate drop-shadow-sm ${colors.text}`}>
                                      {ev.anomalyType === ANOMALY_LIVE_MISS && <AlertTriangle size={8} className="inline mr-1 -mt-0.5" />}
                                      {ev.anomalyType === ANOMALY_EARLY_REPEAT && <AlertCircle size={8} className="inline mr-1 -mt-0.5" />}
                                      {ev.Competition}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarlyWarningPage1;


// "use client";

// import React, { useState, useMemo, useEffect } from "react";
// import { useRunEarlyWarningAnalysis1Mutation, useRunMarketChecksMutation } from "@/state/api"; 
// import { 
//   FileSpreadsheet, Loader2, Search, Clock, Layers, Filter, X, Calendar, Globe, Tv, Activity as ActivityIcon, Eraser,
//   MapPin, Trash2, Copy, CheckCircle, GitMerge, ShieldCheck, AlertTriangle, AlertCircle, Download, TrendingDown, Target, Moon, Sun, BarChart2
// } from "lucide-react";

// // --- TYPESCRIPT INTERFACES ---
// export interface AuditProposal { id: string; title: string; count?: number; source?: string; targets?: string[]; }
// export interface EarlyWarningResponse { timeline_view: any[]; audit_proposals: { removals: AuditProposal[]; duplications: AuditProposal[]; }; official_schedule: any[]; }
// export interface QcSummary { action?: string; check_key?: string; status: string; description: string; details: { rows_flagged?: number; total_issues_flagged?: number; Total_Evaluated?: number; rows_processed?: number; [key: string]: any }; }
// export interface QcRunResponse { status: string; message: string; download_url: string; summaries: QcSummary[]; }

// // --- CONSTANTS & HELPERS ---
// const ANOMALY_LIVE_MISS = "Potential Live Miss";
// const ANOMALY_EARLY_REPEAT = "Early Overlap (Likely Repeat)";

// const DEFAULT_CHECKS_TO_RUN = [
//   "check_latam_espn", "check_italy_mexico", "check_channel4plus1", "check_espn4_bsa",
//   "check_f1_obligations", "duration_limits", "live_date_integrity", "impute_program_type_confidence",
//   "check_session_completeness", "update_audience_from_overnight", "dup_channel_existence",
//   "check_youtube_global", "check_pan_mena", "check_china_tencent", "check_czech_slovakia",
//   "check_ant1_greece", "check_india", "check_usa_espn", "check_dazn_japan", "check_aztv", "check_rush_caribbean"
// ];

// const ACTION_TO_PYTHON_KEY_MAP: Record<string, string> = {
//   "del_Andorra": "remove_andorra",
//   "del_Serbia": "remove_serbia",
//   "del_Montenegro": "remove_montenegro",
//   "del_br_espn": "remove_brazil_espn_fox",
//   "del_swiss_ch": "remove_switz_canal",
//   "dup_uk": "apply_duplication_weights", 
//   "dup_ger": "apply_duplication_weights",
//   "dup_sa": "apply_duplication_weights",
//   "dup_fra": "apply_duplication_weights",
//   "del_invalid_durations": "remove_invalid_durations" // 🎯 NEW QC CORRECTION MAPPING
// };

// const formatTime = (ts: number, tz: string) => {
//   const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
//   if (tz && tz !== 'Local') options.timeZone = tz;
//   return new Intl.DateTimeFormat('en-GB', options).format(ts);
// };
// const formatDateStr = (ts: number, tz: string) => {
//   const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
//   if (tz && tz !== 'Local') options.timeZone = tz;
//   return new Intl.DateTimeFormat('en-GB', options).format(ts);
// };
// const formatFullDate = (ts: number, tz: string) => {
//   const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
//   if (tz && tz !== 'Local') options.timeZone = tz;
//   return new Intl.DateTimeFormat('en-GB', options).format(ts);
// };

// // --- SUB-COMPONENTS ---
// const SearchableList = ({ label, icon, options, selected, onChange }: any) => { 
//   const [query, setQuery] = useState(""); 
//   const filteredOptions = options.filter((opt: string) => opt.toLowerCase().includes(query.toLowerCase())); 
//   return ( 
//     <div> 
//       <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 flex items-center justify-between group"> 
//         <span className="flex items-center gap-2">{icon} {label}</span> 
//         {selected.length > 0 && <span className="text-[9px] text-blue-500 cursor-pointer hover:underline" onClick={() => onChange([])}>Clear ({selected.length})</span>} 
//       </label> 
//       <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700 shadow-inner"> 
//         <div className="relative mb-2"> 
//           <Search size={12} className="absolute left-2 top-2 text-slate-400"/> 
//           <input type="text" placeholder={`Search ${label}...`} className="w-full text-[10px] pl-7 pr-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-400" value={query} onChange={(e) => setQuery(e.target.value)} /> 
//         </div> 
//         <div className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar"> 
//           {filteredOptions.length > 0 ? ( 
//             filteredOptions.map((opt: string) => ( 
//               <label key={opt} className="flex items-center gap-2 text-[10px] p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded cursor-pointer transition-colors group"> 
//                 <input type="checkbox" className="rounded border-slate-300 dark:border-slate-500 text-blue-600 focus:ring-0 bg-white dark:bg-slate-800 cursor-pointer w-3 h-3" checked={selected.includes(opt)} onChange={(e) => { if(e.target.checked) onChange([...selected, opt]); else onChange(selected.filter((x: string) => x !== opt)); }} /> 
//                 <span className="truncate select-none text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" title={opt}>{opt}</span> 
//               </label> 
//             )) 
//           ) : ( <div className="text-[9px] text-slate-400 text-center py-2 italic">No matches found</div> )} 
//         </div> 
//       </div> 
//     </div> 
//   ); 
// };

// export default function EarlyWarningPage1() {
//   const [bsrFile, setBsrFile] = useState<File | null>(null);
//   const [mainTab, setMainTab] = useState<"timeline" | "transform" | "audit">("timeline");
//   const [sidebarTab, setSidebarTab] = useState<"actions" | "filters">("actions");
//   const [showFilters, setShowFilters] = useState(true);
//   const [timezone, setTimezone] = useState<string>("Local");
//   const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

//   const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
//   const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
//   const [selectedTypes, setSelectedTypes] = useState<string[]>(["Live", ANOMALY_LIVE_MISS, ANOMALY_EARLY_REPEAT]); 
//   const [globalSearch, setGlobalSearch] = useState("");
//   const [startDate, setStartDate] = useState<string>("");
//   const [endDate, setEndDate] = useState<string>("");

//   const [roscoId, setRoscoId] = useState<string>("");
//   const [projectName, setProjectName] = useState<string>("BSR Audit 2026");
//   const [completedActions, setCompletedActions] = useState<string[]>([]);
  
//   const [runTimelineAnalysis, { data: timelineRawData, isLoading: isTimelineLoading }] = useRunEarlyWarningAnalysis1Mutation();
//   const [runMarketChecks, { data: qcDataRaw, isLoading: isQcLoading }] = useRunMarketChecksMutation();

//   useEffect(() => {
//     if (document.documentElement.classList.contains('dark')) setIsDarkMode(true);
//   }, []);

//   const toggleTheme = () => {
//     setIsDarkMode(!isDarkMode);
//     if (!isDarkMode) document.documentElement.classList.add('dark');
//     else document.documentElement.classList.remove('dark');
//   };

//   const handleUploadAndAnalyze = async () => {
//     if (!bsrFile) return;
//     const fdTimeline = new FormData(); 
//     fdTimeline.append("bsa_file", bsrFile);
//     try {
//       setCompletedActions([]); 
//       await runTimelineAnalysis(fdTimeline).unwrap();
//       setMainTab("timeline");
//       setSidebarTab("actions");
//     } catch (err) { console.error("Timeline analysis failed", err); }
//   };

//   const handleRunFinalQC = async () => {
//     if (!bsrFile) return;
//     const fdQc = new FormData(); 
//     fdQc.append("bsr_file", bsrFile);
//     fdQc.append("manual_rosco_id", roscoId || `AUTO-${Math.floor(Math.random() * 10000)}`);
//     fdQc.append("project_name", projectName);
//     fdQc.append("user_name", "Dashboard User");
//     fdQc.append("check_configs", "{}");

//     // 🎯 THE FIX: Execution Order Matters!
//     // We must tell the Python backend to run CLEANSING actions FIRST, 
//     // and THEN run the DEFAULT QC checks on the clean data.
//     const orderedChecksToRun: string[] = [];

//     // 1. Queue User's Cleansing Actions First (Removals, Duplications)
//     completedActions.forEach(actionId => {
//       const pythonKey = ACTION_TO_PYTHON_KEY_MAP[actionId];
//       if (pythonKey && !orderedChecksToRun.includes(pythonKey)) {
//         orderedChecksToRun.push(pythonKey);
//       }
//     });

//     // 2. Queue Default QC Checks Second (Durations, Live Dates, etc.)
//     DEFAULT_CHECKS_TO_RUN.forEach(c => {
//       if (!orderedChecksToRun.includes(c)) orderedChecksToRun.push(c);
//     });

//     // Append them to FormData in the exact order they must be executed
//     orderedChecksToRun.forEach(c => fdQc.append("checks", c));

//     try {
//       await runMarketChecks(fdQc).unwrap();
//       setMainTab("audit"); // Auto-switch to QC Board
//     } catch (err) { console.error("Final QC failed", err); }
//   };

//   const timelineResponse = timelineRawData as unknown as EarlyWarningResponse;
//   const qcResponse = qcDataRaw as unknown as QcRunResponse;
//   const etlProposals = timelineResponse?.audit_proposals || { removals: [], duplications: [] };
//   const officialSchedule = timelineResponse?.official_schedule || [];

//   // --- DYNAMIC QC CORRECTIONS ---
//   // If the QC check ran and flagged durations, we extract that number so we can show the "Drop Rows" button
//   const durationErrorsFound = useMemo(() => {
//     if (!qcResponse?.summaries) return 0;
//     const durationSummary = qcResponse.summaries.find(s => s.check_key === 'duration_limits');
//     return durationSummary?.details?.rows_flagged || 0;
//   }, [qcResponse]);


//   const { timelineData, filterOptions } = useMemo(() => {
//     if (!timelineResponse?.timeline_view || timelineResponse.timeline_view.length === 0) {
//       return { timelineData: null, filterOptions: { markets: [], channels: [], programTypes: [] } };
//     }
    
//     let workingData = [...timelineResponse.timeline_view];
//     const processedSchedule = officialSchedule.map((s: any) => ({ ...s, startTs: new Date(`${s.Start_Datetime}Z`).getTime(), endTs: new Date(`${s.End_Datetime}Z`).getTime() }));

//     // 1. Apply Local Cleansing
//     if (completedActions.includes("del_Andorra")) workingData = workingData.filter((d: any) => !d.Market?.toLowerCase().includes("andorra"));
//     if (completedActions.includes("del_Serbia")) workingData = workingData.filter((d: any) => !d.Market?.toLowerCase().includes("serbia"));
//     if (completedActions.includes("del_Montenegro")) workingData = workingData.filter((d: any) => !d.Market?.toLowerCase().includes("montenegro"));
//     if (completedActions.includes("del_br_espn")) workingData = workingData.filter((d: any) => !(d.Market?.toLowerCase().includes("brazil") && d["TV-Channel"]?.match(/espn|fox/i)));
//     if (completedActions.includes("del_swiss_ch")) workingData = workingData.filter((d: any) => !(d.Market?.toLowerCase().includes("switzerland") && d["TV-Channel"]?.match(/canal\+|servustv/i)));
    
//     // 🎯 Apply Local Post-QC Fix (Duration Error Deletion)
//     if (completedActions.includes("del_invalid_durations")) {
//         workingData = workingData.filter((d: any) => {
//             const startTs = new Date(`${d.Start_Datetime}Z`).getTime();
//             const endTs = new Date(`${d.End_Datetime}Z`).getTime();
//             const durationMins = (endTs - startTs) / 60000;
//             // Keep only rows strictly between 5 and 300 minutes
//             return durationMins >= 5 && durationMins <= 300;
//         });
//     }

//     // 2. Apply Local Duplications
//     if (completedActions.includes("dup_uk")) {
//       const ukSky = workingData.filter((d: any) => d.Market?.toLowerCase().includes("united kingdom") && d["TV-Channel"]?.match(/sky/i));
//       workingData = [...workingData, ...ukSky.map((d: any) => ({ ...d, Market: "Ireland", _isDuplicated: true }))];
//     }
//     if (completedActions.includes("dup_ger")) {
//       const gerSky = workingData.filter((d: any) => d.Market?.toLowerCase().includes("germany") && d["TV-Channel"]?.match(/sky/i));
//       workingData = [ ...workingData, ...gerSky.map((d: any) => ({ ...d, Market: "Austria", _isDuplicated: true })), ...gerSky.map((d: any) => ({ ...d, Market: "Switzerland", _isDuplicated: true })), ...gerSky.map((d: any) => ({ ...d, Market: "Luxembourg", _isDuplicated: true })) ];
//     }

//     const parsedEvents = workingData.map((d: any) => {
//       const startTs = new Date(`${d.Start_Datetime}Z`).getTime();
//       const endTs = new Date(`${d.End_Datetime}Z`).getTime();
//       const originalProgType = String(d["Type of program"] || 'Blank').trim();
//       let anomalyType = null; let matchedSessionName = null;
//       if (originalProgType.toLowerCase() !== 'live') {
//         for (const session of processedSchedule) {
//           const overlapStart = Math.max(startTs, session.startTs);
//           const overlapEnd = Math.min(endTs, session.endTs);
//           if (overlapEnd - overlapStart > 900000) { 
//             anomalyType = (session.startTs - startTs) > 5400000 ? ANOMALY_EARLY_REPEAT : ANOMALY_LIVE_MISS;
//             matchedSessionName = session.Session; break; 
//           }
//         }
//       }
//       return { ...d, marketChannel: `${d.Market || 'Unknown'} - ${d["TV-Channel"] || 'Unknown'}`, progType: anomalyType ? anomalyType : originalProgType, originalProgType, anomalyType, matchedSessionName, localStartStr: d.Local_Start_Str || 'N/A', localEndStr: d.Local_End_Str || 'N/A', startTs, endTs, duration: endTs - startTs };
//     }).filter((d: any) => !isNaN(d.startTs) && d.duration > 0);

//     const markets = Array.from(new Set(parsedEvents.map((ev: any) => ev.Market || 'Unknown'))).sort() as string[];
//     const channels = Array.from(new Set(parsedEvents.map((ev: any) => ev["TV-Channel"] || 'Unknown'))).sort() as string[];
//     const programTypes = Array.from(new Set(parsedEvents.map((ev: any) => ev.progType))).sort() as string[];

//     const filteredEvents = parsedEvents.filter((ev: any) => {
//       const matchMarket = selectedMarkets.length === 0 || selectedMarkets.includes(ev.Market);
//       const matchChannel = selectedChannels.length === 0 || selectedChannels.includes(ev["TV-Channel"]);
//       const matchType = selectedTypes.length === 0 || selectedTypes.some(t => t.toLowerCase() === ev.progType.toLowerCase());
//       const matchSearch = !globalSearch || ev.marketChannel.toLowerCase().includes(globalSearch.toLowerCase()) || (ev.Competition && ev.Competition.toLowerCase().includes(globalSearch.toLowerCase()));
//       const fStart = startDate ? new Date(startDate).getTime() : 0;
//       const fEnd = endDate ? new Date(endDate).getTime() + 86400000 : Infinity; 
//       return matchMarket && matchChannel && matchType && matchSearch && (ev.endTs >= fStart && ev.startTs <= fEnd);
//     });

//     if (filteredEvents.length === 0) return { timelineData: null, filterOptions: { markets, channels, programTypes } };

//     const minTs = Math.min(...filteredEvents.map((d: any) => d.startTs));
//     const maxTs = Math.max(...filteredEvents.map((d: any) => d.endTs));
//     const grouped = filteredEvents.reduce((acc: any, curr: any) => {
//       if (!acc[curr.marketChannel]) acc[curr.marketChannel] = [];
//       acc[curr.marketChannel].push(curr); return acc;
//     }, {});
    
//     const ticks = []; let currentTs = minTs - (minTs % 10800000); 
//     while (currentTs <= maxTs + 10800000) { ticks.push(currentTs); currentTs += 10800000; }
    
//     return { timelineData: { minTs, maxTs, totalSpan: maxTs - minTs, grouped, sortedKeys: Object.keys(grouped).sort(), ticks, processedSchedule }, filterOptions: { markets, channels, programTypes } };
//   }, [timelineResponse, completedActions, selectedMarkets, selectedChannels, selectedTypes, globalSearch, startDate, endDate]);

//   const applyAllActions = () => {
//     const allActionIds = [...etlProposals.removals.map((r: AuditProposal) => r.id), ...etlProposals.duplications.map((d: AuditProposal) => d.id)];
//     if (durationErrorsFound > 0) allActionIds.push("del_invalid_durations"); // Auto-add QC fix if present
//     setCompletedActions(allActionIds);
//   };

//   const getTimelineColor = (ev: any) => {
//     if (ev.anomalyType === ANOMALY_LIVE_MISS) return { bg: 'animated-warning-red', border: 'border-rose-700', text: 'text-white' };
//     if (ev.anomalyType === ANOMALY_EARLY_REPEAT) return { bg: 'animated-warning-orange', border: 'border-amber-600', text: 'text-white' };
//     if (ev.progType.toLowerCase() !== 'live') return { bg: 'bg-[#AAB7B8]', border: 'border-[#95A5A6]', text: 'text-slate-800' };
//     const c = (ev.Competition || "").toLowerCase();
//     if (c.includes('practice 1')) return { bg: 'bg-[#5DADE2]', border: 'border-[#3498DB]', text: 'text-white' };
//     if (c.includes('practice 2')) return { bg: 'bg-[#3498DB]', border: 'border-[#2980B9]', text: 'text-white' };
//     if (c.includes('practice 3')) return { bg: 'bg-[#2ECC71]', border: 'border-[#27AE60]', text: 'text-white' };
//     if (c.includes('qualifying')) return { bg: 'bg-[#F39C12]', border: 'border-[#D68910]', text: 'text-white' };
//     if (c.includes('race') || c.includes('grand prix')) return { bg: 'bg-[#E74C3C]', border: 'border-[#C0392B]', text: 'text-white' };
//     return { bg: 'bg-slate-400', border: 'border-slate-500', text: 'text-white' };
//   };

//   const qcMetrics = useMemo(() => {
//     if (!qcResponse?.summaries) return null;
//     let failedChecks = 0; let totalErrors = 0; let totalEvaluatedOverall = 0;
//     const checkGroups = { integrity: [] as any[], coverage: [] as any[], cleansing: [] as any[] };

//     qcResponse.summaries.forEach((chk) => {
//       const isFail = chk.status.toLowerCase().includes('fail') || chk.status.toLowerCase().includes('flag') || chk.status.toLowerCase().includes('error');
//       if (isFail) failedChecks++;
      
//       const flagged = chk.details?.rows_flagged || chk.details?.total_issues_flagged || 0;
//       const evaluated = chk.details?.Total_Evaluated || chk.details?.rows_processed || flagged || 1; 
//       const errorRate = evaluated > 0 ? (flagged / evaluated) * 100 : 0;
      
//       totalErrors += flagged;
//       totalEvaluatedOverall += evaluated;
      
//       const key = (chk.check_key || chk.action || "").toLowerCase();
//       const checkData = { name: chk.action || chk.check_key || 'Check', flagged, evaluated, errorRate, isFail, desc: chk.description };

//       if (key.includes('remove') || key.includes('recreate') || key.includes('impute')) checkGroups.cleansing.push(checkData);
//       else if (key.includes('youtube') || key.includes('mena') || key.includes('china') || key.includes('dazn') || key.includes('usa') || key.includes('rush') || key.includes('aztv') || key.includes('ant1') || key.includes('czech')) checkGroups.coverage.push(checkData);
//       else checkGroups.integrity.push(checkData);
//     });

//     checkGroups.integrity.sort((a, b) => b.errorRate - a.errorRate);

//     const totalChecks = qcResponse.summaries.length;
//     const passedChecks = totalChecks - failedChecks;
//     const healthScore = totalChecks ? Math.round((passedChecks / totalChecks) * 100) : 0;
//     const overallErrorRate = totalEvaluatedOverall ? ((totalErrors / totalEvaluatedOverall) * 100).toFixed(1) : "0.0";

//     return { totalChecks, failedChecks, passedChecks, totalErrors, healthScore, overallErrorRate, checkGroups };
//   }, [qcResponse]);

//   return (
//     <div className={`flex flex-col w-full h-[calc(100vh-64px)] transition-colors duration-300 ${isDarkMode ? 'dark bg-[#0B0C0E] text-slate-200' : 'bg-[#F8FAFC] text-slate-800'}`}>
      
//       <style>{`
//         @keyframes slide-stripes { 0% { background-position: 0 0; } 100% { background-position: 28px 0; } }
//         .animated-schedule-bg { background-image: repeating-linear-gradient(-45deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.08) 10px, rgba(59, 130, 246, 0.18) 10px, rgba(59, 130, 246, 0.18) 20px); background-size: 28px 28px; animation: slide-stripes 2s linear infinite; }
//         .animated-warning-red { background-image: repeating-linear-gradient(45deg, #e11d48, #e11d48 10px, #be123c 10px, #be123c 20px); background-size: 28px 28px; animation: slide-stripes 1.5s linear infinite; }
//         .animated-warning-orange { background-image: repeating-linear-gradient(45deg, #f59e0b, #f59e0b 10px, #d97706 10px, #d97706 20px); background-size: 28px 28px; animation: slide-stripes 1.5s linear infinite; }
//       `}</style>

//       {/* HEADER BAR */}
//       <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10 shrink-0 flex flex-wrap justify-between items-center gap-4">
//         <div className="flex flex-col gap-2">
//           <div className="flex items-center gap-3">
//             {!showFilters && timelineResponse && (
//               <button onClick={() => setShowFilters(true)} className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 transition-colors">
//                 <Filter size={16} />
//               </button>
//             )}
//             <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
//               <Layers className="text-blue-600 dark:text-blue-500" size={20}/> Early Warning & QC Dashboard
//             </h1>
//             <button onClick={toggleTheme} className="p-1.5 rounded-md hover:bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
//               {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
//             </button>
//           </div>
          
//           {timelineResponse && (
//             <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 w-max">
//               <button onClick={() => setMainTab("timeline")} className={`px-4 py-1 text-xs font-bold rounded flex items-center gap-2 transition-all ${mainTab === 'timeline' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><Clock size={14}/> Timeline</button>
//               <button onClick={() => setMainTab("transform")} className={`px-4 py-1 text-xs font-bold rounded flex items-center gap-2 transition-all ${mainTab === 'transform' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><GitMerge size={14}/> ETL Config</button>
//               <button onClick={() => setMainTab("audit")} className={`px-4 py-1 text-xs font-bold rounded flex items-center gap-2 transition-all ${mainTab === 'audit' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
//                 <ShieldCheck size={14}/> Data Quality Board
//               </button>
//             </div>
//           )}
//         </div>
        
//         <div className="flex gap-3 items-end">
//           <div className="flex flex-col gap-1 hidden md:flex">
//              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">Project Name</span>
//              <input type="text" className="w-32 text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
//           </div>
//           <div className="flex flex-col gap-1 hidden md:flex">
//              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">Rosco ID</span>
//              <input type="text" placeholder="Optional ID" className="w-28 text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500" value={roscoId} onChange={(e) => setRoscoId(e.target.value)} />
//           </div>
//           <div className="w-px h-10 bg-slate-200 dark:bg-slate-700 mx-2 self-center hidden md:block"></div>
          
//           <input type="file" id="bsr" className="hidden" onChange={(e) => setBsrFile(e.target.files?.[0] || null)} />
//           <label htmlFor="bsr" className="flex items-center gap-2 px-4 py-2 h-[34px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700">
//             <FileSpreadsheet size={16} className={bsrFile ? "text-emerald-500" : "text-slate-400"} />
//             <span className="truncate max-w-[120px]">{bsrFile ? bsrFile.name : '1. Upload BSR'}</span>
//           </label>
          
//           <button onClick={handleUploadAndAnalyze} disabled={!bsrFile || isTimelineLoading} className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white h-[34px] px-4 rounded-lg flex items-center gap-2 text-xs font-bold disabled:opacity-50 transition-all shadow-sm">
//             {isTimelineLoading ? <Loader2 size={16} className="animate-spin" /> : "2. Analyze"}
//           </button>

//           {timelineResponse && (
//             <button onClick={handleRunFinalQC} disabled={isQcLoading} className="bg-blue-600 hover:bg-blue-700 text-white h-[34px] px-6 rounded-lg flex items-center gap-2 text-xs font-bold disabled:opacity-50 transition-all shadow-md ml-2 border border-blue-700">
//               {isQcLoading ? <Loader2 size={16} className="animate-spin" /> : <><ShieldCheck size={16}/> 3. Run Final QC</>}
//             </button>
//           )}
//         </div>
//       </div>

//       <div className="flex flex-1 overflow-hidden">
        
//         {/* --- SIDEBAR: TABS FOR FILTERS / ACTIONS --- */}
//         {timelineResponse && (
//           <div className={`${showFilters ? 'w-80 border-r opacity-100' : 'w-0 border-r-0 opacity-0'} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out flex flex-col z-20 overflow-hidden shrink-0 shadow-sm`}>
//             <div className={`flex flex-col h-full w-80 ${showFilters ? 'visible' : 'invisible'}`}>
              
//               <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
//                 <button onClick={() => setSidebarTab("filters")} className={`flex-1 py-3 text-xs font-bold uppercase tracking-tight ${sidebarTab === 'filters' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-slate-900' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Filters</button>
//                 <button onClick={() => setSidebarTab("actions")} className={`flex-1 py-3 text-xs font-bold uppercase tracking-tight flex items-center justify-center gap-1 ${sidebarTab === 'actions' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-slate-900' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
//                   Action Center
//                 </button>
//                 <button onClick={() => setShowFilters(false)} className="px-3 text-slate-400 hover:text-rose-500 transition-colors border-l border-slate-100 dark:border-slate-800"><X size={16}/></button>
//               </div>

//               <div className="p-4 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                
//                 {/* ACTION CENTER TAB */}
//                 {sidebarTab === "actions" && (
//                   <div className="space-y-6">
//                      <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-800/50">
//                        <p className="text-[10px] text-blue-700 dark:text-blue-300 font-bold leading-tight">Apply rules here, then click 'Run Final QC'</p>
//                        <button onClick={applyAllActions} className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded shrink-0">Apply All</button>
//                      </div>

//                      {/* 🎯 NEW: DYNAMIC QC CORRECTIONS SECTION */}
//                      {durationErrorsFound > 0 && (
//                        <div>
//                          <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-wider mb-2 flex items-center gap-2"><AlertTriangle size={12}/> Post-QC Corrections</h3>
//                          <div className={`p-2.5 rounded-lg border flex justify-between items-start transition-all ${completedActions.includes("del_invalid_durations") ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60' : 'bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-700 shadow-md ring-1 ring-rose-100 dark:ring-rose-900/30'}`}>
//                            <div>
//                              <span className={`text-[11px] font-bold block ${completedActions.includes("del_invalid_durations") ? "text-slate-500 line-through" : "text-rose-700 dark:text-rose-400"}`}>Drop Invalid Durations</span>
//                              <span className="text-[9px] text-slate-400 dark:text-slate-500">Remove {durationErrorsFound} rows outside 5m - 5h</span>
//                            </div>
//                            {!completedActions.includes("del_invalid_durations") ? <button onClick={() => setCompletedActions([...completedActions, "del_invalid_durations"])} className="text-[9px] font-bold bg-rose-500 hover:bg-rose-600 text-white px-2.5 py-1 rounded">Apply Fix</button> : <CheckCircle size={14} className="text-emerald-500 mt-1"/>}
//                          </div>
//                        </div>
//                      )}

//                      {etlProposals.removals.length > 0 && (
//                        <div>
//                          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><Trash2 size={12}/> Removals</h3>
//                          <div className="space-y-2">
//                            {etlProposals.removals.map((r: AuditProposal) => (
//                              <div key={r.id} className={`p-2.5 rounded-lg border flex justify-between items-start transition-all ${completedActions.includes(r.id) ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60' : 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-800 shadow-sm'}`}>
//                                <div>
//                                  <span className={`text-[11px] font-bold block ${completedActions.includes(r.id) ? "text-slate-500 line-through" : "text-slate-700 dark:text-slate-200"}`}>{r.title}</span>
//                                  <span className="text-[9px] text-slate-400">{r.count} rows</span>
//                                </div>
//                                {!completedActions.includes(r.id) ? <button onClick={() => setCompletedActions([...completedActions, r.id])} className="text-[9px] font-bold bg-rose-500 hover:bg-rose-600 text-white px-2.5 py-1 rounded">Apply</button> : <CheckCircle size={14} className="text-emerald-500 mt-1"/>}
//                              </div>
//                            ))}
//                          </div>
//                        </div>
//                      )}

//                      {etlProposals.duplications.length > 0 && (
//                        <div>
//                          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><Copy size={12}/> Duplications</h3>
//                          <div className="space-y-2">
//                            {etlProposals.duplications.map((d: AuditProposal) => (
//                              <div key={d.id} className={`p-2.5 rounded-lg border flex justify-between items-start transition-all ${completedActions.includes(d.id) ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60' : 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 shadow-sm'}`}>
//                                <div>
//                                  <span className={`text-[11px] font-bold block ${completedActions.includes(d.id) ? "text-slate-500 line-through" : "text-slate-700 dark:text-slate-200"}`}>{d.source}</span>
//                                  <span className="text-[9px] text-slate-400">{d.count} rows</span>
//                                </div>
//                                {!completedActions.includes(d.id) ? <button onClick={() => setCompletedActions([...completedActions, d.id])} className="text-[9px] font-bold bg-blue-500 hover:bg-blue-600 text-white px-2.5 py-1 rounded">Apply</button> : <CheckCircle size={14} className="text-emerald-500 mt-1"/>}
//                              </div>
//                            ))}
//                          </div>
//                        </div>
//                      )}
//                   </div>
//                 )}

//                 {/* FILTERS TAB */}
//                 {sidebarTab === "filters" && filterOptions && (
//                   <>
//                     <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
//                       <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 flex items-center gap-2"><Calendar size={12}/> Monitoring Period</label>
//                       <div className="flex flex-col gap-2">
//                         <input type="date" className="w-full text-[10px] p-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none transition-colors" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
//                         <input type="date" className="w-full text-[10px] p-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none transition-colors" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
//                       </div>
//                     </div>
//                     <hr className="border-slate-100 dark:border-slate-800"/>
//                     <div>
//                       <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 flex items-center gap-2"><ActivityIcon size={12}/> Program Type</label>
//                       <div className="space-y-1">
//                         {filterOptions.programTypes.map((type: string) => {
//                           const isRedWarning = type === ANOMALY_LIVE_MISS;
//                           const isOrangeWarning = type === ANOMALY_EARLY_REPEAT;
//                           return (
//                             <label key={type} className="flex items-center gap-2 text-[10px] p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors group">
//                               <input type="checkbox" className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-0 bg-white dark:bg-slate-700 cursor-pointer w-3 h-3" checked={selectedTypes.includes(type)} onChange={(e) => { if(e.target.checked) setSelectedTypes([...selectedTypes, type]); else setSelectedTypes(selectedTypes.filter(x => x !== type)); }} />
//                               <span className={`group-hover:text-blue-600 dark:group-hover:text-blue-400 ${isRedWarning ? 'text-rose-600 font-bold' : isOrangeWarning ? 'text-amber-600 font-bold' : 'text-slate-600 dark:text-slate-300'} ${selectedTypes.includes(type) && !isRedWarning && !isOrangeWarning ? 'font-bold text-blue-600 dark:text-blue-400' : ''}`}>
//                                 {isRedWarning && <AlertTriangle size={10} className="inline mr-1 -mt-0.5" />}
//                                 {isOrangeWarning && <AlertCircle size={10} className="inline mr-1 -mt-0.5" />}
//                                 {type}
//                               </span>
//                             </label>
//                           )
//                         })}
//                       </div>
//                     </div>
//                     <hr className="border-slate-100 dark:border-slate-800"/>
//                     <SearchableList label="Market" icon={<Globe size={12}/>} options={filterOptions.markets} selected={selectedMarkets} onChange={setSelectedMarkets} />
//                     <SearchableList label="Channel" icon={<Tv size={12}/>} options={filterOptions.channels} selected={selectedChannels} onChange={setSelectedChannels} />
//                     <button onClick={() => { setSelectedMarkets([]); setSelectedChannels([]); setSelectedTypes(["Live", ANOMALY_LIVE_MISS, ANOMALY_EARLY_REPEAT]); setStartDate(""); setEndDate(""); setGlobalSearch(""); }} className="w-full py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-rose-500 dark:hover:text-rose-400 transition-all flex items-center justify-center gap-2 mt-4">
//                       <Eraser size={12}/> Reset Filters
//                     </button>
//                   </>
//                 )}
//               </div>
//             </div>
//           </div>
//         )}

//         {/* --- MAIN CONTENT AREA --- */}
//         <div className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC] dark:bg-[#0B0C0E] relative">
          
//           {/* SEARCH BAR */}
//           {timelineResponse && mainTab === "timeline" && (
//             <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
//               <div className="relative max-w-md">
//                 <Search size={14} className="absolute left-3 top-2.5 text-slate-400"/>
//                 <input type="text" placeholder="Global Search (Market, Channel, Event)..." className="w-full text-xs pl-8 pr-8 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none transition-all" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} />
//                 {globalSearch && <button onClick={() => setGlobalSearch("")} className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
//               </div>
//             </div>
//           )}

//           <div className="flex-1 overflow-hidden p-4 md:p-6 relative">
//             {!timelineResponse && (
//               <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-dashed">
//                 <Layers size={48} className="opacity-20" />
//                 <p className="text-sm font-bold text-slate-600 dark:text-slate-400">System Ready for Processing</p>
//                 <p className="text-xs text-center max-w-sm">Upload a BSR schedule file. Apply local formatting actions, then run the Python validation suite for deep quality insights.</p>
//               </div>
//             )}

//             {/* TAB 1: TIMELINE */}
//             {timelineResponse && mainTab === "timeline" && timelineData && (
//               <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm w-full h-full flex flex-col overflow-hidden">
//                   <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
//                     <span className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200"><Clock size={16} className="text-blue-500"/> Live Broadcast Timeline</span>
//                     <div className="flex items-center gap-3">
//                       <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 mr-2">
//                         <MapPin size={12} className="text-slate-400" />
//                         <select className="bg-transparent text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
//                           <option value="Local">Dashboard Time</option>
//                           <option value="UTC">UTC</option>
//                         </select>
//                       </div>
//                       {[{ label: "Race", color: "bg-[#E74C3C]" }, { label: "Quali", color: "bg-[#F39C12]" }, { label: "Practice", color: "bg-[#5DADE2]" }].map((item) => (
//                         <div key={item.label} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-sm shadow-sm ${item.color}`}></span><span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{item.label}</span></div>
//                       ))}
//                     </div>
//                   </div>

//                   <div className="flex-1 overflow-auto custom-scrollbar relative">
//                     <div className="relative inline-flex flex-col min-w-full">
//                         <div className="sticky top-0 z-40 flex h-14 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 shadow-sm">
//                           <div className="w-56 shrink-0 sticky left-0 z-50 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 px-3 flex items-center shadow-[2px_0_5px_rgba(0,0,0,0.05)]"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Market - Channel</span></div>
//                           <div className="flex-1 relative min-w-[800px]">
//                             {timelineData.ticks.map((tick: number) => (
//                                   <div key={tick} className="absolute top-0 bottom-0 border-l border-slate-200 dark:border-slate-700 px-2 pt-1 flex flex-col" style={{ left: `${((tick - timelineData.minTs) / timelineData.totalSpan) * 100}%` }}>
//                                     <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{formatDateStr(tick, timezone)}</span>
//                                     <span className="text-[11px] font-black mt-0.5 text-slate-600 dark:text-slate-300">{formatTime(tick, timezone)}</span>
//                                   </div>
//                             ))}
//                           </div>
//                         </div>
                        
//                         <div className="absolute top-14 bottom-0 left-56 right-0 pointer-events-none z-0">
//                           {timelineData.processedSchedule.map((s: any, i: number) => {
//                             const leftPct = ((s.startTs - timelineData.minTs) / timelineData.totalSpan) * 100;
//                             const widthPct = ((s.endTs - s.startTs) / timelineData.totalSpan) * 100;
//                             if (leftPct > 100 || leftPct + widthPct < 0) return null; 
//                             return (
//                               <div key={i} className="absolute top-0 bottom-0 border-x-2 border-dashed border-blue-400 dark:border-blue-600 animated-schedule-bg" style={{ left: `${Math.max(0, leftPct)}%`, width: `${Math.min(100 - leftPct, widthPct)}%` }}>
//                                 <div className="sticky top-2 left-0 right-0 mx-auto w-max bg-white/95 dark:bg-slate-900/95 text-blue-700 dark:text-blue-400 text-[10px] font-black px-2 py-1 rounded shadow-md border border-blue-300 dark:border-blue-700 z-10">Official {s.Session}</div>
//                               </div>
//                             )
//                           })}
//                         </div>

//                         {timelineData.sortedKeys.map((channel: string) => (
//                           <div key={channel} className="flex relative hover:bg-slate-100/50 dark:hover:bg-slate-800/50 h-12 border-b border-slate-100 dark:border-slate-800/50 group z-10">
//                             <div className="w-56 shrink-0 bg-white dark:bg-slate-900 sticky left-0 z-30 border-r border-slate-200 dark:border-slate-700 flex items-center px-3 shadow-[2px_0_5px_rgba(0,0,0,0.02)] transition-colors">
//                               <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate" title={channel}>{channel}</span>
//                             </div>
//                             <div className="flex-1 relative min-w-[800px]">
//                               {timelineData.grouped[channel].map((ev: any, idx: number) => {
//                                 const leftPct = ((ev.startTs - timelineData.minTs) / timelineData.totalSpan) * 100;
//                                 const widthPct = (ev.duration / timelineData.totalSpan) * 100;
//                                 const colors = getTimelineColor(ev);
//                                 return (
//                                   <div key={idx} className={`absolute top-2 bottom-2 rounded shadow-sm border flex items-center justify-center overflow-hidden cursor-pointer hover:brightness-110 hover:shadow-md hover:z-20 transition-all ${colors.bg} ${colors.border}`}
//                                         style={{ left: `${Math.max(0, leftPct)}%`, width: `${Math.min(100 - leftPct, widthPct)}%` }} title={`[${ev.Market}] ${ev.Competition}\n${formatFullDate(ev.startTs, timezone)} - ${formatTime(ev.endTs, timezone)}`}>
//                                       {widthPct > 4 && <span className={`text-[9px] font-bold px-1 truncate drop-shadow-sm ${colors.text}`}>{ev.Competition}</span>}
//                                   </div>
//                                 );
//                               })}
//                             </div>
//                           </div>
//                         ))}
//                     </div>
//                   </div>
//               </div>
//             )}

//             {/* TAB 2: DATA QUALITY BOARD (PYTHON VIZ) */}
//             {timelineResponse && mainTab === "audit" && (
//               <div className="max-w-6xl mx-auto h-full overflow-y-auto custom-scrollbar pr-4 pb-10 flex flex-col gap-6">
                
//                 {!qcResponse && isQcLoading && (
//                   <div className="flex flex-col items-center justify-center p-12 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
//                     <Loader2 size={40} className="animate-spin text-blue-500 mb-4" />
//                     <p className="font-bold">Running `BSRValidator` Python Backend...</p>
//                   </div>
//                 )}

//                 {qcMetrics && (
//                   <>
//                     {/* TOP HEADER & DOWNLOAD */}
//                     <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
//                       <div>
//                         <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2"><Target className="text-indigo-500"/> Pipeline Quality Insights</h2>
//                         <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Direct output mapping from the automated Python rule engine.</p>
//                       </div>
//                       {qcResponse?.download_url && (
//                         <a href={qcResponse.download_url} download className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-md flex items-center gap-2 transition-all">
//                           <Download size={16} /> Download Cleansed BSR
//                         </a>
//                       )}
//                     </div>

//                     {/* KPI CARDS */}
//                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//                       <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm relative overflow-hidden">
//                         <div className={`absolute top-0 right-0 w-1.5 h-full ${qcMetrics.healthScore === 100 ? 'bg-emerald-500' : qcMetrics.healthScore > 70 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
//                         <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">System Health</p>
//                         <span className={`text-4xl font-black ${qcMetrics.healthScore === 100 ? 'text-emerald-600 dark:text-emerald-500' : qcMetrics.healthScore > 70 ? 'text-amber-500' : 'text-rose-600 dark:text-rose-500'}`}>{qcMetrics.healthScore}%</span>
//                       </div>
//                       <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm relative overflow-hidden">
//                         <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Overall Error Rate</p>
//                         <span className="text-4xl font-black text-slate-700 dark:text-slate-200">{qcMetrics.overallErrorRate}%</span>
//                       </div>
//                       <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm relative overflow-hidden">
//                         <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Failed Checks</p>
//                         <span className="text-4xl font-black text-slate-700 dark:text-slate-200">{qcMetrics.failedChecks}</span> <span className="text-xs text-slate-400">/ {qcMetrics.totalChecks}</span>
//                       </div>
//                       <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm relative overflow-hidden">
//                         <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Rows Flagged</p>
//                         <span className="text-4xl font-black text-slate-700 dark:text-slate-200">{qcMetrics.totalErrors}</span>
//                       </div>
//                     </div>

//                     {/* ERROR RATES BY CATEGORY */}
//                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
//                       {/* Channel & Integrity Card */}
//                       <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
//                         <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><BarChart2 className="text-blue-500" size={16}/> Channel & Data Integrity Review</h3>
//                         <div className="space-y-4">
//                           {qcMetrics.checkGroups.integrity.map((chk, idx) => (
//                             <div key={idx} className="relative">
//                               <div className="flex justify-between items-end mb-1">
//                                 <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{chk.name}</span>
//                                 <span className={`text-[10px] font-black ${chk.isFail ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{chk.errorRate.toFixed(1)}% Error</span>
//                               </div>
//                               <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
//                                 <div className={`${chk.isFail ? 'bg-rose-500' : 'bg-emerald-500'} h-2 rounded-full transition-all`} style={{ width: `${Math.max(1, chk.errorRate)}%` }}></div>
//                               </div>
//                               <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">{chk.flagged} out of {chk.evaluated} rows flagged</p>
//                             </div>
//                           ))}
//                         </div>
//                       </div>

//                       {/* Coverage & Cleansing Checks */}
//                       <div className="space-y-6">
//                         <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
//                           <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><BarChart2 className="text-purple-500" size={16}/> Broadcaster Coverage</h3>
//                           <div className="space-y-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
//                             {qcMetrics.checkGroups.coverage.length > 0 ? qcMetrics.checkGroups.coverage.map((chk, idx) => (
//                               <div key={idx} className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
//                                 <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 pr-2">{chk.name}</span>
//                                 <span className={`text-xs font-black ${chk.isFail ? 'text-rose-600' : 'text-emerald-600'}`}>{chk.flagged} rows</span>
//                               </div>
//                             )) : <p className="text-xs text-slate-400 italic">No coverage checks triggered.</p>}
//                           </div>
//                         </div>

//                         <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
//                           <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><Trash2 className="text-amber-500" size={16}/> Data Modifications & Setup</h3>
//                           <div className="space-y-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
//                             {qcMetrics.checkGroups.cleansing.length > 0 ? qcMetrics.checkGroups.cleansing.map((chk, idx) => (
//                               <div key={idx} className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
//                                 <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 pr-2">{chk.name}</span>
//                                 <span className="text-xs font-black text-amber-500">{chk.flagged} processed</span>
//                               </div>
//                             )) : <p className="text-xs text-slate-400 italic">No modifications processed.</p>}
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   </>
//                 )}
//               </div>
//             )}

//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }