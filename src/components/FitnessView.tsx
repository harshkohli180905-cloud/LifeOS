import {
  Activity,
  Apple,
  ArrowLeft,
  ArrowRight,
  Beef,
  Calendar,
  Check,
  Clock3,
  Dumbbell,
  Flame,
  Footprints,
  Loader2,
  MoreHorizontal,
  Plus,
  Save,
  Trash2,
  Utensils,
  Waves,
  X,
  Zap,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getLocalDate } from '../lib/date';

type Tab = 'running' | 'workout' | 'nutrition' | 'water';

type Run = {
  id: string;
  date: string;
  distance_km: number;
  duration_seconds: number;
  pace: number | null;
  calories: number | null;
  notes: string | null;
  route_location: string | null;
};

type Workout = {
  id: string;
  name: string;
  date: string;
  duration_seconds: number;
  notes: string | null;
};

type Meal = {
  id: string;
  meal_type: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date: string;
};

type WaterLog = {
  id: string;
  amount_ml: number;
  date: string;
  created_at: string;
};

type Profile = {
  daily_run_target: number;
  daily_water_target: number;
  daily_protein_target: number;
  daily_calorie_target: number;
};

type RunForm = {
  date: string;
  distance: string;
  duration: string;
  calories: string;
  notes: string;
  route: string;
};

type WorkoutForm = {
  name: string;
  date: string;
  duration: string;
  notes: string;
};

type MealForm = {
  mealType: string;
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  date: string;
};

type WaterForm = {
  amount: string;
  date: string;
};



const formatDate = (value: string) => {
  if (!value) return '—';

  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatShortDate = (value: string) => {
  if (!value) return '—';

  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
};

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.round(seconds || 0));

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }

  return `${secs}s`;
};

const formatMinutes = (seconds: number) => {
  return Math.round(Math.max(0, seconds || 0) / 60);
};

const formatNumber = (value: number, digits = 0) => {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
};

const calculatePace = (distance: number, durationSeconds: number) => {
  if (!distance || distance <= 0 || !durationSeconds) return null;

  return durationSeconds / 60 / distance;
};

const formatPace = (pace: number | null) => {
  if (!pace || !Number.isFinite(pace)) return '—';

  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);

  if (seconds >= 60) {
    return `${minutes + 1}:00 /km`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')} /km`;
};

const getPercent = (value: number, target: number) => {
  if (!target || target <= 0) return 0;

  return Math.min(100, Math.max(0, (value / target) * 100));
};

const emptyRunForm = (): RunForm => ({
  date: getLocalDate(),
  distance: '',
  duration: '',
  calories: '',
  notes: '',
  route: '',
});

const emptyWorkoutForm = (): WorkoutForm => ({
  name: '',
  date: getLocalDate(),
  duration: '',
  notes: '',
});

const emptyMealForm = (): MealForm => ({
  mealType: 'Breakfast',
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  date: getLocalDate(),
});

const emptyWaterForm = (): WaterForm => ({
  amount: '',
  date: getLocalDate(),
});

function SectionHeader({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex min-w-0 items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {icon}
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h2>

          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      {action}
    </div>
  );
}

