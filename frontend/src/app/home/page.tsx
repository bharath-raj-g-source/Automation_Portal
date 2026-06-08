// "use client";

// import {
//   Priority,
//   Project,
//   Task,
//   useGetProjectsQuery,
//   useGetTasksQuery,
// } from "@/state/api";
// import React from "react";
// import { useAppSelector } from "../redux";
// import { DataGrid, GridColDef } from "@mui/x-data-grid";
// import Header from "@/components/Header";
// import {
//   Bar,
//   BarChart,
//   CartesianGrid,
//   Cell,
//   Legend,
//   Pie,
//   PieChart,
//   ResponsiveContainer,
//   Tooltip,
//   XAxis,
//   YAxis,
// } from "recharts";
// import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils";

// const taskColumns: GridColDef[] = [
//   { field: "title", headerName: "Title", width: 200 },
//   { field: "status", headerName: "Status", width: 150 },
//   { field: "priority", headerName: "Priority", width: 150 },
//   { field: "dueDate", headerName: "Due Date", width: 150 },
// ];

// const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

// const HomePage = () => {
//   const {
//     data: tasks,
//     isLoading: tasksLoading,
//     isError: tasksError,
//   } = useGetTasksQuery({ projectId: parseInt("1") });
//   const { data: projects, isLoading: isProjectsLoading } =
//     useGetProjectsQuery();

//   const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

//   if (tasksLoading || isProjectsLoading) return <div>Loading..</div>;
//   if (tasksError || !tasks || !projects) return <div>Error fetching data</div>;

//   const priorityCount = tasks.reduce(
//     (acc: Record<string, number>, task: Task) => {
//       const { priority } = task;
//       acc[priority as Priority] = (acc[priority as Priority] || 0) + 1;
//       return acc;
//     },
//     {},
//   );

//   const taskDistribution = Object.keys(priorityCount).map((key) => ({
//     name: key,
//     count: priorityCount[key],
//   }));

//   const statusCount = projects.reduce(
//     (acc: Record<string, number>, project: Project) => {
//       const status = project.endDate ? "Completed" : "Active";
//       acc[status] = (acc[status] || 0) + 1;
//       return acc;
//     },
//     {},
//   );

//   const projectStatus = Object.keys(statusCount).map((key) => ({
//     name: key,
//     count: statusCount[key],
//   }));

//   const chartColors = isDarkMode
//     ? {
//         bar: "#8884d8",
//         barGrid: "#303030",
//         pieFill: "#4A90E2",
//         text: "#FFFFFF",
//       }
//     : {
//         bar: "#8884d8",
//         barGrid: "#E0E0E0",
//         pieFill: "#82ca9d",
//         text: "#000000",
//       };

//   return (
//     <div className="container h-full w-[100%] bg-gray-100 bg-transparent p-8">
//       <Header name="Project Management Dashboard" />
//       <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//         <div className="rounded-lg bg-white p-4 shadow dark:bg-dark-secondary">
//           <h3 className="mb-4 text-lg font-semibold dark:text-white">
//             Task Priority Distribution
//           </h3>
//           <ResponsiveContainer width="100%" height={300}>
//             <BarChart data={taskDistribution}>
//               <CartesianGrid
//                 strokeDasharray="3 3"
//                 stroke={chartColors.barGrid}
//               />
//               <XAxis dataKey="name" stroke={chartColors.text} />
//               <YAxis stroke={chartColors.text} />
//               <Tooltip
//                 contentStyle={{
//                   width: "min-content",
//                   height: "min-content",
//                 }}
//               />
//               <Legend />
//               <Bar dataKey="count" fill={chartColors.bar} />
//             </BarChart>
//           </ResponsiveContainer>
//         </div>
//         <div className="rounded-lg bg-white p-4 shadow dark:bg-dark-secondary">
//           <h3 className="mb-4 text-lg font-semibold dark:text-white">
//             Project Status
//           </h3>
//           <ResponsiveContainer width="100%" height={300}>
//             <PieChart>
//               <Pie dataKey="count" data={projectStatus} fill="#82ca9d" label>
//                 {projectStatus.map((entry, index) => (
//                   <Cell
//                     key={`cell-${index}`}
//                     fill={COLORS[index % COLORS.length]}
//                   />
//                 ))}
//               </Pie>
//               <Tooltip />
//               <Legend />
//             </PieChart>
//           </ResponsiveContainer>
//         </div>
//         <div className="rounded-lg bg-white p-4 shadow dark:bg-dark-secondary md:col-span-2">
//           <h3 className="mb-4 text-lg font-semibold dark:text-white">
//             Your Tasks
//           </h3>
//           <div style={{ height: 400, width: "100%" }}>
//             <DataGrid
//               rows={tasks}
//               columns={taskColumns}
//               checkboxSelection
//               loading={tasksLoading}
//               getRowClassName={() => "data-grid-row"}
//               getCellClassName={() => "data-grid-cell"}
//               className={dataGridClassNames}
//               sx={dataGridSxStyles(isDarkMode)}
//             />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default HomePage;


