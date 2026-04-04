"use client";

import React, { useState, useMemo } from "react";
import { 
  Search, Filter, Clock, AlertCircle, CheckCircle2, User, FolderGit2, Hash,
  Activity, CalendarDays, ChevronRight, ShieldCheck, X, BarChart3, MapPin, FileText,
  TrendingDown, TrendingUp, Users, Sparkles, BrainCircuit, Zap, Layers, Target, Info,
  LineChart as LineChartIcon
} from "lucide-react";
import { useGetQcHistoryQuery } from "@/state/api"; 
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  ScatterChart, Scatter, ZAxis, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Legend
} from "recharts";

// --- HELPER FUNCTIONS ---
const formatCheckName = (key: string) => key.replace(/_OK$/i, "").replace(/_check_result$/i, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const truncateText = (text: string, maxLength: number = 14) => (!text ? "" : text.length > maxLength ? text.substring(0, maxLength) + "..." : text);
const formatLargeNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
};

// --- CUSTOM TOOLTIP COMPONENT ---
const InfoTooltip = ({ text, position = "top", align = "center" }: { text: string, position?: "top" | "bottom", align?: "center" | "left" | "right" }) => {
  const posClasses = position === "top" ? "bottom-full mb-2" : "top-full mt-2";
  const alignClasses = align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";
  const arrowClasses = position === "top" ? "top-full border-t-slate-800 dark:border-t-slate-700" : "bottom-full border-b-slate-800 dark:border-b-slate-700";
  const arrowAlignClasses = align === "left" ? "left-2" : align === "right" ? "right-2" : "left-1/2 -translate-x-1/2";

  return (
    <span className="relative group inline-flex items-center justify-center ml-1.5 cursor-help z-50">
      <Info size={12} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
      <span className={`absolute ${posClasses} ${alignClasses} hidden group-hover:block w-52 p-2 bg-slate-800 dark:bg-slate-700 text-white text-[10px] leading-relaxed rounded-lg shadow-xl font-normal normal-case tracking-normal pointer-events-none z-[100] whitespace-normal`}>
        {text}
        <span className={`absolute ${arrowClasses} ${arrowAlignClasses} border-4 border-transparent`}></span>
      </span>
    </span>
  );
};

