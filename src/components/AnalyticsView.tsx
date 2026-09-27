import { useLifeOS } from '../context/useLifeOS';
import { BookOpen, Activity, Flame, CheckCircle2, TrendingUp, BarChart3 } from 'lucide-react';

export default function AnalyticsView() {
  const {
    studySessions, runs, workouts, meals, tasks, subjects, settings,
    getTodayProgress, getOverallSyllabusProgress, getTodayStudyTimeMinutes,
    getTodayRunKm, getTodayProteinTotal, getTodayCaloriesTotal, getTodayWaterTotal
  } = useLifeOS();

  const todayProgress = getTodayProgress();
  const overallSyllabus = getOverallSyllabusProgress();
  const totalStudyMins = studySessions.reduce((a, s) => a + s.durationMinutes, 0);
  const totalRunKm = runs.reduce((a, r) => a + r.distanceKm, 0);
  const totalVolume = workouts.reduce((a, w) => a + w.totalVolumeKg, 0);
  const totalProtein = meals.reduce((a, m) => a + m.proteinGrams, 0);
  const tasksDone = tasks.filter(t => t.completed).length;
  const taskRate = tasks.length > 0 ? Math.round((tasksDone / tasks.length) * 100) : 0;

  // Subject-wise study time
  const subjectTime: Record<string, number> = {};
  studySessions.forEach(s => {
    subjectTime[s.subjectName] = (subjectTime[s.subjectName] || 0) + s.durationMinutes;
  });

  const insights = [
    `You studied ${(totalStudyMins / 60).toFixed(1)} hours total across ${studySessions.length} sessions.`,
    `Economics / Maths syllabus is at ${overallSyllabus}% overall preparation.`,
    `You ran ${totalRunKm.toFixed(1)} km across ${runs.length} runs.`,
    `Gym total volume: ${totalVolume.toLocaleString()} kg lifted.`,
    `Average protein logged: ${meals.length ? Math.round(totalProtein / Math.max(1, meals.length)) : 0}g per meal.`,
    `Task completion rate: ${taskRate}% (${tasksDone}/${tasks.length}).`,
    `Today's discipline score is ${todayProgress}%.`,
  ];

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <BookOpen className="w-4 h-4 text-blue-400" /> Total Study
          </div>
          <div className="text-2xl font-black text-white">{(totalStudyMins / 60).toFixed(1)}h</div>
          <div className="text-xs text-slate-500 mt-1">{studySessions.length} sessions</div>
        </div>

        <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <Activity className="w-4 h-4 text-emerald-400" /> Total Running
          </div>
          <div className="text-2xl font-black text-white">{totalRunKm.toFixed(1)} km</div>
          <div className="text-xs text-slate-500 mt-1">{runs.length} runs</div>
        </div>

        <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <Flame className="w-4 h-4 text-indigo-400" /> Gym Volume
          </div>
          <div className="text-2xl font-black text-white">{(totalVolume / 1000).toFixed(1)}t</div>
          <div className="text-xs text-slate-500 mt-1">{workouts.length} workouts</div>
        </div>

        <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400" /> Tasks Done
          </div>
          <div className="text-2xl font-black text-white">{taskRate}%</div>
          <div className="text-xs text-slate-500 mt-1">{tasksDone}/{tasks.length} completed</div>
        </div>
      </div>

      {/* Performance Scores */}
      <div className="bg-[#111622] rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold text-white">Personal Performance Scores</h3>
        </div>

        <div className="space-y-5">
          {[
            { label: '📚 STUDY', value: Math.min(100, Math.round((getTodayStudyTimeMinutes() / 60 / settings.dailyStudyTargetHours) * 100)), color: 'from-blue-500 to-blue-400' },
            { label: '🏋️ FITNESS', value: Math.min(100, Math.round((getTodayRunKm() / settings.dailyRunTargetKm) * 100)), color: 'from-emerald-500 to-emerald-400' },
            { label: '🥗 NUTRITION', value: Math.min(100, Math.round((getTodayProteinTotal() / settings.dailyProteinTargetGrams) * 100)), color: 'from-amber-500 to-amber-400' },
            { label: '📋 DISCIPLINE', value: todayProgress, color: 'from-indigo-500 to-indigo-400' },
            { label: '📖 SYLLABUS', value: overallSyllabus, color: 'from-violet-500 to-violet-400' },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300">{item.label}</span>
                <span className="font-bold text-white">{item.value}%</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subject Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#111622] rounded-2xl border border-slate-800 p-6">
          <h3 className="text-md font-bold text-white mb-4">Subject-wise Study Time</h3>
          <div className="space-y-3">
            {Object.keys(subjectTime).length === 0 && (
              <p className="text-sm text-slate-500">No study sessions yet. Start the Focus Timer!</p>
            )}
            {Object.entries(subjectTime).map(([name, mins]) => (
              <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                <span className="text-sm font-medium text-slate-200">{name}</span>
                <span className="text-sm font-bold text-blue-400">{(mins / 60).toFixed(1)}h ({mins}m)</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111622] rounded-2xl border border-slate-800 p-6">
          <h3 className="text-md font-bold text-white mb-4">Syllabus by Subject</h3>
          <div className="space-y-3">
            {subjects.map((sub) => {
              let total = 0;
              let done = 0;
              sub.units.forEach(u => u.chapters.forEach(c => c.topics.forEach(t => {
                total++;
                if (t.status === 'completed' || t.status === 'revision_due' || t.status === 'revision_completed') done++;
              })));
              const pct = total === 0 ? 0 : Math.round((done / total) * 100);
              return (
                <div key={sub.id} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-slate-200">{sub.name}</span>
                    <span className="font-bold" style={{ color: sub.color }}>{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: sub.color }} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{done}/{total} topics</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Smart Insights */}
      <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/20 rounded-2xl border border-blue-500/20 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold text-white">Smart Insights</h3>
        </div>
        <div className="space-y-2">
          {insights.map((text, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
              <span className="text-blue-400 font-bold text-xs mt-0.5">{i + 1}.</span>
              <p className="text-sm text-slate-300">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Today Snapshot */}
      <div className="bg-[#111622] rounded-2xl border border-slate-800 p-6">
        <h3 className="text-md font-bold text-white mb-4">Today Snapshot</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="text-lg font-black text-blue-400">{(getTodayStudyTimeMinutes() / 60).toFixed(1)}h</div>
            <div className="text-[11px] text-slate-500">Study</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="text-lg font-black text-emerald-400">{getTodayRunKm()}km</div>
            <div className="text-[11px] text-slate-500">Run</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="text-lg font-black text-rose-400">{getTodayProteinTotal()}g</div>
            <div className="text-[11px] text-slate-500">Protein</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="text-lg font-black text-amber-400">{getTodayCaloriesTotal()}</div>
            <div className="text-[11px] text-slate-500">Calories</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="text-lg font-black text-cyan-400">{(getTodayWaterTotal() / 1000).toFixed(1)}L</div>
            <div className="text-[11px] text-slate-500">Water</div>
          </div>
        </div>
      </div>
    </div>
  );
}