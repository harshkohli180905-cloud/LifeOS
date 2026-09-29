import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Target,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getLocalDate } from '../lib/date';

type Range = 7 | 30 | 90;

type StudySession = {
  id: string;
  started_at: string;
  duration_seconds: number;
};

type Run = {
  id: string;
  date: string;
  distance_km: number;
  duration_seconds: number;
  calories: number;
};

type Workout = {
  id: string;
  date: string;
  duration_seconds: number;
};

type Meal = {
  id: string;
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type WaterLog = {
  id: string;
  date: string;
  amount_ml: number;
};

type Task = {
  id: string;
  due_date: string | null;
  completed: boolean;
};

type Goal = {
  id: string;
  title: string;
  progress: number;
  target: number;
  completed: boolean;
};

type DayReport = {
  date: string;
  label: string;
  studyMinutes: number;
  runDistance: number;
  workoutMinutes: number;
  waterMl: number;
  calories: number;
  protein: number;
  completedTasks: number;
  totalTasks: number;
};



function parseDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function formatDate(dateString: string) {
  return parseDate(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatShortDate(dateString: string) {
  return parseDate(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function getPeriodDates(range: Range, offset: number) {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const periodEnd = addDays(
    today,
    offset * range
  );

  const periodStart = addDays(
    periodEnd,
    -(range - 1)
  );

  return {
    start: periodStart,
    end: periodEnd,
  };
}

function ReportsView() {
  const { user } = useAuth();

  const [range, setRange] = useState<Range>(7);
  const [periodOffset, setPeriodOffset] = useState(0);

  const [studySessions, setStudySessions] = useState<
    StudySession[]
  >([]);

  const [runs, setRuns] = useState<Run[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const [loading, setLoading] = useState(true);

  const { start, end } = useMemo(
    () => getPeriodDates(range, periodOffset),
    [range, periodOffset]
  );

  

  const isCurrentPeriod = periodOffset === 0;

  useEffect(() => {
    setPeriodOffset(0);
  }, [range]);

  useEffect(() => {
    let active = true;

    const loadReport = async () => {
      if (!user) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      const periodStart = new Date(start);
      periodStart.setHours(0, 0, 0, 0);

      const periodEnd = new Date(end);
      periodEnd.setHours(23, 59, 59, 999);

      const periodStartString =
        getLocalDate(periodStart);

      const periodEndString =
        getLocalDate(periodEnd);

      const [
        studyResult,
        runsResult,
        workoutsResult,
        mealsResult,
        waterResult,
        tasksResult,
        goalsResult,
      ] = await Promise.all([
        supabase
          .from('study_sessions')
          .select(
            'id, started_at, duration_seconds'
          )
          .eq('user_id', user.id)
          .gte(
            'started_at',
            periodStart.toISOString()
          )
          .lte(
            'started_at',
            periodEnd.toISOString()
          )
          .order('started_at', {
            ascending: true,
          }),

        supabase
          .from('runs')
          .select(
            'id, date, distance_km, duration_seconds, calories'
          )
          .eq('user_id', user.id)
          .gte('date', periodStartString)
          .lte('date', periodEndString)
          .order('date', {
            ascending: true,
          }),

        supabase
          .from('workouts')
          .select(
            'id, date, duration_seconds'
          )
          .eq('user_id', user.id)
          .gte('date', periodStartString)
          .lte('date', periodEndString)
          .order('date', {
            ascending: true,
          }),

        supabase
          .from('meals')
          .select(
            'id, date, calories, protein, carbs, fat'
          )
          .eq('user_id', user.id)
          .gte('date', periodStartString)
          .lte('date', periodEndString)
          .order('date', {
            ascending: true,
          }),

        supabase
          .from('water_logs')
          .select(
            'id, date, amount_ml'
          )
          .eq('user_id', user.id)
          .gte('date', periodStartString)
          .lte('date', periodEndString)
          .order('date', {
            ascending: true,
          }),

        supabase
          .from('tasks')
          .select(
            'id, due_date, completed'
          )
          .eq('user_id', user.id)
          .gte('due_date', periodStartString)
          .lte('due_date', periodEndString),

        supabase
          .from('goals')
          .select(
            'id, title, progress, target, completed'
          )
          .eq('user_id', user.id)
          .order('updated_at', {
            ascending: false,
          }),
      ]);

      if (!active) {
        return;
      }

      if (studyResult.error) {
        console.error(
          'Report study error:',
          studyResult.error
        );
      }

      if (runsResult.error) {
        console.error(
          'Report runs error:',
          runsResult.error
        );
      }

      if (workoutsResult.error) {
        console.error(
          'Report workouts error:',
          workoutsResult.error
        );
      }

      if (mealsResult.error) {
        console.error(
          'Report meals error:',
          mealsResult.error
        );
      }

      if (waterResult.error) {
        console.error(
          'Report water error:',
          waterResult.error
        );
      }

      if (tasksResult.error) {
        console.error(
          'Report tasks error:',
          tasksResult.error
        );
      }

      if (goalsResult.error) {
        console.error(
          'Report goals error:',
          goalsResult.error
        );
      }

      setStudySessions(
        (studyResult.data ?? []) as StudySession[]
      );

      setRuns(
        (runsResult.data ?? []) as Run[]
      );

      setWorkouts(
        (workoutsResult.data ?? []) as Workout[]
      );

      setMeals(
        (mealsResult.data ?? []) as Meal[]
      );

      setWaterLogs(
        (waterResult.data ?? []) as WaterLog[]
      );

      setTasks(
        (tasksResult.data ?? []) as Task[]
      );

      setGoals(
        (goalsResult.data ?? []) as Goal[]
      );

      setLoading(false);
    };

    void loadReport();

    return () => {
      active = false;
    };
  }, [
    user,
    range,
    periodOffset,
    start,
    end,
  ]);

  const days = useMemo(() => {
    const result: DayReport[] = [];

    for (let i = 0; i < range; i += 1) {
      const date = addDays(
        end,
        -i
      );

      const dateString =
        getLocalDate(date);

      const studySeconds =
        studySessions
          .filter(
            (session) =>
              getLocalDate(
                new Date(session.started_at)
              ) === dateString
          )
          .reduce(
            (sum, session) =>
              sum +
              Number(
                session.duration_seconds || 0
              ),
            0
          );

      const runDistance =
        runs
          .filter(
            (run) =>
              run.date === dateString
          )
          .reduce(
            (sum, run) =>
              sum +
              Number(
                run.distance_km || 0
              ),
            0
          );

      const workoutSeconds =
        workouts
          .filter(
            (workout) =>
              workout.date === dateString
          )
          .reduce(
            (sum, workout) =>
              sum +
              Number(
                workout.duration_seconds || 0
              ),
            0
          );

      const water =
        waterLogs
          .filter(
            (log) =>
              log.date === dateString
          )
          .reduce(
            (sum, log) =>
              sum +
              Number(
                log.amount_ml || 0
              ),
            0
          );

      const dayMeals =
        meals.filter(
          (meal) =>
            meal.date === dateString
        );

      const calories =
        dayMeals.reduce(
          (sum, meal) =>
            sum +
            Number(
              meal.calories || 0
            ),
          0
        );

      const protein =
        dayMeals.reduce(
          (sum, meal) =>
            sum +
            Number(
              meal.protein || 0
            ),
          0
        );

      const dayTasks =
        tasks.filter(
          (task) =>
            task.due_date === dateString
        );

      result.push({
        date: dateString,
        label:
          i === 0
            ? 'Today'
            : formatShortDate(
                dateString
              ),
        studyMinutes:
          studySeconds / 60,
        runDistance,
        workoutMinutes:
          workoutSeconds / 60,
        waterMl: water,
        calories,
        protein,
        completedTasks:
          dayTasks.filter(
            (task) =>
              task.completed
          ).length,
        totalTasks:
          dayTasks.length,
      });
    }

    return result;
  }, [
    range,
    end,
    studySessions,
    runs,
    workouts,
    meals,
    waterLogs,
    tasks,
  ]);

  const totals = useMemo(() => {
    return {
      studySeconds:
        studySessions.reduce(
          (sum, session) =>
            sum +
            Number(
              session.duration_seconds || 0
            ),
          0
        ),

      runDistance:
        runs.reduce(
          (sum, run) =>
            sum +
            Number(
              run.distance_km || 0
            ),
          0
        ),

      runCalories:
        runs.reduce(
          (sum, run) =>
            sum +
            Number(
              run.calories || 0
            ),
          0
        ),

      workoutSeconds:
        workouts.reduce(
          (sum, workout) =>
            sum +
            Number(
              workout.duration_seconds || 0
            ),
          0
        ),

      waterMl:
        waterLogs.reduce(
          (sum, log) =>
            sum +
            Number(
              log.amount_ml || 0
            ),
          0
        ),

      calories:
        meals.reduce(
          (sum, meal) =>
            sum +
            Number(
              meal.calories || 0
            ),
          0
        ),

      protein:
        meals.reduce(
          (sum, meal) =>
            sum +
            Number(
              meal.protein || 0
            ),
          0
        ),

      carbs:
        meals.reduce(
          (sum, meal) =>
            sum +
            Number(
              meal.carbs || 0
            ),
          0
        ),

      fat:
        meals.reduce(
          (sum, meal) =>
            sum +
            Number(
              meal.fat || 0
            ),
          0
        ),

      completedTasks:
        tasks.filter(
          (task) =>
            task.completed
        ).length,

      totalTasks:
        tasks.length,
    };
  }, [
    studySessions,
    runs,
    workouts,
    waterLogs,
    meals,
    tasks,
  ]);

  const taskCompletion =
    totals.totalTasks === 0
      ? 0
      : Math.round(
          (totals.completedTasks /
            totals.totalTasks) *
            100
        );

  const goalCompletion =
    goals.length === 0
      ? 0
      : Math.round(
          (goals.filter(
            (goal) =>
              goal.completed ||
              Number(
                goal.progress || 0
              ) >=
                Number(
                  goal.target || 1
                )
          ).length /
            goals.length) *
            100
        );

  const activeDays = days.filter(
    (day) =>
      day.studyMinutes > 0 ||
      day.runDistance > 0 ||
      day.workoutMinutes > 0 ||
      day.waterMl > 0 ||
      day.calories > 0 ||
      day.totalTasks > 0
  ).length;

  const bestStudyDay =
    [...days].sort(
      (a, b) =>
        b.studyMinutes -
        a.studyMinutes
    )[0];

  const bestRunDay =
    [...days].sort(
      (a, b) =>
        b.runDistance -
        a.runDistance
    )[0];

  const maxStudy = Math.max(
    ...days.map(
      (day) =>
        day.studyMinutes
    ),
    1
  );

  const maxRun = Math.max(
    ...days.map(
      (day) =>
        day.runDistance
    ),
    1
  );

  const maxTasks = Math.max(
    ...days.map(
      (day) =>
        day.totalTasks
    ),
    1
  );

  const periodLabel = useMemo(() => {
    const startLabel =
      start.toLocaleDateString(
        'en-IN',
        {
          day: 'numeric',
          month: 'short',
        }
      );

    const endLabel =
      end.toLocaleDateString(
        'en-IN',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }
      );

    return `${startLabel} – ${endLabel}`;
  }, [start, end]);

  const handlePrevious = () => {
    setPeriodOffset(
      (current) =>
        current - 1
    );
  };

  const handleNext = () => {
    if (periodOffset >= 0) {
      return;
    }

    setPeriodOffset(
      (current) =>
        current + 1
    );
  };

  const handleRangeChange = (
    value: Range
  ) => {
    setRange(value);
    setPeriodOffset(0);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] w-full min-w-0 items-center justify-center overflow-hidden px-4">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black dark:border-white/20 dark:border-t-white" />

          <p className="mt-3 text-sm text-gray-500">
            Preparing your report...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full min-w-0 overflow-x-hidden pb-24 md:pb-8">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-0">
        {/* Header */}
        <section className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <BarChart3 size={22} />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
                  Reports
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Your progress, activity and consistency.
                </p>
              </div>
            </div>

            {/* Period controls */}
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-700 transition hover:bg-gray-100 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-200 dark:hover:bg-white/[0.06]"
                  aria-label="Previous period"
                >
                  <ChevronLeft
                    size={18}
                  />
                </button>

                <div className="min-w-0 flex-1 text-center">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {isCurrentPeriod
                      ? 'Current period'
                      : 'Previous period'}
                  </p>

                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {periodLabel}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={
                    isCurrentPeriod
                  }
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                    isCurrentPeriod
                      ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 dark:border-white/5 dark:bg-white/[0.02] dark:text-white/20'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-200 dark:hover:bg-white/[0.06]'
                  }`}
                  aria-label="Next period"
                >
                  <ChevronRight
                    size={18}
                  />
                </button>
              </div>

              <div className="flex w-full rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-white/10 dark:bg-white/[0.03]">
                {([7, 30, 90] as Range[]).map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        handleRangeChange(
                          value
                        )
                      }
                      className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                        range === value
                          ? 'bg-black text-white shadow-sm dark:bg-white dark:text-black'
                          : 'text-gray-500 hover:bg-white dark:hover:bg-white/5'
                      }`}
                    >
                      {value}D
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Overview */}
        <section className="grid min-w-0 grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#141414] md:p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <BookOpen size={18} />
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Study time
            </p>

            <p className="mt-1 truncate text-xl font-bold text-gray-900 dark:text-white md:text-2xl">
              {formatDuration(
                totals.studySeconds
              )}
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#141414] md:p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
              <Footprints size={18} />
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Running
            </p>

            <p className="mt-1 truncate text-xl font-bold text-gray-900 dark:text-white md:text-2xl">
              {totals.runDistance.toFixed(
                1
              )}{' '}
              km
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#141414] md:p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
              <Dumbbell size={18} />
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Workout time
            </p>

            <p className="mt-1 truncate text-xl font-bold text-gray-900 dark:text-white md:text-2xl">
              {formatDuration(
                totals.workoutSeconds
              )}
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#141414] md:p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400">
              <Droplets size={18} />
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Water
            </p>

            <p className="mt-1 truncate text-xl font-bold text-gray-900 dark:text-white md:text-2xl">
              {(totals.waterMl / 1000).toFixed(
                1
              )}{' '}
              L
            </p>
          </div>
        </section>

        {/* Productivity */}
        <section className="grid min-w-0 gap-4 lg:grid-cols-2">
          <div className="min-w-0 rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400">
                <CheckCircle2 size={19} />
              </div>

              <div className="min-w-0">
                <h2 className="font-bold text-gray-900 dark:text-white">
                  Task completion
                </h2>

                <p className="text-xs text-gray-500">
                  Tasks completed during this period.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-5">
              <div className="relative h-24 w-24 shrink-0 md:h-28 md:w-28">
                <svg
                  className="h-full w-full -rotate-90"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-gray-100 dark:text-white/5"
                  />

                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeLinecap="round"
                    className="text-green-500"
                    strokeDasharray="251.2"
                    strokeDashoffset={
                      251.2 -
                      (251.2 *
                        taskCompletion) /
                        100
                    }
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900 dark:text-white md:text-xl">
                    {taskCompletion}%
                  </span>
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totals.completedTasks}
                  <span className="text-base font-normal text-gray-400">
                    {' '}
                    / {totals.totalTasks}
                  </span>
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  tasks completed
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <CalendarDays
                    size={14}
                  />
                  {activeDays} active days
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400">
                <Target size={19} />
              </div>

              <div className="min-w-0">
                <h2 className="font-bold text-gray-900 dark:text-white">
                  Goals overview
                </h2>

                <p className="text-xs text-gray-500">
                  Current goal completion.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {goalCompletion}%
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    goals completed
                  </p>
                </div>

                <p className="text-sm text-gray-500">
                  {
                    goals.filter(
                      (goal) =>
                        goal.completed ||
                        Number(
                          goal.progress ||
                            0
                        ) >=
                          Number(
                            goal.target ||
                              1
                          )
                    ).length
                  }{' '}
                  / {goals.length}
                </p>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                <div
                  className="h-full rounded-full bg-yellow-500 transition-all"
                  style={{
                    width: `${goalCompletion}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Daily activity */}
        <section className="min-w-0 rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <TrendingUp
              size={19}
              className="shrink-0 text-indigo-500"
            />

            <div className="min-w-0">
              <h2 className="font-bold text-gray-900 dark:text-white">
                Daily activity
              </h2>

              <p className="text-xs text-gray-500">
                Today appears first.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {days.map((day) => {
              const studyWidth =
                day.studyMinutes === 0
                  ? 0
                  : Math.max(
                      4,
                      (day.studyMinutes /
                        maxStudy) *
                        100
                    );

              return (
                <div
                  key={day.date}
                  className={`rounded-2xl border p-3 ${
                    day.label === 'Today'
                      ? 'border-blue-200 bg-blue-50/70 dark:border-blue-500/20 dark:bg-blue-500/[0.05]'
                      : 'border-gray-100 bg-gray-50 dark:border-white/5 dark:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-16 shrink-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        {day.label}
                      </p>

                      <p className="mt-0.5 text-[10px] text-gray-400">
                        {day.date}
                      </p>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{
                            width: `${studyWidth}%`,
                          }}
                        />
                      </div>
                    </div>

                    <p className="w-12 shrink-0 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {Math.round(
                        day.studyMinutes
                      )}
                      m
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Running + tasks */}
        <section className="grid min-w-0 gap-4 lg:grid-cols-2">
          <div className="min-w-0 rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
            <div className="flex items-center gap-3">
              <Footprints
                size={19}
                className="shrink-0 text-orange-500"
              />

              <div className="min-w-0">
                <h2 className="font-bold text-gray-900 dark:text-white">
                  Running trend
                </h2>

                <p className="text-xs text-gray-500">
                  Daily distance, with today first.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {days.map((day) => {
                const width =
                  day.runDistance === 0
                    ? 0
                    : Math.max(
                        4,
                        (day.runDistance /
                          maxRun) *
                          100
                      );

                return (
                  <div
                    key={day.date}
                    className="rounded-2xl bg-gray-50 p-3 dark:bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-16 shrink-0 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {day.label}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-orange-500"
                            style={{
                              width: `${width}%`,
                            }}
                          />
                        </div>
                      </div>

                      <span className="w-16 shrink-0 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {day.runDistance.toFixed(
                          1
                        )}{' '}
                        km
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 dark:border-white/5">
              <div>
                <p className="text-xs text-gray-500">
                  Total distance
                </p>

                <p className="mt-1 font-bold text-gray-900 dark:text-white">
                  {totals.runDistance.toFixed(
                    1
                  )}{' '}
                  km
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Calories
                </p>

                <p className="mt-1 font-bold text-gray-900 dark:text-white">
                  {Math.round(
                    totals.runCalories
                  )}{' '}
                  kcal
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2
                size={19}
                className="shrink-0 text-green-500"
              />

              <div className="min-w-0">
                <h2 className="font-bold text-gray-900 dark:text-white">
                  Task activity
                </h2>

                <p className="text-xs text-gray-500">
                  Scheduled and completed tasks.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {days.map((day) => {
                const width =
                  day.totalTasks === 0
                    ? 0
                    : Math.max(
                        4,
                        (day.totalTasks /
                          maxTasks) *
                          100
                      );

                const completion =
                  day.totalTasks === 0
                    ? 0
                    : Math.min(
                        100,
                        (day.completedTasks /
                          day.totalTasks) *
                          100
                      );

                return (
                  <div
                    key={day.date}
                    className="rounded-2xl bg-gray-50 p-3 dark:bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-16 shrink-0 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {day.label}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="relative h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-gray-300 dark:bg-white/20"
                            style={{
                              width: `${width}%`,
                            }}
                          />

                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-green-500"
                            style={{
                              width: `${completion}%`,
                            }}
                          />
                        </div>
                      </div>

                      <span className="w-12 shrink-0 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {
                          day.completedTasks
                        }
                        /
                        {
                          day.totalTasks
                        }
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Highlights */}
        <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
            <div className="flex items-center gap-2 text-blue-500">
              <BookOpen size={17} />

              <span className="text-xs font-semibold uppercase tracking-wide">
                Best study day
              </span>
            </div>

            <p className="mt-3 truncate text-lg font-bold text-gray-900 dark:text-white">
              {bestStudyDay &&
              bestStudyDay.studyMinutes >
                0
                ? formatDate(
                    bestStudyDay.date
                  )
                : 'No study recorded'}
            </p>

            {bestStudyDay &&
              bestStudyDay.studyMinutes >
                0 && (
                <p className="mt-1 text-xs text-gray-500">
                  {formatDuration(
                    bestStudyDay.studyMinutes *
                      60
                  )}{' '}
                  studied
                </p>
              )}
          </div>

          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
            <div className="flex items-center gap-2 text-orange-500">
              <Footprints size={17} />

              <span className="text-xs font-semibold uppercase tracking-wide">
                Best run day
              </span>
            </div>

            <p className="mt-3 truncate text-lg font-bold text-gray-900 dark:text-white">
              {bestRunDay &&
              bestRunDay.runDistance >
                0
                ? formatDate(
                    bestRunDay.date
                  )
                : 'No run recorded'}
            </p>

            {bestRunDay &&
              bestRunDay.runDistance >
                0 && (
                <p className="mt-1 text-xs text-gray-500">
                  {bestRunDay.runDistance.toFixed(
                    1
                  )}{' '}
                  km
                </p>
              )}
          </div>

          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
            <div className="flex items-center gap-2 text-purple-500">
              <Clock3 size={17} />

              <span className="text-xs font-semibold uppercase tracking-wide">
                Daily average
              </span>
            </div>

            <p className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
              {formatDuration(
                totals.studySeconds /
                  range
              )}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              study time per day
            </p>
          </div>
        </section>

        {/* Nutrition */}
        <section className="min-w-0 rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
          <div className="flex items-center gap-3">
            <Flame
              size={19}
              className="shrink-0 text-green-500"
            />

            <div className="min-w-0">
              <h2 className="font-bold text-gray-900 dark:text-white">
                Nutrition summary
              </h2>

              <p className="text-xs text-gray-500">
                Total nutrition recorded during this period.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="min-w-0 rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs text-gray-500">
                Calories
              </p>

              <p className="mt-2 truncate text-xl font-bold text-gray-900 dark:text-white">
                {Math.round(
                  totals.calories
                )}
              </p>

              <p className="mt-1 text-[11px] text-gray-400">
                kcal
              </p>
            </div>

            <div className="min-w-0 rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs text-gray-500">
                Protein
              </p>

              <p className="mt-2 truncate text-xl font-bold text-gray-900 dark:text-white">
                {Math.round(
                  totals.protein
                )}
              </p>

              <p className="mt-1 text-[11px] text-gray-400">
                grams
              </p>
            </div>

            <div className="min-w-0 rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs text-gray-500">
                Carbs
              </p>

              <p className="mt-2 truncate text-xl font-bold text-gray-900 dark:text-white">
                {Math.round(
                  totals.carbs
                )}
              </p>

              <p className="mt-1 text-[11px] text-gray-400">
                grams
              </p>
            </div>

            <div className="min-w-0 rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs text-gray-500">
                Fat
              </p>

              <p className="mt-2 truncate text-xl font-bold text-gray-900 dark:text-white">
                {Math.round(
                  totals.fat
                )}
              </p>

              <p className="mt-1 text-[11px] text-gray-400">
                grams
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ReportsView;