// "use client";

// import { useAppSelector } from "@/app/redux";
// import Header from "@/components/Header";
// import ModalNewTask from "@/components/ModalNewTask";
// import TaskCard from "@/components/TaskCard";
// import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils";
// import {
//   Priority,
//   Task,
//   useGetAuthUserQuery,
//   useGetTasksByUserQuery,
// } from "@/state/api";
// import { DataGrid, GridColDef } from "@mui/x-data-grid";
// import React, { useState } from "react";

// type Props = {
//   priority: Priority;
// };

// const columns: GridColDef[] = [
//   {
//     field: "title",
//     headerName: "Title",
//     width: 100,
//   },
//   {
//     field: "description",
//     headerName: "Description",
//     width: 200,
//   },
//   {
//     field: "status",
//     headerName: "Status",
//     width: 130,
//     renderCell: (params) => (
//       <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
//         {params.value}
//       </span>
//     ),
//   },
//   {
//     field: "priority",
//     headerName: "Priority",
//     width: 75,
//   },
//   {
//     field: "tags",
//     headerName: "Tags",
//     width: 130,
//   },
//   {
//     field: "startDate",
//     headerName: "Start Date",
//     width: 130,
//   },
//   {
//     field: "dueDate",
//     headerName: "Due Date",
//     width: 130,
//   },
//   {
//     field: "author",
//     headerName: "Author",
//     width: 150,
//     renderCell: (params) => params.value.username || "Unknown",
//   },
//   {
//     field: "assignee",
//     headerName: "Assignee",
//     width: 150,
//     renderCell: (params) => params.value.username || "Unassigned",
//   },
// ];

// const ReusablePriorityPage = ({ priority }: Props) => {
//   const [view, setView] = useState("list");
//   const [isModalNewTaskOpen, setIsModalNewTaskOpen] = useState(false);

//   // const { data: currentUser } = useGetAuthUserQuery({});
//   const { data: currentUser } = useGetAuthUserQuery();
//   const userId = currentUser?.userDetails?.userId ?? null;
//   const {
//     data: tasks,
//     isLoading,
//     isError: isTasksError,
//   } = useGetTasksByUserQuery(userId || 0, {
//     skip: userId === null,
//   });

//   const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

//   const filteredTasks = tasks?.filter(
//     (task: Task) => task.priority === priority,
//   );

//   if (isTasksError || !tasks) return <div>Error fetching tasks</div>;

//   return (
//     <div className="m-5 p-4">
//       <ModalNewTask
//         isOpen={isModalNewTaskOpen}
//         onClose={() => setIsModalNewTaskOpen(false)}
//       />
//       <Header
//         name="Priority Page"
//         buttonComponent={
//           <button
//             className="mr-3 rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
//             onClick={() => setIsModalNewTaskOpen(true)}
//           >
//             Add Task
//           </button>
//         }
//       />
//       <div className="mb-4 flex justify-start">
//         <button
//           className={`px-4 py-2 ${
//             view === "list" ? "bg-gray-300" : "bg-white"
//           } rounded-l`}
//           onClick={() => setView("list")}
//         >
//           List
//         </button>
//         <button
//           className={`px-4 py-2 ${
//             view === "table" ? "bg-gray-300" : "bg-white"
//           } rounded-l`}
//           onClick={() => setView("table")}
//         >
//           Table
//         </button>
//       </div>
//       {isLoading ? (
//         <div>Loading tasks...</div>
//       ) : view === "list" ? (
//         <div className="grid grid-cols-1 gap-4">
//           {filteredTasks?.map((task: Task) => (
//             <TaskCard key={task.id} task={task} />
//           ))}
//         </div>
//       ) : (
//         view === "table" &&
//         filteredTasks && (
//           <div className="z-0 w-full">
//             <DataGrid
//               rows={filteredTasks}
//               columns={columns}
//               checkboxSelection
//               getRowId={(row) => row.id}
//               className={dataGridClassNames}
//               sx={dataGridSxStyles(isDarkMode)}
//             />
//           </div>
//         )
//       )}
//     </div>
//   );
// };

// export default ReusablePriorityPage;







































// "use client";

