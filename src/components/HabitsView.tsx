import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Archive,
  CalendarDays,
  Check,
  CheckCircle2,
  
  Flame,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Habit = {
  id: string;
  name: string;
  icon: string | null;
  frequency: string;
  target: number | null;
  reminder_time: string | null;
  active: boolean;
  streak: number | null;
  category: string | null;
  created_at: string;
};

type HabitLog = {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
};

type HabitForm = {
  name: string;
  icon: string;
  frequency: string;
  target: string;
  reminderTime: string;
  category: string;
};

const DEFAULT_FORM: HabitForm = {
  name: '',
  icon: '✓',
  frequency: 'daily',
  target: '1',
  reminderTime: '',
  category: 'Personal',
};

const CATEGORY_OPTIONS = [
  'Personal',
  'Study',
  'Fitness',
  'Health',
  'Productivity',
  'Other',
];

const ICON_OPTIONS = [
  '✓',
  '📚',
  '🏃',
  '💪',
  '💧',
  '🥗',
  '🧘',
  '😴',
  '🎯',
  '💻',
  '📖',
  '📝',
];

function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');
  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return getLocalDate(date);
}

function getLastSevenDays() {
  return Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date();
      date.setDate(
        date.getDate() - (6 - index),
      );

      return {
        date: getLocalDate(date),
        label: date.toLocaleDateString(
          'en-IN',
          {
            weekday: 'short',
          },
        ),
        day: date.getDate(),
      };
    },
  );
}

function calculateStreak(
  habitId: string,
  logs: HabitLog[],
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
  let cursor = new Date();

  if (!completedDates.has(getLocalDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (
    completedDates.has(getLocalDate(cursor))
  ) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export default function HabitsView() {
  const { user } = useAuth();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] =
    useState(false);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingHabit, setEditingHabit] =
    useState<Habit | null>(null);

  const [form, setForm] =
    useState<HabitForm>(DEFAULT_FORM);

  const [openMenu, setOpenMenu] =
    useState<string | null>(null);

  const lastSevenDays = useMemo(
    () => getLastSevenDays(),
    [],
  );

  const today = getLocalDate();

  const loadData = useCallback(
    async () => {
      if (!user) return;

      setLoading(true);

      try {
        const [
          habitsResult,
          logsResult,
        ] = await Promise.all([
          supabase
            .from('habits')
            .select(
              'id,name,icon,frequency,target,reminder_time,active,streak,category,created_at',
            )
            .eq('user_id', user.id)
            .order('created_at', {
              ascending: true,
            }),

          supabase
            .from('habit_logs')
            .select(
              'id,habit_id,date,completed',
            )
            .eq('user_id', user.id)
            .gte(
              'date',
              getDateOffset(-30),
            )
            .order('date', {
              ascending: false,
            }),
        ]);

        if (habitsResult.error) {
          console.error(
            'Loading habits failed:',
            habitsResult.error,
          );
        }

        if (logsResult.error) {
          console.error(
            'Loading habit logs failed:',
            logsResult.error,
          );
        }

        setHabits(
          (habitsResult.data ??
            []) as Habit[],
        );

        setLogs(
          (logsResult.data ??
            []) as HabitLog[],
        );
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(
        `habits-view-${user.id}`,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habits',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadData();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habit_logs',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadData]);

  const activeHabits = useMemo(
    () =>
      habits.filter(
        (habit) => habit.active,
      ),
    [habits],
  );

  const archivedHabits = useMemo(
    () =>
      habits.filter(
        (habit) => !habit.active,
      ),
    [habits],
  );

  const visibleHabits = useMemo(() => {
    const source = showArchived
      ? archivedHabits
      : activeHabits;

    const query = search
      .trim()
      .toLowerCase();

    if (!query) return source;

    return source.filter((habit) =>
      [
        habit.name,
        habit.category,
        habit.frequency,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query),
        ),
    );
  }, [
    search,
    showArchived,
    activeHabits,
    archivedHabits,
  ]);

  const todayCompletedCount =
    activeHabits.filter((habit) =>
      logs.some(
        (log) =>
          log.habit_id === habit.id &&
          log.date === today &&
          log.completed,
      ),
    ).length;

  const completionPercentage =
    activeHabits.length > 0
      ? Math.round(
          (todayCompletedCount /
            activeHabits.length) *
            100,
        )
      : 0;

  const totalCompletedLogs = logs.filter(
    (log) => log.completed,
  ).length;

  const openCreateModal = () => {
    setEditingHabit(null);
    setForm(DEFAULT_FORM);
    setModalOpen(true);
    setOpenMenu(null);
  };

  const openEditModal = (
    habit: Habit,
  ) => {
    setEditingHabit(habit);

    setForm({
      name: habit.name,
      icon: habit.icon || '✓',
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

    setModalOpen(true);
    setOpenMenu(null);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingHabit(null);
    setForm(DEFAULT_FORM);
  };

  const saveHabit = async () => {
    if (!user) return;

    const trimmedName =
      form.name.trim();

    if (!trimmedName) return;

    setSaving(true);

    try {
      const payload = {
        name: trimmedName,
        icon: form.icon || '✓',
        frequency:
          form.frequency || 'daily',
        target:
          Math.max(
            1,
            Number(form.target) || 1,
          ),
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
            .eq(
              'id',
              editingHabit.id,
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
        'Saving habit failed:',
        error,
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleToday = async (
    habit: Habit,
  ) => {
    if (!user || !habit.active) return;

    const existingLog =
      logs.find(
        (log) =>
          log.habit_id === habit.id &&
          log.date === today,
      );

    try {
      if (existingLog) {
        const { error } =
          await supabase
            .from('habit_logs')
            .update({
              completed:
                !existingLog.completed,
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

      const nextLogsResult =
        await supabase
          .from('habit_logs')
          .select(
            'id,habit_id,date,completed',
          )
          .eq(
            'user_id',
            user.id,
          )
          .eq(
            'habit_id',
            habit.id,
          )
          .gte(
            'date',
            getDateOffset(-365),
          );

      if (!nextLogsResult.error) {
        const nextStreak =
          calculateStreak(
            habit.id,
            (nextLogsResult.data ??
              []) as HabitLog[],
          );

        await supabase
          .from('habits')
          .update({
            streak: nextStreak,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            habit.id,
          )
          .eq(
            'user_id',
            user.id,
          );
      }

      await loadData();
    } catch (error) {
      console.error(
        'Updating habit failed:',
        error,
      );
    }
  };

  const archiveHabit = async (
    habit: Habit,
  ) => {
    if (!user) return;

    try {
      const { error } =
        await supabase
          .from('habits')
          .update({
            active: false,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            habit.id,
          )
          .eq(
            'user_id',
            user.id,
          );

      if (error) {
        throw error;
      }

      setOpenMenu(null);
      await loadData();
    } catch (error) {
      console.error(
        'Archiving habit failed:',
        error,
      );
    }
  };

  const restoreHabit = async (
    habit: Habit,
  ) => {
    if (!user) return;

    try {
      const { error } =
        await supabase
          .from('habits')
          .update({
            active: true,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            habit.id,
          )
          .eq(
            'user_id',
            user.id,
          );

      if (error) {
        throw error;
      }

      setOpenMenu(null);
      await loadData();
    } catch (error) {
      console.error(
        'Restoring habit failed:',
        error,
      );
    }
  };

  const deleteHabit = async (
    habit: Habit,
  ) => {
    if (!user) return;

    const confirmed =
      window.confirm(
        `Delete "${habit.name}" permanently?`,
      );

    if (!confirmed) return;

    try {
      await supabase
        .from('habit_logs')
        .delete()
        .eq(
          'habit_id',
          habit.id,
        )
        .eq(
          'user_id',
          user.id,
        );

      const { error } =
        await supabase
          .from('habits')
          .delete()
          .eq(
            'id',
            habit.id,
          )
          .eq(
            'user_id',
            user.id,
          );

      if (error) {
        throw error;
      }

      setOpenMenu(null);
      await loadData();
    } catch (error) {
      console.error(
        'Deleting habit failed:',
        error,
      );
    }
  };

  const getHabitTodayState = (
    habitId: string,
  ) =>
    logs.some(
      (log) =>
        log.habit_id === habitId &&
        log.date === today &&
        log.completed,
    );

  const getDayState = (
    habitId: string,
    date: string,
  ) =>
    logs.some(
      (log) =>
        log.habit_id === habitId &&
        log.date === date &&
        log.completed,
    );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-700 dark:border-t-white" />
          Loading habits...
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 pb-24 lg:pb-8"
      onClick={() => setOpenMenu(null)}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Consistency
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Habits
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Build small routines that compound over time.
          </p>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openCreateModal();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <Plus className="h-4 w-4" />
          Add habit
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={
            <CheckCircle2 className="h-5 w-5" />
          }
          label="Today's progress"
          value={`${todayCompletedCount}/${activeHabits.length}`}
          detail={`${completionPercentage}% complete`}
        />

        <StatCard
          icon={
            <Flame className="h-5 w-5" />
          }
          label="Active habits"
          value={String(activeHabits.length)}
          detail="Currently tracking"
        />

        <StatCard
          icon={
            <CalendarDays className="h-5 w-5" />
          }
          label="Completed logs"
          value={String(
            totalCompletedLogs,
          )}
          detail="Last 30 days"
        />

        <StatCard
          icon={
            <Archive className="h-5 w-5" />
          }
          label="Archived"
          value={String(
            archivedHabits.length,
          )}
          detail="Hidden habits"
        />
      </div>

      {/* Today's progress */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Today's progress
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {todayCompletedCount} of{' '}
                {activeHabits.length} habits
                completed
              </p>
            </div>

            <span className="text-lg font-bold text-slate-900 dark:text-white">
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
      </section>

      {/* Search */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search habits..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800"
          />
        </div>

        <button
          type="button"
          onClick={() =>
            setShowArchived(
              (current) => !current,
            )
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Archive className="h-4 w-4" />
          {showArchived
            ? 'Active habits'
            : 'Archived'}
        </button>
      </div>

      {/* Habit list */}
      {visibleHabits.length === 0 ? (
        <EmptyState
          archived={showArchived}
          search={search}
          onAdd={openCreateModal}
        />
      ) : (
        <div className="space-y-3">
          {visibleHabits.map((habit) => {
            const completedToday =
              getHabitTodayState(
                habit.id,
              );

            const streak =
              calculateStreak(
                habit.id,
                logs,
              );

            return (
              <article
                key={habit.id}
                className={`rounded-2xl border bg-white transition dark:bg-slate-900 ${
                  completedToday
                    ? 'border-slate-300 dark:border-slate-700'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleToday(habit);
                      }}
                      disabled={
                        !habit.active
                      }
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg transition ${
                        completedToday
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                          : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600'
                      }`}
                    >
                      {completedToday ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        habit.icon || '✓'
                      )}
                    </button>

                    {/* Main info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`truncate font-semibold ${
                            completedToday
                              ? 'text-slate-500 line-through dark:text-slate-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {habit.name}
                        </h3>

                        {habit.category && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {habit.category}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span>
                          {habit.frequency ||
                            'Daily'}
                        </span>

                        {habit.target && (
                          <span>
                            Target:{' '}
                            {habit.target}
                          </span>
                        )}

                        {habit.reminder_time && (
                          <span>
                            {habit.reminder_time}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Streak */}
                    <div className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800 sm:flex">
                      <Flame className="h-4 w-4 text-slate-500 dark:text-slate-300" />

                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {streak}
                      </span>

                      <span className="text-xs text-slate-400">
                        day
                        {streak === 1
                          ? ''
                          : 's'}
                      </span>
                    </div>

                    {/* Menu */}
                    <div
                      className="relative"
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenu(
                            (current) =>
                              current ===
                              habit.id
                                ? null
                                : habit.id,
                          )
                        }
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>

                      {openMenu ===
                        habit.id && (
                        <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(
                                habit,
                              )
                            }
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>

                          {habit.active ? (
                            <button
                              type="button"
                              onClick={() =>
                                archiveHabit(
                                  habit,
                                )
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <Archive className="h-4 w-4" />
                              Archive
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                restoreHabit(
                                  habit,
                                )
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Restore
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              deleteHabit(
                                habit,
                              )
                            }
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile streak */}
                  <div className="mt-4 flex items-center justify-between sm:hidden">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Flame className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                      <span>
                        {streak} day
                        {streak === 1
                          ? ''
                          : 's'}{' '}
                        streak
                      </span>
                    </div>

                    <span
                      className={`text-xs font-medium ${
                        completedToday
                          ? 'text-slate-700 dark:text-slate-200'
                          : 'text-slate-400'
                      }`}
                    >
                      {completedToday
                        ? 'Completed today'
                        : 'Tap to complete'}
                    </span>
                  </div>

                  {/* Seven day history */}
                  <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <div className="grid grid-cols-7 gap-1.5">
                      {lastSevenDays.map(
                        (day) => {
                          const completed =
                            getDayState(
                              habit.id,
                              day.date,
                            );

                          return (
                            <div
                              key={day.date}
                              className="flex flex-col items-center gap-1"
                            >
                              <span className="text-[10px] font-medium text-slate-400">
                                {day.label}
                              </span>

                              <div
                                className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-semibold ${
                                  completed
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                }`}
                              >
                                {completed ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : (
                                  day.day
                                )}
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingHabit
                    ? 'Edit habit'
                    : 'Create habit'}
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Keep it simple and measurable.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Habit name
                </label>

                <input
                  autoFocus
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Read 20 pages"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Icon
                </label>

                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map(
                    (icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() =>
                          setForm(
                            (current) => ({
                              ...current,
                              icon,
                            }),
                          )
                        }
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition ${
                          form.icon === icon
                            ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                            : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800'
                        }`}
                      >
                        {icon}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Frequency
                  </label>

                  <select
                    value={form.frequency}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          frequency:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className={selectClass}
                  >
                    <option value="daily">
                      Daily
                    </option>
                    <option value="weekly">
                      Weekly
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
                    value={form.target}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          target:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Category
                  </label>

                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          category:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className={selectClass}
                  >
                    {CATEGORY_OPTIONS.map(
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
                    Reminder
                  </label>

                  <input
                    type="time"
                    value={
                      form.reminderTime
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          reminderTime:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-5 sm:flex-row sm:justify-end dark:border-slate-800">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveHabit}
                disabled={
                  saving ||
                  !form.name.trim()
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {saving
                  ? 'Saving...'
                  : editingHabit
                    ? 'Save changes'
                    : 'Create habit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------- SMALL COMPONENTS -------------------- */

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {icon}
      </div>

      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-slate-400">
        {detail}
      </p>
    </div>
  );
}

function EmptyState({
  archived,
  search,
  onAdd,
}: {
  archived: boolean;
  search: string;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        {archived ? (
          <Archive className="h-5 w-5" />
        ) : (
          <CheckCircle2 className="h-5 w-5" />
        )}
      </div>

      <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
        {search
          ? 'No habits found'
          : archived
            ? 'No archived habits'
            : 'No habits yet'}
      </h3>

      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {search
          ? 'Try a different search term.'
          : archived
            ? 'Archived habits will appear here.'
            : 'Start with one small habit and build from there.'}
      </p>

      {!search && !archived && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
        >
          <Plus className="h-4 w-4" />
          Create your first habit
        </button>
      )}
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800';

const selectClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800';