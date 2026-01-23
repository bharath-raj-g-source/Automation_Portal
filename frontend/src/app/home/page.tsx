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


"use client";

import React from "react";
import Header from "@/components/Header";
import { 
  Clock, 
  CheckCircle, 
  Users, 
  GitPullRequest, 
  Layers, 
  Cpu, 
  MoreHorizontal, 
  Plus, 
  CheckSquare, 
  Calendar,
  ArrowUpRight,
  TrendingUp,
  Activity
} from "lucide-react";

// --- 1. UPDATED AUTOMATION METRICS ---
const metrics = [
  { 
    title: "Total Hours Saved", 
    value: "124h", 
    change: "+12% vs last month", 
    icon: Clock, 
    color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    iconColor: "text-green-600"
  },
  { 
    title: "Initiatives Completed", 
    value: "13", 
    change: "+1 this week", 
    icon: CheckCircle, 
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    iconColor: "text-blue-600"
  },
  { 
    title: "Total Users", 
    value: "20", 
    change: "Active Now", 
    icon: Users, 
    color: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    iconColor: "text-purple-600"
  },
  { 
    title: "In Pipeline", 
    value: "3", 
    change: "Upcoming", 
    icon: GitPullRequest, 
    color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    iconColor: "text-yellow-600"
  },
  { 
    title: "General QC Projects", 
    value: "8", 
    change: "Standardized", 
    icon: Layers, 
    color: "bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
    iconColor: "text-pink-600"
  },
  { 
    title: "Bespoke QC Automations", 
    value: "4", 
    change: "Custom Logic", 
    icon: Cpu, 
    color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    iconColor: "text-indigo-600"
  }
];

// --- Mock Data for Bottom Panels ---
const activities = [
  {
    user: "Vivek",
    action: "confirmed collaboration with the USA Team to automate rates and ratings",
    time: "4 hours ago",
    iconBg: "bg-green-100",
    iconColor: "text-green-600"
  },
  {
    user: "Bharath",
    action: "is working on the Automation Portal integration",
    time: "4 hours ago",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600"
  },
  {
    user: "Priya",
    action: "is implementing a new refinement in General QC",
    time: "5 hours ago",
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600"
  },
  {
    user: "System",
    action: "flagged 14 errors in the F1 dataset",
    time: "today",
    iconBg: "bg-red-100",
    iconColor: "text-red-600"
  },
  {
    user: "Sarav",
    action: "created a new Dashboard template",
    time: "3 days ago",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600"
  },
  {
    user: "System",
    action: "archived an old QC project",
    time: "2 days ago",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-600"
  },
];

const tasks = [
  // { text: "Update EPL logic for the 24/25 season", active: true, priority: true },
  // { text: "Optimize large file upload speed", active: false, priority: false },
  
  // New Tasks
  { text: "Find automation opportunities in Rates and Ratings (USA)", active: true, priority: false },
  { text: "Investigate missing broadcasts (Japan)", active: true, priority: true },
  { text: "Integrate the F1 module into the dashboard", active: true, priority: true },
  { text: "Fix timestamp bug in General QC", active: true, priority: true },
  { text: "Implement QC checks for Serie A", active: true, priority: false },
];

const appointments = [
  { title: "Weekly Automation Sync", time: "03:00 AM - 03:45 AM" },
  { title: "AWS - Migration", time: "04:00 PM - 04:30 PM" },
  { title: "Japan - Missing Broadcasts", time: "05:00 PM - 06:00 PM" },
];

const HomePage = () => {
  return (
    <div className="flex flex-col w-full min-h-screen bg-gray-50 p-8 dark:bg-dark-bg">
      <Header name="Automation Dashboard" />

      <div className="mt-6 flex flex-col gap-8">
        
        {/* --- SECTION 1: METRIC CARDS (2 Rows of 3) --- */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric, index) => (
            <div 
              key={index} 
              className={`relative flex flex-col justify-between rounded-2xl p-6 shadow-sm ${metric.color} transition-transform hover:scale-[1.02]`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium opacity-80">{metric.title}</p>
                  <h3 className="mt-2 text-3xl font-bold">{metric.value}</h3>
                </div>
                <div className={`rounded-full bg-white/50 p-2 dark:bg-black/20 ${metric.iconColor}`}>
                  <metric.icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold">
                <span className="flex items-center gap-1 rounded-full bg-white/40 px-2 py-1 dark:bg-black/10">
                  {metric.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* --- SECTION 2: BIG INFORMATIVE CARDS --- */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* 1. Recent Activities */}
          <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-dark-secondary">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <h3 className="text-lg font-bold dark:text-white">Recent Activities</h3>
              </div>
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-6">
              {activities.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${activity.iconBg} dark:bg-opacity-20`}>
                    <ArrowUpRight className={`h-5 w-5 ${activity.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold dark:text-white">
                      {activity.user} <span className="font-normal text-gray-500 dark:text-gray-400">{activity.action}</span>
                    </p>
                    <p className="text-xs text-gray-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Tasks / Pipeline */}
          <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-dark-secondary">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <h3 className="text-lg font-bold dark:text-white">Pending Tasks</h3>
              </div>
              {/* <button className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">
                <Plus className="h-3 w-3" /> Add Task
              </button> */}
            </div>
            <div className="flex flex-col gap-4">
              {tasks.map((task, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${task.active ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                >
                  <input type="checkbox" defaultChecked={task.active} className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                  <div className="flex-1">
                    <p className={`text-sm ${task.active ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                      {task.text}
                    </p>
                  </div>
                  {task.priority && (
                    <div className="h-2 w-2 shrink-0 rounded-full bg-red-500" title="High Priority" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Schedule / Appointments */}
          <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-dark-secondary">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <h3 className="text-lg font-bold dark:text-white">Schedule</h3>
              </div>
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {appointments.map((apt, idx) => (
                <div key={idx} className="group relative border-l-4 border-transparent pl-4 hover:border-blue-500">
                  <h4 className="text-sm font-semibold dark:text-white">{apt.title}</h4>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3" />
                    {apt.time}
                  </div>
                </div>
              ))}
              {/* <div className="mt-2 text-right">
                 <button className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">View Calendar</button>
              </div> */}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HomePage;

// "use client";

// import React from "react";
// import Header from "@/components/Header";

// const HomePage = () => {
//   return (
//     <div className="container h-full w-[100%] bg-gray-100 bg-transparent p-8">
//       {/* <Header name="EPL Dashboard" /> */}
      
//       {/* We use a container div with specific height (h-[85vh]) so the 
//         dashboard takes up most of the screen vertically.
//       */}
//       <div className="w-full h-[85vh] rounded-lg bg-white shadow dark:bg-dark-secondary overflow-hidden">
//         <iframe
//           src="https://lookerstudio.google.com/embed/reporting/f4dd42e6-dc43-4e3a-87c7-b81aca3a8c68/page/AROkF"
//           title="Project Management Dashboard"
//           width="100%"
//           height="100%"
//           style={{ border: 0 }}
//           allowFullScreen
//           sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
//         />
//       </div>
//     </div>
//   );
// };

// export default HomePage;