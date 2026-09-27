import { useState } from 'react';
import { useLifeOS } from '../context/useLifeOS';
import { X, BookOpen, Activity, Flame, Droplets, CheckSquare } from 'lucide-react';

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickLogModal({ isOpen, onClose }: QuickLogModalProps) {
  const { subjects, addStudySession, addRun, addMeal, addWater, addTask } = useLifeOS();
  const [logType, setModalLogType] = useState<'study' | 'run' | 'meal' | 'water' | 'task'>('study');

  // Form states
  const [studySubjectId, setStudySubjectId] = useState(subjects[0]?.id || '');
  const [studyTopic, setStudyTopic] = useState('');
  const [studyMins, setStudyMins] = useState(45);

  const [runDistance, setRunDistance] = useState(5.0);
  const [runMins, setRunMins] = useState(27);

  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState(600);
  const [protein, setProtein] = useState(40);

  const [waterMl, setWaterMl] = useState(500);

  const [taskTitle, setTaskCategory] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('high');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];

    if (logType === 'study') {
      const sub = subjects.find(s => s.id === studySubjectId);
      addStudySession({
        subjectId: studySubjectId,
        subjectName: sub ? sub.name : 'General Study',
        topicTitle: studyTopic || 'General Study',
        durationMinutes: Number(studyMins),
        date: today
      });
    } else if (logType === 'run') {
      addRun({
        date: today,
        distanceKm: Number(runDistance),
        durationMinutes: Number(runMins),
        avgPace: `${(runMins / runDistance).toFixed(2)} min/km`,
        calories: Math.round(runDistance * 75)
      });
    } else if (logType === 'meal') {
      if (!foodName) return;
      addMeal({
        date: today,
        mealType: 'Lunch',
        foodName,
        calories: Number(calories),
        proteinGrams: Number(protein),
        carbsGrams: 50,
        fatGrams: 15
      });
    } else if (logType === 'water') {
      addWater(Number(waterMl));
    } else if (logType === 'task') {
      if (!taskTitle) return;
      addTask({
        title: taskTitle,
        category: 'study',
        priority: taskPriority,
        dueDate: today
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111622] border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-4">Quick Performance Log</h3>

        {/* Tab Selection */}
        <div className="grid grid-cols-5 gap-1 bg-slate-900/80 p-1 rounded-xl mb-6 border border-slate-800">
          {[
            { id: 'study', label: 'Study', icon: BookOpen },
            { id: 'run', label: 'Run', icon: Activity },
            { id: 'meal', label: 'Food', icon: Flame },
            { id: 'water', label: 'Water', icon: Droplets },
            { id: 'task', label: 'Task', icon: CheckSquare },
          ].map((item) => {
            const Icon = item.icon;
            const active = logType === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setModalLogType(item.id as any)}
                className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs font-medium transition-all ${
                  active ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                {item.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {logType === 'study' && (
            <>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Subject</label>
                <select
                  value={studySubjectId}
                  onChange={(e) => setStudySubjectId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Topic / Chapter Name</label>
                <input
                  type="text"
                  placeholder="e.g. Consumer Theory & Demand"
                  value={studyTopic}
                  onChange={(e) => setStudyTopic(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  value={studyMins}
                  onChange={(e) => setStudyMins(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          {logType === 'run' && (
            <>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Distance (KM)</label>
                <input
                  type="number"
                  step="0.1"
                  value={runDistance}
                  onChange={(e) => setRunDistance(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  value={runMins}
                  onChange={(e) => setRunMins(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          {logType === 'meal' && (
            <>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Food / Meal Description</label>
                <input
                  type="text"
                  placeholder="e.g. 4 Eggs, Oats & Whey Protein"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Calories (kcal)</label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Protein (Grams)</label>
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {logType === 'water' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Water Amount (ml)</label>
              <div className="grid grid-cols-3 gap-2">
                {[250, 500, 750].map((amt) => (
                  <button
                    type="button"
                    key={amt}
                    onClick={() => setWaterMl(amt)}
                    className={`py-2 rounded-xl text-sm font-semibold border ${
                      waterMl === amt ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    +{amt} ml
                  </button>
                ))}
              </div>
            </div>
          )}

          {logType === 'task' && (
            <>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Revise Economics IS-LM Model"
                  value={taskTitle}
                  onChange={(e) => setTaskCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="high">🔴 High Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="low">🟢 Low Priority</option>
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-blue-600/25 transition-all"
          >
            Save Entry
          </button>
        </form>
      </div>
    </div>
  );
}