// "use client";

// import React from "react";
// import Header from "@/components/Header";
// import { 
//   Clock, 
//   CheckCircle, 
//   Users, 
//   GitPullRequest, 
//   Layers, 
//   Cpu, 
//   MoreHorizontal, 
//   Plus, 
//   CheckSquare, 
//   Calendar,
//   ArrowUpRight,
//   TrendingUp,
//   Activity
// } from "lucide-react";

// // --- 1. UPDATED AUTOMATION METRICS ---
// const metrics = [
//   { 
//     title: "Total Hours Saved", 
//     value: "124h", 
//     change: "+12% vs last month", 
//     icon: Clock, 
//     color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
//     iconColor: "text-green-600"
//   },
//   { 
//     title: "Initiatives Completed", 
//     value: "13", 
//     change: "+1 this week", 
//     icon: CheckCircle, 
//     color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
//     iconColor: "text-blue-600"
//   },
//   { 
//     title: "Total Deliveries", 
//     value: "20", 
//     change: "Active Now", 
//     icon: Users, 
//     color: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
//     iconColor: "text-purple-600"
//   },
//   { 
//     title: "In Pipeline", 
//     value: "3", 
//     change: "Upcoming", 
//     icon: GitPullRequest, 
//     color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
//     iconColor: "text-yellow-600"
//   },
//   { 
//     title: "General QC Projects", 
//     value: "8", 
//     change: "Standardized", 
//     icon: Layers, 
//     color: "bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
//     iconColor: "text-pink-600"
//   },
//   { 
//     title: "Bespoke QC Automations", 
//     value: "4", 
//     change: "Custom Logic", 
//     icon: Cpu, 
//     color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
//     iconColor: "text-indigo-600"
//   }
// ];

// // --- Mock Data for Bottom Panels ---
// const activities = [
//   {
//     user: "Vivek",
//     action: "confirmed collaboration with the USA Team to automate rates and ratings",
//     time: "4 hours ago",
//     iconBg: "bg-green-100",
//     iconColor: "text-green-600"
//   },
//   {
//     user: "Bharath",
//     action: "is working on the Automation Portal integration",
//     time: "4 hours ago",
//     iconBg: "bg-purple-100",
//     iconColor: "text-purple-600"
//   },
//   {
//     user: "Priya",
//     action: "is implementing a new refinement in General QC",
//     time: "5 hours ago",
//     iconBg: "bg-yellow-100",
//     iconColor: "text-yellow-600"
//   },
//   {
//     user: "System",
//     action: "flagged 14 errors in the F1 dataset",
//     time: "today",
//     iconBg: "bg-red-100",
//     iconColor: "text-red-600"
//   },
//   {
//     user: "Sarav",
//     action: "created a new Dashboard template",
//     time: "3 days ago",
//     iconBg: "bg-blue-100",
//     iconColor: "text-blue-600"
//   },
//   {
//     user: "System",
//     action: "archived an old QC project",
//     time: "2 days ago",
//     iconBg: "bg-gray-100",
//     iconColor: "text-gray-600"
//   },
// ];

// const tasks = [
//   // { text: "Update EPL logic for the 24/25 season", active: true, priority: true },
//   // { text: "Optimize large file upload speed", active: false, priority: false },
  
//   // New Tasks
//   { text: "Find automation opportunities in Rates and Ratings (USA)", active: true, priority: false },
//   { text: "Investigate missing broadcasts (Japan)", active: true, priority: true },
//   { text: "Integrate the F1 module into the dashboard", active: true, priority: true },
//   { text: "Fix timestamp bug in General QC", active: true, priority: true },
//   { text: "Implement QC checks for Serie A", active: true, priority: false },
// ];

