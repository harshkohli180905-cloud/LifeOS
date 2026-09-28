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
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

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

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.round(seconds / 60);
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
  const [year, month, day] = dateString.split('-').map(Number);

  return new Date(year, month - 1, day).toLocaleDateString(
    'en-IN',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  );
}

function ReportsView() {
  const { user } = useAuth();

  const [range, setRange] = useState<Range>(7);

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

  const loadReport = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const today = new Date();

    const startDate = new Date(today);
    startDate.setDate(
      today.getDate() - (range - 1)
    );
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    const startDateString = getLocalDateString(startDate);
    const endDateString = getLocalDateString(endDate);

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
          startDate.toISOString()
        )
        .lte(
          'started_at',
          endDate.toISOString()
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
        .gte('date', startDateString)
        .lte('date', endDateString)
        .order('date', {
          ascending: true,
        }),

      supabase
        .from('workouts')
        .select(
          'id, date, duration_seconds'
        )
        .eq('user_id', user.id)
        .gte('date', startDateString)
        .lte('date', endDateString)
        .order('date', {
          ascending: true,
        }),

      supabase
        .from('meals')
        .select(
          'id, date, calories, protein, carbs, fat'
        )
        .eq('user_id', user.id)
        .gte('date', startDateString)
        .lte('date', endDateString)
        .order('date', {
          ascending: true,
        }),

      supabase
        .from('water_logs')
        .select(
          'id, date, amount_ml'
        )
        .eq('user_id', user.id)
        .gte('date', startDateString)
        .lte('date', endDateString)
        .order('date', {
          ascending: true,
        }),

      supabase
        .from('tasks')
        .select(
          'id, due_date, completed'
        )
        .eq('user_id', user.id)
        .gte('due_date', startDateString)
        .lte('due_date', endDateString),

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

    setRuns((runsResult.data ?? []) as Run[]);

    setWorkouts(
      (workoutsResult.data ?? []) as Workout[]
    );

    setMeals((mealsResult.data ?? []) as Meal[]);

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

  useEffect(() => {
    loadReport();
  }, [user, range]);

  const days = useMemo(() => {
    const result: DayReport[] = [];
    const today = new Date();

    for (let i = range - 1; i >= 0; i -= 1) {
      const date = new Date(today);

      date.setDate(
        today.getDate() - i
      );

      const dateString =
        getLocalDateString(date);

      const studySeconds =
        studySessions
          .filter(
            (session) =>
              getLocalDateString(
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

      const runDistance = runs
        .filter(
          (run) => run.date === dateString
        )
        .reduce(
          (sum, run) =>
            sum +
            Number(run.distance_km || 0),
          0
        );

      const workoutSeconds = workouts
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

      const water = waterLogs
        .filter(
          (log) => log.date === dateString
        )
        .reduce(
          (sum, log) =>
            sum +
            Number(log.amount_ml || 0),
          0
        );

      const calories = meals
        .filter(
          (meal) => meal.date === dateString
        )
        .reduce(
          (sum, meal) =>
            sum +
            Number(meal.calories || 0),
          0
        );

      const protein = meals
        .filter(
          (meal) => meal.date === dateString
        )
        .reduce(
          (sum, meal) =>
            sum +
            Number(meal.protein || 0),
          0
        );

      const dayTasks = tasks.filter(
        (task) =>
          task.due_date === dateString
      );

      result.push({
        date: dateString,
        label: date.toLocaleDateString(
          'en-IN',
          {
            day: 'numeric',
            month: 'short',
          }
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
            (task) => task.completed
          ).length,
        totalTasks: dayTasks.length,
      });
    }

    return result;
  }, [
    range,
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
            Number(run.distance_km || 0),
          0
        ),

      runCalories:
        runs.reduce(
          (sum, run) =>
            sum +
            Number(run.calories || 0),
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
            Number(log.amount_ml || 0),
          0
        ),

      calories:
        meals.reduce(
          (sum, meal) =>
            sum +
            Number(meal.calories || 0),
          0
        ),

      protein:
        meals.reduce(
          (sum, meal) =>
            sum +
            Number(meal.protein || 0),
          0
        ),

      carbs:
        meals.reduce(
          (sum, meal) =>
            sum +
            Number(meal.carbs || 0),
          0
        ),

      fat:
        meals.reduce(
          (sum, meal) =>
            sum +
            Number(meal.fat || 0),
          0
        ),

      completedTasks:
        tasks.filter(
          (task) => task.completed
        ).length,

      totalTasks: tasks.length,
    };
  }, [
    studySessions,
    runs,
    workouts,
    waterLogs,
    meals,
    tasks,
  ]);

  const taskCompletion = useMemo(() => {
    if (totals.totalTasks === 0) {
      return 0;
    }

    return Math.round(
      (totals.completedTasks /
        totals.totalTasks) *
        100
    );
  }, [
    totals.completedTasks,
    totals.totalTasks,
  ]);

  const goalCompletion = useMemo(() => {
    if (goals.length === 0) {
      return 0;
    }

    const completed = goals.filter(
      (goal) =>
        goal.completed ||
        Number(goal.progress || 0) >=
          Number(goal.target || 1)
    ).length;

    return Math.round(
      (completed / goals.length) * 100
    );
  }, [goals]);

  const activeDays = useMemo(() => {
    return days.filter(
      (day) =>
        day.studyMinutes > 0 ||
        day.runDistance > 0 ||
        day.workoutMinutes > 0 ||
        day.waterMl > 0 ||
        day.calories > 0 ||
        day.totalTasks > 0
    ).length;
  }, [days]);

  const bestStudyDay = useMemo(() => {
    return [...days].sort(
      (a, b) =>
        b.studyMinutes -
        a.studyMinutes
    )[0];
  }, [days]);

  const bestRunDay = useMemo(() => {
    return [...days].sort(
      (a, b) =>
        b.runDistance -
        a.runDistance
    )[0];
  }, [days]);

  const maxStudy = Math.max(
    ...days.map(
      (day) => day.studyMinutes
    ),
    1
  );

  const maxRun = Math.max(
    ...days.map(
      (day) => day.runDistance
    ),
    1
  );

  const maxTasks = Math.max(
    ...days.map(
      (day) => day.totalTasks
    ),
    1
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
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
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <BarChart3 size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
                Reports
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                A complete snapshot of your progress.
              </p>
            </div>
          </div>
        </div>

        <div className="flex rounded-xl border border-gray-200 bg-white p-1 dark:border-white/10 dark:bg-[#141414]">
          {([7, 30, 90] as Range[]).map(
            (value) => (
              <button
                key={value}
                onClick={() =>
                  setRange(value)
                }
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  range === value
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                {value}D
              </button>
            )
          )}
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <BookOpen size={18} />
          </div>

          <p className="mt-4 text-xs text-gray-500">
            Study time
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatDuration(
              totals.studySeconds
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
            <Footprints size={18} />
          </div>

          <p className="mt-4 text-xs text-gray-500">
            Running
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {totals.runDistance.toFixed(1)} km
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
            <Dumbbell size={18} />
          </div>

          <p className="mt-4 text-xs text-gray-500">
            Workout time
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatDuration(
              totals.workoutSeconds
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400">
            <Droplets size={18} />
          </div>

          <p className="mt-4 text-xs text-gray-500">
            Water
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {(totals.waterMl / 1000).toFixed(1)} L
          </p>
        </div>
      </div>

      {/* Productivity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400">
              <CheckCircle2 size={19} />
            </div>

            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Task completion
              </h2>

              <p className="text-xs text-gray-500">
                How consistently you completed your tasks.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-6">
            <div className="relative h-28 w-28 shrink-0">
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
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {taskCompletion}%
                </span>
              </div>
            </div>

            <div>
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
                <CalendarDays size={14} />
                {activeDays} active days
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400">
              <Target size={19} />
            </div>

            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Goals overview
              </h2>

              <p className="text-xs text-gray-500">
                Current goal completion.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {goalCompletion}%
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  goals completed
                </p>
              </div>

              <p className="text-sm text-gray-500">
                {goals.filter(
                  (goal) =>
                    goal.completed ||
                    Number(
                      goal.progress || 0
                    ) >=
                      Number(
                        goal.target || 1
                      )
                ).length}{' '}
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
      </div>

      {/* Daily activity */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
        <div className="flex items-center gap-3">
          <TrendingUp
            size={19}
            className="text-indigo-500"
          />

          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">
              Daily activity
            </h2>

            <p className="text-xs text-gray-500">
              Study sessions completed across the selected period.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <div
            className="flex min-w-[560px] items-end gap-2"
            style={{
              height: 220,
            }}
          >
            {days.map((day) => {
              const height =
                (day.studyMinutes /
                  maxStudy) *
                165;

              return (
                <div
                  key={day.date}
                  className="flex min-w-[34px] flex-1 flex-col items-center justify-end gap-2"
                >
                  {day.studyMinutes >
                    0 && (
                    <span className="text-[9px] font-medium text-gray-400">
                      {Math.round(
                        day.studyMinutes
                      )}
                    </span>
                  )}

                  <div
                    className="w-full max-w-[30px] rounded-t-lg bg-blue-500"
                    style={{
                      height: `${Math.max(
                        height,
                        day.studyMinutes >
                          0
                          ? 6
                          : 2
                      )}px`,
                    }}
                  />

                  <span className="text-[9px] text-gray-400">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Running + tasks */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
          <div className="flex items-center gap-3">
            <Footprints
              size={19}
              className="text-orange-500"
            />

            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Running trend
              </h2>

              <p className="text-xs text-gray-500">
                Distance recorded each day.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <div
              className="flex min-w-[450px] items-end gap-2"
              style={{
                height: 180,
              }}
            >
              {days.map((day) => {
                const height =
                  (day.runDistance /
                    maxRun) *
                  125;

                return (
                  <div
                    key={day.date}
                    className="flex min-w-[30px] flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div
                      className="w-full max-w-[28px] rounded-t-md bg-orange-500"
                      style={{
                        height: `${Math.max(
                          height,
                          day.runDistance >
                            0
                            ? 5
                            : 2
                        )}px`,
                      }}
                    />

                    <span className="text-[8px] text-gray-400">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 dark:border-white/5">
            <div>
              <p className="text-xs text-gray-500">
                Total distance
              </p>

              <p className="mt-1 font-bold text-gray-900 dark:text-white">
                {totals.runDistance.toFixed(1)} km
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

        <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2
              size={19}
              className="text-green-500"
            />

            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Task activity
              </h2>

              <p className="text-xs text-gray-500">
                Tasks scheduled and completed each day.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <div
              className="flex min-w-[450px] items-end gap-2"
              style={{
                height: 180,
              }}
            >
              {days.map((day) => {
                const height =
                  (day.totalTasks /
                    maxTasks) *
                  125;

                return (
                  <div
                    key={day.date}
                    className="flex min-w-[30px] flex-1 flex-col items-center justify-end gap-2"
                  >
                    {day.totalTasks >
                      0 && (
                      <span className="text-[8px] text-gray-400">
                        {
                          day.completedTasks
                        }
                        /
                        {
                          day.totalTasks
                        }
                      </span>
                    )}

                    <div
                      className="relative w-full max-w-[28px] rounded-t-md bg-gray-200 dark:bg-white/10"
                      style={{
                        height: `${Math.max(
                          height,
                          day.totalTasks >
                            0
                            ? 5
                            : 2
                        )}px`,
                      }}
                    >
                      {day.totalTasks >
                        0 && (
                        <div
                          className="absolute bottom-0 left-0 w-full rounded-t-md bg-green-500"
                          style={{
                            height: `${
                              (day.completedTasks /
                                day.totalTasks) *
                              100
                            }%`,
                          }}
                        />
                      )}
                    </div>

                    <span className="text-[8px] text-gray-400">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
          <div className="flex items-center gap-2 text-blue-500">
            <BookOpen size={17} />

            <span className="text-xs font-semibold uppercase tracking-wide">
              Best study day
            </span>
          </div>

          <p className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
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

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
          <div className="flex items-center gap-2 text-orange-500">
            <Footprints size={17} />

            <span className="text-xs font-semibold uppercase tracking-wide">
              Best run day
            </span>
          </div>

          <p className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
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

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
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
      </div>

      {/* Nutrition summary */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
        <div className="flex items-center gap-3">
          <Flame
            size={19}
            className="text-green-500"
          />

          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">
              Nutrition summary
            </h2>

            <p className="text-xs text-gray-500">
              Total nutrition recorded during this period.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <p className="text-xs text-gray-500">
              Calories
            </p>

            <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
              {Math.round(
                totals.calories
              )}
            </p>

            <p className="mt-1 text-[11px] text-gray-400">
              kcal
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <p className="text-xs text-gray-500">
              Protein
            </p>

            <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
              {Math.round(
                totals.protein
              )}
            </p>

            <p className="mt-1 text-[11px] text-gray-400">
              grams
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <p className="text-xs text-gray-500">
              Carbs
            </p>

            <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
              {Math.round(
                totals.carbs
              )}
            </p>

            <p className="mt-1 text-[11px] text-gray-400">
              grams
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <p className="text-xs text-gray-500">
              Fat
            </p>

            <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
              {Math.round(
                totals.fat
              )}
            </p>

            <p className="mt-1 text-[11px] text-gray-400">
              grams
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportsView;