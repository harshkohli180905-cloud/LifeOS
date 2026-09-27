import { useState } from 'react';
import { useLifeOS } from '../context/useLifeOS';
import { Save, Download, Upload, RotateCcw, ShieldCheck, User } from 'lucide-react';

export default function SettingsView() {
  const { settings, updateSettings, exportAllData, importAllData, resetAllData } = useLifeOS();

  const [userName, setUserName] = useState(settings.userName);
  const [studyTarget, setStudyTarget] = useState(settings.dailyStudyTargetHours);
  const [runTarget, setRunTarget] = useState(settings.dailyRunTargetKm);
  const [proteinTarget, setProteinTarget] = useState(settings.dailyProteinTargetGrams);
  const [waterTarget, setWaterTarget] = useState(settings.dailyWaterTargetLiters);
  const [calorieTarget, setCalorieTarget] = useState(settings.dailyCalorieTarget);

  const [savedMsg, setSavedMsg] = useState('');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      userName,
      dailyStudyTargetHours: Number(studyTarget),
      dailyRunTargetKm: Number(runTarget),
      dailyProteinTargetGrams: Number(proteinTarget),
      dailyWaterTargetLiters: Number(waterTarget),
      dailyCalorieTarget: Number(calorieTarget)
    });
    setSavedMsg('✅ Targets updated successfully!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importAllData(content);
        if (success) {
          alert('🎉 Data Backup restored successfully!');
        } else {
          alert('❌ Invalid JSON backup file.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('⚠️ Are you sure you want to reset all data to initial state? All custom logs will be cleared.')) {
      resetAllData();
      alert('Reset completed.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Target Customization */}
      <div className="bg-[#111622] rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold text-white">Profile & Daily Performance Targets</h3>
        </div>

        {savedMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            {savedMsg}
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">User Full Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Daily Study Target (Hours)</label>
              <input
                type="number"
                step="0.5"
                value={studyTarget}
                onChange={(e) => setStudyTarget(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Daily Run Target (KM)</label>
              <input
                type="number"
                step="0.5"
                value={runTarget}
                onChange={(e) => setRunTarget(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Daily Protein Target (Grams)</label>
              <input
                type="number"
                value={proteinTarget}
                onChange={(e) => setProteinTarget(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Daily Water Target (Liters)</label>
              <input
                type="number"
                step="0.1"
                value={waterTarget}
                onChange={(e) => setWaterTarget(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Daily Calorie Target (kcal)</label>
              <input
                type="number"
                value={calorieTarget}
                onChange={(e) => setCalorieTarget(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all"
          >
            <Save className="w-4 h-4" />
            Save Target Preferences
          </button>
        </form>
      </div>

      {/* Backup & Restore */}
      <div className="bg-[#111622] rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-bold text-white">Data Backup & Sync Management</h3>
        </div>
        <p className="text-xs text-slate-400 mb-6 max-w-xl">
          Your data is automatically saved offline in your browser's LocalStorage. Download a JSON backup to transfer data to another device or restore previous states.
        </p>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={exportAllData}
            className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold py-2.5 px-5 rounded-xl text-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Export Data Backup (JSON)
          </button>

          <label className="flex items-center gap-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 font-bold py-2.5 px-5 rounded-xl text-sm transition-all cursor-pointer">
            <Upload className="w-4 h-4" />
            Import Backup File
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 bg-rose-600/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 font-bold py-2.5 px-5 rounded-xl text-sm transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Data to Default
          </button>
        </div>
      </div>
    </div>
  );
}