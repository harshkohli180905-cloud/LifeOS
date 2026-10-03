import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Target,
  Pencil,
  Trash2,
  Check,
  X,
  CalendarDays,
  Minus,
  Plus as PlusSmall,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getLocalDate } from '../lib/date';

type GoalCategory = 'study' | 'fitness' | 'health' | 'career' | 'personal' | 'finance';
type PeriodType = 'daily' | 'weekly' | 'monthly' | 'custom' | 'long_term';
type TrackingType = 'manual' | 'automatic';
type MetricKey = 'running_km' | 'reading_pages' | 'workout_sessions' | 'calories' | 'water_liters' | 'study_hours';

type Goal = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: GoalCategory;
  target: number;
  progress: number;
  deadline: string | null;
  completed: boolean;
  unit: string;
  period_type?: PeriodType;
  period_start?: string | null;
  period_end?: string | null;
  tracking_type?: TrackingType;
  metric_key?: MetricKey | null;
  progress_period_key?: string | null;
  created_at?: string;
  updated_at?: string;
};

type GoalForm = {
  title: string;
  description: string;
  category: GoalCategory;
  target: string;
  progress: string;
  deadline: string;
  unit: string;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  trackingType: TrackingType;
  metricKey: MetricKey;
};

const emptyForm: GoalForm = {
  title: '', description: '', category: 'personal', target: '', progress: '0',
  deadline: '', unit: '', periodType: 'long_term', periodStart: '', periodEnd: '',
  trackingType: 'manual', metricKey: 'running_km',
};

function getProgressPercentage(goal: Goal) {
  if (goal.target <= 0) return 0;
  return Math.min(Math.max((goal.progress / goal.target) * 100, 0), 100);
}

function formatDate(date: string | null | undefined) {
  if (!date) return 'No deadline';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}



function iso(date: Date) {
  return getLocalDate(date);
}

function currentPeriod(type: PeriodType, customStart?: string | null, customEnd?: string | null) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (type === 'custom') {
    return { start: customStart || iso(today), end: customEnd || iso(today) };
  }
  if (type === 'long_term') return { start: '', end: iso(today) };
  if (type === 'daily') return { start: iso(today), end: iso(today) };
  if (type === 'weekly') {
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(today); start.setDate(today.getDate() + mondayOffset);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return { start: iso(start), end: iso(end) };
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { start: iso(start), end: iso(end) };
}

function getProgressPeriodKey(goal: Pick<Goal, 'period_type' | 'period_start' | 'period_end'>) {
  const type = goal.period_type ?? 'long_term';
  if (type === 'long_term') return 'long_term';
  const period = currentPeriod(type, goal.period_start, goal.period_end);
  return `${type}:${period.start}:${period.end}`;
}

function inRange(date: string, start: string, end: string) {
  if (!start) return date <= end;
  return date >= start && date <= end;
}

function metricUnit(metric: MetricKey) {
  return {
    running_km: 'km', reading_pages: 'pages', workout_sessions: 'sessions',
    calories: 'kcal', water_liters: 'L', study_hours: 'hours',
  }[metric];
}

function metricLabel(metric: MetricKey) {
  return {
    running_km: 'Running distance', reading_pages: 'Reading pages', workout_sessions: 'Workout sessions',
    calories: 'Calories', water_liters: 'Water', study_hours: 'Study time',
  }[metric];
}

function formatValue(value: number, unit: string) {
  const digits = ['km', 'L'].includes(unit) ? 1 : 0;
  return `${Number(value.toFixed(digits))} ${unit}`.trim();
}

