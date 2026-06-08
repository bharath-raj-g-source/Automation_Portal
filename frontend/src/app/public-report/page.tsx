"use client";

import React, { useEffect, useState } from "react";

export default function PublicReportPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // This fetches data from the new PUBLIC Python router we just made!
    // Notice we don't need Redux or Okta tokens here.
    const fetchPublicData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, ""); 
        const response = await fetch(`${baseUrl}/public/shared-stats`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Failed to fetch public data", error);
      }
    };

    fetchPublicData();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8">
      <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4">
        Public Live Report
      </h1>
      <p className="text-gray-500 mb-8">
        Anyone on the internet can view this page without logging in!
      </p>

      {/* Display the data from FastAPI */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 w-full max-w-md text-center">
        <h2 className="text-sm font-bold uppercase tracking-widest text-indigo-500 mb-2">
          Backend Status
        </h2>
        {data ? (
          <div>
            <p className="text-2xl font-black dark:text-white">{data.message}</p>
            <p className="text-sm text-gray-400 mt-2">Active Projects: {data.active_projects}</p>
          </div>
        ) : (
          <p className="animate-pulse text-gray-400">Fetching live data...</p>
        )}
      </div>
    </div>
  );
}