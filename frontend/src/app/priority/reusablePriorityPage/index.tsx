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

"use client";

import { useAppSelector } from "@/app/redux";
import { useRunQcChecks1Mutation, Priority } from "@/state/api"; 
import { 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  FileText, 
  Loader, 
  FileCheck 
} from "lucide-react";
import React, { useState, useEffect } from "react";

// --- TYPES ---
type Props = {
  priority: Priority; 
};

// --- AVAILABLE CHECKS CONFIG ---
const availableChecks = [
  { key: "period_check", name: "Period Integrity Check", type: "Audit" },
  { key: "completeness_check", name: "Field Completeness Check", type: "Audit" },
  { key: "overlap_duplicate_daybreak_check", name: "Overlap & Duplication Check", type: "Audit" },
  { key: "program_category_check", name: "Program Category Consistency", type: "Audit" },
  { key: "duration_check", name: "Start/End Duration Integrity", type: "Audit" },
  { key: "rates_and_ratings_check", name: "Rates and Ratings Consistency", type: "Audit" },
  { key: "duplicated_markets_check", name: "Market Duplicated Markets Cross-Check", type: "Audit" },
  { key: "country_channel_id_check", name: "Country/Channel ID Consistency", type: "Audit" },
  { key: "client_lstv_ott_check", name: "Client/LSTV/OTT Source Check", type: "Audit" },
  { key: "check_event_matchday_competition", name: "Event Matchday Consistency", type: "Audit" },
];

const ReusablePriorityPage = ({ priority }: Props) => {
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  
  // 💡 Hook usage 
  // We don't use 'data' here for summaries anymore because the response is a File
  const [runQc] = useRunQcChecks1Mutation();

  // --- FILE STATE ---
  const [selectedBSRFile, setSelectedBSRFile] = useState<File | null>(null);
  const [selectedRoscoFile, setSelectedRoscoFile] = useState<File | null>(null);
  const [selectedDataFile, setSelectedDataFile] = useState<File | null>(null); 
  const [selectedMacroFile, setSelectedMacroFile] = useState<File | null>(null); 

  // --- UI STATE ---
  const [selectedChecks, setSelectedChecks] = useState<string[]>([]);
  const [manualLoading, setManualLoading] = useState(false);
  const [processStatus, setProcessStatus] = useState<'idle' | 'complete' | 'error'>('idle');
  const [localError, setLocalError] = useState<string | null>(null);
  
  // 💡 Store the temporary Blob URL for the file
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const isReadyToRun = selectedBSRFile && selectedRoscoFile && selectedChecks.length > 0;

  // Cleanup object URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  // --- HANDLERS ---

  const handleRunChecks = async () => {
    if (!isReadyToRun || manualLoading) return;
    
    // 1. Start Loading & Reset UI
    setManualLoading(true);
    setProcessStatus('idle'); 
    setLocalError(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);

    const formData = new FormData();
    formData.append('rosco_file', selectedRoscoFile as File);
    formData.append('bsr_file', selectedBSRFile as File);
    if (selectedDataFile) { formData.append('data_file', selectedDataFile); }
    if (selectedMacroFile) { formData.append('macro_file', selectedMacroFile); }
    formData.append('selected_checks', JSON.stringify(selectedChecks));

    try {
      // 2. Execute Mutation
      // IMPORTANT: Ensure your api.ts definition for runQcChecks1 has 'responseHandler: (response) => response.blob()' 
      // or similar if using fetchBaseQuery, otherwise RTK might try to parse the file as JSON.
      const response = await runQc(formData).unwrap();
      
      // 3. Handle Binary Response (Blob)
      // If response is a Blob (or standard fetch Response which we can get blob from)
      let blob: Blob;
      if (response instanceof Blob) {
        blob = response;
      } else {
        // Fallback if it's wrapped in some other object, though 'unwrap()' usually gives the raw result
        blob = new Blob([response as any]); 
      }

      // Create a link for the browser
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setProcessStatus('complete');

    } catch (err: any) {
      console.error("QC Check execution failed:", err);
      // Try to parse error message (it might be a blob too if backend sent 500 as file, but usually JSON)
      const errorMsg = err?.data?.detail || 'Processing failed. Check console/network logs.';
      setLocalError(`❌ API Error: ${errorMsg}`);
      setProcessStatus('error');
    } finally {
      // 4. STOP ANIMATION (Crucial)
      setManualLoading(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    // Create a temporary link element to trigger the download with a name
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `QC_Result_${new Date().getTime()}.xlsx`); // Give it a name
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fileType: 'bsr' | 'rosco' | 'data' | 'macro') => {
    const file = event.target.files?.[0];
    if (fileType === 'bsr') setSelectedBSRFile(file || null);
    else if (fileType === 'rosco') setSelectedRoscoFile(file || null);
    else if (fileType === 'data') setSelectedDataFile(file || null); 
    else if (fileType === 'macro') setSelectedMacroFile(file || null); 
  };

  const handleCheckToggle = (key: string) => {
    setSelectedChecks(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="m-5 p-4">
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-4 w-full">
        
        {/* COLUMN 1: INPUTS */}
        <div className="col-span-1 xl:col-span-4 rounded-lg bg-white p-6 shadow dark:bg-dark-secondary">
          
          <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
              
              {/* CHECKLIST */}
              <div className="flex-1 space-y-4 pt-0">
                  <h3 className="text-xl font-bold dark:text-white">Select Checks</h3>
                  <div className="max-h-96 space-y-2 overflow-y-auto pr-2 border border-gray-200 dark:border-gray-700 rounded p-2">
                    {availableChecks.map((check) => (
                      <div key={check.key} className="flex items-center justify-between rounded-md p-3 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedChecks.includes(check.key)}
                            onChange={() => handleCheckToggle(check.key)}
                            className="form-checkbox h-4 w-4 text-blue-600 rounded"
                          />
                          <span className="ml-3 text-sm dark:text-gray-200">{check.name}</span>
                        </label>
                        <span className="text-xs text-blue-500 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          {check.type}
                        </span>
                      </div>
                    ))}
                  </div>
              </div>

              {/* FILE UPLOADS */}
              <div className="flex-1 space-y-4 pt-0">
                  <h3 className="text-xl font-bold dark:text-white">QC File Selection</h3>
                  
                  <div className="flex space-x-4">
                      {/* BSR */}
                      <div className="flex-1">
                          <p className="font-medium text-gray-700 dark:text-gray-300">BSR Data File (Mandatory)</p>
                          <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 p-4 cursor-pointer rounded-lg bg-blue-50 dark:bg-blue-950/50 h-full hover:bg-blue-100 transition-colors">
                              <FileCheck className="h-8 w-8 text-blue-600" />
                              <p className="mt-2 text-sm text-blue-600 dark:text-blue-300 text-center">{selectedBSRFile ? selectedBSRFile.name : "Upload BSR (.xlsx)"}</p>
                              <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'bsr')} />
                          </label>
                      </div>
                      {/* ROSCO */}
                      <div className="flex-1">
                          <p className="font-medium text-gray-700 dark:text-gray-300">Rosco File (Mandatory)</p>
                          <label className="flex flex-col items-center justify-center border-2 border-dashed border-green-300 p-4 cursor-pointer rounded-lg bg-green-50 dark:bg-green-950/50 h-full hover:bg-green-100 transition-colors">
                              <FileCheck className="h-8 w-8 text-green-600" />
                              <p  className="mt-2 text-sm text-green-600 dark:text-green-300 text-center">{selectedRoscoFile ? selectedRoscoFile.name : "Upload Rosco (.xlsx)"}</p>
                              <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'rosco')} />
                          </label>
                      </div>
                  </div>

                  <div className="flex space-x-4 pt-4"> 
                      {/* DATA */}
                      <div className="flex-1">
                          <p className="font-medium text-gray-700 dark:text-gray-300">Client Data File (Optional)</p>
                          <label className={`flex flex-col items-center justify-center p-4 cursor-pointer rounded-lg border-2 border-dashed h-full
                                              ${selectedDataFile ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/50' : 'border-gray-300 bg-gray-50 dark:bg-gray-800'}`}>
                              <FileText className={`h-8 w-8 ${selectedDataFile ? 'text-yellow-700' : 'text-gray-500'}`} />
                              <p className={`mt-2 text-sm text-center ${selectedDataFile ? 'text-yellow-700' : 'text-gray-500'} dark:text-gray-400`}>{selectedDataFile ? selectedDataFile.name : "Upload Client Data (.xlsx)"}</p>
                              <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'data')} />
                          </label>
                      </div>
                      {/* MACRO */}
                      <div className="flex-1">
                          <p className="font-medium text-gray-700 dark:text-gray-300">Macro File (Optional)</p>
                          <label className={`flex flex-col items-center justify-center p-4 cursor-pointer rounded-lg border-2 border-dashed h-full
                                              ${selectedMacroFile ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/50' : 'border-gray-300 bg-gray-50 dark:bg-gray-800'}`}>
                              <FileText className={`h-8 w-8 ${selectedMacroFile ? 'text-purple-700' : 'text-gray-500'}`} />
                              <p className={`mt-2 text-sm text-center ${selectedMacroFile ? 'text-purple-700' : 'text-gray-500'} dark:text-gray-400`}>{selectedMacroFile ? selectedMacroFile.name : "Upload Macro (.xlsm)"}</p>
                              <input type="file" className="hidden" accept=".xlsm" onChange={(e) => handleFileChange(e, 'macro')} />
                          </label>
                      </div>
                  </div>
              </div>
          </div>
          
          {/* RUN BUTTON */}
          <button
            onClick={handleRunChecks}
            disabled={!isReadyToRun || manualLoading}
            className={`w-full flex items-center justify-center rounded-md px-4 py-2 text-white font-semibold mt-4 transition-colors ${
              processStatus === 'complete' 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400'
            }`}
          >
            {manualLoading ? (
              <>
                <Loader className="mr-2 h-5 w-5 animate-spin" />
                Running Checks...
              </>
            ) : processStatus === 'complete' ? (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                Checks Successful! (Ready to Download)
              </>
            ) : (
              <>
                <FileText className="mr-2 h-5 w-5" />
                Run {selectedChecks.length} Checks
              </>
            )}
          </button>
          
          {/* ERROR DISPLAY */}
          <div className="mt-4">
            {localError && (
              <div className="p-4 text-center bg-red-100 rounded-lg dark:bg-red-900/50 text-red-700 dark:text-red-200">
                  <AlertTriangle className="inline h-5 w-5 mr-2" />
                  {localError}
              </div>
            )}
          </div>
        </div>

        {/* RESULTS SUMMARY SECTION */}
        <div className="col-span-1 xl:col-span-4 space-y-6">
          <h3 className="text-xl font-bold dark:text-white">Validation Results</h3>
          
          {/* SUCCESS MESSAGE & DOWNLOAD BUTTON */}
          {processStatus === 'complete' && downloadUrl ? (
              <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-center">
                  <div className="flex justify-center mb-4">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                  <h4 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                      QC Process Completed Successfully!
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Your file has been processed and is ready for download.
                  </p>
                  
                  <button
                      onClick={handleDownload}
                      className="inline-flex items-center justify-center rounded-md bg-green-600 px-6 py-3 text-white text-base font-semibold hover:bg-green-700 transition-colors shadow-sm"
                  >
                      <Download className="mr-2 h-5 w-5" />
                      Download Processed File
                  </button>
              </div>
          ) : (
            // Default placeholder when no results yet
            <div className="p-8 text-center bg-gray-50 rounded-lg dark:bg-gray-800 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700">
                <p>Run checks to see results here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReusablePriorityPage;


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
// import {
//   Clock,
//   Filter,
//   Grid3x3,
//   List,
//   PlusSquare,
//   Share2,
//   Table,
// } from "lucide-react";
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
//   const [activeTab, setActiveTab] = useState("Board"); // Default active tab

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
      
//       {/* HEADER SECTION WITH TABS */}
//       <div className="px-4 xl:px-6">
//         <div className="pb-6 pt-6 lg:pb-4 lg:pt-8">
//           <Header
//             name="Priority Page"
//             buttonComponent={
//               <button
//                 className="flex items-center rounded-md bg-blue-primary px-3 py-2 text-white hover:bg-blue-600"
//                 onClick={() => setIsModalNewTaskOpen(true)}
//               >
//                 <PlusSquare className="mr-2 h-5 w-5" /> Add Task
//               </button>
//             }
//           />
//         </div>

//         {/* TABS */}
//         <div className="flex flex-wrap-reverse gap-2 border-y border-gray-200 pb-[8px] pt-2 dark:border-stroke-dark md:items-center">
//           <div className="flex flex-1 items-center gap-2 md:gap-4">
//             <TabButton
//               name="Board"
//               icon={<Grid3x3 className="h-5 w-5" />}
//               setActiveTab={setActiveTab}
//               activeTab={activeTab}
//             />
//             <TabButton
//               name="List"
//               icon={<List className="h-5 w-5" />}
//               setActiveTab={setActiveTab}
//               activeTab={activeTab}
//             />
//              <TabButton
//               name="Timeline"
//               icon={<Clock className="h-5 w-5" />}
//               setActiveTab={setActiveTab}
//               activeTab={activeTab}
//             />
//             <TabButton
//               name="Table"
//               icon={<Table className="h-5 w-5" />}
//               setActiveTab={setActiveTab}
//               activeTab={activeTab}
//             />
//           </div>
//           <div className="flex items-center gap-2">
//             <button className="text-gray-500 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-gray-300">
//               <Filter className="h-5 w-5" />
//             </button>
//             <button className="text-gray-500 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-gray-300">
//               <Share2 className="h-5 w-5" />
//             </button>
//             <div className="relative">
//               <input
//                 type="text"
//                 placeholder="Search Task"
//                 className="rounded-md border py-1 pl-10 pr-4 focus:outline-none dark:border-dark-secondary dark:bg-dark-secondary dark:text-white"
//               />
//               <Grid3x3 className="absolute left-3 top-2 h-4 w-4 text-gray-400 dark:text-neutral-500" />
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* VIEW CONTROLS - Kept original view state logic but updated UI to match tab style if needed or keep separate */}
//       {/* Note: In your requested design, the tabs seem to replace these view buttons. 
//           I'll link the tabs to the view state below for Board/List/Table. */}
      
//       {/* Logic to map tabs to views:
//          "Board" -> Likely a grid view of cards (your current "list" view)
//          "List" -> Could be a simplified list
//          "Table" -> Your current "table" view
//       */}
      
//       <div className="mt-4">
//         {isLoading ? (
//           <div>Loading tasks...</div>
//         ) : activeTab === "Board" || activeTab === "List" ? ( // Assuming Board/List use the card layout for now
//           <div className="grid grid-cols-1 gap-4">
//             {filteredTasks?.map((task: Task) => (
//               <TaskCard key={task.id} task={task} />
//             ))}
//           </div>
//         ) : activeTab === "Table" && filteredTasks ? (
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
//         ) : (
//              <div>View not implemented yet</div>
//         )}
//       </div>
//     </div>
//   );
// };

// // Reusable Tab Button Component
// type TabButtonProps = {
//   name: string;
//   icon: React.ReactNode;
//   setActiveTab: (tabName: string) => void;
//   activeTab: string;
// };

// const TabButton = ({ name, icon, setActiveTab, activeTab }: TabButtonProps) => {
//   const isActive = activeTab === name;

//   return (
//     <button
//       className={`relative flex items-center gap-2 px-1 py-2 text-gray-500 after:absolute after:-bottom-[9px] after:left-0 after:h-[1px] after:w-full hover:text-blue-600 dark:text-neutral-500 dark:hover:text-white sm:px-2 lg:px-4 ${
//         isActive ? "text-blue-600 after:bg-blue-600 dark:text-white" : ""
//       }`}
//       onClick={() => setActiveTab(name)}
//     >
//       {icon}
//       {name}
//     </button>
//   );
// };

// export default ReusablePriorityPage;
