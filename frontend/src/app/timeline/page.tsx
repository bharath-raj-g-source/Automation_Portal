// "use client";

// import { useAppSelector } from "@/app/redux";
// import Header from "@/components/Header";
// import { useGetProjectsQuery } from "@/state/api";
// import { DisplayOption, Gantt, ViewMode } from "gantt-task-react";
// import "gantt-task-react/dist/index.css";
// import React, { useMemo, useState } from "react";

// type TaskTypeItems = "task" | "milestone" | "project";

// const Timeline = () => {
//   const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
//   const { data: projects, isLoading, isError } = useGetProjectsQuery();

//   const [displayOptions, setDisplayOptions] = useState<DisplayOption>({
//     viewMode: ViewMode.Month,
//     locale: "en-US",
//   });

//   const ganttTasks = useMemo(() => {
//     return (
//       projects?.map((project) => ({
//         start: new Date(project.startDate as string),
//         end: new Date(project.endDate as string),
//         name: project.name,
//         id: `Project-${project.id}`,
//         type: "project" as TaskTypeItems,
//         progress: 50,
//         isDisabled: false,
//       })) || []
//     );
//   }, [projects]);

//   const handleViewModeChange = (
//     event: React.ChangeEvent<HTMLSelectElement>,
//   ) => {
//     setDisplayOptions((prev) => ({
//       ...prev,
//       viewMode: event.target.value as ViewMode,
//     }));
//   };

//   if (isLoading) return <div>Loading...</div>;
//   if (isError || !projects)
//     return <div>An error occurred while fetching projects</div>;

//   return (
//     <div className="max-w-full p-8">
//       <header className="mb-4 flex items-center justify-between">
//         <Header name="Projects Timeline" />
//         <div className="relative inline-block w-64">
//           <select
//             className="focus:shadow-outline block w-full appearance-none rounded border border-gray-400 bg-white px-4 py-2 pr-8 leading-tight shadow hover:border-gray-500 focus:outline-none dark:border-dark-secondary dark:bg-dark-secondary dark:text-white"
//             value={displayOptions.viewMode}
//             onChange={handleViewModeChange}
//           >
//             <option value={ViewMode.Day}>Day</option>
//             <option value={ViewMode.Week}>Week</option>
//             <option value={ViewMode.Month}>Month</option>
//           </select>
//         </div>
//       </header>

//       <div className="overflow-hidden rounded-md bg-white shadow dark:bg-dark-secondary dark:text-white">
//         <div className="timeline">
//           <Gantt
//             tasks={ganttTasks}
//             {...displayOptions}
//             columnWidth={displayOptions.viewMode === ViewMode.Month ? 150 : 100}
//             listCellWidth="100px"
//             projectBackgroundColor={isDarkMode ? "#101214" : "#1f2937"}
//             projectProgressColor={isDarkMode ? "#1f2937" : "#aeb8c2"}
//             projectProgressSelectedColor={isDarkMode ? "#000" : "#9ba1a6"}
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Timeline;


"use client";

import React from "react";
import Header from "@/components/Header";

const Timeline = () => {
  return (
    <div className="max-w-full p-8">
      <header className="mb-4 flex items-center justify-between">
        <Header name="Data Comparison" />
      </header>

      {/* Container for the iframe:
        - h-[85vh]: Takes up 85% of the viewport height
        - dark:bg-dark-secondary: Matches your app's dark mode theme
      */}
      <div className="w-full h-[85vh] rounded-lg bg-white shadow dark:bg-dark-secondary overflow-hidden">
        <iframe
          src="https://lookerstudio.google.com/embed/reporting/f4dd42e6-dc43-4e3a-87c7-b81aca3a8c68/page/AROkF"
          title="Project Management Dashboard"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </div>
  );
};

export default Timeline;