const QcHistoryDashboard = () => {
  const { data: historyData = [], isLoading, isError } = useGetQcHistoryQuery();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "clean" | "error">("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // --- DYNAMIC DATA & SMART ANALYTICS ENGINE ---
  const { filteredData, kpis, chartData, smartInsights, globalRuleStats } = useMemo(() => {
    
    // 1. CLONE THE DATA
    const unlockedHistory = historyData.map((row: any) => ({ ...row }));

    let filtered = unlockedHistory.filter((row: any) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (row.project_name || "").toLowerCase().includes(searchLower) ||
        (row.user_name || "").toLowerCase().includes(searchLower) ||
        (row.manual_rosco_id || "").toLowerCase().includes(searchLower) ||
        (row.destination_id || "").toLowerCase().includes(searchLower)
      );
    });

    if (filterStatus === "clean") filtered = filtered.filter((row: any) => row.error_count === 0);
    else if (filterStatus === "error") filtered = filtered.filter((row: any) => row.error_count > 0);

    // --- DEEP METRICS AGGREGATION ---
    const totalRuns = unlockedHistory.length;
    let globalEvals = 0;
    let globalFails = 0;
    let totalDuration = 0;

    const projectErrorRateMap: Record<string, { evals: number, fails: number }> = {};
    const ruleStats: Record<string, { evals: number, fails: number }> = {};
    const userMap: Record<string, number> = {};
    const anomalies: any[] = [];
    const trendMap: Record<string, { date: string, runs: number }> = {};

    unlockedHistory.forEach((row: any) => {
      totalDuration += row.run_duration || 0;
      const user = row.user_name || "System";
      userMap[user] = (userMap[user] || 0) + 1;

      const date = new Date(row.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (!trendMap[date]) trendMap[date] = { date, runs: 0 };
      trendMap[date].runs += 1;

      let fileMaxRows = 0;
      let fileTotalEvals = 0;
      let fileTotalFails = 0;

      if (row.qc_summary) {
        Object.entries(row.qc_summary).forEach(([ruleKey, stats]: [string, any]) => {
          const cleanName = formatCheckName(ruleKey);
          const evals = stats.Total_Evaluated || 0;
          const fails = stats.Failed || 0;

          globalEvals += evals;
          globalFails += fails;
          fileTotalEvals += evals;
          fileTotalFails += fails;
          if (evals > fileMaxRows) fileMaxRows = evals;

          if (row.project_name) {
            if (!projectErrorRateMap[row.project_name]) projectErrorRateMap[row.project_name] = { evals: 0, fails: 0 };
            projectErrorRateMap[row.project_name].evals += evals;
            projectErrorRateMap[row.project_name].fails += fails;
          }

          if (!ruleStats[cleanName]) ruleStats[cleanName] = { evals: 0, fails: 0 };
          ruleStats[cleanName].evals += evals;
          ruleStats[cleanName].fails += fails;
        });
      }

      row._computedErrorRate = fileTotalEvals > 0 ? (fileTotalFails / fileTotalEvals) * 100 : 0;
      row._computedSpeed = fileMaxRows > 0 && row.run_duration > 0 ? fileMaxRows / row.run_duration : 0;
      row._computedLineItems = fileMaxRows; 
    });

    const avgDuration = totalRuns > 0 ? totalDuration / totalRuns : 0;
    const globalErrorRate = globalEvals > 0 ? (globalFails / globalEvals) * 100 : 0;
    const cleanRuns = unlockedHistory.filter((row: any) => row.error_count === 0).length;
    const healthScore = totalRuns > 0 ? Math.round((cleanRuns / totalRuns) * 100) : 100;

    // --- ANOMALY & INSIGHTS GENERATION ---
    const densityBuckets = { "Clean (0%)": 0, "Low (1-10%)": 0, "Medium (11-25%)": 0, "High (>25%)": 0 };

    unlockedHistory.forEach((row: any) => {
      const isSlow = row.run_duration > avgDuration * 2 && row.run_duration > 15;
      const isBuggy = (row._computedErrorRate || 0) > 25; 
      if (isSlow || isBuggy) anomalies.push({ ...row, isSlow, isBuggy });

      const rate = row._computedErrorRate || 0;
      if (rate === 0) densityBuckets["Clean (0%)"]++;
      else if (rate <= 10) densityBuckets["Low (1-10%)"]++;
      else if (rate <= 25) densityBuckets["Medium (11-25%)"]++;
      else densityBuckets["High (>25%)"]++;
    });

    const densityDistData = [
      { name: "Clean (0%)", count: densityBuckets["Clean (0%)"], fill: "#10b981" },
      { name: "Low (1-10%)", count: densityBuckets["Low (1-10%)"], fill: "#3b82f6" },
      { name: "Medium (11-25%)", count: densityBuckets["Medium (11-25%)"], fill: "#f59e0b" },
      { name: "High (>25%)", count: densityBuckets["High (>25%)"], fill: "#f43f5e" },
    ];

    const insights: string[] = [];
    if (globalErrorRate > 15) insights.push(`High Global Failure Rate: ${globalErrorRate.toFixed(1)}% of all evaluated data points are failing.`);
    if (anomalies.filter(a => a.isBuggy).length > 0) insights.push(`Critical: Detected ${anomalies.filter(a => a.isBuggy).length} files with an Error Density exceeding 25%.`);
    if (anomalies.filter(a => a.isSlow).length > 0) insights.push(`Efficiency Drop: ${anomalies.filter(a => a.isSlow).length} runs took over 2x the normal average duration.`);
    if (insights.length === 0 && totalRuns > 0) insights.push(`System Operating Optimally. Verified ${formatLargeNumber(globalEvals)} data points with stable efficiency.`);

    // --- CHART FORMATTING ---
    const trendTimeline = Object.values(trendMap).slice(-14).reverse();

    const projectErrors = Object.keys(projectErrorRateMap)
      .map(name => ({
        fullName: name,
        shortName: truncateText(name, 16),
        errorRate: projectErrorRateMap[name].evals > 0 
          ? Number(((projectErrorRateMap[name].fails / projectErrorRateMap[name].evals) * 100).toFixed(1)) 
          : 0
      }))
      .filter(p => p.errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5);

    const topFailedRules = Object.keys(ruleStats)
      .map(name => ({
        fullName: name,
        shortName: truncateText(name, 16),
        failRate: ruleStats[name].evals > 0 ? Number(((ruleStats[name].fails / ruleStats[name].evals) * 100).toFixed(1)) : 0
      }))
      .filter(r => r.failRate > 0)
      .sort((a, b) => b.failRate - a.failRate)
      .slice(0, 5);

    const topUsers = Object.keys(userMap)
      .map(u => ({ fullName: u, shortName: truncateText(u, 14), runs: userMap[u] }))
      .sort((a, b) => b.runs - a.runs).slice(0, 5);

    const scatterData = unlockedHistory.map((row: any) => ({
      name: row.project_name || "Unknown",
      id: row.manual_rosco_id || row.rosco_id,
      duration: Number((row.run_duration || 0).toFixed(1)),
      errorRate: Number((row._computedErrorRate || 0).toFixed(1)),
      lineItems: row._computedLineItems || 0,
      isAnomaly: (row.run_duration > avgDuration * 2 && row.run_duration > 15) || ((row._computedErrorRate || 0) > 25)
    }));

    return { 
      filteredData: filtered, 
      kpis: { totalRuns, globalEvals, avgDuration: avgDuration.toFixed(1), globalErrorRate: globalErrorRate.toFixed(1) },
      chartData: { trendTimeline, projectErrors, topFailedRules, scatterData, topUsers, densityDistData },
      smartInsights: insights,
      globalRuleStats: ruleStats
    };
  }, [historyData, searchTerm, filterStatus]);

  // --- DYNAMIC DATA FOR SPECIFIC MODAL ---
  const modalAnalytics = useMemo(() => {
    if (!selectedRecord || !selectedRecord.qc_summary) return null;
    let totalPass = 0, totalFail = 0, totalNA = 0;
    const failedRules: any[] = [];

    Object.entries(selectedRecord.qc_summary).forEach(([key, stats]: any) => {
      totalPass += stats.Passed || 0;
      totalFail += stats.Failed || 0;
      totalNA += stats.NA || 0;

      if (stats.Failed > 0) {
        failedRules.push({ fullName: formatCheckName(key), shortName: truncateText(formatCheckName(key), 12), fails: stats.Failed });
      }
    });

    const executionData = [
      { name: "Passed Checks", value: totalPass, color: "#10b981" },
      { name: "Failed Checks", value: totalFail, color: "#f43f5e" },
      { name: "N/A / Skipped", value: totalNA, color: "#475569" }
    ].filter(d => d.value > 0);

    failedRules.sort((a, b) => b.fails - a.fails);

    return { executionData, failedRules, totalEvals: totalPass + totalFail + totalNA };
  }, [selectedRecord]);


  // Custom Tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const displayName = payload[0].payload?.fullName || label || payload[0].name;
      return (
        <div className="bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800 p-3 rounded-lg shadow-2xl z-50 animate-in zoom-in-95 duration-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{displayName}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-black flex items-center gap-1" style={{ color: entry.color || entry.payload?.fill || '#3b82f6' }}>
              {entry.value}{entry.dataKey === 'errorRate' || entry.dataKey === 'failRate' ? '%' : ''} 
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                {entry.name === 'count' ? 'Files' : entry.name}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const ScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800 p-3 rounded-lg shadow-xl z-50 animate-in zoom-in-95 duration-100 min-w-[160px]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"><Hash size={10}/> {data.id}</p>
          <p className="text-sm font-black dark:text-white mb-2 truncate">{data.name}</p>
          <div className="grid grid-cols-2 gap-2 text-xs font-bold bg-slate-50 dark:bg-slate-800/50 p-2 rounded-md">
            <div><span className="block text-[8px] uppercase text-slate-400">Duration</span><span className="text-amber-500">{data.duration}s</span></div>
            <div><span className="block text-[8px] uppercase text-slate-400">Failure Rate</span><span className="text-rose-500">{data.errorRate}%</span></div>
          </div>
          {data.isAnomaly && <div className="mt-2 text-[9px] uppercase tracking-widest font-black text-rose-500 flex items-center gap-1"><AlertCircle size={10}/> System Anomaly</div>}
        </div>
      );
    }
    return null;
  };

  const CorrelationTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800 p-3 rounded-lg shadow-xl z-50 animate-in zoom-in-95 duration-100 min-w-[160px]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"><Hash size={10}/> {data.id}</p>
          <p className="text-sm font-black dark:text-white mb-2 truncate">{data.name}</p>
          <div className="grid grid-cols-2 gap-2 text-xs font-bold bg-slate-50 dark:bg-slate-800/50 p-2 rounded-md">
            <div><span className="block text-[8px] uppercase text-slate-400">Line Items</span><span className="text-blue-500">{data.lineItems}</span></div>
            <div><span className="block text-[8px] uppercase text-slate-400">Failure Rate</span><span className="text-rose-500">{data.errorRate}%</span></div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-[#F9FBFC] dark:bg-[#08090A]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;
  if (isError) return <div className="flex items-center justify-center h-screen bg-[#F9FBFC] dark:bg-[#08090A] text-red-500 font-medium">Failed to load QC History.</div>;

  return (
    <div className="min-h-screen bg-[#F9FBFC] dark:bg-[#08090A] p-4 lg:p-8 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative flex flex-col gap-6 overflow-x-hidden">
      
      {/* --- DETAILED ANALYSIS MODAL --- */}
      {selectedRecord && modalAnalytics && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedRecord(null)}></div>
          <div className="relative w-full max-w-4xl h-full max-h-[90vh] bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-500">
            <div className="flex justify-between items-start p-6 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-white/[0.02] shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2 mb-1"><BarChart3 className="text-blue-500" /> Advanced Run Analytics</h2>
                <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1"><FolderGit2 size={14}/> {selectedRecord.project_name || "Unknown"}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span className="flex items-center gap-1"><Hash size={14}/> {selectedRecord.manual_rosco_id || selectedRecord.rosco_id || "N/A"}</span>
                </div>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-all hover:rotate-90 hover:scale-110 duration-300"><X size={18} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-14 custom-scrollbar bg-slate-50/30 dark:bg-[#08090A]/50">
              
              {/* --- MODAL KPIs --- */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-white dark:bg-[#111623] rounded-xl border border-slate-200 dark:border-slate-800/60 shadow-sm hover:-translate-y-1 transition-transform duration-300 animate-in slide-in-from-bottom-2 fill-mode-both" style={{ animationDelay: '100ms' }}>
                  <span className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center">
                    Processing Speed <InfoTooltip align="left" text="Formula: (Highest Evaluated Row Count in File) ÷ Run Duration (sec). Shows the engine's throughput speed." />
                  </span>
                  <span className="text-sm font-bold dark:text-slate-200 flex items-center gap-1"><Zap size={14} className="text-amber-500"/> {selectedRecord._computedSpeed.toFixed(0)} rows/sec</span>
                </div>
                <div className="p-4 bg-white dark:bg-[#111623] rounded-xl border border-slate-200 dark:border-slate-800/60 shadow-sm hover:-translate-y-1 transition-transform duration-300 animate-in slide-in-from-bottom-2 fill-mode-both" style={{ animationDelay: '150ms' }}>
                  <span className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center">
                    Time Taken <InfoTooltip align="left" text="Total execution time for the audit script." />
                  </span>
                  <span className="text-sm font-bold dark:text-slate-200 flex items-center gap-1"><Clock size={14} className="text-blue-500"/> {selectedRecord.run_duration}s</span>
                </div>
                <div className="p-4 bg-white dark:bg-[#111623] rounded-xl border border-slate-200 dark:border-slate-800/60 shadow-sm hover:-translate-y-1 transition-transform duration-300 animate-in slide-in-from-bottom-2 fill-mode-both" style={{ animationDelay: '200ms' }}>
                  <span className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center">
                    Absolute Errors <InfoTooltip align="left" text="Raw count of individual errors detected. Not normalized by file size." />
                  </span>
                  <span className={`text-sm font-bold flex items-center gap-1 ${selectedRecord.error_count > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                    {selectedRecord.error_count > 0 ? <AlertCircle size={14}/> : <CheckCircle2 size={14}/>} {selectedRecord.error_count}
                  </span>
                </div>
                <div className="p-4 bg-white dark:bg-[#111623] rounded-xl border border-slate-200 dark:border-slate-800/60 shadow-sm hover:-translate-y-1 transition-transform duration-300 animate-in slide-in-from-bottom-2 fill-mode-both" style={{ animationDelay: '250ms' }}>
                  <span className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center">
                    Error Density <InfoTooltip align="right" text="Formula: (Total Fails in File ÷ Total Evaluated Data Points) × 100. Measures the actual quality ratio of the file regardless of size." />
                  </span>
                  <span className={`text-sm font-bold flex items-center gap-1 ${selectedRecord._computedErrorRate > 10 ? "text-rose-500" : "text-emerald-500"}`}>
                    <Target size={14}/> {selectedRecord._computedErrorRate.toFixed(1)}% Failure
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 h-56">
                <div className="bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800/60 rounded-xl p-4 shadow-sm flex items-center group animate-in zoom-in-95 duration-500 fill-mode-both" style={{ animationDelay: '300ms' }}>
                  <div className="flex-1 h-full relative transition-transform duration-500 group-hover:scale-105">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ right: 20 }}>
                        <Pie data={modalAnalytics.executionData} innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value" stroke="none">
                          {modalAnalytics.executionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend 
                          verticalAlign="middle" 
                          align="right" 
                          layout="vertical" 
                          content={(props: any) => {
                            const { payload } = props;
                            return (
                              <ul className="flex flex-col gap-2 text-[10px]">
                                {payload.map((entry: any, index: number) => (
                                  <li key={`item-${index}`} className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                      <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{entry.value}</span>
                                    </div>
                                    <span className="font-black text-slate-800 dark:text-slate-200">{entry.payload.value.toLocaleString()}</span>
                                  </li>
                                ))}
                                <li className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-4">
                                  <span className="text-slate-400 font-black uppercase tracking-widest">Total Volume</span>
                                  <span className="font-black text-blue-500">{modalAnalytics.totalEvals.toLocaleString()}</span>
                                </li>
                              </ul>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <h3 className="absolute top-0 left-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Total Check Volumes</h3>
                  </div>
                </div>
                <div className="bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800/60 rounded-xl p-4 shadow-sm relative overflow-hidden animate-in zoom-in-95 duration-500 fill-mode-both" style={{ animationDelay: '400ms' }}>
                  <h3 className="absolute top-4 left-4 text-[10px] font-black uppercase tracking-widest text-slate-400 z-10 flex items-center">
                    Failure Distribution <InfoTooltip align="left" text="Breaks down which specific rules contributed to the total Absolute Errors." />
                  </h3>
                  {modalAnalytics.failedRules.length > 0 ? (
                    <div className="w-full h-full pt-6 transition-transform duration-500 hover:scale-[1.02]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={modalAnalytics.failedRules} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="shortName" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} width={85} />
                          <RechartsTooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                          <Bar dataKey="fails" name="Errors" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={12} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center text-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-lg border border-emerald-100 dark:border-emerald-500/10 animate-pulse mt-4">
                      <Sparkles size={24} className="mb-2" />
                      <p className="text-sm font-black uppercase tracking-widest">Perfect Clean Run</p>
                    </div>
                  )}
                </div>
              </div>

              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-200 dark:border-slate-800/60 pb-2 animate-in fade-in duration-500 fill-mode-both flex items-center" style={{ animationDelay: '500ms' }}>
                Global Benchmarking by Rule <InfoTooltip align="left" text="Compares this file's individual rule failure rates against the historical global average for those exact rules." />
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedRecord.qc_summary && Object.keys(selectedRecord.qc_summary).length > 0 ? (
                  Object.entries(selectedRecord.qc_summary).map(([key, stats]: [string, any], idx) => {
                    const cleanName = formatCheckName(key);
                    const total = stats.Total_Evaluated || 0;
                    const passed = stats.Passed || 0;
                    const failed = stats.Failed || 0;
                    const na = stats.NA || 0;
                    const percent = total > 0 ? Math.round((passed / total) * 100) : 0;
                    
                    const globalStat = globalRuleStats[cleanName];
                    const localFailRate = total > 0 ? (failed / total) * 100 : 0;
                    const globalFailRate = globalStat && globalStat.evals > 0 ? (globalStat.fails / globalStat.evals) * 100 : 0;
                    const diffPercent = Math.round(localFailRate - globalFailRate);
                    
                    let trendBadge = null;
                    if (total > 0 && globalStat && globalStat.evals > 0) {
                      if (diffPercent > 2) trendBadge = <span className="flex items-center gap-0.5 text-[9px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 px-1.5 py-0.5 rounded" title={`Failing ${diffPercent}% more than global average`}><TrendingUp size={10}/> {diffPercent}% vs avg</span>;
                      else if (diffPercent < -2) trendBadge = <span className="flex items-center gap-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 px-1.5 py-0.5 rounded" title={`Failing ${Math.abs(diffPercent)}% less than global average`}><TrendingDown size={10}/> {Math.abs(diffPercent)}% vs avg</span>;
                      else trendBadge = <span className="flex items-center gap-0.5 text-[9px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded">Avg</span>;
                    }

                    const ruleChartData = [
                      { name: 'Passed', value: passed, color: '#10b981' },
                      { name: 'Failed', value: failed, color: '#f43f5e' },
                      { name: 'N/A', value: na, color: '#64748b' } 
                    ].filter(d => d.value > 0);

                    return (
                      <div key={key} className="group p-4 bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800/60 rounded-xl shadow-sm flex items-center gap-4 hover:border-blue-500/50 hover:shadow-md transition-all duration-300 animate-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${500 + (idx * 50)}ms` }}>
                        <div className="h-16 w-16 shrink-0 relative transition-transform duration-500 group-hover:scale-110">
                          {total > 0 ? (
                            <>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={ruleChartData} innerRadius={18} outerRadius={28} paddingAngle={2} dataKey="value" stroke="none">
                                    {ruleChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                                  </Pie>
                                  <RechartsTooltip content={<CustomTooltip />} />
                                </PieChart>
                              </ResponsiveContainer>
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className={`text-[9px] font-black ${failed > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{percent}%</span>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full rounded-full border-[3px] border-slate-100 dark:border-slate-800 flex items-center justify-center"><span className="text-[9px] font-bold text-slate-400">N/A</span></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-sm text-slate-700 dark:text-slate-200 block truncate group-hover:text-blue-500 transition-colors" title={cleanName}>{cleanName}</span>
                            {trendBadge}
                          </div>
                          <div className="flex gap-2 text-[10px] font-black uppercase flex-wrap mt-1.5">
                            {failed > 0 && <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 rounded-md border border-rose-200 dark:border-rose-500/20">{failed} Fails</span>}
                            {passed > 0 && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-500/20">{passed} Pass</span>}
                            {na > 0 && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700">{na} N/A</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : <div className="text-sm text-slate-500">No data available.</div>}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-white/[0.02] text-xs text-slate-400 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1"><FileText size={14}/> {selectedRecord.original_filename}</span>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="mt-2 animate-in fade-in slide-in-from-left-4 duration-500 fill-mode-both" style={{ animationDelay: '100ms' }}>
        <h1 className="text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-3">
          <ShieldCheck className="text-blue-500" size={32} /> General QC Dashboard
        </h1>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Audits", value: kpis.totalRuns, icon: <Activity />, color: "text-blue-500" },
          { title: "Data Points Verified", value: formatLargeNumber(kpis.globalEvals), icon: <Layers />, color: "text-indigo-500", tooltip: "Sum of all individual cell/row checks evaluated across the entire database history." },
          { title: "Global Error Rate", value: `${kpis.globalErrorRate}%`, icon: <Target />, color: Number(kpis.globalErrorRate) > 10 ? "text-rose-500" : "text-emerald-500", tooltip: "Formula: (Global Fails ÷ Global Data Points Verified) × 100." },
          { title: "Avg Process Time", value: `${kpis.avgDuration}s`, icon: <Clock />, color: "text-amber-500", tooltip: "Average duration of the Python QC script execution." },
        ].map((kpi, idx) => (
          <div key={idx} className="group bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800/60 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:-translate-y-1 hover:shadow-md hover:border-blue-500/50 transition-all duration-300 animate-in slide-in-from-bottom-6 fade-in fill-mode-both" style={{ animationDelay: `${(idx * 100) + 200}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors flex items-center">
                {kpi.title} 
                {kpi.tooltip && <InfoTooltip text={kpi.tooltip} align={idx === 3 ? "right" : "left"} />}
              </span>
              <div className={`${kpi.color} bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>{React.cloneElement(kpi.icon, { size: 16 })}</div>
            </div>
            <div className="text-2xl font-black dark:text-white transition-transform group-hover:translate-x-1">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* --- ROW 1 CHARTS: Trends & ANOMALY DETECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-72">
        <div className="lg:col-span-2 bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800/60 rounded-xl p-5 shadow-sm flex flex-col group animate-in zoom-in-95 fade-in duration-700 fill-mode-both" style={{ animationDelay: '400ms' }}>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><Activity size={12} className="text-blue-500"/> Daily Audit Volume</h3>
          <div className="flex-1 w-full min-h-0 transition-transform duration-700 group-hover:scale-[1.005]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.trendTimeline} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRuns" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                <RechartsTooltip cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                <Area type="monotone" dataKey="runs" name="Total Audits" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRuns)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800/60 rounded-xl p-5 shadow-sm flex flex-col group relative overflow-hidden animate-in zoom-in-95 fade-in duration-700 fill-mode-both" style={{ animationDelay: '500ms' }}>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <Target size={12}/> Anomaly Detection 
          </h3>
          <div className="flex-1 w-full min-h-0 transition-transform duration-500 group-hover:scale-[1.02]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis type="number" dataKey="duration" name="Duration" unit="s" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis type="number" dataKey="errorRate" name="Error Rate" unit="%" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                <ZAxis type="number" range={[40, 100]} />
                <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={<ScatterTooltip />} />
                <Scatter name="Audits" data={chartData.scatterData}>
                  {chartData.scatterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isAnomaly ? '#f43f5e' : '#3b82f6'} opacity={entry.isAnomaly ? 0.9 : 0.6} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- NEW ROW: SCALE CORRELATION & DISTRIBUTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-72">
        <div className="bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800/60 rounded-xl p-5 shadow-sm flex flex-col group relative overflow-hidden animate-in zoom-in-95 fade-in duration-700 fill-mode-both" style={{ animationDelay: '550ms' }}>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <LineChartIcon size={12}/> Scale vs. Stability (Correlation) <InfoTooltip align="left" text="Plots File Size (Line Items) against its Error Rate. Do larger files break more often?" />
          </h3>
          <div className="flex-1 w-full min-h-0 transition-transform duration-500 group-hover:scale-[1.01]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis type="number" dataKey="lineItems" name="Line Items" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis type="number" dataKey="errorRate" name="Error Rate" unit="%" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                <ZAxis type="number" range={[40, 80]} />
                <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={<CorrelationTooltip />} />
                <Scatter name="Files" data={chartData.scatterData}>
                  {chartData.scatterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#8b5cf6" opacity={0.7} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800/60 rounded-xl p-5 shadow-sm flex flex-col min-h-0 group animate-in slide-in-from-bottom-8 fade-in duration-700 fill-mode-both" style={{ animationDelay: '550ms' }}>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <BarChart3 size={12}/> Quality Distribution Matrix <InfoTooltip align="right" text="Groups all files into health buckets based on their error density." />
          </h3>
          <div className="flex-1 w-full text-xs transition-transform duration-500 group-hover:scale-[1.02]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.densityDistData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                <Bar dataKey="count" name="Files" radius={[4, 4, 0, 0]} barSize={40}>
                  {chartData.densityDistData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="count" position="top" style={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- ROW 3 CHARTS: Projects, Rules, and Users --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-72">
        <div className="bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800/60 rounded-xl p-5 shadow-sm flex flex-col min-h-0 group animate-in slide-in-from-bottom-8 fade-in duration-700 fill-mode-both" style={{ animationDelay: '600ms' }}>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <FolderGit2 size={12}/> Highest Error Density Projects <InfoTooltip align="left" text="Formula: (Project's Total Fails ÷ Project's Total Evals) × 100." />
          </h3>
          <div className="flex-1 w-full text-xs transition-transform duration-500 group-hover:scale-[1.02]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.projectErrors} layout="vertical" margin={{ top: 0, right: 35, left: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="shortName" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} width={110} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                <Bar dataKey="errorRate" name="Failure Rate" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={12}>
                  <LabelList dataKey="errorRate" position="right" formatter={(val: number) => `${val}%`} style={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800/60 rounded-xl p-5 shadow-sm flex flex-col min-h-0 group animate-in slide-in-from-bottom-8 fade-in duration-700 fill-mode-both" style={{ animationDelay: '700ms' }}>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <TrendingDown size={12}/> Most Failed QC Rules <InfoTooltip align="center" text="Formula: (Global Fails for Rule ÷ Global Evals for Rule) × 100." />
          </h3>
          <div className="flex-1 w-full text-xs transition-transform duration-500 group-hover:scale-[1.02]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.topFailedRules} layout="vertical" margin={{ top: 0, right: 35, left: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="shortName" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} width={110} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                <Bar dataKey="failRate" name="Failure Rate" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12}>
                  <LabelList dataKey="failRate" position="right" formatter={(val: number) => `${val}%`} style={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800/60 rounded-xl p-5 shadow-sm flex flex-col min-h-0 group animate-in slide-in-from-bottom-8 fade-in duration-700 fill-mode-both" style={{ animationDelay: '800ms' }}>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><Users size={12}/> Top Active Users</h3>
          <div className="flex-1 w-full text-xs transition-transform duration-500 group-hover:scale-[1.02]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.topUsers} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="shortName" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} width={110} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                <Bar dataKey="runs" name="Audits Run" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800/60 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px] animate-in slide-in-from-bottom-10 fade-in duration-700 fill-mode-both" style={{ animationDelay: '900ms' }}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">Audit Log Database</h3>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-slate-700 text-xs rounded-lg pl-9 pr-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all dark:text-white" />
            </div>
            
            <div className="relative">
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold hover:border-blue-500 hover:text-blue-500 active:scale-95 transition-all text-slate-600 dark:text-slate-300 w-32">
                <Filter size={14} /> {filterStatus === 'all' && "All"} {filterStatus === 'clean' && "Clean"} {filterStatus === 'error' && "Errors"}
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden text-xs animate-in slide-in-from-top-2 fade-in duration-200">
                  <button onClick={() => { setFilterStatus("all"); setIsFilterOpen(false); }} className={`w-full text-left px-4 py-2 font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 ${filterStatus === 'all' ? 'text-blue-500' : 'text-slate-600 dark:text-slate-300'}`}>All Audits</button>
                  <button onClick={() => { setFilterStatus("clean"); setIsFilterOpen(false); }} className={`w-full text-left px-4 py-2 font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800/60 ${filterStatus === 'clean' ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>Clean Audits Only</button>
                  <button onClick={() => { setFilterStatus("error"); setIsFilterOpen(false); }} className={`w-full text-left px-4 py-2 font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800/60 ${filterStatus === 'error' ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>Audits with Errors</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-[#0B0F1A]/50 border-b border-slate-200 dark:border-slate-800/60 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3 font-black">Rosco ID</th>
                <th className="px-5 py-3 font-black">Delivery ID</th>
                <th className="px-5 py-3 font-black">Project Name</th>
                <th className="px-5 py-3 font-black">Triggered By</th>
                <th className="px-5 py-3 font-black">Run Date</th>
                <th className="px-5 py-3 font-black">Duration</th>
                <th className="px-5 py-3 font-black flex items-center">
                  Status / Density <InfoTooltip position="bottom" align="right" text="File Error Density = (Fails ÷ Evals) × 100. Over 25% displays as a Red Warning." />
                </th>
                <th className="px-5 py-3 font-black text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredData.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400 text-xs font-medium">No records found matching your filters.</td></tr>
              ) : (
                filteredData.map((row: any, idx: number) => (
                  <tr key={row.id} onClick={() => setSelectedRecord(row)} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer animate-in fade-in slide-in-from-bottom-2 fill-mode-both" style={{ animationDelay: `${Math.min(idx * 30, 500)}ms` }}>
                    <td className="px-5 py-3"><div className="flex items-center gap-2 text-xs font-bold dark:text-white"><Hash size={12} className="text-slate-400 group-hover:text-blue-500 transition-colors" /> {row.manual_rosco_id || row.rosco_id || "N/A"}</div></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                        <MapPin size={12} className="text-purple-500 group-hover:scale-110 transition-transform" />
                        {row.destination_id || "N/A"}
                      </div>
                    </td>
                    <td className="px-5 py-3"><div className="flex items-center gap-2 text-xs font-medium dark:text-slate-200"><FolderGit2 size={12} className="text-blue-500 group-hover:scale-110 transition-transform" /> {row.project_name || "Unknown"}</div></td>
                    <td className="px-5 py-3"><div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400"><User size={12} className="group-hover:text-emerald-500 transition-colors"/> {row.user_name || "System"}</div></td>
                    <td className="px-5 py-3"><div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400"><CalendarDays size={12} className="group-hover:text-purple-500 transition-colors"/> {new Date(row.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</div></td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-mono px-2 py-1 rounded-md border ${row.run_duration > Number(kpis.avgDuration) * 2 ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
                        {row.run_duration}s
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {row.error_count === 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 group-hover:shadow-sm transition-shadow"><CheckCircle2 size={10} /> Clean</span>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border group-hover:shadow-sm transition-shadow ${row._computedErrorRate > 25 ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'}`}>
                          <Target size={10} /> {row._computedErrorRate.toFixed(1)}% Fail
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right"><button className="p-1.5 text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 rounded-md transition-all group-hover:translate-x-1 inline-flex"><ChevronRight size={16} /></button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QcHistoryDashboard;