async function calculateAutomaticProgress(goal: Goal) {
  const { start: periodStart, end: periodEnd } = currentPeriod(goal.period_type ?? 'long_term', goal.period_start, goal.period_end);
  const created = goal.created_at ? goal.created_at.slice(0, 10) : '';
  const start = periodStart || created;
  const end = periodEnd || getLocalDate();
  const metric = goal.metric_key;
  if (!metric) return 0;

  if (metric === 'running_km') {
    const { data, error } = await supabase.from('runs').select('date,distance_km').eq('user_id', goal.user_id);
    if (error) throw error;
    return (data ?? []).filter(r => inRange(String(r.date).slice(0, 10), start, end)).reduce((s, r) => s + Number(r.distance_km ?? 0), 0);
  }
  if (metric === 'workout_sessions') {
    const { data, error } = await supabase.from('workouts').select('date').eq('user_id', goal.user_id);
    if (error) throw error;
    return (data ?? []).filter(r => inRange(String(r.date).slice(0, 10), start, end)).length;
  }
  if (metric === 'calories') {
    const { data, error } = await supabase.from('meals').select('date,calories').eq('user_id', goal.user_id);
    if (error) throw error;
    return (data ?? []).filter(r => inRange(String(r.date).slice(0, 10), start, end)).reduce((s, r) => s + Number(r.calories ?? 0), 0);
  }
  if (metric === 'water_liters') {
    const { data, error } = await supabase.from('water_logs').select('date,amount_ml').eq('user_id', goal.user_id);
    if (error) throw error;
    return (data ?? []).filter(r => inRange(String(r.date).slice(0, 10), start, end)).reduce((s, r) => s + Number(r.amount_ml ?? 0) / 1000, 0);
  }
  const { data, error } = await supabase.from('study_sessions').select('started_at,duration_seconds,pages_read').eq('user_id', goal.user_id);
  if (error) throw error;
  const sessions = (data ?? []).filter(r => r.started_at && inRange(getLocalDate(new Date(r.started_at)), start, end));
  if (metric === 'reading_pages') return sessions.reduce((s, r) => s + Number(r.pages_read ?? 0), 0);
  return sessions.reduce((s, r) => s + Number(r.duration_seconds ?? 0) / 3600, 0);
}

