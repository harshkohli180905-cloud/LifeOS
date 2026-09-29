import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Droplets,
  Dumbbell,
  Footprints,
  Flame,
  Loader2,
  Trophy,
  TrendingUp,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getLocalDate } from '../lib/date';

type RangeDays = 7 | 30 | 90;

type StudyRow = {
  duration_seconds: number | null;
  started_at: string | null;
};

type RunRow = {
  distance_km: number | null;
  duration_seconds: number | null;
  date: string;
};

type WorkoutRow = {
  duration_seconds: number | null;
  date: string;
};

type WaterRow = {
  amount_ml: number | null;
  date: string;
};

type MealRow = {
  calories: number | null;
  protein: number | null;
  date: string;
};

type DayStats = {
  date: string;
  label: string;
  shortLabel: string;
  studySeconds: number;
  runKm: number;
  workoutSeconds: number;
  waterMl: number;
  calories: number;
  protein: number;
};

type SummaryStats = {
  studySeconds: number;
  runKm: number;
  workoutSeconds: number;
  waterMl: number;
  calories: number;
  protein: number;
};

const RANGE_OPTIONS: RangeDays[] = [7, 30, 90];



function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function addDays(date: string, amount: number) {
  const next = parseLocalDate(date);
  next.setDate(next.getDate() + amount);

  return getLocalDate(next);
}

function formatDateLabel(date: string) {
  return parseLocalDate(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function formatHours(seconds: number) {
  const hours = seconds / 3600;

  if (hours === 0) {
    return '0 h';
  }

  if (hours < 10) {
    return `${hours.toFixed(1)} h`;
  }

  return `${hours.toFixed(0)} h`;
}

function formatLiters(ml: number) {
  return `${(ml / 1000).toFixed(ml >= 10000 ? 0 : 1)} L`;
}

function formatNumber(value: number) {
  return value.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
}

function formatRangeLabel(start: string, end: string) {
  return `${formatDateLabel(start)} – ${formatDateLabel(end)}`;
}

function createEmptyDay(date: string): DayStats {
  const parsed = parseLocalDate(date);

  return {
    date,
    label: parsed.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
    }),
    shortLabel: parsed.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
    studySeconds: 0,
    runKm: 0,
    workoutSeconds: 0,
    waterMl: 0,
    calories: 0,
    protein: 0,
  };
}

function getInitialStartDate(days: RangeDays) {
  return addDays(getLocalDate(), -(days - 1));
}

function MetricCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span className="shrink-0">{icon}</span>

        <span className="truncate">{title}</span>
      </div>

      <div className="mt-3 truncate text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </div>

      <div className="mt-1 truncate text-xs text-slate-400">
        {subtitle}
      </div>
    </div>
  );
}