// import { useAppSelector } from "@/app/redux";
// import { useRunQcChecks1Mutation } from "@/state/api";
// import { 
//   AlertTriangle, 
//   CheckCircle, 
//   Download, 
//   Loader, 
//   ShieldCheck,
//   Zap,
//   Settings2,
//   MonitorCog,
//   Database,
//   Layers,
//   FileText,
//   UploadCloud,
//   Users2,
//   CopyCheck,
//   SearchCheck
// } from "lucide-react";
// import React, { useState, useEffect } from "react";
// import ConfigModal, { QcConfig } from "../../projects/ConfigModal"; 

// // ----------------------------------------------------------------------
// // 1. TYPES & METADATA
// // ----------------------------------------------------------------------

// export enum Priority {
//   Urgent = "Urgent",
//   High = "High",
//   Medium = "Medium",
//   Low = "Low",
//   Backlog = "Backlog",
// }

// type Props = {
//   priority?: Priority | string; 
// };

// const QC_CHECKS_METADATA = [
//   { id: "1", title: "Period Check", icon: <Database size={14}/>, num: "01", desc: "Validates broadcast dates against monitoring start/end dates in Rosco." },
//   { id: "2", title: "Completeness", icon: <Layers size={14}/>, num: "02", desc: "Ensures fields like Channel, ID, Teams, and Audience are non-empty." },
//   { id: "3", title: "Overlap/Duplicate/Daybreak", icon: <Zap size={14}/>, num: "03", desc: "Detects overlaps, in-market duplicates, and midnight transitions." },
//   { id: "4", title: "Category Logic", icon: <Settings2 size={14}/>, num: "04", desc: "Classifies Live/Repeat/Highlights via fixture windows and duration." },
//   { id: "5", title: "Event Matchday", icon: <MonitorCog size={14}/>, num: "05", desc: "Syncs Competition/Matchday/Event data against master references." },
//   { id: "6", title: "Market-Channel", icon: <ShieldCheck size={14}/>, num: "06", desc: "Verifies Market + Channel pairs belong to the expected Rosco market." },
//   { id: "7", title: "Rates & Ratings", icon: <FileText size={14}/>, num: "07", desc: "Ensures exactly one audience source (Estimate/Metered) per row." },
//   { id: "8", title: "Channel ID Sync", icon: <Database size={14}/>, num: "08", desc: "Ensures unique Channel IDs across all Market + TV-Channel pairs." },
//   { id: "9", title: "Home vs Away Consistency", icon: <Users2 size={14}/>, num: "09", desc: "Ensures both the Home and Away team names are present within the Phase/Fixture description to prevent data mismatches." },
//   { id: "10", title: "Multiple Live Match Consistency", icon: <CopyCheck size={14}/>, num: "10", desc: "Flags duplicate entries by flagging rows where the same Live match is recorded multiple times." },
//   { id: "11", title: "Metered Channel Estimation", icon: <SearchCheck size={14}/>, num: "11", desc: "Flags channels that are on the Metered Master List but are being reported as 'Estimated' instead of 'Metered' in the BSR." },
// ];

// const DEFAULT_CHECKS = [
//   "period_check", "completeness_check", "overlap_duplicate_daybreak_check",
//   "program_category_check", "duration_check", "rates_and_ratings_check",
//   "duplicated_markets_check", "country_channel_id_check", "client_lstv_ott_check",
//   "check_event_matchday_competition", "metered_channel_estimation_check"
// ];

// // ----------------------------------------------------------------------
// // 2. MAIN COMPONENT
// // ----------------------------------------------------------------------

// const ReusablePriorityPage = ({ priority = Priority.High }: Props) => {
//   const [runQc] = useRunQcChecks1Mutation();

//   const [selectedBSRFile, setSelectedBSRFile] = useState<File | null>(null);
//   const [selectedRoscoFile, setSelectedRoscoFile] = useState<File | null>(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [qcConfig, setQcConfig] = useState<QcConfig>({ live_tolerance_min: 60 });
//   const [loading, setLoading] = useState(false);
//   const [status, setStatus] = useState<'idle' | 'complete' | 'error'>('idle');
//   const [error, setError] = useState<string | null>(null);
//   const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

//   const isReady = !!(selectedBSRFile && selectedRoscoFile);

//   useEffect(() => {
//     return () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); };
//   }, [downloadUrl]);