function GoalsView() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [progressAmounts, setProgressAmounts] = useState<Record<string, string>>({});

  const loadGoals = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) { console.error('Error loading goals:', error); setGoals([]); setLoading(false); return; }
    let loaded = (data ?? []) as Goal[];
    // Recalculate all automatic goals, including completed ones, so a new period can reopen them.
    // Manual recurring goals reset once when their saved period key no longer matches the current period.
    const updates = await Promise.all(loaded.map(async goal => {
      const type = goal.period_type ?? 'long_term';
      const currentKey = getProgressPeriodKey(goal);
      if (goal.tracking_type === 'automatic') {
        try {
          const value = Math.min(await calculateAutomaticProgress(goal), Number(goal.target));
          const completed = value >= Number(goal.target);
          if (Math.abs(value - Number(goal.progress ?? 0)) > 0.001 || completed !== goal.completed || goal.progress_period_key !== currentKey) {
            const { data: updated, error: updateError } = await supabase.from('goals').update({ progress: value, completed, progress_period_key: currentKey, updated_at: new Date().toISOString() }).eq('id', goal.id).eq('user_id', user.id).select().single();
            if (updateError) console.error('Could not refresh automatic goal:', updateError);
            return updated ? updated as Goal : { ...goal, progress: value, completed, progress_period_key: currentKey };
          }
          return goal;
        } catch (calculationError) {
          console.error(`Could not calculate goal ${goal.title}:`, calculationError);
          return goal;
        }
      }
      if (type !== 'long_term' && type !== 'custom' && goal.progress_period_key && goal.progress_period_key !== currentKey) {
        const { data: updated, error: updateError } = await supabase.from('goals').update({ progress: 0, completed: false, progress_period_key: currentKey, updated_at: new Date().toISOString() }).eq('id', goal.id).eq('user_id', user.id).select().single();
        if (updateError) {
          console.error('Could not reset recurring manual goal:', updateError);
          return goal;
        }
        return updated ? updated as Goal : { ...goal, progress: 0, completed: false, progress_period_key: currentKey };
      }
      if (!goal.progress_period_key) {
        const { data: updated, error: updateError } = await supabase.from('goals').update({ progress_period_key: currentKey }).eq('id', goal.id).eq('user_id', user.id).select().single();
        if (updateError) console.error('Could not initialize goal period:', updateError);
        return updated ? updated as Goal : { ...goal, progress_period_key: currentKey };
      }
      return goal;
    }));
    loaded = updates;
    setGoals(loaded); setLoading(false);
  };

  useEffect(() => { void loadGoals(); }, [user]);

  const openAddModal = () => { setEditingGoal(null); setForm(emptyForm); setShowModal(true); };
  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setForm({ title: goal.title, description: goal.description ?? '', category: goal.category, target: String(goal.target),
      progress: String(goal.progress), deadline: goal.deadline ?? '', unit: goal.unit ?? '', periodType: goal.period_type ?? 'long_term',
      periodStart: goal.period_start ?? '', periodEnd: goal.period_end ?? '', trackingType: goal.tracking_type ?? 'manual', metricKey: goal.metric_key ?? 'running_km' });
    setShowModal(true);
  };
  const closeModal = () => { if (saving) return; setShowModal(false); setEditingGoal(null); setForm(emptyForm); };

  const saveGoal = async () => {
    if (!user) return;
    const title = form.title.trim(); const target = Number(form.target); const progress = Number(form.progress);
    if (!title) return alert('Please enter a goal title.');
    if (!Number.isFinite(target) || target <= 0) return alert('Target must be greater than 0.');
    if (!Number.isFinite(progress) || progress < 0) return alert('Progress cannot be negative.');
    if (form.periodType === 'custom' && (!form.periodStart || !form.periodEnd || form.periodStart > form.periodEnd)) return alert('Select a valid custom period.');
    const finalProgress = form.trackingType === 'automatic' ? 0 : Math.min(progress, target);
    setSaving(true);
    try {
      const payload = {
        title, description: form.description.trim() || null, category: form.category, target, progress: finalProgress,
        deadline: form.deadline || null, completed: finalProgress >= target, unit: form.trackingType === 'automatic' ? metricUnit(form.metricKey) : form.unit.trim(),
        period_type: form.periodType, period_start: form.periodType === 'custom' ? form.periodStart : null,
        period_end: form.periodType === 'custom' ? form.periodEnd : null, tracking_type: form.trackingType,
        metric_key: form.trackingType === 'automatic' ? form.metricKey : null, progress_period_key: getProgressPeriodKey({ period_type: form.periodType, period_start: form.periodType === 'custom' ? form.periodStart : null, period_end: form.periodType === 'custom' ? form.periodEnd : null }), updated_at: new Date().toISOString(),
      };
      if (editingGoal) {
        const { data, error } = await supabase.from('goals').update(payload).eq('id', editingGoal.id).eq('user_id', user.id).select().single();
        if (error) throw error; setGoals(current => current.map(g => g.id === editingGoal.id ? data as Goal : g));
      } else {
        const { data, error } = await supabase.from('goals').insert({ user_id: user.id, ...payload }).select().single();
        if (error) throw error; setGoals(current => [data as Goal, ...current]);
      }
      closeModal();
      if (form.trackingType === 'automatic') void loadGoals();
    } catch (error) { console.error('Error saving goal:', error); alert('Could not save the goal. Please try again.'); }
    finally { setSaving(false); }
  };

  const deleteGoal = async (goalId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this goal?')) return;
    const { error } = await supabase.from('goals').delete().eq('id', goalId).eq('user_id', user.id);
    if (error) return alert('Could not delete the goal.');
    setGoals(current => current.filter(g => g.id !== goalId));
  };

  const toggleGoal = async (goal: Goal) => {
    if (!user || goal.tracking_type === 'automatic') return;
    const completed = !goal.completed; const progress = completed ? goal.target : Math.max(0, Math.min(goal.progress, goal.target - 1));
    const { data, error } = await supabase.from('goals').update({ completed, progress, updated_at: new Date().toISOString() }).eq('id', goal.id).eq('user_id', user.id).select().single();
    if (!error && data) setGoals(current => current.map(g => g.id === goal.id ? data as Goal : g));
  };

  const updateProgress = async (goal: Goal, delta: number) => {
    if (!user || goal.tracking_type === 'automatic') return;
    const progress = Math.min(Math.max(goal.progress + delta, 0), goal.target); const completed = progress >= goal.target;
    const { data, error } = await supabase.from('goals').update({ progress, completed, updated_at: new Date().toISOString() }).eq('id', goal.id).eq('user_id', user.id).select().single();
    if (!error && data) setGoals(current => current.map(g => g.id === goal.id ? data as Goal : g));
  };

  const filteredGoals = useMemo(() => filter === 'active' ? goals.filter(g => !g.completed) : filter === 'completed' ? goals.filter(g => g.completed) : goals, [goals, filter]);
  const completedCount = goals.filter(g => g.completed).length;
  const activeCount = goals.filter(g => !g.completed).length;
  const averageProgress = goals.length ? Math.round(goals.reduce((s, g) => s + getProgressPercentage(g), 0) / goals.length) : 0;
  const categoryClasses: Record<GoalCategory, string> = {
    study: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400', fitness: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
    health: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400', career: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    personal: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400', finance: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black dark:border-white/20 dark:border-t-white" /><p className="mt-3 text-sm text-gray-500">Loading goals...</p></div></div>;

  return <div className="space-y-6 pb-24 md:pb-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400"><Target size={22} /></div><div><h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">Goals</h1><p className="mt-1 text-sm text-gray-500">Set targets that reset or grow automatically with your activity.</p></div></div>
      <button onClick={openAddModal} className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-black"><Plus size={18} />Add Goal</button>
    </div>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {[['Total goals', goals.length], ['Active', activeCount], ['Completed', completedCount], ['Avg. progress', `${averageProgress}%`]].map(([label,value]) => <div key={String(label)} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]"><p className="text-xs font-medium text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p></div>)}
    </div>
    <div className="flex gap-2 overflow-x-auto">{([['all','All'],['active','Active'],['completed','Completed']] as const).map(([value,label]) => <button key={value} onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition ${filter === value ? 'bg-black text-white dark:bg-white dark:text-black' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-[#141414] dark:text-gray-400'}`}>{label}</button>)}</div>
    {filteredGoals.length === 0 ? <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-white/10 dark:bg-[#141414]"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400"><Target size={26} /></div><h2 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">No goals yet</h2><p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">Create a goal and start tracking your progress.</p>{filter === 'all' && <button onClick={openAddModal} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-black"><Plus size={17} />Create your first goal</button>}</div> : <div className="grid gap-4 lg:grid-cols-2">{filteredGoals.map(goal => {
      const percentage = getProgressPercentage(goal); const automatic = goal.tracking_type === 'automatic';
      const periodLabel = goal.period_type === 'long_term' || !goal.period_type ? 'Long-term' : goal.period_type === 'custom' ? `${formatDate(goal.period_start)} – ${formatDate(goal.period_end)}` : goal.period_type;
      return <div key={goal.id} className={`rounded-2xl border bg-white p-5 transition dark:bg-[#141414] ${goal.completed ? 'border-green-200 dark:border-green-500/20' : 'border-gray-200 dark:border-white/10'}`}>
        <div className="flex items-start gap-4"><button onClick={() => void toggleGoal(goal)} disabled={automatic} className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${goal.completed ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-transparent hover:border-gray-500 dark:border-white/20'} ${automatic ? 'cursor-default' : ''}`}><Check size={15} strokeWidth={3} /></button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className={`font-semibold text-gray-900 dark:text-white ${goal.completed ? 'line-through opacity-60' : ''}`}>{goal.title}</h2>{goal.description && <p className="mt-1 text-sm leading-5 text-gray-500">{goal.description}</p>}</div><div className="flex shrink-0 items-center gap-1"><button onClick={() => openEditModal(goal)} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white"><Pencil size={16} /></button><button onClick={() => void deleteGoal(goal.id)} className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"><Trash2 size={16} /></button></div></div>
          <div className="mt-3 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${categoryClasses[goal.category]}`}>{goal.category}</span><span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-gray-600 dark:bg-white/10 dark:text-gray-300">{periodLabel}</span>{automatic && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><Zap size={12}/>{metricLabel(goal.metric_key!)}</span>}{goal.deadline && <span className="inline-flex items-center gap-1 text-xs text-gray-500"><CalendarDays size={13}/>{formatDate(goal.deadline)}</span>}</div>
        </div></div>
        <div className="mt-6"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium text-gray-500">Progress</span><span className="text-sm font-bold text-gray-900 dark:text-white">{Math.round(percentage)}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10"><div className={`h-full rounded-full transition-all ${goal.completed ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${percentage}%` }} /></div><div className="mt-2 flex items-center justify-between text-xs text-gray-500"><span>{formatValue(goal.progress, goal.unit)}</span><span>{formatValue(goal.target, goal.unit)}</span></div></div>
        {!goal.completed && !automatic && <div className="mt-5 flex flex-wrap items-center gap-2"><button onClick={() => void updateProgress(goal, -1)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400"><Minus size={13}/>1</button><button onClick={() => void updateProgress(goal, 1)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400"><PlusSmall size={13}/>1</button><div className="flex items-center gap-1"><input type="number" min="0" step="any" inputMode="decimal" aria-label={`Custom progress amount for ${goal.title}`} placeholder="Amount" value={progressAmounts[goal.id] ?? ''} onChange={e => setProgressAmounts(current => ({...current, [goal.id]: e.target.value}))} className="w-24 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-900 outline-none focus:border-slate-500 dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"/><button disabled={!Number.isFinite(Number(progressAmounts[goal.id])) || !progressAmounts[goal.id]?.trim() || Number(progressAmounts[goal.id]) <= 0} onClick={() => void updateProgress(goal, Number(progressAmounts[goal.id]))} className="rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-green-600 disabled:opacity-40 dark:border-white/10">+ Add</button><button disabled={!Number.isFinite(Number(progressAmounts[goal.id])) || !progressAmounts[goal.id]?.trim() || Number(progressAmounts[goal.id]) <= 0} onClick={() => void updateProgress(goal, -Number(progressAmounts[goal.id]))} className="rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-red-500 disabled:opacity-40 dark:border-white/10">− Subtract</button></div><button onClick={() => void updateProgress(goal, Math.max(1, goal.target * .1))} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 dark:border-white/10 dark:text-gray-400">+10%</button><button onClick={() => void updateProgress(goal, goal.target)} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-600 dark:bg-green-500/10 dark:text-green-400"><Check size={14}/>Complete</button></div>}
      </div>;
    })}</div>}

    {showModal && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#151515]"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingGoal ? 'Edit goal' : 'Create goal'}</h2><p className="mt-1 text-sm text-gray-500">Choose a period and let LifeOS track outcome goals automatically.</p></div><button onClick={closeModal} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"><X size={20}/></button></div>
      <div className="mt-6 space-y-4">
        <div><label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Goal title</label><input value={form.title} onChange={e => setForm(c => ({...c,title:e.target.value}))} placeholder="e.g. Run 50 km this month" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-black dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"/></div>
        <div><label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label><textarea value={form.description} onChange={e => setForm(c => ({...c,description:e.target.value}))} rows={2} placeholder="Optional details..." className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"/></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label><select value={form.category} onChange={e => setForm(c => ({...c,category:e.target.value as GoalCategory}))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"><option value="study">Study</option><option value="fitness">Fitness</option><option value="health">Health</option><option value="career">Career</option><option value="personal">Personal</option><option value="finance">Finance</option></select></div><div><label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Tracking</label><select value={form.trackingType} onChange={e => setForm(c => ({...c,trackingType:e.target.value as TrackingType}))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"><option value="manual">Manual</option><option value="automatic">Automatic</option></select></div></div>
        {form.trackingType === 'automatic' && <div><label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Outcome metric</label><select value={form.metricKey} onChange={e => setForm(c => ({...c,metricKey:e.target.value as MetricKey,unit:metricUnit(e.target.value as MetricKey)}))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"><option value="running_km">Running distance (km)</option><option value="reading_pages">Reading pages</option><option value="workout_sessions">Workout sessions</option><option value="calories">Calories</option><option value="water_liters">Water (L)</option><option value="study_hours">Study time (hours)</option></select><p className="mt-2 text-xs text-gray-500">Progress is calculated from your logged activities; reading pages must be entered when you log study.</p></div>}
        <div><label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Period</label><select value={form.periodType} onChange={e => setForm(c => ({...c,periodType:e.target.value as PeriodType}))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="custom">Custom</option><option value="long_term">Long-term</option></select></div>
        {form.periodType === 'custom' && <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Start date</label><input type="date" value={form.periodStart} onChange={e => setForm(c => ({...c,periodStart:e.target.value}))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"/></div><div><label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">End date</label><input type="date" value={form.periodEnd} onChange={e => setForm(c => ({...c,periodEnd:e.target.value}))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"/></div></div>}
        <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Target</label><input type="number" min="0" step="any" value={form.target} onChange={e => setForm(c => ({...c,target:e.target.value}))} placeholder="50" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"/></div>{form.trackingType === 'manual' && <div><label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Current progress</label><input type="number" min="0" step="any" value={form.progress} onChange={e => setForm(c => ({...c,progress:e.target.value}))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"/></div>}</div>
        {form.trackingType === 'manual' && <div><label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Unit</label><input value={form.unit} onChange={e => setForm(c => ({...c,unit:e.target.value}))} placeholder="pages, books, tasks..." className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"/></div>}
        <div><label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Deadline <span className="font-normal text-gray-400">(optional)</span></label><input type="date" value={form.deadline} onChange={e => setForm(c => ({...c,deadline:e.target.value}))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"/></div>
      </div>
      <div className="mt-7 flex gap-3"><button onClick={closeModal} disabled={saving} className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 dark:border-white/10 dark:text-gray-300">Cancel</button><button onClick={() => void saveGoal()} disabled={saving} className="flex-1 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black">{saving ? 'Saving...' : editingGoal ? 'Save changes' : 'Create goal'}</button></div>
    </div></div>}
  </div>;
}

export default GoalsView;
