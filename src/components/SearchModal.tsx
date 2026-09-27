import { useState } from 'react';
import { useLifeOS } from '../context/useLifeOS';
import { X, Search, BookOpen, CheckSquare, Activity, Dumbbell, Flame } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { subjects, tasks, runs, workouts, meals } = useLifeOS();
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const topicResults = q ? subjects.flatMap(sub => 
    sub.units.flatMap(u => u.chapters.flatMap(c => c.topics.filter(t => 
      t.title.toLowerCase().includes(q)
    ).map(t => ({ ...t, subjectName: sub.name, chapterTitle: c.title }))))
  ) : [];

  const taskResults = q ? tasks.filter(t => t.title.toLowerCase().includes(q)) : [];
  const runResults = q ? runs.filter(r => (r.routeLocation || '').toLowerCase().includes(q) || r.date.includes(q)) : [];
  const workoutResults = q ? workouts.filter(w => w.routineName.toLowerCase().includes(q)) : [];
  const mealResults = q ? meals.filter(m => m.foodName.toLowerCase().includes(q)) : [];

  const totalResults = topicResults.length + taskResults.length + runResults.length + workoutResults.length + mealResults.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-24">
      <div className="bg-[#111622] border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-800 p-4">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            placeholder="Search topics, tasks, meals, workouts, runs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white outline-none text-sm"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {q === '' && (
            <p className="text-sm text-slate-500 text-center py-8">Start typing to search everything...</p>
          )}

          {q !== '' && totalResults === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">No results found for "{query}"</p>
          )}

          {topicResults.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1"><BookOpen className="w-3 h-3" /> TOPICS</div>
              {topicResults.map(t => (
                <div key={t.id} className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 mb-1">
                  <div className="text-sm text-white font-semibold">{t.title}</div>
                  <div className="text-[11px] text-slate-500">{t.subjectName} · {t.chapterTitle}</div>
                </div>
              ))}
            </div>
          )}

          {taskResults.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1"><CheckSquare className="w-3 h-3" /> TASKS</div>
              {taskResults.map(t => (
                <div key={t.id} className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 mb-1">
                  <div className="text-sm text-white">{t.title}</div>
                  <div className="text-[11px] text-slate-500">{t.category} · {t.priority}</div>
                </div>
              ))}
            </div>
          )}

          {runResults.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1"><Activity className="w-3 h-3" /> RUNS</div>
              {runResults.map(r => (
                <div key={r.id} className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 mb-1">
                  <div className="text-sm text-white">{r.distanceKm} km · {r.durationMinutes} min</div>
                  <div className="text-[11px] text-slate-500">{r.date} · {r.routeLocation}</div>
                </div>
              ))}
            </div>
          )}

          {workoutResults.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1"><Dumbbell className="w-3 h-3" /> WORKOUTS</div>
              {workoutResults.map(w => (
                <div key={w.id} className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 mb-1">
                  <div className="text-sm text-white">{w.routineName}</div>
                  <div className="text-[11px] text-slate-500">{w.totalVolumeKg} kg volume · {w.date}</div>
                </div>
              ))}
            </div>
          )}

          {mealResults.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1"><Flame className="w-3 h-3" /> MEALS</div>
              {mealResults.map(m => (
                <div key={m.id} className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 mb-1">
                  <div className="text-sm text-white">{m.foodName}</div>
                  <div className="text-[11px] text-slate-500">{m.calories} kcal · {m.proteinGrams}g protein · {m.date}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}