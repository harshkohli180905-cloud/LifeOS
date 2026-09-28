import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Clock3,
  Droplets,
  Flame,
  Footprints,
  Dumbbell,
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
};

type WaterLog = {
  id: string;
  date: string;
  amount_ml: number;
};

type DayStats = {
  date: string;
  label: string;
  studyMinutes: number;
  runDistance: number;
  workoutMinutes: number;
  waterMl: number;
  calories: number;
  protein: number;
};

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}



function formatMinutes(minutes: number) {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);

  if (remaining === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remaining}m`;
}

function formatStudyTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function AnalyticsView() {
  const { user } = useAuth();

  const [range, setRange] = useState<Range>(7);

  const [studySessions, setStudySessions] = useState<
    StudySession[]
  >([]);

  const [runs, setRuns] = useState<Run[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);

  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    if (!user) return;

    setLoading(true);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (range - 1));
    startDate.setHours(0, 0, 0, 0);

    const startDateString = getLocalDateString(startDate);
    const endDateString = getLocalDateString(endDate);

    const [
      studyResult,
      runsResult,
      workoutsResult,
      mealsResult,
      waterResult,
    ] = await Promise.all([
      supabase
        .from('study_sessions')
        .select('id, started_at, duration_seconds')
        .eq('user_id', user.id)
        .gte('started_at', startDate.toISOString())
        .lte('started_at', endDate.toISOString())
        .order('started_at', { ascending: true }),

      supabase
        .from('runs')
        .select(
          'id, date, distance_km, duration_seconds, calories'
        )
        .eq('user_id', user.id)
        .gte('date', startDateString)
        .lte('date', endDateString)
        .order('date', { ascending: true }),

      supabase
        .from('workouts')
        .select('id, date, duration_seconds')
        .eq('user_id', user.id)
        .gte('date', startDateString)
        .lte('date', endDateString)
        .order('date', { ascending: true }),

      supabase
        .from('meals')
        .select('id, date, calories, protein')
        .eq('user_id', user.id)
        .gte('date', startDateString)
        .lte('date', endDateString)
        .order('date', { ascending: true }),

      supabase
        .from('water_logs')
        .select('id, date, amount_ml')
        .eq('user_id', user.id)
        .gte('date', startDateString)
        .lte('date', endDateString)
        .order('date', { ascending: true }),
    ]);

    if (studyResult.error) {
      console.error(
        'Analytics study error:',
        studyResult.error
      );
    }

    if (runsResult.error) {
      console.error(
        'Analytics runs error:',
        runsResult.error
      );
    }

    if (workoutsResult.error) {
      console.error(
        'Analytics workout error:',
        workoutsResult.error
      );
    }

    if (mealsResult.error) {
      console.error(
        'Analytics meals error:',
        mealsResult.error
      );
    }

    if (waterResult.error) {
      console.error(
        'Analytics water error:',
        waterResult.error
      );
    }

    setStudySessions(
      (studyResult.data ?? []) as StudySession[]
    );

    setRuns((runsResult.data ?? []) as Run[]);
    setWorkouts((workoutsResult.data ?? []) as Workout[]);
    setMeals((mealsResult.data ?? []) as Meal[]);
    setWaterLogs((waterResult.data ?? []) as WaterLog[]);

    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, [user, range]);

  const dayStats = useMemo(() => {
    const days: DayStats[] = [];

    const today = new Date();

    for (let i = range - 1; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      const dateString = getLocalDateString(date);

      const studySeconds = studySessions
        .filter((session) => {
          const sessionDate = getLocalDateString(
            new Date(session.started_at)
          );

          return sessionDate === dateString;
        })
        .reduce(
          (sum, session) =>
            sum + Number(session.duration_seconds || 0),
          0
        );

      const runDistance = runs
        .filter((run) => run.date === dateString)
        .reduce(
          (sum, run) => sum + Number(run.distance_km || 0),
          0
        );

      const workoutSeconds = workouts
        .filter((workout) => workout.date === dateString)
        .reduce(
          (sum, workout) =>
            sum + Number(workout.duration_seconds || 0),
          0
        );

      const water = waterLogs
        .filter((log) => log.date === dateString)
        .reduce(
          (sum, log) => sum + Number(log.amount_ml || 0),
          0
        );

      const calories = meals
        .filter((meal) => meal.date === dateString)
        .reduce(
          (sum, meal) => sum + Number(meal.calories || 0),
          0
        );

      const protein = meals
        .filter((meal) => meal.date === dateString)
        .reduce(
          (sum, meal) => sum + Number(meal.protein || 0),
          0
        );

      days.push({
        date: dateString,
        label: date.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        }),
        studyMinutes: studySeconds / 60,
        runDistance,
        workoutMinutes: workoutSeconds / 60,
        waterMl: water,
        calories,
        protein,
      });
    }

    return days;
  }, [
    range,
    studySessions,
    runs,
    workouts,
    meals,
    waterLogs,
  ]);

  const totals = useMemo(() => {
    return {
      studySeconds: studySessions.reduce(
        (sum, session) =>
          sum + Number(session.duration_seconds || 0),
        0
      ),

      runDistance: runs.reduce(
        (sum, run) => sum + Number(run.distance_km || 0),
        0
      ),

      runCalories: runs.reduce(
        (sum, run) => sum + Number(run.calories || 0),
        0
      ),

      workoutSeconds: workouts.reduce(
        (sum, workout) =>
          sum + Number(workout.duration_seconds || 0),
        0
      ),

      waterMl: waterLogs.reduce(
        (sum, log) => sum + Number(log.amount_ml || 0),
        0
      ),

      calories: meals.reduce(
        (sum, meal) => sum + Number(meal.calories || 0),
        0
      ),

      protein: meals.reduce(
        (sum, meal) => sum + Number(meal.protein || 0),
        0
      ),
    };
  }, [
    studySessions,
    runs,
    workouts,
    meals,
    waterLogs,
  ]);

  const averages = useMemo(() => {
    const divisor = Math.max(dayStats.length, 1);

    return {
      studyMinutes: totals.studySeconds / 60 / divisor,
      runDistance: totals.runDistance / divisor,
      workoutMinutes: totals.workoutSeconds / 60 / divisor,
      waterMl: totals.waterMl / divisor,
      calories: totals.calories / divisor,
      protein: totals.protein / divisor,
    };
  }, [dayStats.length, totals]);

  const activeDays = useMemo(() => {
    return dayStats.filter(
      (day) =>
        day.studyMinutes > 0 ||
        day.runDistance > 0 ||
        day.workoutMinutes > 0 ||
        day.waterMl > 0 ||
        day.calories > 0
    ).length;
  }, [dayStats]);

  const bestStudyDay = useMemo(() => {
    return [...dayStats].sort(
      (a, b) => b.studyMinutes - a.studyMinutes
    )[0];
  }, [dayStats]);

  const maxStudy = Math.max(
    ...dayStats.map((day) => day.studyMinutes),
    1
  );

  const maxRun = Math.max(
    ...dayStats.map((day) => day.runDistance),
    1
  );

  const maxWorkout = Math.max(
    ...dayStats.map((day) => day.workoutMinutes),
    1
  );

  const maxWater = Math.max(
    ...dayStats.map((day) => day.waterMl),
    1
  );

  const maxCalories = Math.max(
    ...dayStats.map((day) => day.calories),
    1
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black dark:border-white/20 dark:border-t-white" />

          <p className="mt-3 text-sm text-gray-500">
            Loading analytics...
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
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <BarChart3 size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
                Analytics
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Understand your progress and daily patterns.
              </p>
            </div>
          </div>
        </div>

        {/* Range */}
        <div className="flex rounded-xl border border-gray-200 bg-white p-1 dark:border-white/10 dark:bg-[#141414]">
          {([7, 30, 90] as Range[]).map((value) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                range === value
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              {value}D
            </button>
          ))}
        </div>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <BookOpen size={18} />
            </div>

            <span className="text-[11px] font-medium text-gray-400">
              STUDY
            </span>
          </div>

          <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            {formatStudyTime(totals.studySeconds)}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {Math.round(averages.studyMinutes)} min/day average
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
              <Footprints size={18} />
            </div>

            <span className="text-[11px] font-medium text-gray-400">
              RUNNING
            </span>
          </div>

          <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            {totals.runDistance.toFixed(1)} km
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {averages.runDistance.toFixed(1)} km/day average
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
              <Dumbbell size={18} />
            </div>

            <span className="text-[11px] font-medium text-gray-400">
              WORKOUT
            </span>
          </div>

          <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            {formatMinutes(totals.workoutSeconds / 60)}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {Math.round(averages.workoutMinutes)} min/day average
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400">
              <Droplets size={18} />
            </div>

            <span className="text-[11px] font-medium text-gray-400">
              WATER
            </span>
          </div>

          <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            {(totals.waterMl / 1000).toFixed(1)} L
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {Math.round(averages.waterMl)} ml/day average
          </p>
        </div>
      </div>

      {/* Study chart */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen
                size={18}
                className="text-blue-500"
              />

              <h2 className="font-bold text-gray-900 dark:text-white">
                Study activity
              </h2>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              Minutes studied each day.
            </p>
          </div>

          {bestStudyDay && bestStudyDay.studyMinutes > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <TrendingUp size={14} />
              Best: {bestStudyDay.label} ·{' '}
              {formatMinutes(bestStudyDay.studyMinutes)}
            </div>
          )}
        </div>

        <div className="mt-6 overflow-x-auto">
          <div
            className="flex min-w-[520px] items-end gap-2"
            style={{ height: 220 }}
          >
            {dayStats.map((day) => {
              const height =
                (day.studyMinutes / maxStudy) * 170;

              return (
                <div
                  key={day.date}
                  className="flex min-w-[38px] flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-[9px] font-medium text-gray-400">
                    {day.studyMinutes > 0
                      ? Math.round(day.studyMinutes)
                      : ''}
                  </span>

                  <div
                    className="w-full max-w-[34px] rounded-t-lg bg-blue-500 transition-all"
                    style={{
                      height: `${Math.max(height, day.studyMinutes > 0 ? 6 : 2)}px`,
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

      {/* Activity charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Running */}
        <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
          <div className="flex items-center gap-2">
            <Footprints
              size={18}
              className="text-orange-500"
            />

            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Running
              </h2>

              <p className="text-xs text-gray-500">
                Distance by day.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <div
              className="flex min-w-[420px] items-end gap-2"
              style={{ height: 180 }}
            >
              {dayStats.map((day) => {
                const height =
                  (day.runDistance / maxRun) * 130;

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
                          day.runDistance > 0 ? 5 : 2
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

          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-white/5">
            <span className="text-xs text-gray-500">
              Total distance
            </span>

            <span className="font-semibold text-gray-900 dark:text-white">
              {totals.runDistance.toFixed(1)} km
            </span>
          </div>
        </div>

        {/* Workout */}
        <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
          <div className="flex items-center gap-2">
            <Dumbbell
              size={18}
              className="text-purple-500"
            />

            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Workout
              </h2>

              <p className="text-xs text-gray-500">
                Training minutes by day.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <div
              className="flex min-w-[420px] items-end gap-2"
              style={{ height: 180 }}
            >
              {dayStats.map((day) => {
                const height =
                  (day.workoutMinutes / maxWorkout) * 130;

                return (
                  <div
                    key={day.date}
                    className="flex min-w-[30px] flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div
                      className="w-full max-w-[28px] rounded-t-md bg-purple-500"
                      style={{
                        height: `${Math.max(
                          height,
                          day.workoutMinutes > 0 ? 5 : 2
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

          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-white/5">
            <span className="text-xs text-gray-500">
              Total training
            </span>

            <span className="font-semibold text-gray-900 dark:text-white">
              {formatMinutes(totals.workoutSeconds / 60)}
            </span>
          </div>
        </div>
      </div>

      {/* Health analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Water */}
        <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
          <div className="flex items-center gap-2">
            <Droplets
              size={18}
              className="text-cyan-500"
            />

            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Hydration
              </h2>

              <p className="text-xs text-gray-500">
                Daily water intake.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <div
              className="flex min-w-[420px] items-end gap-2"
              style={{ height: 180 }}
            >
              {dayStats.map((day) => {
                const height =
                  (day.waterMl / maxWater) * 130;

                return (
                  <div
                    key={day.date}
                    className="flex min-w-[30px] flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div
                      className="w-full max-w-[28px] rounded-t-md bg-cyan-500"
                      style={{
                        height: `${Math.max(
                          height,
                          day.waterMl > 0 ? 5 : 2
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

          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-white/5">
            <span className="text-xs text-gray-500">
              Average intake
            </span>

            <span className="font-semibold text-gray-900 dark:text-white">
              {Math.round(averages.waterMl)} ml/day
            </span>
          </div>
        </div>

        {/* Nutrition */}
        <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
          <div className="flex items-center gap-2">
            <Flame
              size={18}
              className="text-green-500"
            />

            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Nutrition
              </h2>

              <p className="text-xs text-gray-500">
                Daily calorie intake.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <div
              className="flex min-w-[420px] items-end gap-2"
              style={{ height: 180 }}
            >
              {dayStats.map((day) => {
                const height =
                  (day.calories / maxCalories) * 130;

                return (
                  <div
                    key={day.date}
                    className="flex min-w-[30px] flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div
                      className="w-full max-w-[28px] rounded-t-md bg-green-500"
                      style={{
                        height: `${Math.max(
                          height,
                          day.calories > 0 ? 5 : 2
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
                Avg calories
              </p>

              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {Math.round(averages.calories)} kcal
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Avg protein
              </p>

              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {Math.round(averages.protein)} g
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414] md:p-6">
        <div className="flex items-center gap-2">
          <Target
            size={18}
            className="text-yellow-500"
          />

          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">
              Period summary
            </h2>

            <p className="text-xs text-gray-500">
              Your activity across the selected period.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2 text-gray-500">
              <Clock3 size={15} />
              <span className="text-xs">
                Study
              </span>
            </div>

            <p className="mt-2 font-bold text-gray-900 dark:text-white">
              {formatStudyTime(totals.studySeconds)}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2 text-gray-500">
              <Footprints size={15} />
              <span className="text-xs">
                Runs
              </span>
            </div>

            <p className="mt-2 font-bold text-gray-900 dark:text-white">
              {runs.length}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2 text-gray-500">
              <CalendarDays size={15} />
              <span className="text-xs">
                Active days
              </span>
            </div>

            <p className="mt-2 font-bold text-gray-900 dark:text-white">
              {activeDays}/{range}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2 text-gray-500">
              <Flame size={15} />
              <span className="text-xs">
                Run calories
              </span>
            </div>

            <p className="mt-2 font-bold text-gray-900 dark:text-white">
              {Math.round(totals.runCalories)} kcal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsView;