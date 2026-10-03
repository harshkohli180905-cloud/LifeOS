import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  CheckSquare,
  Pencil,
  Trash2,
  Check,
  X,
  CalendarDays,
  Clock3,
  Circle,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getLocalDate } from '../lib/date';

const LIFEOS_DATA_EVENT = 'lifeos-data-changed';

function notifyLifeOSDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(LIFEOS_DATA_EVENT));
  }
}

type Priority = 'low' | 'medium' | 'high';

type TaskCategory =
  | 'study'
  | 'fitness'
  | 'health'
  | 'personal'
  | 'work';

type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: Priority;
  due_date: string | null;
  category: TaskCategory;
  estimated_minutes: number | null;
  created_at?: string;
  updated_at?: string;
  archived_at?: string | null;
};

type TaskForm = {
  title: string;
  description: string;
  priority: Priority;
  due_date: string;
  category: TaskCategory;
  estimated_minutes: string;
};

const emptyForm: TaskForm = {
  title: '',
  description: '',
  priority: 'medium',
  due_date: '',
  category: 'personal',
  estimated_minutes: '',
};

function formatDate(date: string | null) {
  if (!date) return 'No due date';

  const value = new Date(`${date}T00:00:00`);

  return value.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isOverdue(task: Task) {
  if (!task.due_date || task.completed) return false;

  return task.due_date < getLocalDate();
}

function TasksView() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [filter, setFilter] = useState<
    'all' | 'active' | 'completed' | 'overdue' | 'archived'
  >('all');

  const [categoryFilter, setCategoryFilter] = useState<
    'all' | TaskCategory
  >('all');

  const loadTasks = async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('completed', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    } else {
      setTasks((data ?? []) as Task[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, [user]);

  const openAddModal = () => {
    setEditingTask(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);

    setForm({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      due_date: task.due_date ?? '',
      category: task.category,
      estimated_minutes:
        task.estimated_minutes !== null
          ? String(task.estimated_minutes)
          : '',
    });

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingTask(null);
    setForm(emptyForm);
  };

  const saveTask = async () => {
    if (!user) return;

    const title = form.title.trim();

    if (!title) {
      alert('Please enter a task title.');
      return;
    }

    const estimatedMinutes =
      form.estimated_minutes.trim() === ''
        ? null
        : Number(form.estimated_minutes);

    if (
      estimatedMinutes !== null &&
      (!Number.isFinite(estimatedMinutes) ||
        estimatedMinutes < 0)
    ) {
      alert('Estimated time must be a valid number.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title,
        description: form.description.trim() || null,
        priority: form.priority,
        due_date: form.due_date || null,
        category: form.category,
        estimated_minutes: estimatedMinutes,
        updated_at: new Date().toISOString(),
      };

      if (editingTask) {
        const { data, error } = await supabase
          .from('tasks')
          .update(payload)
          .eq('id', editingTask.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;

        setTasks((current) =>
          current.map((task) =>
            task.id === editingTask.id ? (data as Task) : task
          )
        );
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            ...payload,
            completed: false,
          })
          .select()
          .single();

        if (error) throw error;

        setTasks((current) => [data as Task, ...current]);
      }

      notifyLifeOSDataChanged();
    closeModal();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Could not save the task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (task: Task) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('tasks')
      .update({
        completed: !task.completed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return;
    }

    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? (data as Task) : item
      )
    );

    notifyLifeOSDataChanged();
  };

  const extendDeadline = async (task: Task) => {
    if (!user) return;
    const base = task.due_date ? new Date(`${task.due_date}T00:00:00`) : new Date();
    base.setDate(base.getDate() + 1);
    const dueDate = getLocalDate(base);
    const { data, error } = await supabase.from('tasks').update({ due_date: dueDate, archived_at: null, updated_at: new Date().toISOString() }).eq('id', task.id).eq('user_id', user.id).select().single();
    if (error) { console.error('Error extending deadline:', error); return; }
    setTasks(current => current.map(item => item.id === task.id ? data as Task : item));
    notifyLifeOSDataChanged();
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this task?'
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting task:', error);
      alert('Could not delete the task.');
      return;
    }

    setTasks((current) =>
      current.filter((task) => task.id !== taskId)
    );

    notifyLifeOSDataChanged();
  };

  const archiveTask = async (task: Task) => {
    if (!user) return;
    const archivedAt = task.archived_at ? null : new Date().toISOString();
    const { data, error } = await supabase
      .from('tasks')
      .update({ archived_at: archivedAt, updated_at: new Date().toISOString() })
      .eq('id', task.id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) { console.error('Error archiving task:', error); return; }
    setTasks(current => current.map(item => item.id === task.id ? data as Task : item));
    notifyLifeOSDataChanged();
  };

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (filter === 'active') {
      result = result.filter((task) => !task.completed && !task.archived_at);
    }

    if (filter === 'completed') {
      result = result.filter((task) => task.completed && !task.archived_at);
    }

    if (filter === 'overdue') {
      result = result.filter((task) => isOverdue(task) && !task.archived_at);
    }

    if (filter === 'archived') {
      result = result.filter((task) => Boolean(task.archived_at));
    } else {
      result = result.filter((task) => !task.archived_at);
    }

    if (categoryFilter !== 'all') {
      result = result.filter((task) => task.category === categoryFilter);
    }

    const priorityRank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    result.sort((a, b) => {
      const pa = priorityRank[a.priority] ?? 3;
      const pb = priorityRank[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      if (!a.due_date && !b.due_date) return (b.created_at ?? '').localeCompare(a.created_at ?? '');
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });

    return result;
  }, [tasks, filter, categoryFilter]);

  const completedCount = tasks.filter((task) => task.completed && !task.archived_at).length;

  const activeCount = tasks.filter((task) => !task.completed && !task.archived_at).length;

  const overdueCount = tasks.filter((task) => isOverdue(task) && !task.archived_at).length;

  const today = getLocalDate();