function ProgressBar({
  value,
  target,
}: {
  value: number;
  target: number;
}) {
  const percentage = getPercent(value, target);

  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className="h-full rounded-full bg-slate-900 transition-all dark:bg-white"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-1 truncate text-xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>

          {subtext && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {subtext}
            </p>
          )}
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:max-w-lg sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  min?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        min={min}
        step={step}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        {icon}
      </div>

      <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
        {title}
      </h3>

      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default function FitnessView() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('running');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [runs, setRuns] = useState<Run[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);

  const [profile, setProfile] = useState<Profile>({
    daily_run_target: 5,
    daily_water_target: 3000,
    daily_protein_target: 140,
    daily_calorie_target: 2500,
  });

  const [runModal, setRunModal] = useState(false);
  const [workoutModal, setWorkoutModal] = useState(false);
  const [mealModal, setMealModal] = useState(false);
  const [waterModal, setWaterModal] = useState(false);

  const [editingRunId, setEditingRunId] = useState<string | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);

  const [runForm, setRunForm] = useState<RunForm>(emptyRunForm);
  const [workoutForm, setWorkoutForm] =
    useState<WorkoutForm>(emptyWorkoutForm);
  const [mealForm, setMealForm] = useState<MealForm>(emptyMealForm);
  const [waterForm, setWaterForm] = useState<WaterForm>(emptyWaterForm);

  const [selectedDate, setSelectedDate] = useState(getLocalDate());

  const loadData = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      const [
        runsResult,
        workoutsResult,
        mealsResult,
        waterResult,
        profileResult,
      ] = await Promise.all([
        supabase
          .from('runs')
          .select(
            'id,date,distance_km,duration_seconds,pace,calories,notes,route_location',
          )
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),

        supabase
          .from('workouts')
          .select('id,name,date,duration_seconds,notes')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),

        supabase
          .from('meals')
          .select('id,meal_type,name,calories,protein,carbs,fat,date')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),

        supabase
          .from('water_logs')
          .select('id,amount_ml,date,created_at')
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
      if (mealsResult.error) throw mealsResult.error;
      if (waterResult.error) throw waterResult.error;

      setRuns((runsResult.data ?? []) as Run[]);
      setWorkouts((workoutsResult.data ?? []) as Workout[]);
      setMeals((mealsResult.data ?? []) as Meal[]);
      setWaterLogs((waterResult.data ?? []) as WaterLog[]);

      if (profileResult.data) {
        setProfile({
          daily_run_target: Number(profileResult.data.daily_run_target ?? 5),
          daily_water_target: Number(
            profileResult.data.daily_water_target ?? 3000,
          ),
          daily_protein_target: Number(
            profileResult.data.daily_protein_target ?? 140,
          ),
          daily_calorie_target: Number(
            profileResult.data.daily_calorie_target ?? 2500,
          ),
        });
      }
    } catch (error) {
      console.error('Fitness data load error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedRuns = useMemo(
    () => runs.filter((run) => run.date === selectedDate),
    [runs, selectedDate],
  );

  const selectedWorkouts = useMemo(
    () => workouts.filter((workout) => workout.date === selectedDate),
    [workouts, selectedDate],
  );

  const selectedMeals = useMemo(
    () => meals.filter((meal) => meal.date === selectedDate),
    [meals, selectedDate],
  );

  const selectedWaterLogs = useMemo(
    () => waterLogs.filter((log) => log.date === selectedDate),
    [waterLogs, selectedDate],
  );

  const todayDistance = useMemo(
    () =>
      selectedRuns.reduce(
        (total, run) => total + Number(run.distance_km || 0),
        0,
      ),
    [selectedRuns],
  );

  const todayRunCalories = useMemo(
    () =>
      selectedRuns.reduce(
        (total, run) => total + Number(run.calories || 0),
        0,
      ),
    [selectedRuns],
  );

  const todayRunDuration = useMemo(
    () =>
      selectedRuns.reduce(
        (total, run) => total + Number(run.duration_seconds || 0),
        0,
      ),
    [selectedRuns],
  );

  const todayWorkoutDuration = useMemo(
    () =>
      selectedWorkouts.reduce(
        (total, workout) =>
          total + Number(workout.duration_seconds || 0),
        0,
      ),
    [selectedWorkouts],
  );

  const todayCalories = useMemo(
    () =>
      selectedMeals.reduce(
        (total, meal) => total + Number(meal.calories || 0),
        0,
      ),
    [selectedMeals],
  );

  const todayProtein = useMemo(
    () =>
      selectedMeals.reduce(
        (total, meal) => total + Number(meal.protein || 0),
        0,
      ),
    [selectedMeals],
  );

  const todayCarbs = useMemo(
    () =>
      selectedMeals.reduce(
        (total, meal) => total + Number(meal.carbs || 0),
        0,
      ),
    [selectedMeals],
  );

  const todayFat = useMemo(
    () =>
      selectedMeals.reduce(
        (total, meal) => total + Number(meal.fat || 0),
        0,
      ),
    [selectedMeals],
  );

  const todayWater = useMemo(
    () =>
      selectedWaterLogs.reduce(
        (total, log) => total + Number(log.amount_ml || 0),
        0,
      ),
    [selectedWaterLogs],
  );

  const averagePace = useMemo(() => {
    if (!todayDistance || !todayRunDuration) return null;

    return calculatePace(todayDistance, todayRunDuration);
  }, [todayDistance, todayRunDuration]);

  const shiftDate = (days: number) => {
    const date = new Date(`${selectedDate}T00:00:00`);

    date.setDate(date.getDate() + days);

    const offset = date.getTimezoneOffset();
    const adjusted = new Date(date.getTime() - offset * 60 * 1000);

    setSelectedDate(adjusted.toISOString().slice(0, 10));
  };

  const resetRunForm = () => {
    setEditingRunId(null);

    setRunForm({
      ...emptyRunForm(),
      date: selectedDate,
    });
  };

  const resetWorkoutForm = () => {
    setEditingWorkoutId(null);

    setWorkoutForm({
      ...emptyWorkoutForm(),
      date: selectedDate,
    });
  };

  const resetMealForm = () => {
    setEditingMealId(null);

    setMealForm({
      ...emptyMealForm(),
      date: selectedDate,
    });
  };

  const resetWaterForm = () => {
    setWaterForm({
      ...emptyWaterForm(),
      date: selectedDate,
    });
  };

  const openRunModal = (run?: Run) => {
    if (run) {
      setEditingRunId(run.id);

      setRunForm({
        date: run.date,
        distance: String(run.distance_km ?? ''),
        duration: String(
          Math.round((run.duration_seconds ?? 0) / 60),
        ),
        calories: String(run.calories ?? ''),
        notes: run.notes ?? '',
        route: run.route_location ?? '',
      });
    } else {
      resetRunForm();
    }

    setRunModal(true);
  };

  const openWorkoutModal = (workout?: Workout) => {
    if (workout) {
      setEditingWorkoutId(workout.id);

      setWorkoutForm({
        name: workout.name,
        date: workout.date,
        duration: String(
          Math.round((workout.duration_seconds ?? 0) / 60),
        ),
        notes: workout.notes ?? '',
      });
    } else {
      resetWorkoutForm();
    }

    setWorkoutModal(true);
  };

  const openMealModal = (meal?: Meal) => {
    if (meal) {
      setEditingMealId(meal.id);

      setMealForm({
        mealType: meal.meal_type,
        name: meal.name,
        calories: String(meal.calories ?? ''),
        protein: String(meal.protein ?? ''),
        carbs: String(meal.carbs ?? ''),
        fat: String(meal.fat ?? ''),
        date: meal.date,
      });
    } else {
      resetMealForm();
    }

    setMealModal(true);
  };

  const saveRun = async () => {
    if (!user) return;

    const distance = Number(runForm.distance);
    const durationMinutes = Number(runForm.duration);
    const calories = Number(runForm.calories);

    if (
      !runForm.date ||
      !distance ||
      distance <= 0 ||
      !durationMinutes ||
      durationMinutes <= 0
    ) {
      return;
    }

    setSaving(true);

    try {
      const durationSeconds = Math.round(durationMinutes * 60);
      const pace = calculatePace(distance, durationSeconds);

      const payload = {
        user_id: user.id,
        date: runForm.date,
        distance_km: distance,
        duration_seconds: durationSeconds,
        pace,
        calories: calories > 0 ? calories : null,
        notes: runForm.notes.trim() || null,
        route_location: runForm.route.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingRunId) {
        const { error } = await supabase
          .from('runs')
          .update(payload)
          .eq('id', editingRunId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('runs')
          .insert(payload);

        if (error) throw error;
      }

      setRunModal(false);
      resetRunForm();

      await loadData();
    } catch (error) {
      console.error('Run save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteRun = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('runs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Run delete error:', error);
    }
  };

  const saveWorkout = async () => {
    if (!user) return;

    const durationMinutes = Number(workoutForm.duration);

    if (
      !workoutForm.name.trim() ||
      !workoutForm.date ||
      !durationMinutes ||
      durationMinutes <= 0
    ) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        user_id: user.id,
        name: workoutForm.name.trim(),
        date: workoutForm.date,
        duration_seconds: Math.round(durationMinutes * 60),
        notes: workoutForm.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingWorkoutId) {
        const { error } = await supabase
          .from('workouts')
          .update(payload)
          .eq('id', editingWorkoutId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('workouts')
          .insert(payload);

        if (error) throw error;
      }

      setWorkoutModal(false);
      resetWorkoutForm();

      await loadData();
    } catch (error) {
      console.error('Workout save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteWorkout = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Workout delete error:', error);
    }
  };

  const saveMeal = async () => {
    if (!user) return;

    if (!mealForm.name.trim() || !mealForm.date) {
      return;
    }

    setSaving(true);

    try {
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

      if (editingMealId) {
        const { error } = await supabase
          .from('meals')
          .update(payload)
          .eq('id', editingMealId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('meals')
          .insert(payload);

        if (error) throw error;
      }

      setMealModal(false);
      resetMealForm();

      await loadData();
    } catch (error) {
      console.error('Meal save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteMeal = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Meal delete error:', error);
    }
  };

  const saveWater = async () => {
    if (!user) return;

    const amount = Number(waterForm.amount);

    if (!amount || amount <= 0 || !waterForm.date) {
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('water_logs')
        .insert({
          user_id: user.id,
          amount_ml: Math.round(amount),
          date: waterForm.date,
        });

      if (error) throw error;

      setWaterModal(false);
      resetWaterForm();

      await loadData();
    } catch (error) {
      console.error('Water save error:', error);
    } finally {
      setSaving(false);
    }
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

      await loadData();
    } catch (error) {
      console.error('Water delete error:', error);
    }
  };

  const tabs: Array<{
    id: Tab;
    label: string;
    icon: ReactNode;
  }> = [
    {
      id: 'running',
      label: 'Running',
      icon: <Footprints size={17} />,
    },
    {
      id: 'workout',
      label: 'Workout',
      icon: <Dumbbell size={17} />,
    },
    {
      id: 'nutrition',
      label: 'Nutrition',
      icon: <Apple size={17} />,
    },
    {
      id: 'water',
      label: 'Water',
      icon: <Waves size={17} />,
    },
  ];

  if (!user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Please sign in to view your activity.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full min-w-0 overflow-x-hidden bg-slate-50 pb-24 dark:bg-slate-950 lg:pb-8">
      <div className="mx-auto w-full max-w-7xl min-w-0 px-4 py-5 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Activity
            </p>

            <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Fitness & Wellness
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Track your runs, workouts, food and hydration.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Previous day"
            >
              <ArrowLeft size={17} />
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate(getLocalDate())}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Calendar size={16} />

              <span className="hidden sm:inline">
                {selectedDate === getLocalDate()
                  ? 'Today'
                  : formatShortDate(selectedDate)}
              </span>

              <span className="sm:hidden">
                {selectedDate === getLocalDate() ? 'Today' : 'Day'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Next day"
            >
              <ArrowRight size={17} />
            </button>
          </div>
        </div>

        {/* DATE */}
        <div className="mb-5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Calendar size={15} />

          <span>{formatDate(selectedDate)}</span>

          {selectedDate === getLocalDate() && (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-white dark:text-slate-900">
              Today
            </span>
          )}
        </div>

        {/* TABS */}
        <div className="mb-6 w-full overflow-x-auto">
          <div className="flex min-w-max gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    active
                      ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="animate-spin" size={18} />
              Loading activity...
            </div>
          </div>
        ) : (
          <>
            {/* RUNNING */}
            {activeTab === 'running' && (
              <div className="space-y-6">

                <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard
                    icon={<Footprints size={18} />}
                    label="Distance"
                    value={`${formatNumber(todayDistance, 2)} km`}
                    subtext={`Target ${formatNumber(
                      profile.daily_run_target,
                      1,
                    )} km`}
                  />

                  <StatCard
                    icon={<Clock3 size={18} />}
                    label="Duration"
                    value={formatDuration(todayRunDuration)}
                    subtext={`${selectedRuns.length} run${
                      selectedRuns.length === 1 ? '' : 's'
                    }`}
                  />

                  <StatCard
                    icon={<Zap size={18} />}
                    label="Pace"
                    value={formatPace(averagePace)}
                    subtext="Average pace"
                  />

                  <StatCard
                    icon={<Flame size={18} />}
                    label="Calories"
                    value={`${formatNumber(todayRunCalories)} kcal`}
                    subtext="Running calories"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Daily running target
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {formatNumber(todayDistance, 2)} /{' '}
                        {formatNumber(profile.daily_run_target, 1)} km
                      </p>
                    </div>

                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {Math.round(
                        getPercent(
                          todayDistance,
                          profile.daily_run_target,
                        ),
                      )}
                      %
                    </span>
                  </div>

                  <ProgressBar
                    value={todayDistance}
                    target={profile.daily_run_target}
                  />
                </div>

                <section>
                  <SectionHeader
                    icon={<Footprints size={19} />}
                    title="Runs"
                    description="Your running history"
                    action={
                      <button
                        type="button"
                        onClick={() => openRunModal()}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                      >
                        <Plus size={16} />
                        <span className="hidden sm:inline">Log run</span>
                        <span className="sm:hidden">Add</span>
                      </button>
                    }
                  />

                  {selectedRuns.length === 0 ? (
                    <EmptyState
                      icon={<Footprints size={21} />}
                      title="No run logged"
                      description="Log your run for this day to keep your activity history updated."
                      action={
                        <button
                          type="button"
                          onClick={() => openRunModal()}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
                        >
                          Log your first run
                        </button>
                      }
                    />
                  ) : (
                    <div className="space-y-3">
                      {selectedRuns.map((run) => (
                        <div
                          key={run.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300">
                                  <Footprints size={17} />
                                </div>

                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 dark:text-white">
                                    {formatNumber(
                                      run.distance_km,
                                      2,
                                    )}{' '}
                                    km
                                  </p>

                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {formatDuration(
                                      run.duration_seconds,
                                    )}{' '}
                                    · {formatPace(run.pace)}
                                  </p>
                                </div>
                              </div>

                              {(run.notes || run.route_location) && (
                                <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                                  {run.route_location && (
                                    <p>📍 {run.route_location}</p>
                                  )}

                                  {run.notes && <p>{run.notes}</p>}
                                </div>
                              )}
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openRunModal(run)}
                                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                                aria-label="Edit run"
                              >
                                <MoreHorizontal size={17} />
                              </button>

                              <button
                                type="button"
                                onClick={() => void deleteRun(run.id)}
                                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                                aria-label="Delete run"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {run.calories && (
                            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                              <Flame size={14} />
                              {formatNumber(run.calories)} kcal
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* WORKOUT */}
            {activeTab === 'workout' && (
              <div className="space-y-6">
                <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-3">
                  <StatCard
                    icon={<Dumbbell size={18} />}
                    label="Sessions"
                    value={formatNumber(selectedWorkouts.length)}
                    subtext="Logged today"
                  />

                  <StatCard
                    icon={<Clock3 size={18} />}
                    label="Duration"
                    value={formatDuration(todayWorkoutDuration)}
                    subtext={`${formatMinutes(
                      todayWorkoutDuration,
                    )} minutes`}
                  />

                  <StatCard
                    icon={<Activity size={18} />}
                    label="Status"
                    value={
                      selectedWorkouts.length > 0 ? 'Active' : 'Rest'
                    }
                    subtext="Based on logged sessions"
                  />
                </div>

                <section>
                  <SectionHeader
                    icon={<Dumbbell size={19} />}
                    title="Workout sessions"
                    description="Track your training sessions"
                    action={
                      <button
                        type="button"
                        onClick={() => openWorkoutModal()}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
                      >
                        <Plus size={16} />
                        <span className="hidden sm:inline">
                          Log workout
                        </span>
                        <span className="sm:hidden">Add</span>
                      </button>
                    }
                  />

                  {selectedWorkouts.length === 0 ? (
                    <EmptyState
                      icon={<Dumbbell size={21} />}
                      title="No workout logged"
                      description="Add a workout session to build your training history."
                      action={
                        <button
                          type="button"
                          onClick={() => openWorkoutModal()}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
                        >
                          Log workout
                        </button>
                      }
                    />
                  ) : (
                    <div className="space-y-3">
                      {selectedWorkouts.map((workout) => (
                        <div
                          key={workout.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300">
                                <Dumbbell size={18} />
                              </div>

                              <div className="min-w-0">
                                <h3 className="truncate font-bold text-slate-900 dark:text-white">
                                  {workout.name}
                                </h3>

                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {formatDuration(
                                    workout.duration_seconds,
                                  )}
                                </p>

                                {workout.notes && (
                                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    {workout.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  openWorkoutModal(workout)
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                aria-label="Edit workout"
                              >
                                <MoreHorizontal size={17} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void deleteWorkout(workout.id)
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                                aria-label="Delete workout"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* NUTRITION */}
            {activeTab === 'nutrition' && (
              <div className="space-y-6">
                <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard
                    icon={<Flame size={18} />}
                    label="Calories"
                    value={`${formatNumber(todayCalories)} kcal`}
                    subtext={`Target ${formatNumber(
                      profile.daily_calorie_target,
                    )}`}
                  />

                  <StatCard
                    icon={<Beef size={18} />}
                    label="Protein"
                    value={`${formatNumber(todayProtein, 1)} g`}
                    subtext={`Target ${formatNumber(
                      profile.daily_protein_target,
                    )} g`}
                  />

                  <StatCard
                    icon={<Zap size={18} />}
                    label="Carbs"
                    value={`${formatNumber(todayCarbs, 1)} g`}
                    subtext="Total carbs"
                  />

                  <StatCard
                    icon={<Apple size={18} />}
                    label="Fat"
                    value={`${formatNumber(todayFat, 1)} g`}
                    subtext="Total fat"
                  />
                </div>

                <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          Calorie target
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {formatNumber(todayCalories)} /{' '}
                          {formatNumber(
                            profile.daily_calorie_target,
                          )}{' '}
                          kcal
                        </p>
                      </div>

                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {Math.round(
                          getPercent(
                            todayCalories,
                            profile.daily_calorie_target,
                          ),
                        )}
                        %
                      </span>
                    </div>

                    <ProgressBar
                      value={todayCalories}
                      target={profile.daily_calorie_target}
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          Protein target
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {formatNumber(todayProtein, 1)} /{' '}
                          {formatNumber(
                            profile.daily_protein_target,
                          )}{' '}
                          g
                        </p>
                      </div>

                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {Math.round(
                          getPercent(
                            todayProtein,
                            profile.daily_protein_target,
                          ),
                        )}
                        %
                      </span>
                    </div>

                    <ProgressBar
                      value={todayProtein}
                      target={profile.daily_protein_target}
                    />
                  </div>
                </div>

                <section>
                  <SectionHeader
                    icon={<Utensils size={19} />}
                    title="Meals"
                    description="Track your daily nutrition"
                    action={
                      <button
                        type="button"
                        onClick={() => openMealModal()}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
                      >
                        <Plus size={16} />
                        <span className="hidden sm:inline">
                          Add meal
                        </span>
                        <span className="sm:hidden">Add</span>
                      </button>
                    }
                  />

                  {selectedMeals.length === 0 ? (
                    <EmptyState
                      icon={<Apple size={21} />}
                      title="No meals logged"
                      description="Add your meals to keep calories and macros up to date."
                      action={
                        <button
                          type="button"
                          onClick={() => openMealModal()}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
                        >
                          Add meal
                        </button>
                      }
                    />
                  ) : (
                    <div className="space-y-3">
                      {selectedMeals.map((meal) => (
                        <div
                          key={meal.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-300">
                                <Apple size={18} />
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-bold text-slate-900 dark:text-white">
                                    {meal.name}
                                  </h3>

                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                    {meal.meal_type}
                                  </span>
                                </div>

                                <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                  {formatNumber(meal.calories)} kcal
                                </p>

                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                  <span>
                                    Protein{' '}
                                    {formatNumber(meal.protein, 1)}g
                                  </span>

                                  <span>
                                    Carbs{' '}
                                    {formatNumber(meal.carbs, 1)}g
                                  </span>

                                  <span>
                                    Fat {formatNumber(meal.fat, 1)}g
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openMealModal(meal)}
                                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                aria-label="Edit meal"
                              >
                                <MoreHorizontal size={17} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void deleteMeal(meal.id)
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                                aria-label="Delete meal"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* WATER */}
            {activeTab === 'water' && (
              <div className="space-y-6">
                <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-3">
                  <StatCard
                    icon={<Waves size={18} />}
                    label="Water"
                    value={`${formatNumber(
                      todayWater / 1000,
                      2,
                    )} L`}
                    subtext={`Target ${formatNumber(
                      profile.daily_water_target / 1000,
                      1,
                    )} L`}
                  />

                  <StatCard
                    icon={<Activity size={18} />}
                    label="Progress"
                    value={`${Math.round(
                      getPercent(
                        todayWater,
                        profile.daily_water_target,
                      ),
                    )}%`}
                    subtext="Daily hydration"
                  />

                  <StatCard
                    icon={<Utensils size={18} />}
                    label="Logs"
                    value={formatNumber(selectedWaterLogs.length)}
                    subtext="Water entries"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Daily hydration
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {formatNumber(todayWater)} /{' '}
                        {formatNumber(profile.daily_water_target)} ml
                      </p>
                    </div>

                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {Math.round(
                        getPercent(
                          todayWater,
                          profile.daily_water_target,
                        ),
                      )}
                      %
                    </span>
                  </div>

                  <ProgressBar
                    value={todayWater}
                    target={profile.daily_water_target}
                  />
                </div>

                <section>
                  <SectionHeader
                    icon={<Waves size={19} />}
                    title="Water logs"
                    description="Keep your hydration consistent"
                    action={
                      <button
                        type="button"
                        onClick={() => {
                          resetWaterForm();
                          setWaterModal(true);
                        }}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
                      >
                        <Plus size={16} />
                        <span className="hidden sm:inline">
                          Add water
                        </span>
                        <span className="sm:hidden">Add</span>
                      </button>
                    }
                  />

                  {selectedWaterLogs.length === 0 ? (
                    <EmptyState
                      icon={<Waves size={21} />}
                      title="No water logged"
                      description="Start adding water throughout the day to track your hydration."
                      action={
                        <button
                          type="button"
                          onClick={() => {
                            resetWaterForm();
                            setWaterModal(true);
                          }}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
                        >
                          Add water
                        </button>
                      }
                    />
                  ) : (
                    <div className="space-y-3">
                      {selectedWaterLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300">
                              <Waves size={18} />
                            </div>

                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">
                                {formatNumber(log.amount_ml)} ml
                              </p>

                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {new Date(
                                  log.created_at,
                                ).toLocaleTimeString('en-IN', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => void deleteWater(log.id)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                            aria-label="Delete water log"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </div>

      {/* RUN MODAL */}
      <Modal
        open={runModal}
        title={editingRunId ? 'Edit run' : 'Log a run'}
        onClose={() => {
          setRunModal(false);
          resetRunForm();
        }}
      >
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={runForm.date}
            onChange={(value) =>
              setRunForm((current) => ({
                ...current,
                date: value,
              }))
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Distance (km)"
              type="number"
              min="0"
              step="0.01"
              placeholder="5"
              value={runForm.distance}
              onChange={(value) =>
                setRunForm((current) => ({
                  ...current,
                  distance: value,
                }))
              }
            />

            <Input
              label="Duration (minutes)"
              type="number"
              min="0"
              step="1"
              placeholder="30"
              value={runForm.duration}
              onChange={(value) =>
                setRunForm((current) => ({
                  ...current,
                  duration: value,
                }))
              }
            />
          </div>

          <Input
            label="Calories"
            type="number"
            min="0"
            step="1"
            placeholder="300"
            value={runForm.calories}
            onChange={(value) =>
              setRunForm((current) => ({
                ...current,
                calories: value,
              }))
            }
          />

          <Input
            label="Route / Location"
            placeholder="Park, track, treadmill..."
            value={runForm.route}
            onChange={(value) =>
              setRunForm((current) => ({
                ...current,
                route: value,
              }))
            }
          />

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Notes
            </span>

            <textarea
              value={runForm.notes}
              onChange={(event) =>
                setRunForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              rows={3}
              placeholder="How did the run feel?"
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800"
            />
          </label>

          {runForm.distance && runForm.duration && (
            <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900">
              <span className="text-slate-500 dark:text-slate-400">
                Calculated pace:{' '}
              </span>

              <span className="font-bold text-slate-900 dark:text-white">
                {formatPace(
                  calculatePace(
                    Number(runForm.distance),
                    Number(runForm.duration) * 60,
                  ),
                )}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => void saveRun()}
            disabled={
              saving ||
              !runForm.distance ||
              !runForm.duration ||
              !runForm.date
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <Save size={17} />
            )}

            {editingRunId ? 'Update run' : 'Save run'}
          </button>
        </div>
      </Modal>

      {/* WORKOUT MODAL */}
      <Modal
        open={workoutModal}
        title={editingWorkoutId ? 'Edit workout' : 'Log a workout'}
        onClose={() => {
          setWorkoutModal(false);
          resetWorkoutForm();
        }}
      >
        <div className="space-y-4">
          <Input
            label="Workout name"
            placeholder="Push Day, Leg Day, Full Body..."
            value={workoutForm.name}
            onChange={(value) =>
              setWorkoutForm((current) => ({
                ...current,
                name: value,
              }))
            }
          />

          <Input
            label="Date"
            type="date"
            value={workoutForm.date}
            onChange={(value) =>
              setWorkoutForm((current) => ({
                ...current,
                date: value,
              }))
            }
          />

          <Input
            label="Duration (minutes)"
            type="number"
            min="0"
            step="1"
            placeholder="60"
            value={workoutForm.duration}
            onChange={(value) =>
              setWorkoutForm((current) => ({
                ...current,
                duration: value,
              }))
            }
          />

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Notes
            </span>

            <textarea
              value={workoutForm.notes}
              onChange={(event) =>
                setWorkoutForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              rows={3}
              placeholder="Exercises, sets, how the session went..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800"
            />
          </label>

          <button
            type="button"
            onClick={() => void saveWorkout()}
            disabled={
              saving ||
              !workoutForm.name.trim() ||
              !workoutForm.duration ||
              !workoutForm.date
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <Save size={17} />
            )}

            {editingWorkoutId
              ? 'Update workout'
              : 'Save workout'}
          </button>
        </div>
      </Modal>

      {/* MEAL MODAL */}
      <Modal
        open={mealModal}
        title={editingMealId ? 'Edit meal' : 'Add a meal'}
        onClose={() => {
          setMealModal(false);
          resetMealForm();
        }}
      >
        <div className="space-y-4">
          <Select
            label="Meal type"
            value={mealForm.mealType}
            onChange={(value) =>
              setMealForm((current) => ({
                ...current,
                mealType: value,
              }))
            }
            options={[
              'Breakfast',
              'Lunch',
              'Dinner',
              'Snack',
              'Pre-workout',
              'Post-workout',
            ]}
          />

          <Input
            label="Meal name"
            placeholder="Oats, Paneer, Rice & Chicken..."
            value={mealForm.name}
            onChange={(value) =>
              setMealForm((current) => ({
                ...current,
                name: value,
              }))
            }
          />

          <Input
            label="Date"
            type="date"
            value={mealForm.date}
            onChange={(value) =>
              setMealForm((current) => ({
                ...current,
                date: value,
              }))
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Calories (kcal)"
              type="number"
              min="0"
              step="1"
              placeholder="500"
              value={mealForm.calories}
              onChange={(value) =>
                setMealForm((current) => ({
                  ...current,
                  calories: value,
                }))
              }
            />

            <Input
              label="Protein (g)"
              type="number"
              min="0"
              step="0.1"
              placeholder="30"
              value={mealForm.protein}
              onChange={(value) =>
                setMealForm((current) => ({
                  ...current,
                  protein: value,
                }))
              }
            />

            <Input
              label="Carbs (g)"
              type="number"
              min="0"
              step="0.1"
              placeholder="50"
              value={mealForm.carbs}
              onChange={(value) =>
                setMealForm((current) => ({
                  ...current,
                  carbs: value,
                }))
              }
            />

            <Input
              label="Fat (g)"
              type="number"
              min="0"
              step="0.1"
              placeholder="15"
              value={mealForm.fat}
              onChange={(value) =>
                setMealForm((current) => ({
                  ...current,
                  fat: value,
                }))
              }
            />
          </div>

          <button
            type="button"
            onClick={() => void saveMeal()}
            disabled={
              saving ||
              !mealForm.name.trim() ||
              !mealForm.date
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <Save size={17} />
            )}

            {editingMealId ? 'Update meal' : 'Save meal'}
          </button>
        </div>
      </Modal>

      {/* WATER MODAL */}
      <Modal
        open={waterModal}
        title="Add water"
        onClose={() => {
          setWaterModal(false);
          resetWaterForm();
        }}
      >
        <div className="space-y-4">
          <Input
            label="Amount (ml)"
            type="number"
            min="1"
            step="50"
            placeholder="500"
            value={waterForm.amount}
            onChange={(value) =>
              setWaterForm((current) => ({
                ...current,
                amount: value,
              }))
            }
          />

          <Input
            label="Date"
            type="date"
            value={waterForm.date}
            onChange={(value) =>
              setWaterForm((current) => ({
                ...current,
                date: value,
              }))
            }
          />

          <div className="grid grid-cols-4 gap-2">
            {[250, 500, 750, 1000].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() =>
                  setWaterForm((current) => ({
                    ...current,
                    amount: String(amount),
                  }))
                }
                className="rounded-xl border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {amount >= 1000 ? '1 L' : `${amount} ml`}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void saveWater()}
            disabled={
              saving ||
              !waterForm.amount ||
              !waterForm.date
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <Check size={17} />
            )}

            Save water
          </button>
        </div>
      </Modal>
    </div>
  );
}