import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Activity,
  ArrowDown,
  ArrowUp,
 
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Droplets,
  Edit3,
  Flame,
  Footprints,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  Utensils,
  X,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type FitnessTab = 'overview' | 'running' | 'workouts' | 'nutrition' | 'water';

type RunRow = {
  id: string;
  user_id: string;
  date: string;
  distance_km: number | null;
  duration_seconds: number | null;
  pace: number | null;
  calories: number | null;
  notes: string | null;
  route_location: string | null;
  created_at: string;
  updated_at: string;
};

type WorkoutRow = {
  id: string;
  user_id: string;
  name: string;
  date: string;
  duration_seconds: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ExerciseRow = {
  id: string;
  user_id: string;
  workout_id: string;
  name: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  created_at: string;
};

type MealRow = {
  id: string;
  user_id: string;
  meal_type: string;
  name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  date: string;
  created_at: string;
  updated_at: string;
};

type WaterRow = {
  id: string;
  user_id: string;
  amount_ml: number;
  date: string;
  created_at: string;
};

type Targets = {
  run: number;
  water: number;
  protein: number;
  calories: number;
};

type ExerciseForm = {
  name: string;
  sets: string;
  reps: string;
  weight: string;
};

type FitnessViewProps = {
  initialTab?: FitnessTab;
};

const todayString = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatDate = (value: string) => {
  if (!value) return '';

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) return value;

  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatShortDate = (value: string) => {
  if (!value) return '';

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) return value;

  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
};

const formatDuration = (seconds: number | null | undefined) => {
  const total = Math.max(0, Math.round(seconds ?? 0));

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }

  return `${secs}s`;
};

const formatMinutes = (seconds: number | null | undefined) => {
  return Math.round(Math.max(0, seconds ?? 0) / 60);
};

const parseDurationToSeconds = (minutes: string) => {
  const value = Number(minutes);

  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.round(value * 60);
};

const calculatePace = (
  distance: number,
  durationSeconds: number,
) => {
  if (!distance || distance <= 0 || !durationSeconds) {
    return null;
  }

  return durationSeconds / 60 / distance;
};

const formatPace = (pace: number | null | undefined) => {
  if (!pace || pace <= 0 || !Number.isFinite(pace)) {
    return '--';
  }

  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);

  if (seconds >= 60) {
    return `${minutes + 1}:00 /km`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')} /km`;
};

const progressPercent = (
  value: number,
  target: number,
) => {
  if (!target || target <= 0) return 0;

  return Math.min(100, Math.max(0, (value / target) * 100));
};

const emptyExercise = (): ExerciseForm => ({
  name: '',
  sets: '',
  reps: '',
  weight: '',
});

const defaultTargets: Targets = {
  run: 5,
  water: 3000,
  protein: 140,
  calories: 2500,
};