const todayTasks = tasks.filter((task) => task.due_date === today && !task.archived_at).length;

  const priorityClasses: Record<Priority, string> = {
    low: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',
    medium:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
    high: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  };

  const categoryClasses: Record<TaskCategory, string> = {
    study:
      'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    fitness:
      'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
    health:
      'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
    personal:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
    work:
      'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black dark:border-white/20 dark:border-t-white" />

          <p className="mt-3 text-sm text-gray-500">
            Loading tasks...
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
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400">
              <CheckSquare size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
                Tasks
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Stay organized and get things done.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-black"
        >
          <Plus size={18} />
          Add Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
          <p className="text-xs font-medium text-gray-500">
            Total tasks
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {tasks.length}
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
            Due today
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {todayTasks}
          </p>

          {overdueCount > 0 && (
            <p className="mt-1 text-xs font-medium text-red-500">
              {overdueCount} overdue
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto">
          {(
            [
              ['all', 'All'],
              ['active', 'Active'],
              ['completed', 'Completed'],
              ['overdue', 'Overdue'],
            ['archived', 'Archived'],
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

        <div className="flex gap-2 overflow-x-auto">
          {(
            [
              ['all', 'All categories'],
              ['study', 'Study'],
              ['fitness', 'Fitness'],
              ['health', 'Health'],
              ['personal', 'Personal'],
              ['work', 'Work'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setCategoryFilter(value)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition ${
                categoryFilter === value
                  ? 'bg-gray-200 text-gray-900 dark:bg-white/10 dark:text-white'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-white/10 dark:bg-[#141414]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400">
            <CheckSquare size={26} />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
            No tasks found
          </h2>

          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
            Add a task and start organizing your day.
          </p>

          {filter === 'all' && categoryFilter === 'all' && (
            <button
              onClick={openAddModal}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-black"
            >
              <Plus size={17} />
              Create your first task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const overdue = isOverdue(task);

            return (
              <div
                key={task.id}
                className={`rounded-2xl border bg-white p-4 transition dark:bg-[#141414] ${
                  task.completed
                    ? 'border-gray-200 opacity-70 dark:border-white/10'
                    : overdue
                      ? 'border-red-200 dark:border-red-500/20'
                      : 'border-gray-200 dark:border-white/10'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTask(task)}
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition ${
                      task.completed
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 text-transparent hover:border-gray-500 dark:border-white/20 dark:hover:border-white/40'
                    }`}
                  >
                    {task.completed ? (
                      <Check size={16} strokeWidth={3} />
                    ) : (
                      <Circle size={12} />
                    )}
                  </button>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h2
                          className={`font-semibold text-gray-900 dark:text-white ${
                            task.completed
                              ? 'line-through'
                              : ''
                          }`}
                        >
                          {task.title}
                        </h2>

                        {task.description && (
                          <p className="mt-1 text-sm leading-5 text-gray-500">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => openEditModal(task)}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>

                        {isOverdue(task) && (
                          <button
                            onClick={() => void extendDeadline(task)}
                            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-500/10"
                            title="Extend by 1 day"
                          >
                            +1 day
                          </button>
                        )}
                        <button
                          onClick={() => void archiveTask(task)}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white"
                          title={task.archived_at ? 'Restore' : 'Archive'}
                        >
                          <CheckSquare size={16} />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                          title="Delete permanently"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                          priorityClasses[task.priority]
                        }`}
                      >
                        {task.priority} priority
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                          categoryClasses[task.category]
                        }`}
                      >
                        {task.category}
                      </span>

                      {task.due_date && (
                        <span
                          className={`inline-flex items-center gap-1 text-xs ${
                            overdue
                              ? 'font-semibold text-red-500'
                              : 'text-gray-500'
                          }`}
                        >
                          <CalendarDays size={13} />
                          {overdue
                            ? `Overdue · ${formatDate(task.due_date)}`
                            : formatDate(task.due_date)}
                        </span>
                      )}

                      {task.estimated_minutes !== null && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Clock3 size={13} />
                          {task.estimated_minutes} min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
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
                  {editingTask ? 'Edit task' : 'Create task'}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Add the details you need to stay on track.
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
                  Task title
                </label>

                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      title: e.target.value,
                    }))
                  }
                  placeholder="e.g. Complete Microeconomics chapter 3"
                  autoFocus
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

              {/* Priority + Category */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Priority
                  </label>

                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        priority: e.target.value as Priority,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"
                  >
                    <option
                      value="low"
                      className="bg-white text-gray-900 dark:bg-[#1d1d1d] dark:text-white"
                    >
                      Low
                    </option>

                    <option
                      value="medium"
                      className="bg-white text-gray-900 dark:bg-[#1d1d1d] dark:text-white"
                    >
                      Medium
                    </option>

                    <option
                      value="high"
                      className="bg-white text-gray-900 dark:bg-[#1d1d1d] dark:text-white"
                    >
                      High
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </label>

                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        category: e.target.value as TaskCategory,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"
                  >
                    <option
                      value="study"
                      className="bg-white text-gray-900 dark:bg-[#1d1d1d] dark:text-white"
                    >
                      Study
                    </option>

                    <option
                      value="fitness"
                      className="bg-white text-gray-900 dark:bg-[#1d1d1d] dark:text-white"
                    >
                      Fitness
                    </option>

                    <option
                      value="health"
                      className="bg-white text-gray-900 dark:bg-[#1d1d1d] dark:text-white"
                    >
                      Health
                    </option>

                    <option
                      value="personal"
                      className="bg-white text-gray-900 dark:bg-[#1d1d1d] dark:text-white"
                    >
                      Personal
                    </option>

                    <option
                      value="work"
                      className="bg-white text-gray-900 dark:bg-[#1d1d1d] dark:text-white"
                    >
                      Work
                    </option>
                  </select>
                </div>
              </div>

              {/* Date + Estimated time */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Due date
                  </label>

                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        due_date: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Estimated time
                  </label>

                  <div className="relative">
                    <Clock3
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={form.estimated_minutes}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          estimated_minutes: e.target.value,
                        }))
                      }
                      placeholder="Minutes"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"
                    />
                  </div>
                </div>
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
                onClick={saveTask}
                disabled={saving}
                className="flex-1 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {saving
                  ? 'Saving...'
                  : editingTask
                    ? 'Save changes'
                    : 'Create task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TasksView;