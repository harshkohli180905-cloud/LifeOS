import { useState } from 'react';
import { useLifeOS } from '../context/useLifeOS';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarView() {
  const { studySessions, runs, workouts, meals, tasks } = useLifeOS();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const getDayActivity = (day: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const study = studySessions.filter(s => s.date === dStr).reduce((a, s) => a + s.durationMinutes, 0);
    const run = runs.filter(r => r.date === dStr).reduce((a, r) => a + r.distanceKm, 0);
    const workout = workouts.filter(w => w.date === dStr).length;
    const meal = meals.filter(m => m.date === dStr).length;
    const total = study + (run * 10) + (workout * 30) + (meal * 5);
    return { dStr, study, run, workout, meal, total };
  };

  const getIntensity = (total: number) => {
    if (total === 0) return 'bg-slate-900';
    if (total < 60) return 'bg-blue-900/40';
    if (total < 120) return 'bg-blue-700/50';
    if (total < 180) return 'bg-blue-500/60';
    return 'bg-blue-400/80';
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const selectedDayActivity = selectedDate ? {
    study: studySessions.filter(s => s.date === selectedDate),
    runs: runs.filter(r => r.date === selectedDate),
    workouts: workouts.filter(w => w.date === selectedDate),
    meals: meals.filter(m => m.date === selectedDate),
    tasks: tasks.filter(t => t.dueDate === selectedDate),
  } : null;

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="bg-[#111622] rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="p-2 rounded-lg hover:bg-slate-800"
          >
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <h3 className="text-xl font-bold text-white">{monthNames[month]} {year}</h3>
          <button 
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="p-2 rounded-lg hover:bg-slate-800"
          >
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-bold text-slate-500 py-2">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const activity = getDayActivity(day);
            const isSelected = selectedDate === activity.dStr;
            return (
              <button
                key={day}
                onClick={() => setSelectedDate(activity.dStr)}
                className={`aspect-square rounded-lg text-xs font-bold transition-all border-2 ${
                  isSelected
                    ? 'border-blue-400 text-white bg-blue-600'
                    : `border-transparent text-slate-300 hover:border-slate-700 ${getIntensity(activity.total)}`
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-6 text-[10px] text-slate-400">
          <span>Less</span>
          <div className="w-4 h-4 rounded bg-slate-900"></div>
          <div className="w-4 h-4 rounded bg-blue-900/40"></div>
          <div className="w-4 h-4 rounded bg-blue-700/50"></div>
          <div className="w-4 h-4 rounded bg-blue-500/60"></div>
          <div className="w-4 h-4 rounded bg-blue-400/80"></div>
          <span>More Activity</span>
        </div>
      </div>

      {/* Selected Day Details */}
      {selectedDayActivity && (
        <div className="bg-[#111622] rounded-2xl border border-slate-800 p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            Activity on {selectedDate}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="text-xs text-slate-400 mb-2">📚 Study Sessions</div>
              {selectedDayActivity.study.length === 0 ? (
                <p className="text-sm text-slate-500">No sessions</p>
              ) : (
                selectedDayActivity.study.map(s => (
                  <div key={s.id} className="text-sm text-white">
                    {s.subjectName} — <span className="text-blue-400">{s.durationMinutes} min</span>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="text-xs text-slate-400 mb-2">🏃 Runs</div>
              {selectedDayActivity.runs.length === 0 ? (
                <p className="text-sm text-slate-500">No runs</p>
              ) : (
                selectedDayActivity.runs.map(r => (
                  <div key={r.id} className="text-sm text-white">
                    {r.distanceKm} km — <span className="text-emerald-400">{r.durationMinutes} min</span>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="text-xs text-slate-400 mb-2">🏋️ Workouts</div>
              {selectedDayActivity.workouts.length === 0 ? (
                <p className="text-sm text-slate-500">No workouts</p>
              ) : (
                selectedDayActivity.workouts.map(w => (
                  <div key={w.id} className="text-sm text-white">
                    {w.routineName} — <span className="text-indigo-400">{w.totalVolumeKg} kg</span>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="text-xs text-slate-400 mb-2">🥗 Meals</div>
              {selectedDayActivity.meals.length === 0 ? (
                <p className="text-sm text-slate-500">No meals logged</p>
              ) : (
                selectedDayActivity.meals.map(m => (
                  <div key={m.id} className="text-sm text-white">
                    {m.foodName} — <span className="text-amber-400">{m.calories} kcal</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}