//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'bsr' | 'rosco') => {
//     const file = event.target.files?.[0] || null;
//     if (type === 'bsr') setSelectedBSRFile(file);
//     else setSelectedRoscoFile(file);
//     setStatus('idle');
//   };

//   const handleRunChecks = async () => {
//     if (!isReady || loading) return;
//     setLoading(true); setStatus('idle'); setError(null);
    
//     const formData = new FormData();
//     formData.append('rosco_file', selectedRoscoFile as File);
//     formData.append('bsr_file', selectedBSRFile as File);
//     formData.append('selected_checks', JSON.stringify(DEFAULT_CHECKS));
//     formData.append('config_overrides', JSON.stringify(qcConfig));

//     try {
//       const response = await (runQc as any)(formData).unwrap();
//       const blob = response instanceof Blob ? response : new Blob([response as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); 
//       setDownloadUrl(URL.createObjectURL(blob));
//       setStatus('complete');
//     } catch (err: any) {
//       setError(err?.data?.detail || 'Audit processing failed.');
//       setStatus('error');
//     } finally { setLoading(false); }
//   };

//   const handleDownload = () => {
//     if (!downloadUrl) return;
//     const link = document.createElement('a');
//     link.href = downloadUrl;
//     link.download = `QC_Audit_${priority}_${Date.now()}.xlsx`;
//     document.body.appendChild(link);
//     link.click();
//     link.remove();
//   };

//   return (
//     <div className="flex flex-col w-full h-screen bg-[#F9FBFC] dark:bg-[#08090A] overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300">
//       <ConfigModal 
//         isOpen={isModalOpen}
//         onClose={() => setIsModalOpen(false)}
//         currentConfig={qcConfig}
//         onSave={setQcConfig}
//       />

//       {/* HEADER */}
//       <header className="w-full px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F1A] flex flex-col sm:flex-row sm:items-center justify-between shrink-0 z-10 gap-4">
//         <div>
//           <div className="flex items-center gap-3">
//             <div className="p-1.5 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20 shrink-0">
//               <ShieldCheck className="h-5 w-5 text-white" />
//             </div>
//             <div>
//               <h1 className="text-lg font-bold tracking-tight leading-none dark:text-white">
//                 General QC <span className="text-blue-500 text-sm ml-1 uppercase"></span>
//               </h1>
//               <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">This is applicable to all BSR projects</p>
//             </div>
//           </div>
          
//           <div className="flex items-center gap-2 mt-3 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-md border border-amber-200 dark:border-amber-500/20 w-fit">
//             <AlertTriangle size={14} />
//             Make sure to update the monitoring period in question on ROSCO.
//           </div>
//         </div>

//         <div className="flex items-center gap-4">
//           <button 
//             onClick={() => setIsModalOpen(true)}
//             className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[11px] font-bold transition-all border border-transparent dark:border-slate-700 shadow-sm"
//           >
//             <MonitorCog size={14} className="text-blue-500" /> <span className="dark:text-slate-200">System Config</span>
//           </button>
//         </div>
//       </header>

//       {/* MAIN CONTAINER */}
//       <main className="flex-1 flex flex-col p-4 gap-5 overflow-hidden relative">
//         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none hidden dark:block" />
        
//         {/* UPLOAD UI */}
//         <div className="grid grid-cols-2 gap-6 shrink-0">
//           {[
//             { id: 'bsr', label: 'BSR Dataset', file: selectedBSRFile, color: 'text-blue-500' },
//             { id: 'rosco', label: 'Rosco Reference', file: selectedRoscoFile, color: 'text-purple-500' }
//           ].map((item) => (
//             <label 
//               key={item.id}
//               className={`group flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden
//                 ${item.file 
//                   ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/5 border-solid' 
//                   : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:border-blue-400 dark:hover:border-blue-500'}`}
//             >
//               <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, item.id as 'bsr' | 'rosco')} />
              
//               {/* RESTORED ANIMATION: Added group-hover:-translate-y-1 */}
//               <div className={`flex flex-col items-center z-10 transition-transform duration-300 ${!item.file ? 'group-hover:-translate-y-1' : ''}`}>
//                 {item.file ? (
//                   <>
//                     <CheckCircle size={20} className="text-emerald-500 mb-1" />
//                     <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">{item.file.name}</p>
//                   </>
//                 ) : (
//                   <>
//                     <UploadCloud size={20} className={`${item.color} mb-1`} />
//                     <p className="text-[10px] font-bold">Upload {item.label}</p>
//                   </>
//                 )}
//               </div>
//             </label>
//           ))}
//         </div>

//         {/* MIDDLE SECTION: CHECKS GRID & ACTION CONSOLE */}
//         <div className="flex-1 grid grid-cols-4 gap-6 min-h-0 overflow-hidden">
          
//           {/* VALIDATION FRAMEWORK (3/4 Width) */}
//           <div className="col-span-3 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
//             {QC_CHECKS_METADATA.map((check) => (
//               <div 
//                 key={check.id} 
//                 className="group p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-xl flex flex-col hover:border-blue-500/50 transition-all shadow-sm hover:shadow-md relative overflow-hidden h-fit min-h-[120px]"
//               >
//                 {/* BACKGROUND WATERMARK ICON */}
//                 <div className="absolute top-0 right-0 p-1 opacity-[0.03] dark:opacity-[0.07] group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity pointer-events-none">
//                   {React.cloneElement(check.icon as React.ReactElement, { size: 48 })}
//                 </div>

//                 {/* TEXT CONTENT */}
//                 <div className="flex items-center justify-between mb-2 relative z-10">
//                   <span className="text-[10px] font-black text-slate-300 dark:text-slate-600">{check.num}</span>
//                   <div className="text-blue-500 dark:text-blue-400">
//                     {check.icon}
//                   </div>
//                 </div>
//                 <h4 className="text-[10px] font-black uppercase tracking-tight dark:text-slate-200 mb-1.5 relative z-10">{check.title}</h4>
//                 <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal relative z-10">
//                   {check.desc}
//                 </p>
//               </div>
//             ))}
//           </div>

//           {/* ACTION CONSOLE (1/4 Width) */}
//           <div className="col-span-1 flex flex-col gap-4 min-h-0">
//             <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center shadow-sm relative overflow-hidden">
//               {status === 'complete' && downloadUrl ? (
//                 <div className="animate-in slide-in-from-bottom-2 duration-500 space-y-4 w-full text-center">
//                   <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
//                     <Download size={24} />
//                   </div>
//                   <div>
//                     <h3 className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Audit Ready</h3>
//                   </div>
//                   <button
//                     onClick={handleDownload}
//                     className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
//                   >
//                     Download XLSX
//                   </button>
//                 </div>
//               ) : (
//                 <div className="space-y-5 w-full text-center">
//                   <div className="text-[9px] font-black uppercase text-slate-400 tracking-[0.3em]">QC Engine</div>
//                   <button
//                     onClick={handleRunChecks}
//                     disabled={!isReady || loading}
//                     className="w-full py-4 bg-slate-900 dark:bg-blue-600 hover:opacity-90 text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-30 shadow-xl transition-all"
//                   >
//                     {loading ? <Loader className="animate-spin mx-auto" size={16} /> : "Run Checks"}
//                   </button>
//                   <p className={`text-[9px] font-bold uppercase ${isReady ? 'text-emerald-500' : 'text-slate-400'}`}>
//                     {isReady ? 'Files Ready' : 'Awaiting Files'}
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* FOOTER */}
//         <footer className="shrink-0 flex items-center justify-between px-2 pt-2 text-[9px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest border-t border-slate-100 dark:border-slate-800/50">
//           <div className="flex gap-4">
//             <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> System Online</span>
//             <span>Ref: 2026.QA.Engine</span>
//           </div>
//         </footer>
//       </main>
//     </div>
//   );
// };

// export default ReusablePriorityPage;

"use client";

import { useAppSelector } from "@/app/redux";
import { useRunQcChecks1Mutation } from "@/state/api";
import { 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  Loader, 
  ShieldCheck,
  Zap,
  Settings2,
  MonitorCog,
  Database,
  Layers,
  FileText,
  UploadCloud,
  Users2,
  CopyCheck,
  SearchCheck,
  Calendar,
  PlayCircle,
  Hash,      // NEW: Icon for Rosco ID
  MapPin,    // NEW: Icon for Destination ID
  User       // NEW: Icon for User Name
} from "lucide-react";
import React, { useState, useEffect } from "react";
import ConfigModal, { QcConfig } from "../../projects/ConfigModal"; 

