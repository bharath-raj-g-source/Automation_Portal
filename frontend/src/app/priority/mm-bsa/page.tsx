'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Priority } from "@/state/api"

// Import the reusable QC component directly into this page context
// NOTE: Adjust the relative path below if your directory structure differs
import ReusablePriorityPage from "../reusablePriorityPage"

interface RoscoStatusData {
  id: string;
  MM: string;
  EA: string;
  BSR: string;
  GDT: string;
}

export default function MMBSAHome() {
  const router = useRouter()

  const [showMMSubmenu, setShowMMSubmenu] = useState(false)
  const [roscoId, setRoscoId] = useState('')
  const [roscoStatus, setRoscoStatus] = useState<RoscoStatusData | null>(null)

  // ✅ New state to handle inline navigation toggles
  const [activeView, setActiveView] = useState<'dashboard' | 'bsr'>('dashboard')

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!roscoId || roscoId.trim() === '') return

    setRoscoStatus({
      id: roscoId,
      MM: 'Completed',
      EA: 'In Progress',
      BSR: 'Pending',
      GDT: 'Not Started'
    })
  }

  const handleWIP = (checkName: string) => {
    alert(`${checkName} Checks are currently a work in progress!`)
  }

  // ✅ If the user activated the BSR view, swap the display inline with an embedded back bar
  if (activeView === 'bsr') {
    return (
      <div className="flex flex-col w-full h-screen bg-[#F9FBFC] dark:bg-[#08090A] overflow-hidden">
        {/* Navigation override bar */}
        <div className="w-full px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F1A] flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold border border-transparent dark:border-slate-700 transition-all shadow-sm cursor-pointer"
          >
            ← Back to E2E Overview
          </button>
        </div>
       
        {/* Render the QC view with Urgent priority settings matching your config */}
        <div className="flex-1 overflow-hidden">
          <ReusablePriorityPage priority={Priority.Urgent} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center py-12 min-h-screen gap-8 bg-[#F8FAFC] dark:bg-[#050505] px-4">
     
      <h1 className="text-3xl font-semibold text-slate-900 dark:text-white mt-8">
        E2E Checks
      </h1>

      {/* --- ROSCO ID TRACKER SECTION --- */}
      <div className="w-full max-w-md bg-white dark:bg-[#111] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <div>
            <label htmlFor="roscoInput" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Track Rosco ID Status
            </label>
            <div className="flex gap-2">
              <input
                id="roscoInput"
                type="text"
                value={roscoId}
                onChange={(e) => setRoscoId(e.target.value)}
                placeholder="Enter Rosco ID"
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Search
              </button>
            </div>
          </div>
        </form>

        {/* Status Display Card */}
        {roscoStatus && (
          <div className="mt-6 p-5 rounded-lg bg-slate-50 dark:bg-[#1a1a1a] border border-slate-100 dark:border-slate-800">
            <h3 className="font-medium text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
              Status for ID: <span className="text-blue-600 dark:text-blue-400">{roscoStatus.id}</span>
            </h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">MM Checks:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{roscoStatus.MM}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">EA Checks:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{roscoStatus.EA}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">BSR Checks:</span>
                <span className="font-semibold text-yellow-600 dark:text-yellow-500">{roscoStatus.BSR}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">GDT Checks:</span>
                <span className="font-semibold text-slate-500 dark:text-slate-500">{roscoStatus.GDT}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- LIST VIEW / MENU SECTION --- */}
      <div className="flex flex-col gap-4 w-full max-w-md pb-12">
       
        {/* 1. MM Checks (Expandable) */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowMMSubmenu(!showMMSubmenu)}
            className="cursor-pointer w-full px-6 py-4 rounded-xl shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base font-medium hover:scale-[1.02] hover:shadow-lg transition-all duration-200 flex justify-between items-center"
          >
            <span>MM Checks</span>
            <span className="text-sm">{showMMSubmenu ? '▼' : '▶'}</span>
          </button>

          {/* Nested MM Sub-menus */}
          {showMMSubmenu && (
            <div className="flex flex-col gap-3 pl-4 border-l-2 border-indigo-400 ml-2 mt-1 transition-all">
              <button
                type="button"
                onClick={() => router.push('/priority/mm-bsa/mm-checks')}
                className="text-left cursor-pointer w-full px-5 py-3 rounded-lg shadow-sm bg-white dark:bg-[#111] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors"
              >
                1. Standard MM Checks
              </button>
              <button
                type="button"
                onClick={() => router.push('/priority/mm-bsa/exclusive')}
                className="text-left cursor-pointer w-full px-5 py-3 rounded-lg shadow-sm bg-white dark:bg-[#111] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors"
              >
                2. MM Exclusive Checks
              </button>
            </div>
          )}
        </div>

        {/* 2. EA Checks */}
        <button
          type="button"
          onClick={() => handleWIP('EA')}
          className="cursor-pointer w-full px-6 py-4 rounded-xl shadow-md bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-base font-medium hover:scale-[1.02] hover:shadow-lg transition-all duration-200 text-left"
        >
          EA Checks
        </button>

        {/* 3. BSR Checks */}
        <button
          type="button"
          // ✅ Swapped navigation out for local subview state activation
          onClick={() => setActiveView('bsr')}
          className="cursor-pointer w-full px-6 py-4 rounded-xl shadow-md bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-base font-medium hover:scale-[1.02] hover:shadow-lg transition-all duration-200 text-left"
        >
          BSR Checks
        </button>

        {/* 4. GDT Checks */}
        <button
          type="button"
          onClick={() => handleWIP('GDT')}
          className="cursor-pointer w-full px-6 py-4 rounded-xl shadow-md bg-gradient-to-r from-rose-600 to-orange-600 text-white text-base font-medium hover:scale-[1.02] hover:shadow-lg transition-all duration-200 text-left"
        >
          GDT Checks
        </button>

      </div>
    </div>
  )
}
