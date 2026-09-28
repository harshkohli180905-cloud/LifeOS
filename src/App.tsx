import { useState, useEffect } from 'react';
import { useLifeOS } from './context/useLifeOS';
import { useAuth } from './context/AuthContext';

import QuickLogModal from './components/QuickLogModal';
import SearchModal from './components/SearchModal';
import StudyView from './components/StudyView';
import FitnessView from './components/FitnessView';
import AnalyticsView from './components/AnalyticsView';
import GoalsView from './components/GoalsView';
import SettingsView from './components/SettingsView';
import ReportsView from './components/ReportsView';
import CalendarView from './components/CalendarView';

import {
  Home,
  BookOpen,
  Dumbbell,
  BarChart3,
  Target,
  Settings,
  Plus,
  CheckCircle2,
  Flame,
  Droplets,
  Activity,
  Calendar,
  FileText,
  Search,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';

type Tab =
  | 'home'
  | 'study'
  | 'fitness'
  | 'analytics'
  | 'goals'
  | 'reports'
  | 'calendar'
  | 'settings';

export default function App() {
  const [activeTab, setActiveTab] =
    useState<Tab>('home');

  const [isQuickLogOpen, setIsQuickLogOpen] =
    useState(false);

  const [isSearchOpen, setIsSearchOpen] =
    useState(false);

  const [isDark, setIsDark] = useState(
    () =>
      localStorage.getItem('lifeos_theme') !==
      'light'
  );

  const {
    user,
    loading,
    signInWithGoogle,
    signOut,
  } = useAuth();

  const {
    settings,
    tasks,
    toggleTask,
    getTodayProgress,
    getOverallSyllabusProgress,
    getTodayWaterTotal,
    addWater,
    getTodayProteinTotal,
    getTodayStudyTimeMinutes,
    getTodayRunKm,
  } = useLifeOS();

  // ==========================================================
  // THEME
  // ==========================================================

  useEffect(() => {
    localStorage.setItem(
      'lifeos_theme',
      isDark ? 'dark' : 'light'
    );
  }, [isDark]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-2xl mx-auto mb-4">
            ⚡
          </div>

          <p className="text-sm text-slate-400">
            Loading LifeOS...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // LOGIN
  // ==========================================================

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-3xl mx-auto mb-5">
              ⚡
            </div>

            <h1 className="text-3xl font-black tracking-tight">
              LIFE OS
            </h1>

            <p className="text-slate-400 mt-2">
              Your personal command center
            </p>
          </div>

          <div className="bg-[#111622] border border-slate-800 rounded-2xl p-6 shadow-2xl">

            <h2 className="text-xl font-bold mb-2">
              Welcome to LifeOS
            </h2>

            <p className="text-sm text-slate-400 mb-6">
              Sign in to access your personal
              dashboard and keep your data synced
              across devices.
            </p>

            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 px-5 py-3 rounded-xl font-semibold transition-all"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#4285F4"
                  d="M21.35 12.23c0-.79-.07-1.55-.2-2.28H12v4.32h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.43Z"
                />

                <path
                  fill="#34A853"
                  d="M12 21.5c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.29v2.53A9.74 9.74 0 0 0 12 21.5Z"
                />

                <path
                  fill="#FBBC05"
                  d="M6.54 13.59A5.86 5.86 0 0 1 6.23 12c0-.55.11-1.09.31-1.59V7.88H3.29A9.5 9.5 0 0 0 2.25 12c0 1.53.37 2.97 1.04 4.12l3.25-2.53Z"
                />

                <path
                  fill="#EA4335"
                  d="M12 6.38c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.83 3.4 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.71 5.38l3.25 2.53C7.31 8.1 9.46 6.38 12 6.38Z"
                />
              </svg>

              Continue with Google
            </button>

          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // TODAY'S DATA
  // ==========================================================

  const todayProgress =
    getTodayProgress();

  const overallSyllabus =
    getOverallSyllabusProgress();

  const todayWater =
    getTodayWaterTotal();

  const todayProtein =
    getTodayProteinTotal();

  const todayStudyMins =
    getTodayStudyTimeMinutes();

  const todayRunKm =
    getTodayRunKm();

  // ==========================================================
  // TODAY'S TASKS ONLY
  // ==========================================================

  const todayStr =
    new Date().toISOString().split('T')[0];

  const todayTasks =
    tasks.filter(
      task =>
        task.dueDate === todayStr
    );

  const completedTodayTasks =
    todayTasks.filter(
      task => task.completed
    );

  // ==========================================================
  // THEME CLASSES
  // ==========================================================

  const bgClass = isDark
    ? 'bg-[#0A0D14] text-slate-100'
    : 'bg-slate-50 text-slate-900';

  const cardClass = isDark
    ? 'bg-[#111622] border-slate-800/80'
    : 'bg-white border-slate-200';

  const sidebarClass = isDark
    ? 'bg-[#111622] border-slate-800/60'
    : 'bg-white border-slate-200';

  // ==========================================================
  // APP
  // ==========================================================

  return (
    <div
      className={`min-h-screen flex flex-col md:flex-row font-sans transition-colors ${bgClass}`}
    >

      {/* ======================================================
          MODALS
      ====================================================== */}

      <QuickLogModal
        isOpen={isQuickLogOpen}
        onClose={() =>
          setIsQuickLogOpen(false)
        }
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() =>
          setIsSearchOpen(false)
        }
      />

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`w-full md:w-64 border-b md:border-b-0 md:border-r p-4 flex md:flex-col justify-between ${sidebarClass}`}
      >

        <div>

          {/* LOGO */}

          <div
            className={`flex items-center gap-3 px-3 py-4 border-b mb-6 ${
              isDark
                ? 'border-slate-800/60'
                : 'border-slate-200'
            }`}
          >

            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xl">
              ⚡
            </div>

            <div>

              <h1
                className={`font-bold text-lg tracking-wide ${
                  isDark
                    ? 'text-white'
                    : 'text-slate-900'
                }`}
              >
                LIFE OS
              </h1>

              <p
                className={`text-xs ${
                  isDark
                    ? 'text-slate-400'
                    : 'text-slate-500'
                }`}
              >
                Command Center
              </p>

            </div>

          </div>

          {/* NAVIGATION */}

          <nav className="space-y-1">

            {[
              {
                id: 'home',
                label: 'Home Center',
                icon: Home,
              },
              {
                id: 'study',
                label: 'Study & Syllabus',
                icon: BookOpen,
              },
              {
                id: 'fitness',
                label: 'Fitness & Diet',
                icon: Dumbbell,
              },
              {
                id: 'analytics',
                label: 'Analytics',
                icon: BarChart3,
              },
              {
                id: 'reports',
                label: 'Reports',
                icon: FileText,
              },
              {
                id: 'calendar',
                label: 'Calendar',
                icon: Calendar,
              },
              {
                id: 'goals',
                label: 'Goals & Streaks',
                icon: Target,
              },
              {
                id: 'settings',
                label: 'Settings',
                icon: Settings,
              },
            ].map(item => {

              const Icon = item.icon;

              const isActive =
                activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() =>
                    setActiveTab(
                      item.id as Tab
                    )
                  }
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : isDark
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                        : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >

                  <Icon className="w-5 h-5" />

                  {item.label}

                </button>
              );
            })}

          </nav>

        </div>

        {/* USER / SYNC */}

        <div
          className={`hidden md:block p-4 rounded-xl border ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/60'
              : 'bg-slate-100 border-slate-200'
          }`}
        >

          <div className="flex items-center justify-between mb-2">

            <span
              className={`text-xs ${
                isDark
                  ? 'text-slate-400'
                  : 'text-slate-600'
              }`}
            >
              Sync Status
            </span>

            <span className="flex items-center gap-1.5 text-xs text-emerald-500">

              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

              Live Synced

            </span>

          </div>

          <p
            className={`text-xs font-medium truncate ${
              isDark
                ? 'text-slate-300'
                : 'text-slate-700'
            }`}
          >
            {user.email}
          </p>

          <button
            onClick={signOut}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >

            <LogOut className="w-4 h-4" />

            Sign Out

          </button>

        </div>

      </aside>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">

        {/* HEADER */}

        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">

          <div>

            <div className="text-xs font-semibold text-blue-500 tracking-wider uppercase mb-1">

              {new Date().toLocaleDateString(
                'en-US',
                {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }
              )}

            </div>

            <h2
              className={`text-2xl md:text-3xl font-extrabold ${
                isDark
                  ? 'text-white'
                  : 'text-slate-900'
              }`}
            >
              WELCOME BACK,{' '}
              {settings.userName.toUpperCase()} 👋
            </h2>

          </div>

          <div className="flex items-center gap-2">

            <button
              onClick={() =>
                setIsSearchOpen(true)
              }
              className={`p-2.5 rounded-xl border transition-all ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Global Search"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              onClick={() =>
                setIsDark(!isDark)
              }
              className={`p-2.5 rounded-xl border transition-all ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Toggle Theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={() =>
                setIsQuickLogOpen(true)
              }
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/25 transition-all"
            >
              <Plus className="w-5 h-5" />
              Quick Log
            </button>

          </div>

        </header>

        {/* ====================================================
            HOME
        ==================================================== */}

        {activeTab === 'home' && (

          <div className="space-y-8">

            {/* DISCIPLINE */}

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/60 border border-blue-500/20 p-6 md:p-8">

              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

                <div>

                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">

                    <Activity className="w-3.5 h-3.5" />

                    TODAY'S OVERALL DISCIPLINE SCORE

                  </div>

                  <h3 className="text-4xl md:text-5xl font-black text-white tracking-tight">

                    {todayProgress}%

                    <span className="text-lg text-slate-400 font-normal">
                      {' '}
                      Completed
                    </span>

                  </h3>

                  <p className="text-sm text-slate-400 mt-2 max-w-xl">
                    Calculated automatically from
                    your actual Study, Running,
                    Nutrition, Water and Tasks.
                  </p>

                </div>

                {/* SYLLABUS */}

                <div className="w-full md:w-64 bg-slate-900/80 p-4 rounded-xl border border-slate-800">

                  <div className="flex justify-between text-xs mb-2">

                    <span className="text-slate-400">
                      Exam Preparation
                    </span>

                    <span className="text-blue-400 font-bold">
                      {overallSyllabus}%
                    </span>

                  </div>

                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">

                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      style={{
                        width: `${overallSyllabus}%`,
                      }}
                    />

                  </div>

                  <p className="text-[11px] text-slate-400 mt-2">
                    Your syllabus progress
                  </p>

                </div>

              </div>

            </div>

            {/* METRICS */}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              {/* STUDY */}

              <div
                className={`p-5 rounded-2xl border ${cardClass}`}
              >

                <div
                  className={`flex items-center justify-between mb-3 ${
                    isDark
                      ? 'text-slate-400'
                      : 'text-slate-500'
                  }`}
                >
                  <span className="text-xs font-medium">
                    Study Today
                  </span>

                  <BookOpen className="w-4 h-4 text-blue-400" />
                </div>

                <div
                  className={`text-2xl font-bold ${
                    isDark
                      ? 'text-white'
                      : 'text-slate-900'
                  }`}
                >
                  {(todayStudyMins / 60).toFixed(1)} h
                </div>

                <div
                  className={`text-xs mt-1 ${
                    isDark
                      ? 'text-slate-400'
                      : 'text-slate-500'
                  }`}
                >
                  Target:{' '}
                  {settings.dailyStudyTargetHours}{' '}
                  hours
                </div>

              </div>

              {/* RUNNING */}

              <div
                className={`p-5 rounded-2xl border ${cardClass}`}
              >

                <div
                  className={`flex items-center justify-between mb-3 ${
                    isDark
                      ? 'text-slate-400'
                      : 'text-slate-500'
                  }`}
                >
                  <span className="text-xs font-medium">
                    Running
                  </span>

                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>

                <div
                  className={`text-2xl font-bold ${
                    isDark
                      ? 'text-white'
                      : 'text-slate-900'
                  }`}
                >
                  {todayRunKm} km
                </div>

                <div
                  className={`text-xs mt-1 ${
                    isDark
                      ? 'text-slate-400'
                      : 'text-slate-500'
                  }`}
                >
                  Target:{' '}
                  {settings.dailyRunTargetKm} km
                </div>

              </div>

              {/* PROTEIN */}

              <div
                className={`p-5 rounded-2xl border ${cardClass}`}
              >

                <div
                  className={`flex items-center justify-between mb-3 ${
                    isDark
                      ? 'text-slate-400'
                      : 'text-slate-500'
                  }`}
                >
                  <span className="text-xs font-medium">
                    Protein
                  </span>

                  <Flame className="w-4 h-4 text-amber-400" />
                </div>

                <div
                  className={`text-2xl font-bold ${
                    isDark
                      ? 'text-white'
                      : 'text-slate-900'
                  }`}
                >
                  {todayProtein}g
                </div>

                <div
                  className={`text-xs mt-1 ${
                    isDark
                      ? 'text-slate-400'
                      : 'text-slate-500'
                  }`}
                >
                  Target:{' '}
                  {settings.dailyProteinTargetGrams}g
                </div>

              </div>

              {/* WATER */}

              <div
                className={`p-5 rounded-2xl border ${cardClass}`}
              >

                <div
                  className={`flex items-center justify-between mb-3 ${
                    isDark
                      ? 'text-slate-400'
                      : 'text-slate-500'
                  }`}
                >
                  <span className="text-xs font-medium">
                    Water Intake
                  </span>

                  <Droplets className="w-4 h-4 text-cyan-400" />
                </div>

                <div
                  className={`text-2xl font-bold ${
                    isDark
                      ? 'text-white'
                      : 'text-slate-900'
                  }`}
                >
                  {(todayWater / 1000).toFixed(1)}L
                </div>

                <div className="flex items-center justify-between mt-1">

                  <span
                    className={`text-xs ${
                      isDark
                        ? 'text-slate-400'
                        : 'text-slate-500'
                    }`}
                  >
                    Target:{' '}
                    {settings.dailyWaterTargetLiters}L
                  </span>

                  <button
                    onClick={() =>
                      addWater(250)
                    }
                    className="text-[10px] bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 px-2 py-0.5 rounded font-bold"
                  >
                    +250ml
                  </button>

                </div>

              </div>

            </div>

            {/* ==================================================
                TODAY'S TASKS
            ================================================== */}

            <div
              className={`rounded-2xl border p-6 ${cardClass}`}
            >

              <div className="flex items-center justify-between mb-6">

                <div>

                  <h3
                    className={`text-lg font-bold ${
                      isDark
                        ? 'text-white'
                        : 'text-slate-900'
                    }`}
                  >
                    Today's Mission Tasks
                  </h3>

                  <p
                    className={`text-xs ${
                      isDark
                        ? 'text-slate-400'
                        : 'text-slate-500'
                    }`}
                  >
                    Complete today's tasks to
                    improve your discipline score.
                  </p>

                </div>

                <span
                  className={`text-xs px-3 py-1 rounded-full ${
                    isDark
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {completedTodayTasks.length} /{' '}
                  {todayTasks.length} Done
                </span>

              </div>

              <div className="space-y-3">

                {todayTasks.length === 0 ? (

                  <div
                    className={`text-center py-10 rounded-xl border border-dashed ${
                      isDark
                        ? 'border-slate-800 text-slate-500'
                        : 'border-slate-200 text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />

                    <p className="text-sm">
                      No tasks scheduled for today.
                    </p>

                    <p className="text-xs mt-1 opacity-70">
                      Add a task to start building
                      today's discipline score.
                    </p>

                  </div>

                ) : (

                  todayTasks.map(task => (

                    <div
                      key={task.id}
                      onClick={() =>
                        toggleTask(task.id)
                      }
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                        task.completed
                          ? isDark
                            ? 'bg-slate-900/40 border-slate-800/40 opacity-60'
                            : 'bg-slate-100 border-slate-200 opacity-60'
                          : isDark
                            ? 'bg-slate-800/30 border-slate-800 hover:border-slate-700'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >

                      <div className="flex items-center gap-3">

                        <CheckCircle2
                          className={`w-5 h-5 ${
                            task.completed
                              ? 'text-emerald-400'
                              : isDark
                                ? 'text-slate-600'
                                : 'text-slate-400'
                          }`}
                        />

                        <span
                          className={`text-sm font-medium ${
                            task.completed
                              ? 'line-through text-slate-400'
                              : isDark
                                ? 'text-slate-200'
                                : 'text-slate-800'
                          }`}
                        >
                          {task.title}
                        </span>

                      </div>

                      <span
                        className={`text-xs px-2.5 py-1 rounded-lg uppercase font-semibold ${
                          task.priority === 'high'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : task.priority === 'medium'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-blue-500/10 text-blue-400'
                        }`}
                      >
                        {task.priority}
                      </span>

                    </div>

                  ))

                )}

              </div>

            </div>

          </div>

        )}

        {/* ======================================================
            OTHER VIEWS
        ====================================================== */}

        {activeTab === 'study' && (
          <StudyView />
        )}

        {activeTab === 'fitness' && (
          <FitnessView />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView />
        )}

        {activeTab === 'reports' && (
          <ReportsView />
        )}

        {activeTab === 'calendar' && (
          <CalendarView />
        )}

        {activeTab === 'goals' && (
          <GoalsView />
        )}

        {activeTab === 'settings' && (
          <SettingsView />
        )}

      </main>

    </div>
  );
}