// ----------------------------------------------------------------------
// 1. TYPES & METADATA
// ----------------------------------------------------------------------

export enum Priority {
  Urgent = "Urgent",
  High = "High",
  Medium = "Medium",
  Low = "Low",
  Backlog = "Backlog",
}

type Props = {
  priority?: Priority | string; 
};

const QC_CHECKS_METADATA = [
  { id: "1", title: "Period Check", icon: <Database size={14}/>, num: "01", desc: "Validates broadcast dates against monitoring start/end dates in Rosco." },
  { id: "2", title: "Completeness", icon: <Layers size={14}/>, num: "02", desc: "Ensures fields like Channel, ID, Teams, and Audience are non-empty." },
  { id: "3", title: "Overlap/Duplicate/Daybreak", icon: <Zap size={14}/>, num: "03", desc: "Detects overlaps, in-market duplicates, and midnight transitions." },
  { id: "4", title: "Category Logic", icon: <Settings2 size={14}/>, num: "04", desc: "Classifies Live/Repeat/Highlights via fixture windows and duration." },
  { id: "5", title: "Event Matchday", icon: <MonitorCog size={14}/>, num: "05", desc: "Syncs Competition/Matchday/Event data against master references." },
  { id: "6", title: "Market-Channel", icon: <ShieldCheck size={14}/>, num: "06", desc: "Verifies Market + Channel pairs belong to the expected Rosco market." },
  { id: "7", title: "Rates & Ratings", icon: <FileText size={14}/>, num: "07", desc: "Ensures exactly one audience source (Estimate/Metered) per row." },
  { id: "8", title: "Channel ID Sync", icon: <Database size={14}/>, num: "08", desc: "Ensures unique Channel IDs across all Market + TV-Channel pairs." },
  { id: "9", title: "Home vs Away Consistency", icon: <Users2 size={14}/>, num: "09", desc: "Ensures both the Home and Away team names are present within the Phase/Fixture description to prevent data mismatches." },
  { id: "10", title: "Multiple Live Match Consistency", icon: <CopyCheck size={14}/>, num: "10", desc: "Flags duplicate entries by flagging rows where the same Live match is recorded multiple times." },
  { id: "11", title: "Metered Channel Estimation", icon: <SearchCheck size={14}/>, num: "11", desc: "Flags channels that are on the Metered Master List but are being reported as 'Estimated' instead of 'Metered' in the BSR." },
];

const DEFAULT_CHECKS = [
  "period_check", "completeness_check", "overlap_duplicate_daybreak_check",
  "program_category_check", "duration_check", "rates_and_ratings_check",
  "duplicated_markets_check", "country_channel_id_check", "client_lstv_ott_check",
  "check_event_matchday_competition", "metered_channel_estimation_check"
];

// ----------------------------------------------------------------------
// 2. MAIN COMPONENT
// ----------------------------------------------------------------------

