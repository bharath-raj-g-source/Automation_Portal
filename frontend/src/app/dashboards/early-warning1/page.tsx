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