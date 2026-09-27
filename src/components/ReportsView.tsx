import { useState } from 'react';
import { useLifeOS } from '../context/useLifeOS';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function ReportsView() {
  const { studySessions, runs, workouts, meals, tasks, waterLogs } = useLifeOS();
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('week');

  const now = new Date();
  const getDaysAgo = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const periodDays = { day: 1, week: 7, month: 30, year: 365 };
  const days = periodDays[period];
  const cutoffDate = getDaysAgo(days);
  const prevCutoffDate = getDaysAgo(days * 2);

  const filterByPeriod = <T extends { date: string }>(items: T[], from: string, to: string) => {
    return items.filter(i => i.date >= from && i.date < to);
  };

  const todayStr = now.toISOString().split('T')[0];
  const currentStudy = filterByPeriod(studySessions, cutoffDate, todayStr).reduce((a, s) => a + s.durationMinutes, 0);
  const currentRuns = filterByPeriod(runs, cutoffDate, todayStr).reduce((a, r) => a + r.distanceKm, 0);
  const currentWorkouts = filterByPeriod(workouts, cutoffDate, todayStr).length;
  const currentMeals = filterByPeriod(meals, cutoffDate, todayStr);
  const currentProtein = currentMeals.reduce((a, m) => a + m.proteinGrams, 0);
  const currentCals = currentMeals.reduce((a, m) => a + m.calories, 0);
  const currentWater = filterByPeriod(waterLogs, cutoffDate, todayStr).reduce((a, w) => a + w.amountMl, 0);
  const currentTasks = tasks.filter(t => t.dueDate >= cutoffDate && t.completed).length;

  const prevStudy = filterByPeriod(studySessions, prevCutoffDate, cutoffDate).reduce((a, s) => a + s.durationMinutes, 0);
  const prevRuns = filterByPeriod(runs, prevCutoffDate, cutoffDate).reduce((a, r) => a + r.distanceKm, 0);

  const getTrend = (current: number, prev: number) => {
    if (prev === 0) return { pct: 0, direction: 'same' as const };
    const pct = Math.round(((current - prev) / prev) * 100);
    return { pct, direction: pct > 0 ? 'up' as const : pct < 0 ? 'down' as const : 'same' as const };
  };

  const studyTrend = getTrend(currentStudy, prevStudy);
  const runTrend = getTrend(currentRuns, prevRuns);

  const TrendIcon = ({ trend }: { trend: { direction: 'up' | 'down' | 'same' } }) => {
    if (trend.direction === 'up') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (trend.direction === 'down') return <TrendingDown className="w-4 h-4 text-rose-400" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="grid grid-cols-4 gap-2 bg-[#111622] p-1.5 rounded-2xl border border-slate-800">
        {(['day', 'week', 'month', 'year'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
              period === p 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Period Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-900/60 rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold tracking-wider uppercase mb-2">
          <Calendar className="w-4 h-4" />
          {period.toUpperCase()}LY REPORT
        </div>
        <h3 className="text-2xl font-black text-white">
          Last {days} {days === 1 ? 'Day' : 'Days'} Overview
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Comparing {cutoffDate} to {todayStr}
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400">Study Hours</span>
          <div className="text-2xl font-black text-blue-400 mt-1">{(currentStudy / 60).toFixed(1)}h</div>
          <div className="flex items-center gap-1 mt-2 text-xs">
            <TrendIcon trend={studyTrend} />
            <span className={studyTrend.direction === 'up' ? 'text-emerald-400' : studyTrend.direction === 'down' ? 'text-rose-400' : 'text-slate-400'}>
              {studyTrend.pct > 0 ? '+' : ''}{studyTrend.pct}% vs previous
            </span>
          </div>
        </div>

        <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400">Distance Run</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">{currentRuns.toFixed(1)} km</div>
          <div className="flex items-center gap-1 mt-2 text-xs">
            <TrendIcon trend={runTrend} />
            <span className={runTrend.direction === 'up' ? 'text-emerald-400' : runTrend.direction === 'down' ? 'text-rose-400' : 'text-slate-400'}>
              {runTrend.pct > 0 ? '+' : ''}{runTrend.pct}% vs previous
            </span>
          </div>
        </div>

        <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400">Workouts</span>
          <div className="text-2xl font-black text-indigo-400 mt-1">{currentWorkouts}</div>
          <div className="text-xs text-slate-500 mt-2">Total sessions</div>
        </div>

        <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400">Tasks Done</span>
          <div className="text-2xl font-black text-amber-400 mt-1">{currentTasks}</div>
          <div className="text-xs text-slate-500 mt-2">Completed items</div>
        </div>
      </div>

      {/* Nutrition Summary */}
      <div className="bg-[#111622] p-6 rounded-2xl border border-slate-800">
        <h3 className="text-md font-bold text-white mb-4">Nutrition Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
            <div className="text-xl font-black text-amber-400">{currentCals}</div>
            <div className="text-xs text-slate-400">Total Calories</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
            <div className="text-xl font-black text-rose-400">{currentProtein}g</div>
            <div className="text-xs text-slate-400">Total Protein</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
            <div className="text-xl font-black text-cyan-400">{(currentWater / 1000).toFixed(1)}L</div>
            <div className="text-xs text-slate-400">Water Intake</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
            <div className="text-xl font-black text-purple-400">{currentMeals.length}</div>
            <div className="text-xs text-slate-400">Meals Logged</div>
          </div>
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="bg-[#111622] p-6 rounded-2xl border border-slate-800">
        <h3 className="text-md font-bold text-white mb-4">Daily Activity Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-left">
                <th className="pb-2">Date</th>
                <th className="pb-2">Study</th>
                <th className="pb-2">Run (km)</th>
                <th className="pb-2">Workout</th>
                <th className="pb-2">Calories</th>
                <th className="pb-2">Protein</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {Array.from({ length: Math.min(days, 14) }).map((_, i) => {
                const d = getDaysAgo(i);
                const dayStudy = studySessions.filter(s => s.date === d).reduce((a, s) => a + s.durationMinutes, 0);
                const dayRun = runs.filter(r => r.date === d).reduce((a, r) => a + r.distanceKm, 0);
                const dayWorkout = workouts.filter(w => w.date === d).length;
                const dayMeals = meals.filter(m => m.date === d);
                const dayCals = dayMeals.reduce((a, m) => a + m.calories, 0);
                const dayProt = dayMeals.reduce((a, m) => a + m.proteinGrams, 0);
                return (
                  <tr key={d} className="border-b border-slate-800/40">
                    <td className="py-2 font-semibold">{d}</td>
                    <td className="py-2 text-blue-400">{(dayStudy / 60).toFixed(1)}h</td>
                    <td className="py-2 text-emerald-400">{dayRun}</td>
                    <td className="py-2 text-indigo-400">{dayWorkout}</td>
                    <td className="py-2 text-amber-400">{dayCals}</td>
                    <td className="py-2 text-rose-400">{dayProt}g</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}