"use client";

import React, { useEffect, useState } from "react";
import { useOktaAuth } from "@okta/okta-react";

export default function ProfilePage() {
  const { authState, oktaAuth } = useOktaAuth();
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    // oktaAuth.getUser() fetches the specific user details from Okta's servers
    if (authState?.isAuthenticated) {
      oktaAuth.getUser().then((info) => setUserInfo(info));
    }
  }, [authState, oktaAuth]);

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <h1 className="text-3xl font-black mb-6 dark:text-white">Okta Debug Profile</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* PANEL 1: The User Info */}
        <div className="bg-slate-900 rounded-xl p-4 shadow-lg border border-slate-700 overflow-hidden">
          <h2 className="text-emerald-400 font-bold mb-2 uppercase tracking-widest text-xs">
            1. Okta User Claims (oktaAuth.getUser)
          </h2>
          <p className="text-slate-400 text-xs mb-4">This is the profile data Okta holds for you.</p>
          <pre className="text-[10px] text-emerald-200 overflow-auto max-h-[500px] scrollbar-thin scrollbar-thumb-slate-700">
            {JSON.stringify(userInfo, null, 2)}
          </pre>
        </div>

        {/* PANEL 2: The Raw Token */}
        <div className="bg-slate-900 rounded-xl p-4 shadow-lg border border-slate-700 overflow-hidden">
          <h2 className="text-indigo-400 font-bold mb-2 uppercase tracking-widest text-xs">
            2. Raw Auth State & Token
          </h2>
          <p className="text-slate-400 text-xs mb-4">This is the actual cryptographic JWT token state.</p>
          <pre className="text-[10px] text-indigo-200 overflow-auto max-h-[500px] scrollbar-thin scrollbar-thumb-slate-700">
            {JSON.stringify(authState, null, 2)}
          </pre>
        </div>

      </div>
    </div>
  );
}