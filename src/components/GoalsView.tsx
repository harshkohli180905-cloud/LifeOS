import { useLifeOS } from '../context/useLifeOS';
import { Target, Flame, Trophy, CheckCircle2, Zap } from 'lucide-react';

export default function GoalsView() {
  const { goals, habits, toggleHabitToday, settings, getOverallSyllabusProgress, runs, workouts, studySessions } = useLifeOS();
  const today = new Date().toISOString().split('T')[0];
  const overallSyllabus = getOverallSyllabusProgress();

  const totalStudyHours = Math.round(studySessions.reduce((a, s) => a + s.durationMinutes, 0) / 60);
  const totalRunKm = Math.round(runs.reduce((a, r) => a + r.distanceKm, 0));
  const totalWorkouts = workouts.length;

  const achievements = [
    { title: 'First Study Session', unlocked: studySessions.length >= 1, icon: '📚' },
    { title: '10 Hours Studied', unlocked: totalStudyHours >= 10, icon: '⏱️' },
    { title: '50 Hours Studied', unlocked: totalStudyHours >= 50, icon: '🏆' },
    { title: 'First 5K Run', unlocked: runs.some(r => r.distanceKm >= 5), icon: '🏃' },
    { title: '50 KM Total Running', unlocked: totalRunKm >= 50, icon: '🔥' },
    { title: '10 Workouts', unlocked: totalWorkouts >= 10, icon: '🏋️' },
    { title: 'Syllabus 50%', unlocked: overallSyllabus >= 50, icon: '📖' },
    { title: '7-Day Habit Streak', unlocked: habits.some(h => h.streak >= 7), icon: '⚡' },
  ];

  return (
    <div className="space-y-8">
      {/* Long-term Goals */}
      <div className="bg-[#111622] rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold text-white">Long-term Goals</h3>
        </div>

        <div className="space-y-4">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
            return (
              <div key={g.id} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-white text-sm">{g.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Deadline: {g.deadline} · {g.category.toUpperCase()}
                    </div>
                  </div>
                  <span className="text-sm font-black text-blue-400">
                    {g.currentValue}/{g.targetValue} {g.unit}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500 mt-1.5">{pct}% complete</div>
              </div>
            );
          })}

          {/* Live computed goals */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-bold text-white text-sm">Overall Exam Syllabus</div>
                <div className="text-xs text-slate-400 mt-0.5">Auto-calculated from topics</div>
              </div>
              <span className="text-sm font-black text-violet-400">{overallSyllabus}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full" style={{ width: `${overallSyllabus}%` }} />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-bold text-white text-sm">Total Running Distance</div>
                <div className="text-xs text-slate-400 mt-0.5">Lifetime km target: 100 km</div>
              </div>
              <span className="text-sm font-black text-emerald-400">{totalRunKm}/100 km</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full" style={{ width: `${Math.min(100, totalRunKm)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Habit Tracker + Streaks */}
      <div className="bg-[#111622] rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Flame className="w-5 h-5 text-orange-400" />
          <h3 className="text-lg font-bold text-white">Habits & Streaks</h3>
        </div>

        <div className="space-y-3">
          {habits.map((h) => {
            const doneToday = h.completedDates.includes(today);
            return (
              <div
                key={h.id}
                onClick={() => toggleHabitToday(h.id)}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  doneToday
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className={`w-5 h-5 ${doneToday ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <div>
                    <div className={`text-sm font-bold ${doneToday ? 'text-emerald-300' : 'text-white'}`}>{h.name}</div>
                    <div className="text-xs text-slate-400">{h.category}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-black text-orange-400">{h.streak} day streak</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-[#111622] rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-white">Achievements</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {achievements.map((a) => (
            <div
              key={a.title}
              className={`p-4 rounded-xl border text-center transition-all ${
                a.unlocked
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-slate-900/40 border-slate-800 opacity-50'
              }`}
            >
              <div className="text-2xl mb-2">{a.icon}</div>
              <div className={`text-xs font-bold ${a.unlocked ? 'text-amber-300' : 'text-slate-500'}`}>
                {a.title}
              </div>
              {a.unlocked && (
                <div className="text-[10px] text-amber-500 mt-1 font-semibold">UNLOCKED</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Profile Summary */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-900/60 rounded-2xl border border-slate-800 p-6">
        <h3 className="text-md font-bold text-white mb-4">Profile Snapshot — {settings.userName}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-black text-blue-400">{totalStudyHours}h</div>
            <div className="text-xs text-slate-500">Study Hours</div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400">{totalRunKm}km</div>
            <div className="text-xs text-slate-500">Distance Run</div>
          </div>
          <div>
            <div className="text-2xl font-black text-indigo-400">{totalWorkouts}</div>
            <div className="text-xs text-slate-500">Workouts</div>
          </div>
          <div>
            <div className="text-2xl font-black text-violet-400">{overallSyllabus}%</div>
            <div className="text-xs text-slate-500">Syllabus</div>
          </div>
        </div>
      </div>
    </div>
  );
}