function MiniBarChart({
  data,
  valueKey,
  maxValue,
  suffix = '',
  decimals = 0,
  emptyText = 'No data',
}: {
  data: DayStats[];
  valueKey:
    | 'studySeconds'
    | 'runKm'
    | 'workoutSeconds'
    | 'waterMl'
    | 'calories'
    | 'protein';
  maxValue: number;
  suffix?: string;
  decimals?: number;
  emptyText?: string;
}) {
  const hasData = data.some(
    (item) => Number(item[valueKey]) > 0,
  );

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="flex h-48 items-end gap-1 overflow-hidden sm:gap-2">
      {data.map((item) => {
        const rawValue = Number(item[valueKey]);

        const height =
          maxValue > 0
            ? Math.max(
                rawValue > 0 ? 4 : 0,
                Math.min(100, (rawValue / maxValue) * 100),
              )
            : 0;

        const displayValue =
          valueKey === 'studySeconds'
            ? formatHours(rawValue)
            : valueKey === 'workoutSeconds'
              ? formatHours(rawValue)
              : `${rawValue.toFixed(decimals)}${suffix}`;

        return (
          <div
            key={item.date}
            className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
          >
            <div className="relative flex w-full justify-center">
              <div className="absolute bottom-full z-20 mb-2 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block">
                {displayValue}
              </div>

              <div
                className="w-full max-w-8 rounded-t-md bg-slate-900 transition-all duration-300 dark:bg-white sm:max-w-10"
                style={{
                  height: `${height}%`,
                  minHeight: rawValue > 0 ? '4px' : '0px',
                }}
              />
            </div>

            <div className="mt-2 max-w-full truncate text-[9px] text-slate-400 sm:text-[10px]">
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendRow({
  icon,
  title,
  value,
  suffix = '',
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  suffix?: string;
}) {
  const displayValue =
    value >= 10 ? value.toFixed(0) : value.toFixed(1);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
          {title}
        </div>

        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-slate-900 dark:bg-white"
            style={{
              width: `${Math.min(100, value > 0 ? 100 : 0)}%`,
            }}
          />
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="text-sm font-bold text-slate-900 dark:text-white">
          {displayValue}
          {suffix}
        </div>

        <div className="text-[10px] text-slate-400">
          avg/day
        </div>
      </div>
    </div>
  );
}

function TodayValue({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
      <div className="text-xs text-slate-400">
        {title}
      </div>

      <div className="mt-1 truncate font-bold text-slate-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function DarkSummary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/10 p-4">
      <div className="text-xs text-slate-300">
        {label}
      </div>

      <div className="mt-1 truncate font-bold">
        {value}
      </div>
    </div>
  );
}

type AnalyticsViewProps = {
  refreshVersion?: number;
};

export default function AnalyticsView({
  refreshVersion = 0,
}: AnalyticsViewProps) {
  const { user } = useAuth();

  const today = getLocalDate();

  const [rangeDays, setRangeDays] =
    useState<RangeDays>(7);

  const [rangeStart, setRangeStart] =
    useState<string>(
      getInitialStartDate(7),
    );

  const [days, setDays] =
    useState<DayStats[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [mobileMetric, setMobileMetric] =
    useState<
      | 'study'
      | 'running'
      | 'workout'
      | 'water'
      | 'calories'
      | 'protein'
    >('study');

  const rangeEnd = addDays(
    rangeStart,
    rangeDays - 1,
  );

  const loadAnalytics = useCallback(
    async () => {
      if (!user) {
        setDays([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const startDate = rangeStart;
        const endDate = rangeEnd;

        const startDateTime =
          `${startDate}T00:00:00`;

        const endDateTime =
          `${addDays(endDate, 1)}T00:00:00`;

        const [
          studyResult,
          runsResult,
          workoutsResult,
          waterResult,
          mealsResult,
        ] = await Promise.all([
          supabase
            .from('study_sessions')
            .select(
              'duration_seconds, started_at',
            )
            .eq('user_id', user.id)
            .gte(
              'started_at',
              startDateTime,
            )
            .lt(
              'started_at',
              endDateTime,
            ),

          supabase
            .from('runs')
            .select(
              'distance_km, duration_seconds, date',
            )
            .eq('user_id', user.id)
            .gte('date', startDate)
            .lte('date', endDate),

          supabase
            .from('workouts')
            .select(
              'duration_seconds, date',
            )
            .eq('user_id', user.id)
            .gte('date', startDate)
            .lte('date', endDate),

          supabase
            .from('water_logs')
            .select(
              'amount_ml, date',
            )
            .eq('user_id', user.id)
            .gte('date', startDate)
            .lte('date', endDate),

          supabase
            .from('meals')
            .select(
              'calories, protein, date',
            )
            .eq('user_id', user.id)
            .gte('date', startDate)
            .lte('date', endDate),
        ]);

        const errors = [
          studyResult.error,
          runsResult.error,
          workoutsResult.error,
          waterResult.error,
          mealsResult.error,
        ].filter(Boolean);

        if (errors.length > 0) {
          console.error(
            'Analytics errors:',
            errors,
          );

          throw new Error(
            'Unable to load analytics data.',
          );
        }

        const map =
          new Map<string, DayStats>();

        for (
          let i = 0;
          i < rangeDays;
          i++
        ) {
          const date =
            addDays(startDate, i);

          map.set(
            date,
            createEmptyDay(date),
          );
        }

        const studyRows =
          (studyResult.data ??
            []) as StudyRow[];

        studyRows.forEach((row) => {
          if (!row.started_at) {
            return;
          }

          const date =
            getLocalDate(
              new Date(row.started_at),
            );

          const item =
            map.get(date);

          if (!item) {
            return;
          }

          item.studySeconds +=
            Number(
              row.duration_seconds ??
                0,
            );
        });

        const runRows =
          (runsResult.data ??
            []) as RunRow[];

        runRows.forEach((row) => {
          const item =
            map.get(row.date);

          if (!item) {
            return;
          }

          item.runKm +=
            Number(
              row.distance_km ?? 0,
            );
        });

        const workoutRows =
          (workoutsResult.data ??
            []) as WorkoutRow[];

        workoutRows.forEach(
          (row) => {
            const item =
              map.get(row.date);

            if (!item) {
              return;
            }

            item.workoutSeconds +=
              Number(
                row.duration_seconds ??
                  0,
              );
          },
        );

        const waterRows =
          (waterResult.data ??
            []) as WaterRow[];

        waterRows.forEach((row) => {
          const item =
            map.get(row.date);

          if (!item) {
            return;
          }

          item.waterMl +=
            Number(
              row.amount_ml ?? 0,
            );
        });

        const mealRows =
          (mealsResult.data ??
            []) as MealRow[];

        mealRows.forEach((row) => {
          const item =
            map.get(row.date);

          if (!item) {
            return;
          }

          item.calories +=
            Number(
              row.calories ?? 0,
            );

          item.protein +=
            Number(
              row.protein ?? 0,
            );
        });

        setDays(
          Array.from(map.values()),
        );
      } catch (loadError) {
        console.error(
          'Analytics load error:',
          loadError,
        );

        setError(
          'Unable to load analytics right now.',
        );

        setDays([]);
      } finally {
        setLoading(false);
      }
    },
    [
      user,
      rangeStart,
      rangeEnd,
      rangeDays,
    ],
  );

  useEffect(() => {
  void loadAnalytics();
}, [loadAnalytics, refreshVersion]);

  const goPrevious = () => {
    setRangeStart(
      addDays(
        rangeStart,
        -rangeDays,
      ),
    );
  };

  const goNext = () => {
    const nextStart =
      addDays(
        rangeStart,
        rangeDays,
      );

    if (nextStart > today) {
      return;
    }

    setRangeStart(nextStart);
  };

  const goCurrent = () => {
    setRangeStart(
      getInitialStartDate(
        rangeDays,
      ),
    );
  };

  const canGoNext =
    addDays(
      rangeStart,
      rangeDays,
    ) <= today;

  const summary =
    useMemo<SummaryStats>(
      () =>
        days.reduce(
          (acc, item) => {
            acc.studySeconds +=
              item.studySeconds;

            acc.runKm +=
              item.runKm;

            acc.workoutSeconds +=
              item.workoutSeconds;

            acc.waterMl +=
              item.waterMl;

            acc.calories +=
              item.calories;

            acc.protein +=
              item.protein;

            return acc;
          },
          {
            studySeconds: 0,
            runKm: 0,
            workoutSeconds: 0,
            waterMl: 0,
            calories: 0,
            protein: 0,
          },
        ),
      [days],
    );

  const averages =
    useMemo(
      () => {
        const count =
          Math.max(
            1,
            days.length,
          );

        return {
          studySeconds:
            summary.studySeconds /
            count,

          runKm:
            summary.runKm /
            count,

          workoutSeconds:
            summary.workoutSeconds /
            count,

          waterMl:
            summary.waterMl /
            count,

          calories:
            summary.calories /
            count,

          protein:
            summary.protein /
            count,
        };
      },
      [days, summary],
    );

  const chartValues =
    useMemo(() => {
      return days.map(
        (item) => {
          switch (
            mobileMetric
          ) {
            case 'study':
              return (
                item.studySeconds /
                3600
              );

            case 'running':
              return item.runKm;

            case 'workout':
              return (
                item.workoutSeconds /
                3600
              );

            case 'water':
              return (
                item.waterMl /
                1000
              );

            case 'calories':
              return item.calories;

            case 'protein':
              return item.protein;

            default:
              return 0;
          }
        },
      );
    }, [days, mobileMetric]);

  const chartMax =
    Math.max(
      1,
      ...chartValues,
    );

  const chartValueKey =
    mobileMetric === 'study'
      ? 'studySeconds'
      : mobileMetric ===
          'running'
        ? 'runKm'
        : mobileMetric ===
            'workout'
          ? 'workoutSeconds'
          : mobileMetric ===
              'water'
            ? 'waterMl'
            : mobileMetric ===
                'calories'
              ? 'calories'
              : 'protein';

  const chartMaxRaw =
    mobileMetric === 'study'
      ? chartMax * 3600
      : mobileMetric ===
          'workout'
        ? chartMax * 3600
        : mobileMetric ===
            'water'
          ? chartMax * 1000
          : chartMax;

  const chartSuffix =
    mobileMetric ===
    'running'
      ? ' km'
      : mobileMetric ===
          'water'
        ? ' L'
        : mobileMetric ===
            'calories'
          ? ' kcal'
          : mobileMetric ===
              'protein'
            ? ' g'
            : '';

  const chartDecimals =
    mobileMetric ===
      'running' ||
    mobileMetric ===
      'water'
      ? 1
      : 0;

  const currentDay =
    days.find(
      (item) =>
        item.date ===
        today,
    ) ??
    createEmptyDay(today);

  const todayHasData =
    currentDay.studySeconds >
      0 ||
    currentDay.runKm >
      0 ||
    currentDay.workoutSeconds >
      0 ||
    currentDay.waterMl >
      0 ||
    currentDay.calories >
      0 ||
    currentDay.protein >
      0;

  return (
    <div className="w-full min-w-0 max-w-full space-y-5 overflow-x-hidden">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:p-6">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <BarChart3 size={18} />

              <span className="text-sm font-medium">
                Performance overview
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
              Analytics
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Track your activity and progress over time.
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {RANGE_OPTIONS.map(
                (option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setRangeDays(
                        option,
                      );

                      setRangeStart(
                        getInitialStartDate(
                          option,
                        ),
                      );
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${
                      rangeDays ===
                      option
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {option}d
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={
              goPrevious
            }
            className="flex h-10 w-full shrink-0 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 sm:w-10"
            title="Previous period"
          >
            <ArrowLeft size={17} />
          </button>

          <div className="flex h-10 min-w-0 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-800 dark:bg-slate-800/60">
            <CalendarDays
              size={15}
              className="mr-2 shrink-0 text-slate-400"
            />

            <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
              {formatRangeLabel(
                rangeStart,
                rangeEnd,
              )}
            </span>
          </div>

          <button
            onClick={
              goCurrent
            }
            className="h-10 shrink-0 rounded-xl border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            Current
          </button>

          <button
            onClick={
              goNext
            }
            disabled={!canGoNext}
            className="flex h-10 w-full shrink-0 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-800 dark:hover:bg-slate-800 sm:w-10"
            title="Next period"
          >
            <ArrowRight size={17} />
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <Loader2
              size={18}
              className="animate-spin"
            />

            Loading analytics...
          </div>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/20">
          <div className="font-semibold text-red-700 dark:text-red-400">
            {error}
          </div>

          <button
            onClick={() =>
              void loadAnalytics()
            }
            className="mt-3 text-sm font-semibold text-red-700 underline dark:text-red-400"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <MetricCard
              icon={<BookOpen size={17} />}
              title="Study"
              value={formatHours(
                summary.studySeconds,
              )}
              subtitle={`${formatHours(
                averages.studySeconds,
              )} average/day`}
            />

            <MetricCard
              icon={
                <Footprints size={17} />
              }
              title="Running"
              value={`${summary.runKm.toFixed(
                1,
              )} km`}
              subtitle={`${averages.runKm.toFixed(
                1,
              )} km average/day`}
            />

            <MetricCard
              icon={
                <Dumbbell size={17} />
              }
              title="Workout"
              value={formatHours(
                summary.workoutSeconds,
              )}
              subtitle={`${formatHours(
                averages.workoutSeconds,
              )} average/day`}
            />

            <MetricCard
              icon={
                <Droplets size={17} />
              }
              title="Water"
              value={formatLiters(
                summary.waterMl,
              )}
              subtitle={`${formatLiters(
                averages.waterMl,
              )} average/day`}
            />

            <MetricCard
              icon={<Flame size={17} />}
              title="Calories"
              value={`${formatNumber(
                summary.calories,
              )} kcal`}
              subtitle={`${formatNumber(
                averages.calories,
              )} average/day`}
            />

            <MetricCard
              icon={
                <Activity size={17} />
              }
              title="Protein"
              value={`${formatNumber(
                summary.protein,
              )} g`}
              subtitle={`${formatNumber(
                averages.protein,
              )} g average/day`}
            />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-bold text-slate-900 dark:text-white">
                  Daily activity
                </h2>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  One bar for each day in the selected period.
                </p>
              </div>

              <div className="relative shrink-0">
                <select
                  value={
                    mobileMetric
                  }
                  onChange={(event) =>
                    setMobileMetric(
                      event.target
                        .value as typeof mobileMetric,
                    )
                  }
                  className="h-10 appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-sm font-medium text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  <option value="study">
                    Study
                  </option>

                  <option value="running">
                    Running
                  </option>

                  <option value="workout">
                    Workout
                  </option>

                  <option value="water">
                    Water
                  </option>

                  <option value="calories">
                    Calories
                  </option>

                  <option value="protein">
                    Protein
                  </option>
                </select>

                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            <div className="mt-6 overflow-hidden">
              <MiniBarChart
                data={days}
                valueKey={
                  chartValueKey
                }
                maxValue={
                  chartMaxRaw
                }
                suffix={
                  chartSuffix
                }
                decimals={
                  chartDecimals
                }
              />
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <TrendingUp
                  size={18}
                  className="text-slate-500"
                />

                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">
                    Daily averages
                  </h2>

                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Average activity per day.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <TrendRow
                  icon={
                    <BookOpen size={17} />
                  }
                  title="Study"
                  value={
                    averages.studySeconds /
                    3600
                  }
                  suffix=" h"
                />

                <TrendRow
                  icon={
                    <Footprints size={17} />
                  }
                  title="Running"
                  value={
                    averages.runKm
                  }
                  suffix=" km"
                />

                <TrendRow
                  icon={
                    <Dumbbell size={17} />
                  }
                  title="Workout"
                  value={
                    averages.workoutSeconds /
                    3600
                  }
                  suffix=" h"
                />

                <TrendRow
                  icon={
                    <Droplets size={17} />
                  }
                  title="Water"
                  value={
                    averages.waterMl /
                    1000
                  }
                  suffix=" L"
                />
              </div>
            </div>

            <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Trophy
                  size={18}
                  className="text-yellow-500"
                />

                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">
                    Today
                  </h2>

                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Your current day at a glance.
                  </p>
                </div>
              </div>

              {!todayHasData ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    No activity logged today
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    Your analytics will update as you log activities.
                  </div>
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <TodayValue
                    title="Study"
                    value={formatHours(
                      currentDay.studySeconds,
                    )}
                  />

                  <TodayValue
                    title="Running"
                    value={`${currentDay.runKm.toFixed(
                      1,
                    )} km`}
                  />

                  <TodayValue
                    title="Workout"
                    value={formatHours(
                      currentDay.workoutSeconds,
                    )}
                  />

                  <TodayValue
                    title="Water"
                    value={formatLiters(
                      currentDay.waterMl,
                    )}
                  />

                  <TodayValue
                    title="Calories"
                    value={`${formatNumber(
                      currentDay.calories,
                    )} kcal`}
                  />

                  <TodayValue
                    title="Protein"
                    value={`${formatNumber(
                      currentDay.protein,
                    )} g`}
                  />
                </div>
              )}
            </div>
          </section>

          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                Daily breakdown
              </h2>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Detailed values for each day.
              </p>
            </div>

            <div className="mt-5 overflow-x-auto">
              <div className="min-w-[620px]">
                <div className="grid grid-cols-[110px_repeat(6,minmax(80px,1fr))] gap-2 px-3 pb-2 text-[11px] font-medium text-slate-400">
                  <div>Date</div>
                  <div>Study</div>
                  <div>Run</div>
                  <div>Workout</div>
                  <div>Water</div>
                  <div>Calories</div>
                  <div>Protein</div>
                </div>

                <div className="space-y-1">
                  {days
                    .slice()
                    .reverse()
                    .map((item) => (
                      <div
                        key={item.date}
                        className={`grid grid-cols-[110px_repeat(6,minmax(80px,1fr))] gap-2 rounded-xl px-3 py-3 text-sm ${
                          item.date ===
                          today
                            ? 'bg-slate-100 dark:bg-slate-800'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="font-medium text-slate-700 dark:text-slate-300">
                          {item.date ===
                          today
                            ? 'Today'
                            : item.shortLabel}
                        </div>

                        <div className="text-slate-600 dark:text-slate-400">
                          {formatHours(
                            item.studySeconds,
                          )}
                        </div>

                        <div className="text-slate-600 dark:text-slate-400">
                          {item.runKm.toFixed(
                            1,
                          )}{' '}
                          km
                        </div>

                        <div className="text-slate-600 dark:text-slate-400">
                          {formatHours(
                            item.workoutSeconds,
                          )}
                        </div>

                        <div className="text-slate-600 dark:text-slate-400">
                          {formatLiters(
                            item.waterMl,
                          )}
                        </div>

                        <div className="text-slate-600 dark:text-slate-400">
                          {formatNumber(
                            item.calories,
                          )}{' '}
                          kcal
                        </div>

                        <div className="text-slate-600 dark:text-slate-400">
                          {formatNumber(
                            item.protein,
                          )}{' '}
                          g
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-slate-900 p-5 text-white dark:bg-slate-800 md:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <CalendarDays size={19} />
              </div>

              <div className="min-w-0">
                <h2 className="font-bold">
                  Selected period
                </h2>

                <p className="mt-1 text-sm text-slate-300">
                  {formatRangeLabel(
                    rangeStart,
                    rangeEnd,
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DarkSummary
                label="Study"
                value={formatHours(
                  summary.studySeconds,
                )}
              />

              <DarkSummary
                label="Running"
                value={`${summary.runKm.toFixed(
                  1,
                )} km`}
              />

              <DarkSummary
                label="Workout"
                value={formatHours(
                  summary.workoutSeconds,
                )}
              />

              <DarkSummary
                label="Water"
                value={formatLiters(
                  summary.waterMl,
                )}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}