import { useState } from 'react';
import { useLifeOS } from '../context/useLifeOS';
import { Activity, Dumbbell, Flame, Plus } from 'lucide-react';

export default function FitnessView() {
  const { 
    runs, workouts, meals, settings, 
    addRun, addWorkout, addMeal, addWater,
    getTodayRunKm, getTodayProteinTotal, getTodayCaloriesTotal, getTodayWaterTotal 
  } = useLifeOS();

  const [subTab, setSubTab] = useState<'running' | 'gym' | 'diet'>('running');

  // Quick form states
  const [runDist, setRunDist] = useState(5.0);
  const [runTime, setRunTime] = useState(28);

  const [routineName, setRoutineName] = useState('Push Day (Chest & Shoulders)');
  const [workoutVolume, setWorkoutVolume] = useState(4850);
  const [workoutMins, setWorkoutMins] = useState(55);

  const [foodItem, setFoodItem] = useState('');
  const [foodCals, setFoodCals] = useState(500);
  const [foodProt, setFoodProt] = useState(35);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleAddRun = (e: React.FormEvent) => {
    e.preventDefault();
    addRun({
      date: todayStr,
      distanceKm: Number(runDist),
      durationMinutes: Number(runTime),
      avgPace: `${(runTime / runDist).toFixed(2)} min/km`,
      calories: Math.round(runDist * 75),
      routeLocation: 'Local Track / Road'
    });
    alert('🏃 Run Logged Successfully!');
  };

  const handleAddWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    addWorkout({
      date: todayStr,
      routineName,
      durationMinutes: Number(workoutMins),
      totalVolumeKg: Number(workoutVolume)
    });
    alert('🏋️ Workout Logged Successfully!');
  };

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodItem) return;
    addMeal({
      date: todayStr,
      mealType: 'Lunch',
      foodName: foodItem,
      calories: Number(foodCals),
      proteinGrams: Number(foodProt),
      carbsGrams: 50,
      fatGrams: 15
    });
    setFoodItem('');
    alert('🥗 Meal Logged Successfully!');
  };

  const todayRun = getTodayRunKm();
  const todayProtein = getTodayProteinTotal();
  const todayCals = getTodayCaloriesTotal();
  const todayWaterL = getTodayWaterTotal() / 1000;

  return (
    <div className="space-y-8">
      {/* Sub Section Header Tabs */}
      <div className="grid grid-cols-3 gap-2 bg-[#111622] p-1.5 rounded-2xl border border-slate-800">
        {[
          { id: 'running', label: '🏃 Running & Pace', icon: Activity },
          { id: 'gym', label: '🏋️ Gym & Strength', icon: Dumbbell },
          { id: 'diet', label: '🥗 Diet & Macros', icon: Flame },
        ].map((tab) => {
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`py-3 rounded-xl font-bold text-sm transition-all ${
                active 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 🏃 RUNNING SECTION */}
      {subTab === 'running' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400">Today's Distance</span>
              <div className="text-3xl font-black text-emerald-400 mt-1">{todayRun} KM</div>
              <p className="text-xs text-slate-500 mt-1">Target: {settings.dailyRunTargetKm} KM</p>
            </div>

            <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400">Total Runs Logged</span>
              <div className="text-3xl font-black text-white mt-1">{runs.length} Runs</div>
              <p className="text-xs text-slate-500 mt-1">Consistency Active</p>
            </div>

            <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400">Avg Pace</span>
              <div className="text-3xl font-black text-blue-400 mt-1">
                {runs.length > 0 ? runs[0].avgPace : '5:23 min/km'}
              </div>
              <p className="text-xs text-slate-500 mt-1">Strava Metric Sync</p>
            </div>
          </div>

          {/* Add Run Form */}
          <div className="bg-[#111622] p-6 rounded-2xl border border-slate-800">
            <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" /> Log New Run Session
            </h3>

            <form onSubmit={handleAddRun} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Distance (KM)</label>
                <input
                  type="number"
                  step="0.1"
                  value={runDist}
                  onChange={(e) => setRunDist(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  value={runTime}
                  onChange={(e) => setRunTime(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-sm transition-all">
                  Save Run
                </button>
              </div>
            </form>
          </div>

          {/* Running History */}
          <div className="bg-[#111622] p-6 rounded-2xl border border-slate-800">
            <h3 className="text-md font-bold text-white mb-4">Running History & Records</h3>
            <div className="space-y-3">
              {runs.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                      🏃
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{r.distanceKm} KM Run</div>
                      <div className="text-xs text-slate-400">{r.routeLocation || 'Outdoor Run'} • {r.date}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-400">{r.durationMinutes} mins</div>
                    <div className="text-xs text-slate-400">{r.avgPace} | {r.calories} kcal</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🏋️ GYM SECTION */}
      {subTab === 'gym' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400">Total Volume Lifted</span>
              <div className="text-3xl font-black text-indigo-400 mt-1">
                {workouts.reduce((acc, curr) => acc + curr.totalVolumeKg, 0).toLocaleString()} KG
              </div>
              <p className="text-xs text-slate-500 mt-1">Accumulated Workout Volume</p>
            </div>

            <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400">Bench Press Record (PR)</span>
              <div className="text-3xl font-black text-amber-400 mt-1">75.0 KG</div>
              <p className="text-xs text-slate-500 mt-1">Target: 80.0 KG</p>
            </div>
          </div>

          {/* Log Workout Form */}
          <div className="bg-[#111622] p-6 rounded-2xl border border-slate-800">
            <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" /> Log Workout Session
            </h3>

            <form onSubmit={handleAddWorkout} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Routine Name</label>
                <input
                  type="text"
                  value={routineName}
                  onChange={(e) => setRoutineName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Volume Lifted (KG)</label>
                <input
                  type="number"
                  value={workoutVolume}
                  onChange={(e) => setWorkoutVolume(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Duration (Mins)</label>
                <input
                  type="number"
                  value={workoutMins}
                  onChange={(e) => setWorkoutMins(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-3 flex justify-end">
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-xl text-sm transition-all">
                  Save Workout
                </button>
              </div>
            </form>
          </div>

          {/* Workout Logs List */}
          <div className="bg-[#111622] p-6 rounded-2xl border border-slate-800">
            <h3 className="text-md font-bold text-white mb-4">Completed Gym Workouts</h3>
            <div className="space-y-3">
              {workouts.map((w) => (
                <div key={w.id} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                      🏋️
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{w.routineName}</div>
                      <div className="text-xs text-slate-400">{w.date} • {w.durationMinutes} mins</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-indigo-400">{w.totalVolumeKg.toLocaleString()} KG</div>
                    <div className="text-xs text-slate-500">Volume Lifted</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🥗 DIET & NUTRITION SECTION */}
      {subTab === 'diet' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400">Calories Consumed</span>
              <div className="text-3xl font-black text-amber-400 mt-1">{todayCals} kcal</div>
              <p className="text-xs text-slate-500 mt-1">Target: {settings.dailyCalorieTarget} kcal</p>
            </div>

            <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400">Protein Target</span>
              <div className="text-3xl font-black text-rose-400 mt-1">{todayProtein}g / {settings.dailyProteinTargetGrams}g</div>
              <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-rose-500 h-full" 
                  style={{ width: `${Math.min(100, (todayProtein / settings.dailyProteinTargetGrams) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400">Water Logged</span>
              <div className="text-3xl font-black text-cyan-400 mt-1">{todayWaterL.toFixed(1)}L / {settings.dailyWaterTargetLiters}L</div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => addWater(250)} className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded font-bold">+250ml</button>
                <button onClick={() => addWater(500)} className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded font-bold">+500ml</button>
              </div>
            </div>
          </div>

          {/* Add Meal Form */}
          <div className="bg-[#111622] p-6 rounded-2xl border border-slate-800">
            <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" /> Log Meal / Food
            </h3>

            <form onSubmit={handleAddMeal} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Food Item</label>
                <input
                  type="text"
                  placeholder="e.g. 200g Chicken Breast & Rice"
                  value={foodItem}
                  onChange={(e) => setFoodItem(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Calories (kcal)</label>
                <input
                  type="number"
                  value={foodCals}
                  onChange={(e) => setFoodCals(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Protein (g)</label>
                <input
                  type="number"
                  value={foodProt}
                  onChange={(e) => setFoodProt(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-4 flex justify-end">
                <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-6 rounded-xl text-sm transition-all">
                  Save Meal
                </button>
              </div>
            </form>
          </div>

          {/* Meals Logged Today */}
          <div className="bg-[#111622] p-6 rounded-2xl border border-slate-800">
            <h3 className="text-md font-bold text-white mb-4">Today's Meals History</h3>
            <div className="space-y-3">
              {meals.map((m) => (
                <div key={m.id} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{m.foodName}</div>
                    <div className="text-xs text-slate-400">{m.mealType} • {m.date}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-amber-400">{m.calories} kcal</div>
                    <div className="text-xs text-rose-400 font-semibold">{m.proteinGrams}g Protein</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}