const ReusablePriorityPage = ({ priority = Priority.High }: Props) => {
  const [runQc] = useRunQcChecks1Mutation();

  const [selectedBSRFile, setSelectedBSRFile] = useState<File | null>(null);
  const [selectedRoscoFile, setSelectedRoscoFile] = useState<File | null>(null);
  
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // NEW: State for the 3 new database fields
  const [roscoId, setRoscoId] = useState<string>("");
  const [destinationId, setDestinationId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  
  const [qcConfig, setQcConfig] = useState<QcConfig>({ live_tolerance_min: 60 });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // UPDATED: Now requires all inputs before the "Run Checks" button unlocks
  const isReady = !!(selectedBSRFile && selectedRoscoFile && startDate && endDate && roscoId && destinationId && userName);

  useEffect(() => {
    return () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); };
  }, [downloadUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'bsr' | 'rosco') => {
    const file = event.target.files?.[0] || null;
    if (type === 'bsr') setSelectedBSRFile(file);
    else setSelectedRoscoFile(file);
    setStatus('idle');
  };

  const handleRunChecks = async () => {
    if (!isReady || loading) return;
    setLoading(true); setStatus('idle'); setError(null);
    
    const formData = new FormData();
    formData.append('rosco_file', selectedRoscoFile as File);
    formData.append('bsr_file', selectedBSRFile as File);
    formData.append('selected_checks', JSON.stringify(DEFAULT_CHECKS));
    formData.append('config_overrides', JSON.stringify(qcConfig));
    formData.append('start_date', startDate);
    formData.append('end_date', endDate);
    
    // NEW: Append the 3 new fields to the form data
    formData.append('rosco_id', roscoId);
    formData.append('destination_id', destinationId);
    formData.append('user_name', userName);

    try {
      const response = await (runQc as any)(formData).unwrap();
      const blob = response instanceof Blob ? response : new Blob([response as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); 
      setDownloadUrl(URL.createObjectURL(blob));
      setStatus('complete');
    } catch (err: any) {
      let errorMessage = 'Audit processing failed.';

      if (err?.data instanceof Blob) {
        try {
          const errorText = await err.data.text();
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error blob:", parseError);
        }
      } else if (err?.data?.detail) {
        errorMessage = err.data.detail;
      }

      setError(errorMessage);
      setStatus('error');
    } finally { 
      setLoading(false); 
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `QC_Audit_${priority}_${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="flex flex-col w-full h-screen bg-[#F9FBFC] dark:bg-[#08090A] overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* CONFIG MODAL */}
      <ConfigModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentConfig={qcConfig}
        onSave={setQcConfig}
      />

      {/* VIDEO MODAL */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800/50">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <PlayCircle size={16} className="text-indigo-500"/> System Workflow Tutorial
              </h3>
              <button 
                onClick={() => setIsVideoModalOpen(false)} 
                className="text-slate-400 hover:text-red-500 transition-colors font-bold text-xl leading-none px-2"
              >
                &times;
              </button>
            </div>
            <div className="relative w-full aspect-video bg-black">
              <iframe 
                src="https://drive.google.com/file/d/1_if5FlWraBtMjvOynqd-c8Z4t4hgQy6b1rKJ-sHx1_A/preview" 
                className="absolute top-0 left-0 w-full h-full border-0" 
                allow="autoplay"
                allowFullScreen
                title="System Tutorial Video"
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="w-full px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F1A] flex flex-col sm:flex-row sm:items-center justify-between shrink-0 z-10 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20 shrink-0">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none dark:text-white">
                General QC <span className="text-blue-500 text-sm ml-1 uppercase"></span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">This is applicable to all BSR projects</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-3 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-md border border-amber-200 dark:border-amber-500/20 w-fit">
            <AlertTriangle size={14} />
            Make sure to update the monitoring period in question on ROSCO.
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsVideoModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[11px] font-bold transition-all border border-indigo-200 dark:border-indigo-500/20 shadow-sm"
          >
            <PlayCircle size={14} /> <span>Watch Tutorial</span>
          </button>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[11px] font-bold transition-all border border-transparent dark:border-slate-700 shadow-sm"
          >
            <MonitorCog size={14} className="text-blue-500" /> <span className="dark:text-slate-200">System Config</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col p-4 gap-5 overflow-hidden relative">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none hidden dark:block" />
        
        {/* INPUTS WRAPPER */}
        <div className="flex flex-col gap-4 shrink-0">
          
          {/* TOP ROW: UPLOAD & DURATION UI */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              { id: 'bsr', label: 'BSR Dataset', file: selectedBSRFile, color: 'text-blue-500' },
              { id: 'rosco', label: 'Rosco Reference', file: selectedRoscoFile, color: 'text-purple-500' }
            ].map((item) => (
              <label 
                key={item.id}
                className={`group flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden
                  ${item.file 
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/5 border-solid' 
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:border-blue-400 dark:hover:border-blue-500'}`}
              >
                <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, item.id as 'bsr' | 'rosco')} />
                
                <div className={`flex flex-col items-center z-10 transition-transform duration-300 ${!item.file ? 'group-hover:-translate-y-1' : ''}`}>
                  {item.file ? (
                    <>
                      <CheckCircle size={20} className="text-emerald-500 mb-1" />
                      <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">{item.file.name}</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={20} className={`${item.color} mb-1`} />
                      <p className="text-[10px] font-bold">Upload {item.label}</p>
                    </>
                  )}
                </div>
              </label>
            ))}

            <div className="flex flex-col justify-center h-24 border-2 border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50 px-5 relative overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={14} className="text-blue-500 dark:text-white" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Rosco Monitoring Period</span>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setStatus('idle'); }}
                  className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer dark:[color-scheme:dark]"
                />
                <span className="text-slate-400 text-xs font-black uppercase">to</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setStatus('idle'); }}
                  className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer dark:[color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* BOTTOM ROW: NEW DATABASE FIELDS UI */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="flex flex-col justify-center h-20 border-2 border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50 px-5 relative overflow-hidden shadow-sm hover:border-blue-200 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Hash size={14} className="text-blue-500 dark:text-white" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Rosco ID</span>
              </div>
              <input 
                type="text" 
                value={roscoId}
                onChange={(e) => { setRoscoId(e.target.value); setStatus('idle'); }}
                placeholder="e.g. 26525"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="flex flex-col justify-center h-20 border-2 border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50 px-5 relative overflow-hidden shadow-sm hover:border-purple-200 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={14} className="text-purple-500 dark:text-white" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Delivery ID</span>
              </div>
              <input 
                type="text" 
                value={destinationId}
                onChange={(e) => { setDestinationId(e.target.value); setStatus('idle'); }}
                placeholder="e.g. DEST-001"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg px-3 py-1.5 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
            </div>

            <div className="flex flex-col justify-center h-20 border-2 border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50 px-5 relative overflow-hidden shadow-sm hover:border-emerald-200 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <User size={14} className="text-emerald-500 dark:text-white" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">User Name</span>
              </div>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => { setUserName(e.target.value); setStatus('idle'); }}
                placeholder="e.g. Alice"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>

          </div>
        </div>

        {/* MIDDLE SECTION: CHECKS GRID & ACTION CONSOLE */}
        <div className="flex-1 grid grid-cols-4 gap-6 min-h-0 overflow-hidden">
          
          <div className="col-span-3 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
            {QC_CHECKS_METADATA.map((check) => (
              <div 
                key={check.id} 
                className="group p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-xl flex flex-col hover:border-blue-500/50 transition-all shadow-sm hover:shadow-md relative overflow-hidden h-fit min-h-[120px]"
              >
                <div className="absolute top-0 right-0 p-1 opacity-[0.03] dark:opacity-[0.07] group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity pointer-events-none">
                  {React.cloneElement(check.icon as React.ReactElement, { size: 48 })}
                </div>

                <div className="flex items-center justify-between mb-2 relative z-10">
                  <span className="text-[10px] font-black text-slate-300 dark:text-slate-600">{check.num}</span>
                  <div className="text-blue-500 dark:text-blue-400">
                    {check.icon}
                  </div>
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-tight dark:text-slate-200 mb-1.5 relative z-10">{check.title}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal relative z-10">
                  {check.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="col-span-1 flex flex-col gap-4 min-h-0">
            <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center shadow-sm relative overflow-hidden">
              {status === 'complete' && downloadUrl ? (
                <div className="animate-in slide-in-from-bottom-2 duration-500 space-y-4 w-full text-center">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <Download size={24} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Audit Ready</h3>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                  >
                    Download XLSX
                  </button>
                </div>
              ) : (
                <div className="space-y-5 w-full text-center">
                  <div className="text-[9px] font-black uppercase text-slate-400 tracking-[0.3em]">QC Engine</div>
                  <button
                    onClick={handleRunChecks}
                    disabled={!isReady || loading}
                    className="w-full py-4 bg-slate-900 dark:bg-blue-600 hover:opacity-90 text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-30 shadow-xl transition-all"
                  >
                    {loading ? <Loader className="animate-spin mx-auto" size={16} /> : "Run Checks"}
                  </button>
                  <p className={`text-[9px] font-bold uppercase ${isReady ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {isReady ? 'System Ready' : 'Awaiting Inputs'}
                  </p>
                  {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="shrink-0 flex items-center justify-between px-2 pt-2 text-[9px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest border-t border-slate-100 dark:border-slate-800/50">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> System Online</span>
            <span>Ref: 2026.QA.Engine</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default ReusablePriorityPage;