function ProgressBar({
  value,
  className = '',
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 ${className}`}
    >
      <div
        className="h-full rounded-full bg-current transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  progress,
  iconClass,
  progressClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  progress?: number;
  iconClass: string;
  progressClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>

      {progress !== undefined && (
        <ProgressBar
          value={progress}
          className={`mt-4 text-current ${progressClass}`}
        />
      )}
    </div>
  );
}

function FitnessView({
  initialTab = 'overview',
}: FitnessViewProps) {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<FitnessTab>(initialTab);

  const [runs, setRuns] = useState<RunRow[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [meals, setMeals] = useState<MealRow[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterRow[]>([]);
  const [targets, setTargets] = useState<Targets>(defaultTargets);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [runModalOpen, setRunModalOpen] = useState(false);
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false);
  const [mealModalOpen, setMealModalOpen] = useState(false);

  const [editingRun, setEditingRun] = useState<RunRow | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutRow | null>(null);
  const [editingMeal, setEditingMeal] = useState<MealRow | null>(null);

  const [runForm, setRunForm] = useState({
    date: todayString(),
    distance: '',
    duration: '',
    calories: '',
    notes: '',
    routeLocation: '',
  });

  const [workoutForm, setWorkoutForm] = useState({
    name: '',
    date: todayString(),
    duration: '',
    notes: '',
  });

  const [exerciseForms, setExerciseForms] = useState<ExerciseForm[]>([
    emptyExercise(),
  ]);

  const [mealForm, setMealForm] = useState({
    mealType: 'Breakfast',
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    date: todayString(),
  });

  const [waterAmount, setWaterAmount] = useState('');
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);

  const loadFitnessData = useCallback(async () => {
    if (!user) {
      setRuns([]);
      setWorkouts([]);
      setExercises([]);
      setMeals([]);
      setWaterLogs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [
        runsResult,
        workoutsResult,
        exercisesResult,
        mealsResult,
        waterResult,
        profileResult,
      ] = await Promise.all([
        supabase
          .from('runs')
          .select(
            'id,user_id,date,distance_km,duration_seconds,pace,calories,notes,route_location,created_at,updated_at',
          )
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),

        supabase
          .from('workouts')
          .select(
            'id,user_id,name,date,duration_seconds,notes,created_at,updated_at',
          )
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),

        supabase
          .from('exercises')
          .select(
            'id,user_id,workout_id,name,sets,reps,weight,created_at',
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),

        supabase
          .from('meals')
          .select(
            'id,user_id,meal_type,name,calories,protein,carbs,fat,date,created_at,updated_at',
          )
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),

        supabase
          .from('water_logs')
          .select('id,user_id,amount_ml,date,created_at')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),

        supabase
          .from('profiles')
          .select(
            'daily_run_target,daily_water_target,daily_protein_target,daily_calorie_target',
          )
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      if (runsResult.error) throw runsResult.error;
      if (workoutsResult.error) throw workoutsResult.error;
      if (exercisesResult.error) throw exercisesResult.error;
      if (mealsResult.error) throw mealsResult.error;
      if (waterResult.error) throw waterResult.error;

      setRuns((runsResult.data ?? []) as RunRow[]);
      setWorkouts((workoutsResult.data ?? []) as WorkoutRow[]);
      setExercises((exercisesResult.data ?? []) as ExerciseRow[]);
      setMeals((mealsResult.data ?? []) as MealRow[]);
      setWaterLogs((waterResult.data ?? []) as WaterRow[]);

      if (profileResult.data) {
        setTargets({
          run:
            Number(profileResult.data.daily_run_target) ||
            defaultTargets.run,

          water:
            Number(profileResult.data.daily_water_target) ||
            defaultTargets.water,

          protein:
            Number(profileResult.data.daily_protein_target) ||
            defaultTargets.protein,

          calories:
            Number(profileResult.data.daily_calorie_target) ||
            defaultTargets.calories,
        });
      }
    } catch (error) {
      console.error('Fitness data load error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFitnessData();
  }, [loadFitnessData]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`fitness-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'runs',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadFitnessData();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workouts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadFitnessData();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exercises',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadFitnessData();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meals',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadFitnessData();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'water_logs',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadFitnessData();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          loadFitnessData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadFitnessData]);

  const today = todayString();

  const todayRuns = useMemo(
    () => runs.filter((run) => run.date === today),
    [runs, today],
  );

  const todayWorkouts = useMemo(
    () => workouts.filter((workout) => workout.date === today),
    [workouts, today],
  );

  const todayMeals = useMemo(
    () => meals.filter((meal) => meal.date === today),
    [meals, today],
  );

  const todayWaterLogs = useMemo(
    () => waterLogs.filter((log) => log.date === today),
    [waterLogs, today],
  );

  const todayRunDistance = useMemo(
    () =>
      todayRuns.reduce(
        (sum, run) => sum + Number(run.distance_km ?? 0),
        0,
      ),
    [todayRuns],
  );

  const todayRunDuration = useMemo(
    () =>
      todayRuns.reduce(
        (sum, run) => sum + Number(run.duration_seconds ?? 0),
        0,
      ),
    [todayRuns],
  );

  const todayRunCalories = useMemo(
    () =>
      todayRuns.reduce(
        (sum, run) => sum + Number(run.calories ?? 0),
        0,
      ),
    [todayRuns],
  );

  const todayWorkoutDuration = useMemo(
    () =>
      todayWorkouts.reduce(
        (sum, workout) => sum + Number(workout.duration_seconds ?? 0),
        0,
      ),
    [todayWorkouts],
  );

  const todayWater = useMemo(
    () =>
      todayWaterLogs.reduce(
        (sum, log) => sum + Number(log.amount_ml ?? 0),
        0,
      ),
    [todayWaterLogs],
  );

  const todayCalories = useMemo(
    () =>
      todayMeals.reduce(
        (sum, meal) => sum + Number(meal.calories ?? 0),
        0,
      ),
    [todayMeals],
  );

  const todayProtein = useMemo(
    () =>
      todayMeals.reduce(
        (sum, meal) => sum + Number(meal.protein ?? 0),
        0,
      ),
    [todayMeals],
  );

  const todayCarbs = useMemo(
    () =>
      todayMeals.reduce(
        (sum, meal) => sum + Number(meal.carbs ?? 0),
        0,
      ),
    [todayMeals],
  );

  const todayFat = useMemo(
    () =>
      todayMeals.reduce(
        (sum, meal) => sum + Number(meal.fat ?? 0),
        0,
      ),
    [todayMeals],
  );

  const todayPace = useMemo(() => {
    if (!todayRunDistance || !todayRunDuration) {
      return null;
    }

    return calculatePace(
      todayRunDistance,
      todayRunDuration,
    );
  }, [todayRunDistance, todayRunDuration]);

  const waterProgress = progressPercent(
    todayWater,
    targets.water,
  );

  const calorieProgress = progressPercent(
    todayCalories,
    targets.calories,
  );

  const recentRuns = useMemo(
    () => runs.slice(0, 12),
    [runs],
  );

  const recentMeals = useMemo(
    () => meals.slice(0, 12),
    [meals],
  );

  const recentWaterLogs = useMemo(
    () => waterLogs.slice(0, 12),
    [waterLogs],
  );

  const workoutVolumes = useMemo(() => {
    const map: Record<string, number> = {};

    exercises.forEach((exercise) => {
      const sets = Number(exercise.sets ?? 0);
      const reps = Number(exercise.reps ?? 0);
      const weight = Number(exercise.weight ?? 0);

      map[exercise.workout_id] =
        (map[exercise.workout_id] ?? 0) +
        sets * reps * weight;
    });

    return map;
  }, [exercises]);

  const openNewRun = () => {
    setEditingRun(null);

    setRunForm({
      date: todayString(),
      distance: '',
      duration: '',
      calories: '',
      notes: '',
      routeLocation: '',
    });

    setRunModalOpen(true);
  };

  const openEditRun = (run: RunRow) => {
    setEditingRun(run);

    setRunForm({
      date: run.date,
      distance:
        run.distance_km !== null
          ? String(run.distance_km)
          : '',
      duration:
        run.duration_seconds !== null
          ? String(Math.round(run.duration_seconds / 60))
          : '',
      calories:
        run.calories !== null
          ? String(run.calories)
          : '',
      notes: run.notes ?? '',
      routeLocation: run.route_location ?? '',
    });

    setRunModalOpen(true);
  };

  const saveRun = async () => {
    if (!user) return;

    const distance = Number(runForm.distance);
    const durationSeconds = parseDurationToSeconds(
      runForm.duration,
    );
    const calories = Number(runForm.calories) || 0;

    if (!runForm.date || !distance || distance <= 0) {
      alert('Please enter a valid run date and distance.');
      return;
    }

    if (!durationSeconds || durationSeconds <= 0) {
      alert('Please enter a valid duration.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        user_id: user.id,
        date: runForm.date,
        distance_km: distance,
        duration_seconds: durationSeconds,
        pace: calculatePace(distance, durationSeconds),
        calories,
        notes: runForm.notes.trim() || null,
        route_location:
          runForm.routeLocation.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingRun) {
        const { error } = await supabase
          .from('runs')
          .update(payload)
          .eq('id', editingRun.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('runs')
          .insert(payload);

        if (error) throw error;
      }

      setRunModalOpen(false);
      await loadFitnessData();
    } catch (error) {
      console.error('Run save error:', error);
      alert('Could not save the run.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRun = async (runId: string) => {
    if (!user) return;

    if (!window.confirm('Delete this run?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('runs')
        .delete()
        .eq('id', runId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadFitnessData();
    } catch (error) {
      console.error('Run delete error:', error);
      alert('Could not delete the run.');
    }
  };

  const openNewWorkout = () => {
    setEditingWorkout(null);

    setWorkoutForm({
      name: '',
      date: todayString(),
      duration: '',
      notes: '',
    });

    setExerciseForms([emptyExercise()]);
    setWorkoutModalOpen(true);
  };

  const openEditWorkout = (workout: WorkoutRow) => {
    setEditingWorkout(workout);

    setWorkoutForm({
      name: workout.name,
      date: workout.date,
      duration:
        workout.duration_seconds !== null
          ? String(Math.round(workout.duration_seconds / 60))
          : '',
      notes: workout.notes ?? '',
    });

    const workoutExercises = exercises
      .filter((exercise) => exercise.workout_id === workout.id)
      .map((exercise) => ({
        name: exercise.name,
        sets:
          exercise.sets !== null
            ? String(exercise.sets)
            : '',
        reps:
          exercise.reps !== null
            ? String(exercise.reps)
            : '',
        weight:
          exercise.weight !== null
            ? String(exercise.weight)
            : '',
      }));

    setExerciseForms(
      workoutExercises.length > 0
        ? workoutExercises
        : [emptyExercise()],
    );

    setWorkoutModalOpen(true);
  };

  const addExerciseRow = () => {
    setExerciseForms((current) => [
      ...current,
      emptyExercise(),
    ]);
  };

  const removeExerciseRow = (index: number) => {
    setExerciseForms((current) => {
      if (current.length === 1) {
        return [emptyExercise()];
      }

      return current.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const updateExercise = (
    index: number,
    field: keyof ExerciseForm,
    value: string,
  ) => {
    setExerciseForms((current) =>
      current.map((exercise, rowIndex) =>
        rowIndex === index
          ? {
              ...exercise,
              [field]: value,
            }
          : exercise,
      ),
    );
  };

  const saveWorkout = async () => {
    if (!user) return;

    if (!workoutForm.name.trim()) {
      alert('Please enter a workout name.');
      return;
    }

    const durationSeconds = parseDurationToSeconds(
      workoutForm.duration,
    );

    if (!durationSeconds) {
      alert('Please enter a valid workout duration.');
      return;
    }

    const validExercises = exerciseForms.filter(
      (exercise) => exercise.name.trim(),
    );

    try {
      setSaving(true);

      const workoutPayload = {
        user_id: user.id,
        name: workoutForm.name.trim(),
        date: workoutForm.date,
        duration_seconds: durationSeconds,
        notes: workoutForm.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      let workoutId = editingWorkout?.id ?? '';

      if (editingWorkout) {
        const { error } = await supabase
          .from('workouts')
          .update(workoutPayload)
          .eq('id', editingWorkout.id)
          .eq('user_id', user.id);

        if (error) throw error;

        const { error: deleteExercisesError } =
          await supabase
            .from('exercises')
            .delete()
            .eq('workout_id', editingWorkout.id)
            .eq('user_id', user.id);

        if (deleteExercisesError) {
          throw deleteExercisesError;
        }
      } else {
        const { data, error } = await supabase
          .from('workouts')
          .insert(workoutPayload)
          .select('id')
          .single();

        if (error) throw error;

        workoutId = data.id;
      }

      if (validExercises.length > 0) {
        const exercisePayload = validExercises.map(
          (exercise) => ({
            user_id: user.id,
            workout_id: workoutId,
            name: exercise.name.trim(),
            sets: Number(exercise.sets) || 0,
            reps: Number(exercise.reps) || 0,
            weight: Number(exercise.weight) || 0,
          }),
        );

        const { error } = await supabase
          .from('exercises')
          .insert(exercisePayload);

        if (error) throw error;
      }

      setWorkoutModalOpen(false);
      await loadFitnessData();
    } catch (error) {
      console.error('Workout save error:', error);
      alert('Could not save the workout.');
    } finally {
      setSaving(false);
    }
  };

  const deleteWorkout = async (workoutId: string) => {
    if (!user) return;

    if (!window.confirm('Delete this workout?')) {
      return;
    }

    try {
      const { error: exercisesError } =
        await supabase
          .from('exercises')
          .delete()
          .eq('workout_id', workoutId)
          .eq('user_id', user.id);

      if (exercisesError) throw exercisesError;

      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadFitnessData();
    } catch (error) {
      console.error('Workout delete error:', error);
      alert('Could not delete the workout.');
    }
  };

  const openNewMeal = () => {
    setEditingMeal(null);

    setMealForm({
      mealType: 'Breakfast',
      name: '',
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      date: todayString(),
    });

    setMealModalOpen(true);
  };

  const openEditMeal = (meal: MealRow) => {
    setEditingMeal(meal);

    setMealForm({
      mealType: meal.meal_type,
      name: meal.name,
      calories:
        meal.calories !== null
          ? String(meal.calories)
          : '',
      protein:
        meal.protein !== null
          ? String(meal.protein)
          : '',
      carbs:
        meal.carbs !== null
          ? String(meal.carbs)
          : '',
      fat:
        meal.fat !== null
          ? String(meal.fat)
          : '',
      date: meal.date,
    });

    setMealModalOpen(true);
  };

  const saveMeal = async () => {
    if (!user) return;

    if (!mealForm.name.trim()) {
      alert('Please enter a meal name.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        user_id: user.id,
        meal_type: mealForm.mealType,
        name: mealForm.name.trim(),
        calories: Number(mealForm.calories) || 0,
        protein: Number(mealForm.protein) || 0,
        carbs: Number(mealForm.carbs) || 0,
        fat: Number(mealForm.fat) || 0,
        date: mealForm.date,
        updated_at: new Date().toISOString(),
      };

      if (editingMeal) {
        const { error } = await supabase
          .from('meals')
          .update(payload)
          .eq('id', editingMeal.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('meals')
          .insert(payload);

        if (error) throw error;
      }

      setMealModalOpen(false);
      await loadFitnessData();
    } catch (error) {
      console.error('Meal save error:', error);
      alert('Could not save the meal.');
    } finally {
      setSaving(false);
    }
  };

  const deleteMeal = async (mealId: string) => {
    if (!user) return;

    if (!window.confirm('Delete this meal?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', mealId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadFitnessData();
    } catch (error) {
      console.error('Meal delete error:', error);
      alert('Could not delete the meal.');
    }
  };

  const addWater = async (amount: number) => {
    if (!user || amount <= 0) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('water_logs')
        .insert({
          user_id: user.id,
          amount_ml: amount,
          date: todayString(),
        });

      if (error) throw error;

      setWaterAmount('');
      await loadFitnessData();
    } catch (error) {
      console.error('Water add error:', error);
      alert('Could not log water.');
    } finally {
      setSaving(false);
    }
  };

  const addCustomWater = async () => {
    const amount = Number(waterAmount);

    if (!amount || amount <= 0) {
      alert('Enter a valid water amount.');
      return;
    }

    await addWater(amount);
  };

  const deleteWater = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('water_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadFitnessData();
    } catch (error) {
      console.error('Water delete error:', error);
      alert('Could not delete water log.');
    }
  };

  const tabItems: {
    id: FitnessTab;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <Activity size={17} />,
    },
    {
      id: 'running',
      label: 'Running',
      icon: <Footprints size={17} />,
    },
    {
      id: 'workouts',
      label: 'Workouts',
      icon: <Dumbbell size={17} />,
    },
    {
      id: 'nutrition',
      label: 'Nutrition',
      icon: <Utensils size={17} />,
    },
    {
      id: 'water',
      label: 'Water',
      icon: <Droplets size={17} />,
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <RefreshCw
            size={20}
            className="animate-spin"
          />
          Loading fitness data...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-orange-500">
            Fitness
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Train your body.
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track running, workouts, nutrition and hydration in one place.
          </p>
        </div>

        <button
          onClick={() => loadFitnessData()}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw size={16} />
          Sync
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {tabItems.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Today's stats */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={<Footprints size={20} />}
              label="Running"
              value={`${todayRunDistance.toFixed(1)} km`}
              subtitle={`${targets.run} km daily target`}
              progress={progressPercent(
                todayRunDistance,
                targets.run,
              )}
              iconClass="bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
              progressClass="text-orange-500"
            />

            <StatCard
              icon={<Dumbbell size={20} />}
              label="Workout"
              value={`${formatMinutes(todayWorkoutDuration)} min`}
              subtitle={`${todayWorkouts.length} session${
                todayWorkouts.length === 1 ? '' : 's'
              } today`}
              iconClass="bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
              progressClass="text-purple-500"
            />

            <StatCard
              icon={<Droplets size={20} />}
              label="Water"
              value={`${(todayWater / 1000).toFixed(1)} L`}
              subtitle={`${targets.water} ml daily target`}
              progress={waterProgress}
              iconClass="bg-cyan-100 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400"
              progressClass="text-cyan-500"
            />

            <StatCard
              icon={<Flame size={20} />}
              label="Calories"
              value={`${Math.round(todayCalories)} kcal`}
              subtitle={`${Math.round(todayProtein)} g protein`}
              progress={calorieProgress}
              iconClass="bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400"
              progressClass="text-green-500"
            />
          </div>

          {/* Quick actions */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={openNewRun}
              className="group flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-orange-900/40 dark:bg-orange-950/20"
            >
              <div>
                <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                  Log a run
                </p>
                <p className="mt-1 text-xs text-orange-600/70 dark:text-orange-300/60">
                  Distance, pace & calories
                </p>
              </div>
              <Plus
                size={20}
                className="text-orange-500 transition group-hover:rotate-90"
              />
            </button>

            <button
              onClick={openNewWorkout}
              className="group flex items-center justify-between rounded-2xl border border-purple-200 bg-purple-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-purple-900/40 dark:bg-purple-950/20"
            >
              <div>
                <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                  Log workout
                </p>
                <p className="mt-1 text-xs text-purple-600/70 dark:text-purple-300/60">
                  Exercises & volume
                </p>
              </div>
              <Plus
                size={20}
                className="text-purple-500 transition group-hover:rotate-90"
              />
            </button>

            <button
              onClick={openNewMeal}
              className="group flex items-center justify-between rounded-2xl border border-green-200 bg-green-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-green-900/40 dark:bg-green-950/20"
            >
              <div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                  Log meal
                </p>
                <p className="mt-1 text-xs text-green-600/70 dark:text-green-300/60">
                  Calories & macros
                </p>
              </div>
              <Plus
                size={20}
                className="text-green-500 transition group-hover:rotate-90"
              />
            </button>

            <button
              onClick={() => setActiveTab('water')}
              className="group flex items-center justify-between rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-cyan-900/40 dark:bg-cyan-950/20"
            >
              <div>
                <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                  Add water
                </p>
                <p className="mt-1 text-xs text-cyan-600/70 dark:text-cyan-300/60">
                  Stay hydrated
                </p>
              </div>
              <Droplets
                size={20}
                className="text-cyan-500"
              />
            </button>
          </div>

          {/* Today's details */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white">
                    Today's running
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {todayRuns.length} run
                    {todayRuns.length === 1 ? '' : 's'}
                  </p>
                </div>

                <Footprints
                  size={20}
                  className="text-orange-500"
                />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Distance
                  </p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {todayRunDistance.toFixed(1)} km
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Time
                  </p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {formatDuration(todayRunDuration)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pace
                  </p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {formatPace(todayPace)}
                  </p>
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all"
                  style={{
                    width: `${progressPercent(
                      todayRunDistance,
                      targets.run,
                    )}%`,
                  }}
                />
              </div>

              <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {todayRunDistance.toFixed(1)} km completed
                </span>
                <span>{targets.run} km target</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white">
                    Today's nutrition
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {todayMeals.length} meal
                    {todayMeals.length === 1 ? '' : 's'}
                  </p>
                </div>

                <Utensils
                  size={20}
                  className="text-green-500"
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-green-50 p-3 dark:bg-green-950/20">
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Calories
                  </p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {Math.round(todayCalories)}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-950/20">
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Protein
                  </p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {Math.round(todayProtein)}g
                  </p>
                </div>

                <div className="rounded-xl bg-orange-50 p-3 dark:bg-orange-950/20">
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    Carbs
                  </p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {Math.round(todayCarbs)}g
                  </p>
                </div>

                <div className="rounded-xl bg-yellow-50 p-3 dark:bg-yellow-950/20">
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Fat
                  </p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {Math.round(todayFat)}g
                  </p>
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{
                    width: `${calorieProgress}%`,
                  }}
                />
              </div>

              <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{Math.round(todayCalories)} kcal</span>
                <span>{targets.calories} kcal target</span>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white">
                    Recent runs
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your latest running sessions
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('running')}
                  className="text-xs font-medium text-orange-500 hover:text-orange-600"
                >
                  View all
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentRuns.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No runs logged yet.
                  </div>
                ) : (
                  recentRuns.slice(0, 5).map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between gap-3 p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                          <Footprints size={17} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white">
                            {Number(run.distance_km ?? 0).toFixed(1)} km
                          </p>

                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatShortDate(run.date)} ·{' '}
                            {formatPace(run.pace)}
                          </p>
                        </div>
                      </div>

                      <p className="shrink-0 text-sm font-medium text-slate-600 dark:text-slate-300">
                        {formatDuration(run.duration_seconds)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white">
                    Recent workouts
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your latest training sessions
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('workouts')}
                  className="text-xs font-medium text-purple-500 hover:text-purple-600"
                >
                  View all
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {workouts.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No workouts logged yet.
                  </div>
                ) : (
                  workouts.slice(0, 5).map((workout) => (
                    <div
                      key={workout.id}
                      className="flex items-center justify-between gap-3 p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                          <Dumbbell size={17} />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900 dark:text-white">
                            {workout.name}
                          </p>

                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatShortDate(workout.date)}
                            {' · '}
                            {exercises.filter(
                              (exercise) =>
                                exercise.workout_id === workout.id,
                            ).length}{' '}
                            exercises
                          </p>
                        </div>
                      </div>

                      <p className="shrink-0 text-sm font-medium text-slate-600 dark:text-slate-300">
                        {formatMinutes(workout.duration_seconds)} min
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Running */}
      {activeTab === 'running' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={<Footprints size={20} />}
              label="Today"
              value={`${todayRunDistance.toFixed(1)} km`}
              subtitle={`${targets.run} km target`}
              progress={progressPercent(
                todayRunDistance,
                targets.run,
              )}
              iconClass="bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
              progressClass="text-orange-500"
            />

            <StatCard
              icon={<Clock size={20} />}
              label="Duration"
              value={formatDuration(todayRunDuration)}
              subtitle="Today's running"
              iconClass="bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
              progressClass="text-blue-500"
            />

            <StatCard
              icon={<TrendingUp size={20} />}
              label="Pace"
              value={formatPace(todayPace)}
              subtitle="Average today"
              iconClass="bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
              progressClass="text-purple-500"
            />

            <StatCard
              icon={<Flame size={20} />}
              label="Calories"
              value={`${Math.round(todayRunCalories)}`}
              subtitle="Running calories"
              iconClass="bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              progressClass="text-red-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={openNewRun}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
            >
              <Plus size={17} />
              Log run
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-5 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Run history
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Every run you've logged is synced to your account.
              </p>
            </div>

            {runs.length === 0 ? (
              <div className="p-12 text-center">
                <Footprints
                  size={32}
                  className="mx-auto text-slate-300 dark:text-slate-700"
                />
                <p className="mt-3 font-medium text-slate-700 dark:text-slate-300">
                  No runs yet
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Log your first run to start building your history.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {runs.map((run) => (
                  <div
                    key={run.id}
                    className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                        <Footprints size={20} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {Number(run.distance_km ?? 0).toFixed(2)} km
                          </p>

                          {run.date === today && (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                              TODAY
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(run.date)}
                          {' · '}
                          {formatDuration(run.duration_seconds)}
                          {' · '}
                          {formatPace(run.pace)}
                        </p>

                        {run.notes && (
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {run.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:shrink-0">
                      {run.calories ? (
                        <span className="mr-2 text-xs text-slate-500 dark:text-slate-400">
                          {Math.round(run.calories)} kcal
                        </span>
                      ) : null}

                      <button
                        onClick={() => openEditRun(run)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                        title="Edit run"
                      >
                        <Edit3 size={16} />
                      </button>

                      <button
                        onClick={() => deleteRun(run.id)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                        title="Delete run"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workouts */}
      {activeTab === 'workouts' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard
              icon={<Dumbbell size={20} />}
              label="Today"
              value={`${formatMinutes(todayWorkoutDuration)} min`}
              subtitle={`${todayWorkouts.length} session${
                todayWorkouts.length === 1 ? '' : 's'
              }`}
              iconClass="bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
              progressClass="text-purple-500"
            />

            <StatCard
              icon={<Clock size={20} />}
              label="Sessions"
              value={`${workouts.length}`}
              subtitle="Total workouts"
              iconClass="bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
              progressClass="text-blue-500"
            />

            <StatCard
              icon={<TrendingUp size={20} />}
              label="Volume"
              value={`${Math.round(
                Object.values(workoutVolumes).reduce(
                  (sum, volume) => sum + volume,
                  0,
                ),
              )} kg`}
              subtitle="Logged exercise volume"
              iconClass="bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400"
              progressClass="text-green-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={openNewWorkout}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-600"
            >
              <Plus size={17} />
              Log workout
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-5 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Workout history
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Expand a workout to see exercises and volume.
              </p>
            </div>

            {workouts.length === 0 ? (
              <div className="p-12 text-center">
                <Dumbbell
                  size={32}
                  className="mx-auto text-slate-300 dark:text-slate-700"
                />
                <p className="mt-3 font-medium text-slate-700 dark:text-slate-300">
                  No workouts yet
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Log your first workout to start tracking training.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {workouts.map((workout) => {
                  const workoutExercises =
                    exercises.filter(
                      (exercise) =>
                        exercise.workout_id === workout.id,
                    );

                  const isExpanded =
                    expandedWorkout === workout.id;

                  const volume =
                    workoutVolumes[workout.id] ?? 0;

                  return (
                    <div key={workout.id}>
                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <button
                          onClick={() =>
                            setExpandedWorkout(
                              isExpanded
                                ? null
                                : workout.id,
                            )
                          }
                          className="flex min-w-0 items-center gap-3 text-left"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                            <Dumbbell size={18} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900 dark:text-white">
                              {workout.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {formatDate(workout.date)}
                              {' · '}
                              {formatMinutes(
                                workout.duration_seconds,
                              )}{' '}
                              min
                              {' · '}
                              {workoutExercises.length}{' '}
                              exercise
                              {workoutExercises.length === 1
                                ? ''
                                : 's'}
                            </p>
                          </div>

                          <span className="ml-1 text-slate-400">
                            {isExpanded ? (
                              <ChevronUp size={17} />
                            ) : (
                              <ChevronDown size={17} />
                            )}
                          </span>
                        </button>

                        <div className="flex items-center gap-3 sm:shrink-0">
                          {volume > 0 && (
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {Math.round(volume)} kg volume
                            </span>
                          )}

                          <button
                            onClick={() =>
                              openEditWorkout(workout)
                            }
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                            title="Edit workout"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            onClick={() =>
                              deleteWorkout(workout.id)
                            }
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                            title="Delete workout"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/30">
                          {workout.notes && (
                            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
                              {workout.notes}
                            </p>
                          )}

                          {workoutExercises.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              No exercises added to this workout.
                            </p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[500px] text-sm">
                                <thead>
                                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                    <th className="pb-2 font-medium">
                                      Exercise
                                    </th>
                                    <th className="pb-2 font-medium">
                                      Sets
                                    </th>
                                    <th className="pb-2 font-medium">
                                      Reps
                                    </th>
                                    <th className="pb-2 font-medium">
                                      Weight
                                    </th>
                                    <th className="pb-2 text-right font-medium">
                                      Volume
                                    </th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {workoutExercises.map(
                                    (exercise) => {
                                      const exerciseVolume =
                                        Number(
                                          exercise.sets ?? 0,
                                        ) *
                                        Number(
                                          exercise.reps ?? 0,
                                        ) *
                                        Number(
                                          exercise.weight ?? 0,
                                        );

                                      return (
                                        <tr
                                          key={exercise.id}
                                          className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                                        >
                                          <td className="py-3 font-medium text-slate-900 dark:text-white">
                                            {exercise.name}
                                          </td>
                                          <td className="py-3 text-slate-600 dark:text-slate-300">
                                            {exercise.sets ?? 0}
                                          </td>
                                          <td className="py-3 text-slate-600 dark:text-slate-300">
                                            {exercise.reps ?? 0}
                                          </td>
                                          <td className="py-3 text-slate-600 dark:text-slate-300">
                                            {exercise.weight ?? 0} kg
                                          </td>
                                          <td className="py-3 text-right text-slate-600 dark:text-slate-300">
                                            {Math.round(
                                              exerciseVolume,
                                            )}{' '}
                                            kg
                                          </td>
                                        </tr>
                                      );
                                    },
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nutrition */}
      {activeTab === 'nutrition' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={<Flame size={20} />}
              label="Calories"
              value={`${Math.round(todayCalories)}`}
              subtitle={`${targets.calories} kcal target`}
              progress={calorieProgress}
              iconClass="bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400"
              progressClass="text-green-500"
            />

            <StatCard
              icon={<Activity size={20} />}
              label="Protein"
              value={`${Math.round(todayProtein)}g`}
              subtitle={`${targets.protein}g target`}
              progress={progressPercent(
                todayProtein,
                targets.protein,
              )}
              iconClass="bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
              progressClass="text-blue-500"
            />

            <StatCard
              icon={<ArrowDown size={20} />}
              label="Carbs"
              value={`${Math.round(todayCarbs)}g`}
              subtitle="Today's total"
              iconClass="bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
              progressClass="text-orange-500"
            />

            <StatCard
              icon={<ArrowUp size={20} />}
              label="Fat"
              value={`${Math.round(todayFat)}g`}
              subtitle="Today's total"
              iconClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400"
              progressClass="text-yellow-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={openNewMeal}
              className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-600"
            >
              <Plus size={17} />
              Log meal
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-5 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Meal history
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Calories and macros from your logged meals.
              </p>
            </div>

            {recentMeals.length === 0 ? (
              <div className="p-12 text-center">
                <Utensils
                  size={32}
                  className="mx-auto text-slate-300 dark:text-slate-700"
                />
                <p className="mt-3 font-medium text-slate-700 dark:text-slate-300">
                  No meals yet
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Log your meals to track your nutrition.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentMeals.map((meal) => (
                  <div
                    key={meal.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400">
                        <Utensils size={18} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {meal.name}
                          </p>

                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {meal.meal_type}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(meal.date)}
                          {' · '}
                          {Math.round(meal.calories ?? 0)} kcal
                          {' · '}
                          {Math.round(meal.protein ?? 0)}g protein
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:shrink-0">
                      <div className="hidden text-right text-xs text-slate-500 sm:block dark:text-slate-400">
                        <p>
                          P {Math.round(meal.protein ?? 0)}g
                        </p>
                        <p>
                          C {Math.round(meal.carbs ?? 0)}g
                        </p>
                        <p>
                          F {Math.round(meal.fat ?? 0)}g
                        </p>
                      </div>

                      <button
                        onClick={() => openEditMeal(meal)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                        title="Edit meal"
                      >
                        <Edit3 size={16} />
                      </button>

                      <button
                        onClick={() => deleteMeal(meal.id)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                        title="Delete meal"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Water */}
      {activeTab === 'water' && (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6 dark:border-cyan-900/40 dark:bg-cyan-950/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                    Today's hydration
                  </p>

                  <p className="mt-2 text-4xl font-bold text-slate-900 dark:text-white">
                    {(todayWater / 1000).toFixed(1)}
                    <span className="ml-1 text-lg font-medium text-slate-500">
                      L
                    </span>
                  </p>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    of {(targets.water / 1000).toFixed(1)} L daily target
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500 text-white">
                  <Droplets size={24} />
                </div>
              </div>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/70 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                  style={{
                    width: `${waterProgress}%`,
                  }}
                />
              </div>

              <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {Math.round(waterProgress)}% complete
                </span>
                <span>
                  {Math.max(
                    0,
                    targets.water - todayWater,
                  )}{' '}
                  ml remaining
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[250, 500, 750, 1000].map(
                  (amount) => (
                    <button
                      key={amount}
                      onClick={() => addWater(amount)}
                      disabled={saving}
                      className="rounded-xl border border-cyan-200 bg-white px-3 py-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100 disabled:opacity-50 dark:border-cyan-900/50 dark:bg-slate-900 dark:text-cyan-300 dark:hover:bg-cyan-950/40"
                    >
                      +{amount} ml
                    </button>
                  ),
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={waterAmount}
                  onChange={(event) =>
                    setWaterAmount(event.target.value)
                  }
                  placeholder="Custom amount in ml"
                  className="min-w-0 flex-1 rounded-xl border border-cyan-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 dark:border-cyan-900/50 dark:bg-slate-900 dark:text-white"
                />

                <button
                  onClick={addCustomWater}
                  disabled={saving}
                  className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white">
                    Today's logs
                  </h2>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {todayWaterLogs.length} entries
                  </p>
                </div>

                <Droplets
                  size={20}
                  className="text-cyan-500"
                />
              </div>

              <div className="mt-4 space-y-2">
                {todayWaterLogs.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                    No water logged today.
                  </div>
                ) : (
                  todayWaterLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400">
                          <Droplets size={15} />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {log.amount_ml} ml
                          </p>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {new Date(
                              log.created_at,
                            ).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteWater(log.id)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-5 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Recent hydration
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Your latest water entries.
              </p>
            </div>

            {recentWaterLogs.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No hydration history yet.
              </div>
            ) : (
              <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {recentWaterLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <Droplets
                        size={17}
                        className="text-cyan-500"
                      />

                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {log.amount_ml} ml
                        </p>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(log.date)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteWater(log.id)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Run modal */}
      {runModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingRun ? 'Edit run' : 'Log a run'}
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Record your running session.
                </p>
              </div>

              <button
                onClick={() => setRunModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Date
                </label>

                <input
                  type="date"
                  value={runForm.date}
                  onChange={(event) =>
                    setRunForm((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  className="input-fitness"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Distance (km)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={runForm.distance}
                    onChange={(event) =>
                      setRunForm((current) => ({
                        ...current,
                        distance: event.target.value,
                      }))
                    }
                    placeholder="5.00"
                    className="input-fitness"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Duration (min)
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={runForm.duration}
                    onChange={(event) =>
                      setRunForm((current) => ({
                        ...current,
                        duration: event.target.value,
                      }))
                    }
                    placeholder="30"
                    className="input-fitness"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Calories
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={runForm.calories}
                    onChange={(event) =>
                      setRunForm((current) => ({
                        ...current,
                        calories: event.target.value,
                      }))
                    }
                    placeholder="350"
                    className="input-fitness"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Route / Location
                  </label>

                  <input
                    type="text"
                    value={runForm.routeLocation}
                    onChange={(event) =>
                      setRunForm((current) => ({
                        ...current,
                        routeLocation: event.target.value,
                      }))
                    }
                    placeholder="Park / Track"
                    className="input-fitness"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Notes
                </label>

                <textarea
                  rows={3}
                  value={runForm.notes}
                  onChange={(event) =>
                    setRunForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="How did the run feel?"
                  className="input-fitness resize-none"
                />
              </div>

              {runForm.distance &&
                runForm.duration && (
                  <div className="rounded-xl bg-orange-50 p-3 text-sm text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                    Estimated pace:{' '}
                    <strong>
                      {formatPace(
                        calculatePace(
                          Number(runForm.distance),
                          parseDurationToSeconds(
                            runForm.duration,
                          ),
                        ),
                      )}
                    </strong>
                  </div>
                )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setRunModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>

              <button
                onClick={saveRun}
                disabled={saving}
                className="flex-1 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {saving
                  ? 'Saving...'
                  : editingRun
                    ? 'Save changes'
                    : 'Save run'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workout modal */}
      {workoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingWorkout
                    ? 'Edit workout'
                    : 'Log workout'}
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Add exercises to calculate training volume.
                </p>
              </div>

              <button
                onClick={() => setWorkoutModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Workout name
                  </label>

                  <input
                    type="text"
                    value={workoutForm.name}
                    onChange={(event) =>
                      setWorkoutForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Push Day"
                    className="input-fitness"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Date
                  </label>

                  <input
                    type="date"
                    value={workoutForm.date}
                    onChange={(event) =>
                      setWorkoutForm((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                    className="input-fitness"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Duration (minutes)
                </label>

                <input
                  type="number"
                  min="0"
                  value={workoutForm.duration}
                  onChange={(event) =>
                    setWorkoutForm((current) => ({
                      ...current,
                      duration: event.target.value,
                    }))
                  }
                  placeholder="60"
                  className="input-fitness"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Exercises
                    </p>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sets × reps × weight = volume
                    </p>
                  </div>

                  <button
                    onClick={addExerciseRow}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-600 dark:bg-purple-500/10 dark:text-purple-300"
                  >
                    <Plus size={14} />
                    Add exercise
                  </button>
                </div>

                <div className="space-y-3">
                  {exerciseForms.map(
                    (exercise, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                      >
                        <div className="grid gap-2 sm:grid-cols-[1.6fr_0.7fr_0.7fr_0.9fr_auto]">
                          <input
                            type="text"
                            value={exercise.name}
                            onChange={(event) =>
                              updateExercise(
                                index,
                                'name',
                                event.target.value,
                              )
                            }
                            placeholder="Bench Press"
                            className="input-fitness"
                          />

                          <input
                            type="number"
                            min="0"
                            value={exercise.sets}
                            onChange={(event) =>
                              updateExercise(
                                index,
                                'sets',
                                event.target.value,
                              )
                            }
                            placeholder="Sets"
                            className="input-fitness"
                          />

                          <input
                            type="number"
                            min="0"
                            value={exercise.reps}
                            onChange={(event) =>
                              updateExercise(
                                index,
                                'reps',
                                event.target.value,
                              )
                            }
                            placeholder="Reps"
                            className="input-fitness"
                          />

                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={exercise.weight}
                            onChange={(event) =>
                              updateExercise(
                                index,
                                'weight',
                                event.target.value,
                              )
                            }
                            placeholder="kg"
                            className="input-fitness"
                          />

                          <button
                            onClick={() =>
                              removeExerciseRow(index)
                            }
                            className="flex h-11 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Notes
                </label>

                <textarea
                  rows={3}
                  value={workoutForm.notes}
                  onChange={(event) =>
                    setWorkoutForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="How was the workout?"
                  className="input-fitness resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setWorkoutModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>

              <button
                onClick={saveWorkout}
                disabled={saving}
                className="flex-1 rounded-xl bg-purple-500 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-600 disabled:opacity-50"
              >
                {saving
                  ? 'Saving...'
                  : editingWorkout
                    ? 'Save changes'
                    : 'Save workout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meal modal */}
      {mealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingMeal ? 'Edit meal' : 'Log meal'}
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Track calories and macronutrients.
                </p>
              </div>

              <button
                onClick={() => setMealModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Meal type
                  </label>

                  <select
                    value={mealForm.mealType}
                    onChange={(event) =>
                      setMealForm((current) => ({
                        ...current,
                        mealType: event.target.value,
                      }))
                    }
                    className="input-fitness"
                  >
                    <option value="Breakfast">
                      Breakfast
                    </option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Date
                  </label>

                  <input
                    type="date"
                    value={mealForm.date}
                    onChange={(event) =>
                      setMealForm((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                    className="input-fitness"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Meal name
                </label>

                <input
                  type="text"
                  value={mealForm.name}
                  onChange={(event) =>
                    setMealForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Chicken rice bowl"
                  className="input-fitness"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Calories
                </label>

                <input
                  type="number"
                  min="0"
                  value={mealForm.calories}
                  onChange={(event) =>
                    setMealForm((current) => ({
                      ...current,
                      calories: event.target.value,
                    }))
                  }
                  placeholder="600"
                  className="input-fitness"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Protein
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={mealForm.protein}
                    onChange={(event) =>
                      setMealForm((current) => ({
                        ...current,
                        protein: event.target.value,
                      }))
                    }
                    placeholder="40g"
                    className="input-fitness"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Carbs
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={mealForm.carbs}
                    onChange={(event) =>
                      setMealForm((current) => ({
                        ...current,
                        carbs: event.target.value,
                      }))
                    }
                    placeholder="60g"
                    className="input-fitness"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Fat
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={mealForm.fat}
                    onChange={(event) =>
                      setMealForm((current) => ({
                        ...current,
                        fat: event.target.value,
                      }))
                    }
                    placeholder="20g"
                    className="input-fitness"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setMealModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>

              <button
                onClick={saveMeal}
                disabled={saving}
                className="flex-1 rounded-xl bg-green-500 px-4 py-3 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
              >
                {saving
                  ? 'Saving...'
                  : editingMeal
                    ? 'Save changes'
                    : 'Save meal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Component-local input styles */}
      <style>{`
        .input-fitness {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0.75rem 0.875rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          outline: none;
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }

        .input-fitness:focus {
          border-color: rgb(14 165 233);
          box-shadow: 0 0 0 3px rgb(14 165 233 / 0.10);
        }

        .input-fitness::placeholder {
          color: rgb(148 163 184);
        }

        @media (prefers-color-scheme: dark) {
          .dark .input-fitness {
            border-color: rgb(30 41 59);
            background: rgb(15 23 42);
            color: white;
          }

          .dark .input-fitness:focus {
            border-color: rgb(14 165 233);
          }
        }
      `}</style>
    </div>
  );
}

export default FitnessView;