// const appointments = [
//   { title: "Weekly Automation Sync", time: "03:00 AM - 03:45 AM" },
//   { title: "AWS - Migration", time: "04:00 PM - 04:30 PM" },
//   { title: "Japan - Missing Broadcasts", time: "05:00 PM - 06:00 PM" },
// ];

// const HomePage = () => {
//   return (
//     <div className="flex flex-col w-full min-h-screen bg-gray-50 p-8 dark:bg-dark-bg">
//       <Header name="Automation Dashboard" />

//       <div className="mt-6 flex flex-col gap-8">
        
//         {/* --- SECTION 1: METRIC CARDS (2 Rows of 3) --- */}
//         <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
//           {metrics.map((metric, index) => (
//             <div 
//               key={index} 
//               className={`relative flex flex-col justify-between rounded-2xl p-6 shadow-sm ${metric.color} transition-transform hover:scale-[1.02]`}
//             >
//               <div className="flex items-start justify-between">
//                 <div>
//                   <p className="text-sm font-medium opacity-80">{metric.title}</p>
//                   <h3 className="mt-2 text-3xl font-bold">{metric.value}</h3>
//                 </div>
//                 <div className={`rounded-full bg-white/50 p-2 dark:bg-black/20 ${metric.iconColor}`}>
//                   <metric.icon className="h-6 w-6" />
//                 </div>
//               </div>
//               <div className="mt-4 flex items-center text-xs font-semibold">
//                 <span className="flex items-center gap-1 rounded-full bg-white/40 px-2 py-1 dark:bg-black/10">
//                   {metric.change}
//                 </span>
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* --- SECTION 2: BIG INFORMATIVE CARDS --- */}
//         <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
//           {/* 1. Recent Activities */}
//           <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-dark-secondary">
//             <div className="mb-6 flex items-center justify-between">
//               <div className="flex items-center gap-2">
//                 <Activity className="h-5 w-5 text-gray-500 dark:text-gray-400" />
//                 <h3 className="text-lg font-bold dark:text-white">Recent Activities</h3>
//               </div>
//               <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
//                 <MoreHorizontal className="h-5 w-5" />
//               </button>
//             </div>
//             <div className="flex flex-col gap-6">
//               {activities.map((activity, idx) => (
//                 <div key={idx} className="flex items-start gap-4">
//                   <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${activity.iconBg} dark:bg-opacity-20`}>
//                     <ArrowUpRight className={`h-5 w-5 ${activity.iconColor}`} />
//                   </div>
//                   <div>
//                     <p className="text-sm font-semibold dark:text-white">
//                       {activity.user} <span className="font-normal text-gray-500 dark:text-gray-400">{activity.action}</span>
//                     </p>
//                     <p className="text-xs text-gray-400">{activity.time}</p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* 2. Tasks / Pipeline */}
//           <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-dark-secondary">
//             <div className="mb-6 flex items-center justify-between">
//               <div className="flex items-center gap-2">
//                 <CheckSquare className="h-5 w-5 text-gray-500 dark:text-gray-400" />
//                 <h3 className="text-lg font-bold dark:text-white">Pending Tasks</h3>
//               </div>
//               {/* <button className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">
//                 <Plus className="h-3 w-3" /> Add Task
//               </button> */}
//             </div>
//             <div className="flex flex-col gap-4">
//               {tasks.map((task, idx) => (
//                 <div 
//                   key={idx} 
//                   className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${task.active ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
//                 >
//                   <input type="checkbox" defaultChecked={task.active} className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
//                   <div className="flex-1">
//                     <p className={`text-sm ${task.active ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
//                       {task.text}
//                     </p>
//                   </div>
//                   {task.priority && (
//                     <div className="h-2 w-2 shrink-0 rounded-full bg-red-500" title="High Priority" />
//                   )}
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* 3. Schedule / Appointments */}
//           <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-dark-secondary">
//             <div className="mb-6 flex items-center justify-between">
//               <div className="flex items-center gap-2">
//                 <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" />
//                 <h3 className="text-lg font-bold dark:text-white">Schedule</h3>
//               </div>
//               <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
//                 <MoreHorizontal className="h-5 w-5" />
//               </button>
//             </div>
//             <div className="flex flex-col gap-4">
//               {appointments.map((apt, idx) => (
//                 <div key={idx} className="group relative border-l-4 border-transparent pl-4 hover:border-blue-500">
//                   <h4 className="text-sm font-semibold dark:text-white">{apt.title}</h4>
//                   <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
//                     <Clock className="h-3 w-3" />
//                     {apt.time}
//                   </div>
//                 </div>
//               ))}
//               {/* <div className="mt-2 text-right">
//                  <button className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">View Calendar</button>
//               </div> */}
//             </div>
//           </div>

