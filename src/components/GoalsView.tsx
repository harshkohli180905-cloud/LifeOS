import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Target,
  Pencil,
  Trash2,
  Check,
  X,
  CalendarDays,
  
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type GoalCategory =
  | 'study'
  | 'fitness'
  | 'health'
  | 'career'
  | 'personal'
  | 'finance';

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
};

const emptyForm: GoalForm = {
  title: '',
  description: '',
  category: 'personal',
  target: '',
  progress: '0',
  deadline: '',
  unit: '',
};

function getProgressPercentage(goal: Goal) {
  if (goal.target <= 0) return 0;

  return Math.min(
    Math.max((goal.progress / goal.target) * 100, 0),
    100
  );
}

function formatDate(date: string | null) {
  if (!date) return 'No deadline';

  const value = new Date(`${date}T00:00:00`);

  return value.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function GoalsView() {
  const { user } = useAuth();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [form, setForm] = useState<GoalForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>(
    'all'
  );

  const loadGoals = async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading goals:', error);
      setGoals([]);
    } else {
      setGoals((data ?? []) as Goal[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadGoals();
  }, [user]);

  const openAddModal = () => {
    setEditingGoal(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);

    setForm({
      title: goal.title,
      description: goal.description ?? '',
      category: goal.category,
      target: String(goal.target),
      progress: String(goal.progress),
      deadline: goal.deadline ?? '',
      unit: goal.unit ?? '',
    });

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingGoal(null);
    setForm(emptyForm);
  };

  const saveGoal = async () => {
    if (!user) return;

    const title = form.title.trim();
    const target = Number(form.target);
    const progress = Number(form.progress);

    if (!title) {
      alert('Please enter a goal title.');
      return;
    }

    if (!Number.isFinite(target) || target <= 0) {
      alert('Target must be greater than 0.');
      return;
    }

    if (!Number.isFinite(progress) || progress < 0) {
      alert('Progress cannot be negative.');
      return;
    }

    const finalProgress = Math.min(progress, target);
    const completed = finalProgress >= target;

    setSaving(true);

    try {
      if (editingGoal) {
        const { data, error } = await supabase
          .from('goals')
          .update({
            title,
            description: form.description.trim() || null,
            category: form.category,
            target,
            progress: finalProgress,
            deadline: form.deadline || null,
            completed,
            unit: form.unit.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingGoal.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;

        setGoals((current) =>
          current.map((goal) =>
            goal.id === editingGoal.id ? (data as Goal) : goal
          )
        );
      } else {
        const { data, error } = await supabase
          .from('goals')
          .insert({
            user_id: user.id,
            title,
            description: form.description.trim() || null,
            category: form.category,
            target,
            progress: finalProgress,
            deadline: form.deadline || null,
            completed,
            unit: form.unit.trim(),
          })
          .select()
          .single();

        if (error) throw error;

        setGoals((current) => [data as Goal, ...current]);
      }

      closeModal();
    } catch (error) {
      console.error('Error saving goal:', error);
      alert('Could not save the goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!user) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this goal?'
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting goal:', error);
      alert('Could not delete the goal.');
      return;
    }

    setGoals((current) =>
      current.filter((goal) => goal.id !== goalId)
    );
  };

  const toggleGoal = async (goal: Goal) => {
    if (!user) return;

    const completed = !goal.completed;
    const progress = completed ? goal.target : Math.min(goal.progress, goal.target - 0.01);

    const { data, error } = await supabase
      .from('goals')
      .update({
        completed,
        progress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goal.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating goal:', error);
      return;
    }

    setGoals((current) =>
      current.map((item) =>
        item.id === goal.id ? (data as Goal) : item
      )
    );
  };

  const updateProgress = async (goal: Goal, value: number) => {
    if (!user) return;

    const progress = Math.min(
      Math.max(value, 0),
      goal.target
    );

    const completed = progress >= goal.target;

    const { data, error } = await supabase
      .from('goals')
      .update({
        progress,
        completed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goal.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating progress:', error);
      return;
    }

    setGoals((current) =>
      current.map((item) =>
        item.id === goal.id ? (data as Goal) : item
      )
    );
  };

  const filteredGoals = useMemo(() => {
    if (filter === 'active') {
      return goals.filter((goal) => !goal.completed);
    }

    if (filter === 'completed') {
      return goals.filter((goal) => goal.completed);
    }

    return goals;
  }, [goals, filter]);

  const completedCount = goals.filter(
    (goal) => goal.completed
  ).length;

  const activeCount = goals.filter(
    (goal) => !goal.completed
  ).length;

  const averageProgress =
    goals.length > 0
      ? Math.round(
          goals.reduce(
            (sum, goal) => sum + getProgressPercentage(goal),
            0
          ) / goals.length
        )
      : 0;

  const categoryClasses: Record<GoalCategory, string> = {
    study: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    fitness:
      'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
    health:
      'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
    career:
      'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    personal:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
    finance:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black dark:border-white/20 dark:border-t-white" />
          <p className="mt-3 text-sm text-gray-500">
            Loading goals...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400">
              <Target size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
                Goals
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Turn your plans into measurable progress.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-black"
        >
          <Plus size={18} />
          Add Goal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
          <p className="text-xs font-medium text-gray-500">
            Total goals
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {goals.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
          <p className="text-xs font-medium text-gray-500">
            Active
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {activeCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
          <p className="text-xs font-medium text-gray-500">
            Completed
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {completedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
          <p className="text-xs font-medium text-gray-500">
            Avg. progress
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {averageProgress}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto">
        {(
          [
            ['all', 'All'],
            ['active', 'Active'],
            ['completed', 'Completed'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              filter === value
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-[#141414] dark:text-gray-400 dark:hover:bg-white/5'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Goals */}
      {filteredGoals.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-white/10 dark:bg-[#141414]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400">
            <Target size={26} />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
            {filter === 'completed'
              ? 'No completed goals'
              : filter === 'active'
                ? 'No active goals'
                : 'No goals yet'}
          </h2>

          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
            Create a goal and start tracking your progress.
          </p>

          {filter === 'all' && (
            <button
              onClick={openAddModal}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-black"
            >
              <Plus size={17} />
              Create your first goal
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredGoals.map((goal) => {
            const percentage = getProgressPercentage(goal);

            return (
              <div
                key={goal.id}
                className={`rounded-2xl border bg-white p-5 transition dark:bg-[#141414] ${
                  goal.completed
                    ? 'border-green-200 dark:border-green-500/20'
                    : 'border-gray-200 dark:border-white/10'
                }`}
              >
                {/* Goal top */}
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleGoal(goal)}
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      goal.completed
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 text-transparent hover:border-gray-500 dark:border-white/20 dark:hover:border-white/40'
                    }`}
                  >
                    <Check size={15} strokeWidth={3} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2
                          className={`font-semibold text-gray-900 dark:text-white ${
                            goal.completed
                              ? 'line-through opacity-60'
                              : ''
                          }`}
                        >
                          {goal.title}
                        </h2>

                        {goal.description && (
                          <p className="mt-1 text-sm leading-5 text-gray-500">
                            {goal.description}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => openEditModal(goal)}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                          categoryClasses[goal.category]
                        }`}
                      >
                        {goal.category}
                      </span>

                      {goal.deadline && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <CalendarDays size={13} />
                          {formatDate(goal.deadline)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      Progress
                    </span>

                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {Math.round(percentage)}%
                    </span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all ${
                        goal.completed
                          ? 'bg-green-500'
                          : 'bg-yellow-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {goal.progress} {goal.unit}
                    </span>

                    <span>
                      {goal.target} {goal.unit}
                    </span>
                  </div>
                </div>

                {/* Quick progress buttons */}
                {!goal.completed && (
                  <div className="mt-5 flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateProgress(
                          goal,
                          goal.progress + goal.target * 0.1
                        )
                      }
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5"
                    >
                      +10%
                    </button>

                    <button
                      onClick={() =>
                        updateProgress(
                          goal,
                          goal.progress + goal.target * 0.25
                        )
                      }
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5"
                    >
                      +25%
                    </button>

                    <button
                      onClick={() =>
                        updateProgress(goal, goal.target)
                      }
                      className="ml-auto inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-600 transition hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400"
                    >
                      <Check size={14} />
                      Complete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#151515]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingGoal ? 'Edit goal' : 'Create goal'}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Set something measurable and keep moving.
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {/* Title */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Goal title
                </label>

                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      title: e.target.value,
                    }))
                  }
                  placeholder="e.g. Complete Economics syllabus"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white dark:focus:border-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Optional details..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white dark:focus:border-white"
                />
              </div>

              {/* Category + Unit */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </label>

                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        category: e.target.value as GoalCategory,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"
                  >
                    <option value="study">Study</option>
                    <option value="fitness">Fitness</option>
                    <option value="health">Health</option>
                    <option value="career">Career</option>
                    <option value="personal">Personal</option>
                    <option value="finance">Finance</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Unit
                  </label>

                  <input
                    value={form.unit}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        unit: e.target.value,
                      }))
                    }
                    placeholder="hours, km, books..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"
                  />
                </div>
              </div>

              {/* Target + Progress */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Target
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.target}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        target: e.target.value,
                      }))
                    }
                    placeholder="100"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Current progress
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.progress}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        progress: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"
                  />
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Deadline
                </label>

                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      deadline: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-7 flex gap-3">
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Cancel
              </button>

              <button
                onClick={saveGoal}
                disabled={saving}
                className="flex-1 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {saving
                  ? 'Saving...'
                  : editingGoal
                    ? 'Save changes'
                    : 'Create goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GoalsView;