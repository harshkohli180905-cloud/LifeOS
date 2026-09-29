import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Trash2,
  X,
  Clock3,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { getLocalDate } from '../lib/date';
import { useAuth } from '../context/AuthContext';

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
};

type TaskForm = {
  title: string;
  description: string;
  priority: Priority;
  category: TaskCategory;
  estimated_minutes: string;
};

const emptyForm: TaskForm = {
  title: '',
  description: '',
  priority: 'medium',
  category: 'personal',
  estimated_minutes: '',
};

function parseDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function formatDate(dateString: string) {
  return parseDate(dateString).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function CalendarView() {
  const { user } = useAuth();

  const today = useMemo(() => new Date(), []);

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [selectedDate, setSelectedDate] = useState(
    getLocalDate(today)
  );

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<TaskForm>(emptyForm);

  const loadTasks = async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error loading calendar tasks:', error);
      setTasks([]);
    } else {
      setTasks((data ?? []) as Task[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, [user]);

  const monthYear = currentMonth.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday = 0, Sunday = 6
    const startingDay =
      firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const totalDays = lastDay.getDate();

    const days: Array<{
      date: Date | null;
      dateString: string | null;
    }> = [];

    for (let i = 0; i < startingDay; i += 1) {
      days.push({
        date: null,
        dateString: null,
      });
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(year, month, day);

      days.push({
        date,
        dateString: getLocalDate(date),
      });
    }

    while (days.length % 7 !== 0) {
      days.push({
        date: null,
        dateString: null,
      });
    }

    return days;
  }, [currentMonth]);

  const selectedTasks = useMemo(
    () =>
      tasks.filter(
        (task) => task.due_date === selectedDate
      ),
    [tasks, selectedDate]
  );

  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    tasks.forEach((task) => {
      if (!task.due_date) return;

      if (!grouped[task.due_date]) {
        grouped[task.due_date] = [];
      }

      grouped[task.due_date].push(task);
    });

    return grouped;
  }, [tasks]);

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        1
      )
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1
      )
    );
  };

  const goToToday = () => {
    const now = new Date();

    setCurrentMonth(
      new Date(now.getFullYear(), now.getMonth(), 1)
    );

    setSelectedDate(getLocalDate(now));
  };

  const openAddModal = () => {
    setForm(emptyForm);
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setForm(emptyForm);
  };

  const createTask = async () => {
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
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title,
          description: form.description.trim() || null,
          completed: false,
          priority: form.priority,
          due_date: selectedDate,
          category: form.category,
          estimated_minutes: estimatedMinutes,
        })
        .select()
        .single();

      if (error) throw error;

      setTasks((current) => [...current, data as Task]);

      closeModal();
    } catch (error) {
      console.error('Error creating calendar task:', error);
      alert('Could not create the task. Please try again.');
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
      console.error('Error updating calendar task:', error);
      return;
    }

    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? (data as Task) : item
      )
    );
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
      console.error('Error deleting calendar task:', error);
      alert('Could not delete the task.');
      return;
    }

    setTasks((current) =>
      current.filter((task) => task.id !== taskId)
    );
  };

  const priorityClasses: Record<Priority, string> = {
    low: 'bg-gray-400',
    medium: 'bg-yellow-500',
    high: 'bg-red-500',
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
            Loading calendar...
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
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
              <CalendarDays size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
                Calendar
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Plan your days and stay on schedule.
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

      {/* Calendar */}
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#141414]">
        {/* Calendar header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-white/10 md:px-6">
          <div>
            <h2 className="text-lg font-bold capitalize text-gray-900 dark:text-white md:text-xl">
              {monthYear}
            </h2>

            <p className="mt-1 hidden text-xs text-gray-500 sm:block">
              Select a day to view its tasks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5"
            >
              Today
            </button>

            <button
              onClick={goToPreviousMonth}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={goToNextMonth}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-white/10">
          {[
            'Mon',
            'Tue',
            'Wed',
            'Thu',
            'Fri',
            'Sat',
            'Sun',
          ].map((day) => (
            <div
              key={day}
              className="py-3 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400 sm:text-xs"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            if (!day.date || !day.dateString) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[76px] border-b border-r border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-white/[0.01] sm:min-h-[105px]"
                />
              );
            }

            const dateString = day.dateString;
            const dayTasks = tasksByDate[dateString] ?? [];

            const isToday =
              dateString === getLocalDate(today);

            const isSelected =
              dateString === selectedDate;

            return (
              <button
                key={dateString}
                onClick={() => setSelectedDate(dateString)}
                className={`relative min-h-[76px] border-b border-r border-gray-100 p-2 text-left transition dark:border-white/5 sm:min-h-[105px] sm:p-3 ${
                  isSelected
                    ? 'bg-purple-50 dark:bg-purple-500/[0.08]'
                    : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                      isToday
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : isSelected
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400'
                          : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {day.date.getDate()}
                  </span>

                  {dayTasks.length > 0 && (
                    <span className="text-[10px] font-medium text-gray-400">
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                {/* Desktop task previews */}
                <div className="mt-2 hidden space-y-1 sm:block">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-1.5 truncate"
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          priorityClasses[task.priority]
                        }`}
                      />

                      <span
                        className={`truncate text-[11px] ${
                          task.completed
                            ? 'text-gray-400 line-through'
                            : 'text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                  ))}

                  {dayTasks.length > 3 && (
                    <p className="text-[10px] text-gray-400">
                      +{dayTasks.length - 3} more
                    </p>
                  )}
                </div>

                {/* Mobile dots */}
                <div className="mt-2 flex gap-1 sm:hidden">
                  {dayTasks.slice(0, 3).map((task) => (
                    <span
                      key={task.id}
                      className={`h-1.5 w-1.5 rounded-full ${
                        priorityClasses[task.priority]
                      }`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Selected day
            </p>

            <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              {formatDate(selectedDate)}
            </h2>
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
          >
            <Plus size={16} />
            Add for this day
          </button>
        </div>

        {selectedTasks.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-200 px-5 py-10 text-center dark:border-white/10">
            <CalendarDays
              size={25}
              className="mx-auto text-gray-300 dark:text-gray-600"
            />

            <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-300">
              Nothing scheduled
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Add a task for this day.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {selectedTasks.map((task) => (
              <div
                key={task.id}
                className={`rounded-xl border p-4 ${
                  task.completed
                    ? 'border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/[0.02]'
                    : 'border-gray-200 dark:border-white/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleTask(task)}
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition ${
                      task.completed
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 text-transparent hover:border-gray-500 dark:border-white/20'
                    }`}
                  >
                    <Check size={15} strokeWidth={3} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <h3
                      className={`font-semibold text-gray-900 dark:text-white ${
                        task.completed
                          ? 'line-through opacity-60'
                          : ''
                      }`}
                    >
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="mt-1 text-sm text-gray-500">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                          categoryClasses[task.category]
                        }`}
                      >
                        {task.category}
                      </span>

                      {task.estimated_minutes !== null && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Clock3 size={13} />
                          {task.estimated_minutes} min
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add task modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#151515]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Add task
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Scheduled for {formatDate(selectedDate)}
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
                  autoFocus
                  placeholder="What needs to be done?"
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
                  rows={3}
                  placeholder="Optional details..."
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-[#1d1d1d] dark:text-white"
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

              {/* Estimated time */}
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

            <div className="mt-7 flex gap-3">
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Cancel
              </button>

              <button
                onClick={createTask}
                disabled={saving}
                className="flex-1 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {saving ? 'Saving...' : 'Add task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarView;