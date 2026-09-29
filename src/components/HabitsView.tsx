import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Bell,
  Check,
  ChevronDown,
  Edit3,
  Flame,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getLocalDate } from '../lib/date';

type Habit = {
  id: string;
  name: string;
  icon: string;
  frequency: string;
  target: number;
  reminder_time: string | null;
  active: boolean;
  streak: number;
  category: string | null;
  created_at?: string;
  updated_at?: string;
};

type HabitLog = {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  created_at?: string;
};

type HabitForm = {
  name: string;
  icon: string;
  frequency: string;
  target: string;
  reminderTime: string;
  category: string;
};

const ICONS = [
  '📚',
  '💪',
  '🏃',
  '🧘',
  '💧',
  '🥗',
  '😴',
  '🧠',
  '✍️',
  '🎯',
  '🚶',
  '🏋️',
  '🚴',
  '🎸',
  '💻',
  '📖',
];

const CATEGORIES = [
  'Study',
  'Fitness',
  'Health',
  'Personal',
  'Productivity',
  'Lifestyle',
];

const EMPTY_FORM: HabitForm = {
  name: '',
  icon: '🎯',
  frequency: 'daily',
  target: '1',
  reminderTime: '',
  category: 'Personal',
};

function shiftDate(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);

  return getLocalDate(date);
}

function calculateStreak(
  habitId: string,
  logs: HabitLog[],
  endDate: string,
) {
  const completedDates = new Set(
    logs
      .filter(
        (log) =>
          log.habit_id === habitId &&
          log.completed,
      )
      .map((log) => log.date),
  );

  let streak = 0;
  let currentDate = endDate;

  while (completedDates.has(currentDate)) {
    streak += 1;
    currentDate = shiftDate(currentDate, -1);
  }

  return streak;
}

function getCompletedToday(
  habitId: string,
  logs: HabitLog[],
  today: string,
) {
  return logs.some(
    (log) =>
      log.habit_id === habitId &&
      log.date === today &&
      log.completed,
  );
}

function formatFrequency(
  frequency: string,
  target: number,
) {
  if (frequency === 'daily') {
    return target > 1
      ? `${target} times / day`
      : 'Every day';
  }

  if (frequency === 'weekly') {
    return target > 1
      ? `${target} times / week`
      : 'Every week';
  }

  return target > 1
    ? `${target} times`
    : 'Custom';
}