//         </div>
//       </div>
//     </div>
//   );
// };

// export default HomePage;

"use client";

import React, { useState } from "react";
import { useGetAutomationHubQuery, useGetWebsiteUpdatesQuery } from "@/state/api"; // Adjust path to match your structure

// --- TYPES ---
type UpdateType = {
  version: string;
  date: string;
  changes: Record<string, string[]>;
};

import { 
  Clock, Layers, Cpu, Rocket, Code2, CalendarDays, 
  User, Database, Server, Cloud, Globe, Activity, TrendingUp, ChevronDown
} from "lucide-react";

// Lucide Icon Mapping Helper
const iconMap: Record<string, React.ComponentType<any>> = {
  "Docker": Layers,
  "Terraform": Globe,
  "Next.js": Code2,
  "FastAPI": Rocket,
  "Postgres": Database,
  "AWS": Cloud,
  "ALB": Activity,
  "ECS": Server,
  "Default": Cpu
};

// Complete static backup configs in case API fails on first load completely
const BACKUP_DATA = {
  primaryMetric: { 
    title: "Current Potential Monthly Savings", 
    value: "500h+", 
    icon: Clock, 
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-500/10"
  },
  coreTech: [
    { name: "Docker", icon: Layers, color: "text-blue-500" },
    { name: "Terraform", icon: Globe, color: "text-purple-500" },
    { name: "Next.js", icon: Code2, color: "text-slate-900 dark:text-white" },
    { name: "FastAPI", icon: Rocket, color: "text-emerald-500" },
    { name: "Postgres", icon: Database, color: "text-blue-600" },
    { name: "AWS", icon: Cloud, color: "text-orange-500" },
    { name: "ALB", icon: Activity, color: "text-rose-500" },
    { name: "ECS", icon: Server, color: "text-orange-600" },
  ],
  activeProjects: [
    { 
      name: "GMO Dashboard", 
      owner: "Bharath", 
      tech: "", 
      status: "Completed", 
      eta: "May 15",
      desc: "Interactive dashboard for gms project deadline sheet visualization." 
    },
    { 
      name: "QC Audit", 
      owner: "Bharath", 
      tech: "", 
      status: "Completed", 
      eta: "May 20",
      desc: "Interactive dashboard for qc audit and db visualization." 
    },
    { 
      name: "Middle East Sport Specific Check", 
      owner: "Priya", 
      tech: "", 
      status: "WIP", 
      eta: "June 5",
      desc: "Specific checks requested for middle east projects are being implemented" 
    },
    { 
      name: "Rates and Ratings Calculation", 
      owner: "Bharath", 
      tech: "", 
      status: "WIP", 
      eta: "June 15",
      desc: "Automates NNTV/NLTV viewership data retrieval and converts media rates (USD to EUR)." 
    }
  ],
  deployments: [] // Left intentionally blank since the UI now maps everything via activeProjects
};

const FALLBACK_UPDATES_DATA = [
  { version: "v1.2", date: "May 2026", category: "New Features", change: "Automation Hub" },
  { version: "v1.2", date: "May 2026", category: "Improvements", change: "All athletics, motorsports, individual and non team sports are excluded for considering home and away teams in completeness check" },
  { version: "v1.2", date: "May 2026", category: "Bug Fixes", change: "QC Audit processed trail failed issue resoved and able to process large files." },
  { version: "v1.1", date: "April 2026", category: "Improvements", change: "Optimized large file processing speed by 40%" },
  { version: "v1.1", date: "April 2026", category: "Bug Fixes", change: "Fixed timestamp offset in General QC results" },
  { version: "v1.1", date: "April 2026", category: "Bug Fixes", change: "Resolved 500 error on BSR file upload with hidden spaces" },
  { version: "v1.1", date: "April 2026", category: "New Features", change: "Added LaLiga QC Module" },
  { version: "v1.0", date: "March 2026", category: "Improvements", change: "Initial framework release and AWS integration" }
];

const WHATS_NEW_DATA = [
  {
    version: "v1.1",
    date: "April 2026",
    changes: {
      "New Features": ["Added Laliga QC module", "Added F1 Market checks"],
      "Improvements": ["Improved file upload stability"],
      "QC Logic Updates": ["Improved program category classification"]
    }
  },
  {
    version: "v1.0",
    date: "March 2026",
    changes: {
      "New Features": ["Initial QC Automation release", "Main QC checks implemented"],
      "Improvements": ["Basic validation engine"]
    }
  },
  {
    version: "v0.9",
    date: "February 2026",
    changes: {
      "New Features": ["Internal beta release"],
      "Bug Fixes": ["Minor stability fixes"]
    }
  }
];

const HomePage = () => {
  const [openFeedback, setOpenFeedback] = useState(false);
  const [openUpdates, setOpenUpdates] = useState(false);
  const [openRequirement, setOpenRequirement] = useState(false);

  const [expandedDeploys, setExpandedDeploys] = useState<Record<number, boolean>>({});

  const toggleDeploy = (idx: number) => {
    setExpandedDeploys((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Connect to Redux Endpoint API
  const { data: serverHubData, isLoading, isError } = useGetAutomationHubQuery();

  // Safely extract the array whether it's the direct response or wrapped in a 'data' property
  const hubArray = Array.isArray(serverHubData) ? serverHubData : ((serverHubData as any)?.data || []);

  // 1. Compute Primary Metric
  const metricItem = hubArray.find((item: any) => item.Type === "Metric");
  const finalPrimaryMetric = {
    title: metricItem?.Name || BACKUP_DATA.primaryMetric.title,
    value: metricItem?.Icon_or_Color || BACKUP_DATA.primaryMetric.value,
    icon: Clock,
    color: BACKUP_DATA.primaryMetric.color,
    bg: BACKUP_DATA.primaryMetric.bg
  };

  // 2. Compute Core Tech
  const techItems = hubArray.filter((item: any) => item.Type === "Tech");
  const finalCoreTech = techItems.length > 0
    ? techItems.map((t: any) => ({
        name: t.Name,
        color: t.Icon_or_Color,
        icon: iconMap[t.Name] || iconMap["Default"]
      }))
    : BACKUP_DATA.coreTech;

  // 3. Compute Active Projects (Keep Upcoming, but filter Deployed to ONLY last month)
  // 3. Compute Active Projects (Keep Upcoming, but filter Deployed to ONLY last month)
  const upcomingItems = hubArray.filter((item: any) => {
    // 1. Keep "Upcoming" items so you don't lose WIP tasks
    if (item.Type === "Upcoming") return true;

    // 2. For "Deployed" items, filter for exactly the previous calendar month
    if (item.Type === "Deployed") {
      let dateString = item.ETA_or_Date;
      
      // BUG FIX: If the date (e.g. "May 15") is missing a year, JS assumes year 2001.
      // This regex checks if a 4-digit year exists. If not, it adds the current year.
      if (!/\d{4}/.test(dateString)) {
        dateString = `${dateString}, ${new Date().getFullYear()}`;
      }

      const itemDate = new Date(dateString);
      
      // If it's still not a valid parseable date, hide it
      if (isNaN(itemDate.getTime())) return false;

      const today = new Date();
      
      // Calculate what "last month" is, handling the Jan -> Dec year rollover
      const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
      const targetYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();

      // Return true ONLY if the item's month and year match last month
      return itemDate.getMonth() === lastMonth && itemDate.getFullYear() === targetYear;
    }

    return false;
  });

  const finalActiveProjects = upcomingItems.length > 0
    ? upcomingItems.map((p: any) => ({
        name: p.Name,
        owner: p.Owner,
        tech: p.Tech,
        status: p.Status,
        eta: p.ETA_or_Date,
        desc: p.Desc
      }))
    : BACKUP_DATA.activeProjects;

  // 1. Hook invocation for website updates
  const { data: updatesResponse, isLoading: isUpdatesLoading, error: updatesError } = useGetWebsiteUpdatesQuery();

  // ✅ Use API data if valid, otherwise use the fallback array
  const finalUpdatesList = (!updatesError && updatesResponse?.status === "success" && updatesResponse?.data?.length > 0)
    ? updatesResponse.data
    : FALLBACK_UPDATES_DATA;

  // 2. Data transformation for What's New modal
  const updatesData = React.useMemo(() => {
    if (updatesError) {
      console.error("❌ Updates API Error Details:", updatesError);
      console.log("⚠️ Falling back to static updates data cache.");
    }
    
    const grouped: Record<string, UpdateType> = {};
    
    finalUpdatesList.forEach((row: any) => {
      const version = row.version; 
      const date = row.date;
      const category = row.category;
      const change = row.change;
      
      if (!version || version.trim() === "") return;

      if (!grouped[version]) {
        grouped[version] = { 
          version, 
          date: date || "Unknown Date", 
          changes: {} 
        };
      }

      if (!grouped[version].changes[category]) {
        grouped[version].changes[category] = [];
      }

      grouped[version].changes[category].push(change);
    });

    return Object.values(grouped).sort((a, b) =>
      b.version.localeCompare(a.version, undefined, { numeric: true })
    );
  }, [finalUpdatesList, updatesError]); 


  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#050505] text-slate-900 dark:text-slate-100 font-sans relative">
      
      {/* HEADER */}
      <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F1A]">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <h1 className="text-lg font-extrabold tracking-tight">Automation Key Indicators</h1>
          <span className={`flex items-center gap-2 px-2 py-1 border rounded-md text-[10px] font-bold uppercase tracking-widest ${
            isError 
              ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
              : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
          }`}>
            <div className={`w-1 h-1 rounded-full ${isError ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`} /> 
            {isError ? "Offline Cache Mode" : "Nominal"}
          </span>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 space-y-6">
        {isLoading && (
          <div className="text-xs text-slate-400 dark:text-slate-500 animate-pulse">
            Fetching latest layout updates from Google Sheets...
          </div>
        )}
        
        {/* TOP SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="bg-white dark:bg-[#0F131F] border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm h-full flex flex-col justify-center">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${finalPrimaryMetric.bg} ${finalPrimaryMetric.color}`}>
                  <finalPrimaryMetric.icon size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-tight mb-1">
                    {finalPrimaryMetric.title}
                  </h3>
                  <p className="text-2xl font-bold tabular-nums leading-none">{finalPrimaryMetric.value}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 xl:col-span-9 bg-white dark:bg-[#0F131F] border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {finalCoreTech.map((tech: any, i: number) => (
                <div key={i} className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 hover:border-indigo-500/30 transition-colors">
                  <tech.icon size={16} className={tech.color} />
                  <span className="text-[10px] font-bold truncate w-full text-center">{tech.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* UPCOMING & DEPLOYED AUTOMATIONS */}
          <div className="xl:col-span-8 space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Code2 className="text-blue-500" size={18} />
              <h2 className="text-md font-bold text-slate-700 dark:text-slate-200">Active & Recently Deployed</h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {finalActiveProjects.map((project: any, idx: number) => (
                <div key={idx} className="bg-white dark:bg-[#0F131F] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-blue-400/50 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-bold">{project.name}</h3>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-tighter ${
                      project.status.toLowerCase() === "completed" 
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{project.desc}</p>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex gap-4">
                      <span className="flex items-center gap-1"><User size={12} /> {project.owner}</span>
                      {project.tech && <span className="flex items-center gap-1"><Database size={12} /> {project.tech}</span>}
                    </div>
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <CalendarDays size={12} /> {project.eta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RECENT UPDATES SIDEBAR */}
          <div className="xl:col-span-4 space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Rocket className="text-emerald-500" size={18} />
              <h2 className="text-md font-bold text-slate-700 dark:text-slate-200">Recent Updates</h2>
            </div>
            
            <div className="bg-white dark:bg-[#0F131F] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-3">
              <div className="space-y-1">
                {isUpdatesLoading ? (
                  <div className="text-xs text-slate-400 dark:text-slate-500 animate-pulse text-center py-4">
                    Loading recent deployments...
                  </div>
                ) : (
                  finalUpdatesList.slice(0, 5).map((dep: any, idx: number) => {
                    const isLast = idx === Math.min(finalUpdatesList.length, 5) - 1;
                    const isExpanded = expandedDeploys[idx];
                    
                    return (
                      <div 
                        key={idx} 
                        onClick={() => toggleDeploy(idx)}
                        className="flex gap-3 group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 p-2 rounded-lg transition-colors"
                      >
                        <div className="flex flex-col items-center shrink-0 pt-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${isExpanded ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" : "bg-emerald-500"}`} />
                          {!isLast && <div className="w-[1px] h-full bg-slate-100 dark:bg-slate-800 mt-2" />}
                        </div>
                        
                        <div className="min-w-0 pb-1 w-full">
                          <div className="flex justify-between items-start mb-1 gap-2">
                            <h4 className="text-xs font-bold truncate">
                              <span className="text-indigo-600 dark:text-indigo-400">{dep.version}</span>
                              <span className="text-slate-400 mx-1.5">•</span>
                              {dep.category}
                            </h4>
                            <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                              <span className="text-[9px] font-bold mt-0.5">
                                {dep.date}
                              </span>
                              <ChevronDown 
                                size={14} 
                                className={`transition-transform duration-300 ${isExpanded ? "rotate-180 text-indigo-500" : "group-hover:text-slate-600 dark:group-hover:text-slate-300"}`} 
                              />
                            </div>
                          </div>
                          
                          <div 
                            className={`text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed transition-all duration-300 ease-in-out overflow-hidden ${
                              isExpanded 
                                ? "max-h-[500px] opacity-100" 
                                : "max-h-[2.75rem] opacity-80 line-clamp-2"
                            }`}
                          >
                            {dep.change}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* --- FLOATING ACTION BUTTONS --- */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
        <button
          onClick={() => setOpenUpdates(true)}
          className="fixed bottom-20 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:scale-105 transition z-50"
        >
          🚀 New Updates
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => setOpenRequirement(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            New Business Requirement
          </button>

          <button
            onClick={() => setOpenFeedback(true)}
            className="bg-blue-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-900 transition-colors text-sm font-medium"
          >
            Feedback
          </button>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* FEEDBACK MODAL */}
      {openFeedback && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-[750px] h-[80vh] relative shadow-2xl overflow-hidden">
            <button
              onClick={() => setOpenFeedback(false)}
              className="absolute top-3 right-4 text-slate-500 hover:text-black text-2xl z-10"
            >
              ✕
            </button>
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLSeZTZ1jSRptUpOkgsD7BIPVJshVXSVjw9-giKnFzTn8gxwELA/viewform?embedded=true"
              width="100%"
              height="100%"
              className="border-none"
            >
              Loading…
            </iframe>
          </div>
        </div>
      )}

      {/* BUSINESS REQUIREMENT MODAL */}
      {openRequirement && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-[750px] h-[80vh] relative shadow-2xl overflow-hidden">
            <button
              onClick={() => setOpenRequirement(false)}
              className="absolute top-3 right-4 text-slate-500 hover:text-black text-2xl z-10"
            >
              ✕
            </button>
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLSfa4wtaZxSsYbxG8oBQC1EPdYDEGcZlkiwBkZyhLUkKUOfkfA/viewform?embedded=true"
              width="100%"
              height="100%"
              className="border-none"
            >
              Loading…
            </iframe>
          </div>
        </div>
      )}

      {/* NEW UPDATES MODAL */}
      {openUpdates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-[#0F131F] w-full max-w-5xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold">🆕 What&apos;s New</h2>
                <p className="text-xs text-slate-500">Latest updates</p>
              </div>
              <button
                onClick={() => setOpenUpdates(false)}
                className="text-xl text-slate-400 hover:text-black dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              {isUpdatesLoading ? (
                <div className="text-center py-10">Loading updates...</div>
              ) : updatesError ? (
                <div className="text-center py-10 text-red-500 font-semibold">
                  ❌ Connection failed. Verify your server or network routes in api.ts.
                </div>
              ) : updatesData.length > 0 ? (
                <>
                  {/* ✅ LATEST VERSION */}
                  <div>
                    <div className="mb-4 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold">
                      🚀 Latest: {updatesData[0].version} – {updatesData[0].date}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(updatesData[0].changes).map(([key, items], i) => (
                        <div key={i} className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                          <h3 className="text-xs font-bold mb-2 text-indigo-500">{key}</h3>
                          <ul className="text-xs space-y-1">
                            {items.map((item, idx) => (
                              <li key={idx}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ✅ PREVIOUS VERSIONS */}
                  {updatesData.length > 1 && (
                    <div className="mt-10">
                      <h3 className="text-sm font-bold mb-3">Previous Versions</h3>
                      {updatesData.slice(1).map((v, i) => (
                        <div key={i} className="p-3 mb-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
                          <h4 className="text-xs font-bold mb-1">{v.version} – {v.date}</h4>
                          {Object.entries(v.changes).map(([key, items], idx) => (
                            <div key={idx} className="text-xs text-slate-600 dark:text-slate-400">
                              <span className="font-semibold">{key}: </span>{items.join(", ")}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10 text-slate-500">No updates found.</div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default HomePage;