export default function HabitsView() {
  const { user } = useAuth();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] =
    useState<Habit | null>(null);

  const [form, setForm] =
    useState<HabitForm>(EMPTY_FORM);

  const [openMenu, setOpenMenu] =
    useState<string | null>(null);

  const today = getLocalDate();

  const loadData = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      const startDate = shiftDate(
        today,
        -90,
      );

      const [
        habitsResponse,
        logsResponse,
      ] = await Promise.all([
        supabase
          .from('habits')
          .select(
            'id,name,icon,frequency,target,reminder_time,active,streak,category,created_at,updated_at',
          )
          .eq('user_id', user.id)
          .order('created_at', {
            ascending: true,
          }),

        supabase
          .from('habit_logs')
          .select(
            'id,habit_id,date,completed,created_at',
          )
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', today)
          .order('date', {
            ascending: false,
          }),
      ]);

      if (habitsResponse.error) {
        throw habitsResponse.error;
      }

      if (logsResponse.error) {
        throw logsResponse.error;
      }

      const loadedHabits =
        (habitsResponse.data ?? []) as Habit[];

      const loadedLogs =
        (logsResponse.data ?? []) as HabitLog[];

      const updatedHabits =
        loadedHabits.map((habit) => ({
          ...habit,
          streak: calculateStreak(
            habit.id,
            loadedLogs,
            today,
          ),
        }));

      setHabits(updatedHabits);
      setLogs(loadedLogs);
    } catch (error) {
      console.error(
        'Failed to load habits:',
        error,
      );
    } finally {
      setLoading(false);
    }
  }, [today, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeHabits = useMemo(
    () =>
      habits.filter(
        (habit) => habit.active,
      ),
    [habits],
  );

  const pausedHabits = useMemo(
    () =>
      habits.filter(
        (habit) => !habit.active,
      ),
    [habits],
  );

  const completedToday = useMemo(
    () =>
      activeHabits.filter((habit) =>
        getCompletedToday(
          habit.id,
          logs,
          today,
        ),
      ).length,
    [activeHabits, logs, today],
  );

  const completionPercentage =
    activeHabits.length > 0
      ? Math.round(
          (completedToday /
            activeHabits.length) *
            100,
        )
      : 0;

  const bestStreak = useMemo(
    () =>
      habits.reduce(
        (max, habit) =>
          Math.max(max, habit.streak),
        0,
      ),
    [habits],
  );

  const openCreateModal = () => {
    setEditingHabit(null);
    setForm(EMPTY_FORM);
    setOpenMenu(null);
    setShowModal(true);
  };

  const openEditModal = (
    habit: Habit,
  ) => {
    setEditingHabit(habit);

    setForm({
      name: habit.name,
      icon: habit.icon || '🎯',
      frequency:
        habit.frequency || 'daily',
      target: String(
        habit.target || 1,
      ),
      reminderTime:
        habit.reminder_time || '',
      category:
        habit.category || 'Personal',
    });

    setOpenMenu(null);
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingHabit(null);
    setForm(EMPTY_FORM);
  };

  const saveHabit = async () => {
    if (!user) return;

    const name = form.name.trim();

    if (!name) {
      return;
    }

    const parsedTarget = Number(
      form.target,
    );

    const target =
      Number.isFinite(parsedTarget) &&
      parsedTarget > 0
        ? Math.max(
            1,
            Math.round(parsedTarget),
          )
        : 1;

    setSaving(true);

    try {
      const payload = {
        name,
        icon: form.icon || '🎯',
        frequency:
          form.frequency || 'daily',
        target,
        reminder_time:
          form.reminderTime || null,
        category:
          form.category || 'Personal',
        updated_at:
          new Date().toISOString(),
      };

      if (editingHabit) {
        const { error } =
          await supabase
            .from('habits')
            .update(payload)
            .eq('id', editingHabit.id)
            .eq('user_id', user.id);

        if (error) {
          throw error;
        }
      } else {
        const { error } =
          await supabase
            .from('habits')
            .insert({
              ...payload,
              user_id: user.id,
              active: true,
              streak: 0,
            });

        if (error) {
          throw error;
        }
      }

      closeModal();
      await loadData();
    } catch (error) {
      console.error(
        'Failed to save habit:',
        error,
      );

      alert(
        'Could not save the habit. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteHabit = async (
    habit: Habit,
  ) => {
    if (!user) return;

    const confirmed = window.confirm(
      `Delete "${habit.name}"?`,
    );

    if (!confirmed) return;

    setOpenMenu(null);

    try {
      const { error } =
        await supabase
          .from('habit_logs')
          .delete()
          .eq('habit_id', habit.id)
          .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      const {
        error: habitError,
      } = await supabase
        .from('habits')
        .delete()
        .eq('id', habit.id)
        .eq('user_id', user.id);

      if (habitError) {
        throw habitError;
      }

      await loadData();
    } catch (error) {
      console.error(
        'Failed to delete habit:',
        error,
      );

      alert(
        'Could not delete the habit. Please try again.',
      );
    }
  };

  const toggleActive = async (
    habit: Habit,
  ) => {
    if (!user) return;

    setOpenMenu(null);

    try {
      const { error } =
        await supabase
          .from('habits')
          .update({
            active: !habit.active,
            updated_at:
              new Date().toISOString(),
          })
          .eq('id', habit.id)
          .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      await loadData();
    } catch (error) {
      console.error(
        'Failed to update habit:',
        error,
      );
    }
  };

  const toggleToday = async (
    habit: Habit,
  ) => {
    if (!user) return;

    const existingLog =
      logs.find(
        (log) =>
          log.habit_id === habit.id &&
          log.date === today,
      );

    const currentlyCompleted =
      existingLog?.completed ?? false;

    try {
      if (existingLog) {
        const { error } =
          await supabase
            .from('habit_logs')
            .update({
              completed:
                !currentlyCompleted,
            })
            .eq(
              'id',
              existingLog.id,
            )
            .eq(
              'user_id',
              user.id,
            );

        if (error) {
          throw error;
        }
      } else {
        const { error } =
          await supabase
            .from('habit_logs')
            .insert({
              user_id: user.id,
              habit_id: habit.id,
              date: today,
              completed: true,
            });

        if (error) {
          throw error;
        }
      }

      const nextCompleted =
        !currentlyCompleted;

      const nextStreak =
        calculateStreak(
          habit.id,
          [
            ...logs.filter(
              (log) =>
                !(
                  log.habit_id ===
                    habit.id &&
                  log.date === today
                ),
            ),
            {
              id:
                existingLog?.id ||
                `temporary-${habit.id}-${today}`,
              habit_id: habit.id,
              date: today,
              completed:
                nextCompleted,
            },
          ],
          today,
        );

      const { error: streakError } =
        await supabase
          .from('habits')
          .update({
            streak: nextStreak,
            updated_at:
              new Date().toISOString(),
          })
          .eq('id', habit.id)
          .eq('user_id', user.id);

      if (streakError) {
        throw streakError;
      }

      await loadData();
    } catch (error) {
      console.error(
        'Failed to update habit completion:',
        error,
      );

      alert(
        'Could not update the habit. Please try again.',
      );
    }
  };

  const updateForm = <
    K extends keyof HabitForm,
  >(
    key: K,
    value: HabitForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] w-full min-w-0 overflow-x-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">
            Loading habits...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full min-w-0 overflow-x-hidden bg-slate-50 pb-28 text-slate-900 dark:bg-slate-950 dark:text-white lg:pb-10">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">

        <div className="mb-6 flex min-w-0 items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              Daily consistency
            </p>

            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
              Habits
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Build small habits. Stay consistent.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex shrink-0 items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">
              Add Habit
            </span>
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            icon="✓"
            label="Today"
            value={`${completedToday}/${activeHabits.length}`}
            description="completed"
          />

          <SummaryCard
            icon="◉"
            label="Progress"
            value={`${completionPercentage}%`}
            description="today"
          />

          <SummaryCard
            icon="🔥"
            label="Best Streak"
            value={`${bestStreak}`}
            description="days"
          />

          <SummaryCard
            icon="●"
            label="Active"
            value={`${activeHabits.length}`}
            description="habits"
          />
        </div>

        {activeHabits.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">
                  Today&apos;s progress
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {completedToday ===
                  activeHabits.length
                    ? 'All active habits completed 🎉'
                    : `${activeHabits.length - completedToday} habit${
                        activeHabits.length -
                          completedToday ===
                        1
                          ? ''
                          : 's'
                      } remaining`}
                </p>
              </div>

              <span className="text-lg font-bold">
                {completionPercentage}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-slate-900 transition-all duration-500 dark:bg-white"
                style={{
                  width: `${completionPercentage}%`,
                }}
              />
            </div>
          </div>
        )}

        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">
                Active habits
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Complete your habits for today
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          {activeHabits.length === 0 ? (
            <EmptyHabits
              onAdd={openCreateModal}
            />
          ) : (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {activeHabits.map(
                (habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    completedToday={getCompletedToday(
                      habit.id,
                      logs,
                      today,
                    )}
                    onToggle={() =>
                      toggleToday(habit)
                    }
                    onEdit={() =>
                      openEditModal(habit)
                    }
                    onDelete={() =>
                      deleteHabit(habit)
                    }
                    onToggleActive={() =>
                      toggleActive(habit)
                    }
                    menuOpen={
                      openMenu ===
                      habit.id
                    }
                    setMenuOpen={() =>
                      setOpenMenu(
                        openMenu ===
                          habit.id
                          ? null
                          : habit.id,
                      )
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>

        {pausedHabits.length > 0 && (
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-bold">
                Paused habits
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Habits you are currently taking a break from
              </p>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pausedHabits.map(
                (habit) => (
                  <PausedHabit
                    key={habit.id}
                    habit={habit}
                    onResume={() =>
                      toggleActive(habit)
                    }
                    onEdit={() =>
                      openEditModal(habit)
                    }
                    onDelete={() =>
                      deleteHabit(habit)
                    }
                  />
                ),
              )}
            </div>
          </section>
        )}
      </div>

      {showModal && (
        <HabitModal
          editingHabit={editingHabit}
          form={form}
          saving={saving}
          onChange={updateForm}
          onClose={closeModal}
          onSave={saveHabit}
        />
      )}
    </div>
  );
}

function HabitCard({
  habit,
  completedToday,
  onToggle,
  onEdit,
  onDelete,
  onToggleActive,
  menuOpen,
  setMenuOpen,
}: {
  habit: Habit;
  completedToday: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  menuOpen: boolean;
  setMenuOpen: () => void;
}) {
  return (
    <div
      className={`relative min-w-0 overflow-hidden rounded-3xl border bg-white p-4 shadow-sm transition dark:bg-slate-900 ${
        completedToday
          ? 'border-emerald-200 dark:border-emerald-900/60'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={
            completedToday
              ? 'Mark habit incomplete'
              : 'Mark habit complete'
          }
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl transition ${
            completedToday
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800'
          }`}
        >
          {completedToday ? (
            <Check className="h-6 w-6" />
          ) : (
            habit.icon
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <h3
                className={`truncate font-semibold ${
                  completedToday
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : ''
                }`}
              >
                {habit.name}
              </h3>

              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                {formatFrequency(
                  habit.frequency,
                  habit.target,
                )}
              </p>
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={setMenuOpen}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Habit options"
              >
                <ChevronDown className="h-4 w-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-10 z-30 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={onEdit}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={onToggleActive}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Pause
                  </button>

                  <button
                    type="button"
                    onClick={onDelete}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-600 dark:bg-orange-950/30 dark:text-orange-400">
              <Flame className="h-3.5 w-3.5" />
              {habit.streak} day
              {habit.streak === 1
                ? ''
                : 's'}
            </span>

            {habit.category && (
              <span className="max-w-[140px] truncate rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {habit.category}
              </span>
            )}

            {habit.reminder_time && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                <Bell className="h-3 w-3" />
                {habit.reminder_time}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99] ${
          completedToday
            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50'
            : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
        }`}
      >
        <Check className="h-4 w-4" />

        {completedToday
          ? 'Completed today'
          : 'Mark as complete'}
      </button>
    </div>
  );
}

function PausedHabit({
  habit,
  onResume,
  onEdit,
  onDelete,
}: {
  habit: Habit;
  onResume: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 opacity-80 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl grayscale dark:bg-slate-800">
          {habit.icon}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">
            {habit.name}
          </h3>

          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
            Paused ·{' '}
            {formatFrequency(
              habit.frequency,
              habit.target,
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onResume}
          className="col-span-1 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
        >
          Resume
        </button>

        <button
          type="button"
          onClick={onEdit}
          className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function HabitModal({
  editingHabit,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  editingHabit: Habit | null;
  form: HabitForm;
  saving: boolean;
  onChange: <K extends keyof HabitForm>(
    key: K,
    value: HabitForm[K],
  ) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="max-h-[92dvh] w-full min-w-0 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 sm:max-w-lg sm:rounded-3xl sm:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">
              {editingHabit
                ? 'Edit habit'
                : 'Create habit'}
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Keep it simple and consistent.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Habit name
            </label>

            <input
              value={form.name}
              onChange={(event) =>
                onChange(
                  'name',
                  event.target.value,
                )
              }
              placeholder="e.g. Read 20 pages"
              className={inputClass}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Icon
            </label>

            <div className="grid grid-cols-8 gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() =>
                    onChange(
                      'icon',
                      icon,
                    )
                  }
                  className={`flex h-10 items-center justify-center rounded-xl text-lg transition ${
                    form.icon === icon
                      ? 'bg-slate-900 ring-2 ring-slate-900 ring-offset-2 dark:bg-white dark:ring-white dark:ring-offset-slate-900'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Frequency
              </label>

              <select
                value={form.frequency}
                onChange={(event) =>
                  onChange(
                    'frequency',
                    event.target.value,
                  )
                }
                className={inputClass}
              >
                <option value="daily">
                  Daily
                </option>

                <option value="weekly">
                  Weekly
                </option>

                <option value="custom">
                  Custom
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Target
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={form.target}
                onChange={(event) =>
                  onChange(
                    'target',
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Category
            </label>

            <select
              value={form.category}
              onChange={(event) =>
                onChange(
                  'category',
                  event.target.value,
                )
              }
              className={inputClass}
            >
              {CATEGORIES.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Reminder time
            </label>

            <div className="relative">
              <Bell className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="time"
                value={
                  form.reminderTime
                }
                onChange={(event) =>
                  onChange(
                    'reminderTime',
                    event.target.value,
                  )
                }
                className={`${inputClass} pl-10`}
              />
            </div>

            <p className="mt-1.5 text-[11px] text-slate-400">
              Optional reminder time.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={
                saving ||
                !form.name.trim()
              }
              className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {saving
                ? 'Saving...'
                : editingHabit
                  ? 'Save changes'
                  : 'Create habit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  description,
}: {
  icon: string;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm dark:bg-slate-800">
        {icon}
      </div>

      <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <div className="mt-1 flex min-w-0 items-baseline gap-1">
        <span className="truncate text-xl font-bold">
          {value}
        </span>

        <span className="truncate text-[10px] text-slate-400">
          {description}
        </span>
      </div>
    </div>
  );
}

function EmptyHabits({
  onAdd,
}: {
  onAdd: () => void;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl dark:bg-slate-800">
        🎯
      </div>

      <h3 className="font-semibold">
        No habits yet
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Add your first habit and start building a consistent routine.
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
      >
        <Plus className="h-4 w-4" />
        Create your first habit
      </button>
    </div>
  );
}

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-800';