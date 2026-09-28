import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Dumbbell,
  Droplets,
  FileText,
  Flame,
  Footprints,
  Home,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  Target,
  Trophy,
  Utensils,
  X,
} from 'lucide-react';

import { supabase } from './lib/supabase';
import { useAuth } from './context/AuthContext';

import StudyView from './components/StudyView';
import FitnessView from './components/FitnessView';
import HabitsView from './components/HabitsView';
import GoalsView from './components/GoalsView';
import TasksView from './components/TasksView';
import CalendarView from './components/CalendarView';
import AnalyticsView from './components/AnalyticsView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import SearchModal from './components/SearchModal';
import QuickLogModal from './components/QuickLogModal';
import OnboardingView from './components/OnboardingView';

type View =
  | 'home'
  | 'study'
  | 'fitness'
  | 'habits'
  | 'goals'
  | 'tasks'
  | 'calendar'
  | 'analytics'
  | 'reports'
  | 'settings';

type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  focus_areas: string[] | null;
  daily_study_target: number;
  daily_water_target: number;
  daily_run_target: number;
  daily_protein_target: number;
  daily_calorie_target: number;
  onboarding_completed: boolean;
};

type DashboardData = {
  studySeconds: number;
  runDistance: number;
  workoutMinutes: number;
  water: number;
  calories: number;
  protein: number;
  tasksTotal: number;
  tasksCompleted: number;
  goalsTotal: number;
  goalsCompleted: number;
  habitsTotal: number;
  habitsCompleted: number;
  latestWorkout: {
    id: string;
    name: string;
    date: string;
    duration_seconds: number;
  } | null;
};

const DEFAULT_PROFILE: Omit<
  Profile,
  'id' | 'name' | 'avatar_url' | 'focus_areas'
> = {
  daily_study_target: 120,
  daily_water_target: 3000,
  daily_run_target: 5,
  daily_protein_target: 140,
  daily_calorie_target: 2500,
  onboarding_completed: false,
};

const EMPTY_DASHBOARD: DashboardData = {
  studySeconds: 0,
  runDistance: 0,
  workoutMinutes: 0,
  water: 0,
  calories: 0,
  protein: 0,
  tasksTotal: 0,
  tasksCompleted: 0,
  goalsTotal: 0,
  goalsCompleted: 0,
  habitsTotal: 0,
  habitsCompleted: 0,
  latestWorkout: null,
};

function getLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function progressPercent(value: number, target: number) {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.round(seconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes === 0
    ? `${hours}h`
    : `${hours}h ${minutes}m`;
}

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString('en-IN', {
    maximumFractionDigits: digits,
  });
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle(
    'dark',
    theme === 'dark',
  );

  localStorage.setItem('lifeos-theme', theme);
}

function getStoredTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';

  const stored = localStorage.getItem('lifeos-theme');

  return stored === 'dark' ? 'dark' : 'light';
}

const navItems: Array<{
  id: View;
  label: string;
  icon: typeof Home;
}> = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
  },
  {
    id: 'study',
    label: 'Study',
    icon: BookOpen,
  },
  {
    id: 'fitness',
    label: 'Fitness',
    icon: Activity,
  },
  {
    id: 'habits',
    label: 'Habits',
    icon: Trophy,
  },
  {
    id: 'goals',
    label: 'Goals',
    icon: Target,
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: CheckSquare,
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: CalendarDays,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
  },
];

function App() {
  const { user, loading: authLoading } = useAuth();

  const [activeView, setActiveView] = useState<View>('home');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dashboard, setDashboard] =
    useState<DashboardData>(EMPTY_DASHBOARD);

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [quickLogOpen, setQuickLogOpen] = useState(false);

  const [quickLogType, setQuickLogType] = useState<
    'study' | 'run' | 'workout' | 'water' | 'meal'
  >('study');

 const [theme] = useState<'light' | 'dark'>(
  getStoredTheme(),
);

  const [showOnboarding, setShowOnboarding] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select(
        `
        id,
        name,
        avatar_url,
        focus_areas,
        daily_study_target,
        daily_water_target,
        daily_run_target,
        daily_protein_target,
        daily_calorie_target,
        onboarding_completed
        `,
      )
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Profile load error:', error);
      return null;
    }

    if (data) {
      const normalized: Profile = {
        id: data.id,
        name: data.name ?? '',
        avatar_url: data.avatar_url ?? null,
        focus_areas: data.focus_areas ?? [],
        daily_study_target:
          data.daily_study_target ??
          DEFAULT_PROFILE.daily_study_target,
        daily_water_target:
          data.daily_water_target ??
          DEFAULT_PROFILE.daily_water_target,
        daily_run_target:
          data.daily_run_target ??
          DEFAULT_PROFILE.daily_run_target,
        daily_protein_target:
          data.daily_protein_target ??
          DEFAULT_PROFILE.daily_protein_target,
        daily_calorie_target:
          data.daily_calorie_target ??
          DEFAULT_PROFILE.daily_calorie_target,
        onboarding_completed:
          data.onboarding_completed ?? false,
      };

      setProfile(normalized);
      setShowOnboarding(!normalized.onboarding_completed);

      return normalized;
    }

    const metadata = user.user_metadata ?? {};

    const newProfile: Profile = {
      id: user.id,
      name:
        metadata.full_name ??
        metadata.name ??
        '',
      avatar_url:
        metadata.avatar_url ??
        metadata.picture ??
        null,
      focus_areas: [],
      daily_study_target:
        DEFAULT_PROFILE.daily_study_target,
      daily_water_target:
        DEFAULT_PROFILE.daily_water_target,
      daily_run_target:
        DEFAULT_PROFILE.daily_run_target,
      daily_protein_target:
        DEFAULT_PROFILE.daily_protein_target,
      daily_calorie_target:
        DEFAULT_PROFILE.daily_calorie_target,
      onboarding_completed: false,
    };

    const { error: insertError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        name: newProfile.name,
        avatar_url: newProfile.avatar_url,
        focus_areas: [],
        daily_study_target:
          newProfile.daily_study_target,
        daily_water_target:
          newProfile.daily_water_target,
        daily_run_target:
          newProfile.daily_run_target,
        daily_protein_target:
          newProfile.daily_protein_target,
        daily_calorie_target:
          newProfile.daily_calorie_target,
        onboarding_completed: false,
      });

    if (insertError) {
      console.error(
        'Profile create error:',
        insertError,
      );
    }

    setProfile(newProfile);
    setShowOnboarding(true);

    return newProfile;
  }, [user]);

  const loadDashboard = useCallback(async () => {
    if (!user) return;

    const today = getLocalDate();

    const [
      studyResult,
      runsResult,
      workoutsResult,
      waterResult,
      mealsResult,
      tasksResult,
      goalsResult,
      habitsResult,
      habitLogsResult,
    ] = await Promise.all([
      supabase
        .from('study_sessions')
        .select('duration_seconds, started_at')
        .eq('user_id', user.id),

      supabase
        .from('runs')
        .select('distance_km, duration_seconds, date')
        .eq('user_id', user.id)
        .eq('date', today),

      supabase
        .from('workouts')
        .select(
          'id, name, date, duration_seconds',
        )
        .eq('user_id', user.id)
        .eq('date', today)
        .order('created_at', {
          ascending: false,
        }),

      supabase
        .from('water_logs')
        .select('amount_ml, date')
        .eq('user_id', user.id)
        .eq('date', today),

      supabase
        .from('meals')
        .select(
          'calories, protein, date',
        )
        .eq('user_id', user.id)
        .eq('date', today),

      supabase
        .from('tasks')
        .select('completed')
        .eq('user_id', user.id),

      supabase
        .from('goals')
        .select('completed')
        .eq('user_id', user.id),

      supabase
        .from('habits')
        .select(
          'id, active',
        )
        .eq('user_id', user.id)
        .eq('active', true),

      supabase
        .from('habit_logs')
        .select(
          'habit_id, completed, date',
        )
        .eq('user_id', user.id)
        .eq('date', today),
    ]);

    if (studyResult.error) {
      console.error(
        'Study dashboard error:',
        studyResult.error,
      );
    }

    if (runsResult.error) {
      console.error(
        'Runs dashboard error:',
        runsResult.error,
      );
    }

    if (workoutsResult.error) {
      console.error(
        'Workout dashboard error:',
        workoutsResult.error,
      );
    }

    if (waterResult.error) {
      console.error(
        'Water dashboard error:',
        waterResult.error,
      );
    }

    if (mealsResult.error) {
      console.error(
        'Meals dashboard error:',
        mealsResult.error,
      );
    }

    if (tasksResult.error) {
      console.error(
        'Tasks dashboard error:',
        tasksResult.error,
      );
    }

    if (goalsResult.error) {
      console.error(
        'Goals dashboard error:',
        goalsResult.error,
      );
    }

    if (habitsResult.error) {
      console.error(
        'Habits dashboard error:',
        habitsResult.error,
      );
    }

    if (habitLogsResult.error) {
      console.error(
        'Habit logs dashboard error:',
        habitLogsResult.error,
      );
    }

    const studySessions = studyResult.data ?? [];
    const runs = runsResult.data ?? [];
    const workouts = workoutsResult.data ?? [];
    const waterLogs = waterResult.data ?? [];
    const meals = mealsResult.data ?? [];
    const tasks = tasksResult.data ?? [];
    const goals = goalsResult.data ?? [];
    const habits = habitsResult.data ?? [];
    const habitLogs = habitLogsResult.data ?? [];

    const studySeconds = studySessions.reduce(
      (sum, item) =>
        sum + Number(item.duration_seconds ?? 0),
      0,
    );

    const runDistance = runs.reduce(
      (sum, item) =>
        sum + Number(item.distance_km ?? 0),
      0,
    );

    const workoutMinutes = Math.round(
      workouts.reduce(
        (sum, item) =>
          sum +
          Number(item.duration_seconds ?? 0),
        0,
      ) / 60,
    );

    const water = waterLogs.reduce(
      (sum, item) =>
        sum + Number(item.amount_ml ?? 0),
      0,
    );

    const calories = meals.reduce(
      (sum, item) =>
        sum + Number(item.calories ?? 0),
      0,
    );

    const protein = meals.reduce(
      (sum, item) =>
        sum + Number(item.protein ?? 0),
      0,
    );

    const tasksCompleted = tasks.filter(
      (item) => item.completed,
    ).length;

    const goalsCompleted = goals.filter(
      (item) => item.completed,
    ).length;

    const habitsCompleted = habits.filter(
      (habit) =>
        habitLogs.some(
          (log) =>
            log.habit_id === habit.id &&
            log.completed,
        ),
    ).length;

    const latestWorkout =
      workouts.length > 0
        ? {
            id: workouts[0].id,
            name: workouts[0].name,
            date: workouts[0].date,
            duration_seconds:
              Number(
                workouts[0].duration_seconds ?? 0,
              ),
          }
        : null;

    setDashboard({
      studySeconds,
      runDistance,
      workoutMinutes,
      water,
      calories,
      protein,
      tasksTotal: tasks.length,
      tasksCompleted,
      goalsTotal: goals.length,
      goalsCompleted,
      habitsTotal: habits.length,
      habitsCompleted,
      latestWorkout,
    });
  }, [user]);

  const refreshAll = useCallback(async () => {
    if (!user) return;

    await Promise.all([
      loadProfile(),
      loadDashboard(),
    ]);
  }, [
    user,
    loadProfile,
    loadDashboard,
  ]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setDashboard(EMPTY_DASHBOARD);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const initialise = async () => {
      setLoading(true);

      await Promise.all([
        loadProfile(),
        loadDashboard(),
      ]);

      if (!cancelled) {
        setLoading(false);
      }
    };

    void initialise();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    loadProfile,
    loadDashboard,
  ]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`lifeos-dashboard-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_sessions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadDashboard();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'runs',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadDashboard();
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
          void loadDashboard();
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
          void loadDashboard();
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
          void loadDashboard();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadDashboard();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadDashboard();
        },
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
          void loadDashboard();
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
          void loadDashboard();
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
          void loadProfile();
          void loadDashboard();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    user,
    loadProfile,
    loadDashboard,
  ]);

  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState ===
        'visible'
      ) {
        void refreshAll();
      }
    };

    const handleFocus = () => {
      void refreshAll();
    };

    document.addEventListener(
      'visibilitychange',
      handleVisibility,
    );

    window.addEventListener(
      'focus',
      handleFocus,
    );

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibility,
      );

      window.removeEventListener(
        'focus',
        handleFocus,
      );
    };
  }, [refreshAll]);

  useEffect(() => {
    const handleKeyboard = (
      event: KeyboardEvent,
    ) => {
      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault();
        setSearchOpen(true);
      }

      if (event.key === 'Escape') {
        setSearchOpen(false);
        setQuickLogOpen(false);
        setSidebarOpen(false);
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyboard,
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyboard,
      );
    };
  }, []);

  const navigate = useCallback(
    (view: string) => {
      const validViews: View[] = [
        'home',
        'study',
        'fitness',
        'habits',
        'goals',
        'tasks',
        'calendar',
        'analytics',
        'reports',
        'settings',
      ];

      if (
        validViews.includes(
          view as View,
        )
      ) {
        setActiveView(view as View);
      }

      setSidebarOpen(false);
    },
    [],
  );

  const openQuickLog = (
    type:
      | 'study'
      | 'run'
      | 'workout'
      | 'water'
      | 'meal',
  ) => {
    setQuickLogType(type);
    setQuickLogOpen(true);
  };

  const handleOnboardingComplete =
    async () => {
      setShowOnboarding(false);
      await refreshAll();
    };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center">
            <LayoutDashboard
              className="text-white dark:text-slate-900"
              size={20}
            />
          </div>

          <div className="text-sm text-slate-500 dark:text-slate-400">
            Loading LifeOS...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center mb-6">
              <LayoutDashboard
                className="text-white dark:text-slate-900"
                size={26}
              />
            </div>

            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              LifeOS
            </h1>

            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Your personal operating system
              for study, fitness, habits and
              everyday life.
            </p>

            <div className="mt-7">
              <button
                onClick={() => {
                  void (async () => {
                    try {
                      const { error } =
                        await supabase.auth.signInWithOAuth(
                          {
                            provider: 'google',
                            options: {
                              redirectTo:
                                window.location
                                  .origin,
                            },
                          },
                        );

                      if (error) {
                        console.error(
                          'Google login error:',
                          error,
                        );
                      }
                    } catch (error) {
                      console.error(
                        'Google login error:',
                        error,
                      );
                    }
                  })();
                }}
                className="w-full h-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold flex items-center justify-center gap-3 hover:opacity-90 transition"
              >
                Continue with Google
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Preparing your workspace...
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingView
        initialName={
          profile?.name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          ''
        }
        initialAvatar={
          profile?.avatar_url ??
          user.user_metadata?.avatar_url ??
          user.user_metadata?.picture ??
          null
        }
        onComplete={
          handleOnboardingComplete
        }
      />
    );
  }

  const currentName =
    profile?.name?.trim() ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    'there';

  const firstName =
    currentName.split(/\s+/)[0] ||
    'there';

  const studyProgress = progressPercent(
    dashboard.studySeconds / 60,
    profile?.daily_study_target ?? 120,
  );

  const runProgress = progressPercent(
    dashboard.runDistance,
    profile?.daily_run_target ?? 5,
  );

  const waterProgress = progressPercent(
    dashboard.water,
    profile?.daily_water_target ?? 3000,
  );

  const proteinProgress = progressPercent(
    dashboard.protein,
    profile?.daily_protein_target ?? 140,
  );

  const calorieProgress = progressPercent(
    dashboard.calories,
    profile?.daily_calorie_target ?? 2500,
  );

  const taskProgress =
    dashboard.tasksTotal > 0
      ? Math.round(
          (dashboard.tasksCompleted /
            dashboard.tasksTotal) *
            100,
        )
      : 0;

  const goalProgress =
    dashboard.goalsTotal > 0
      ? Math.round(
          (dashboard.goalsCompleted /
            dashboard.goalsTotal) *
            100,
        )
      : 0;

  const renderHome = () => (
    <div className="space-y-6">
      <section className="rounded-3xl bg-slate-900 dark:bg-slate-800 text-white p-6 md:p-8 overflow-hidden relative">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <span>
              {getGreeting()}
            </span>
            <span>•</span>
            <span>
              {new Date().toLocaleDateString(
                'en-IN',
                {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                },
              )}
            </span>
          </div>

          <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
            Hey, {firstName}
          </h1>

          <p className="mt-2 text-slate-300 max-w-xl">
            Keep your momentum going. Here's
            how your day is shaping up.
          </p>

          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
              <div className="text-xs text-slate-300">
                Study
              </div>
              <div className="mt-1 text-xl font-bold">
                {formatDuration(
                  dashboard.studySeconds,
                )}
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{
                    width: `${studyProgress}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
              <div className="text-xs text-slate-300">
                Running
              </div>
              <div className="mt-1 text-xl font-bold">
                {dashboard.runDistance.toFixed(
                  1,
                )}{' '}
                km
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{
                    width: `${runProgress}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
              <div className="text-xs text-slate-300">
                Workout
              </div>
              <div className="mt-1 text-xl font-bold">
                {dashboard.workoutMinutes} min
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {dashboard.latestWorkout?.name ||
                  'No workout logged yet'}
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
              <div className="text-xs text-slate-300">
                Tasks
              </div>
              <div className="mt-1 text-xl font-bold">
                {dashboard.tasksCompleted}/
                {dashboard.tasksTotal}
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{
                    width: `${taskProgress}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="absolute -right-20 -bottom-20 w-72 h-72 rounded-full border border-white/10" />
        <div className="absolute -right-10 -bottom-10 w-52 h-52 rounded-full border border-white/10" />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Quick actions
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Log something in seconds
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <button
            onClick={() =>
              openQuickLog('study')
            }
            className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-4 text-left hover:-translate-y-0.5 transition"
          >
            <BookOpen
              className="text-blue-600 dark:text-blue-400"
              size={22}
            />
            <div className="mt-3 font-semibold text-slate-900 dark:text-white">
              Study
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Log session
            </div>
          </button>

          <button
            onClick={() =>
              openQuickLog('run')
            }
            className="rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 p-4 text-left hover:-translate-y-0.5 transition"
          >
            <Footprints
              className="text-orange-600 dark:text-orange-400"
              size={22}
            />
            <div className="mt-3 font-semibold text-slate-900 dark:text-white">
              Run
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Log run
            </div>
          </button>

          <button
            onClick={() =>
              openQuickLog('workout')
            }
            className="rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 p-4 text-left hover:-translate-y-0.5 transition"
          >
            <Dumbbell
              className="text-purple-600 dark:text-purple-400"
              size={22}
            />
            <div className="mt-3 font-semibold text-slate-900 dark:text-white">
              Workout
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Log workout
            </div>
          </button>

          <button
            onClick={() =>
              openQuickLog('water')
            }
            className="rounded-2xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/50 p-4 text-left hover:-translate-y-0.5 transition"
          >
            <Droplets
              className="text-cyan-600 dark:text-cyan-400"
              size={22}
            />
            <div className="mt-3 font-semibold text-slate-900 dark:text-white">
              Water
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Add water
            </div>
          </button>

          <button
            onClick={() =>
              openQuickLog('meal')
            }
            className="rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/50 p-4 text-left hover:-translate-y-0.5 transition"
          >
            <Utensils
              className="text-green-600 dark:text-green-400"
              size={22}
            />
            <div className="mt-3 font-semibold text-slate-900 dark:text-white">
              Meal
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Add meal
            </div>
          </button>
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                Daily progress
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Your targets for today
              </p>
            </div>

            <button
              onClick={() =>
                navigate('analytics')
              }
              className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
            >
              Analytics
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            <ProgressCard
              icon={<BookOpen size={18} />}
              title="Study"
              value={formatDuration(
                dashboard.studySeconds,
              )}
              target={`${profile?.daily_study_target ?? 120} min`}
              progress={studyProgress}
            />

            <ProgressCard
              icon={<Footprints size={18} />}
              title="Running"
              value={`${dashboard.runDistance.toFixed(
                1,
              )} km`}
              target={`${profile?.daily_run_target ?? 5} km`}
              progress={runProgress}
            />

            <ProgressCard
              icon={<Droplets size={18} />}
              title="Water"
              value={`${formatNumber(
                dashboard.water,
              )} ml`}
              target={`${formatNumber(
                profile?.daily_water_target ?? 3000,
              )} ml`}
              progress={waterProgress}
            />

            <ProgressCard
              icon={<Flame size={18} />}
              title="Calories"
              value={`${formatNumber(
                dashboard.calories,
              )} kcal`}
              target={`${formatNumber(
                profile?.daily_calorie_target ?? 2500,
              )} kcal`}
              progress={calorieProgress}
            />

            <ProgressCard
              icon={<Activity size={18} />}
              title="Protein"
              value={`${dashboard.protein.toFixed(
                0,
              )} g`}
              target={`${profile?.daily_protein_target ?? 140} g`}
              progress={proteinProgress}
            />

            <ProgressCard
              icon={<CheckSquare size={18} />}
              title="Tasks"
              value={`${dashboard.tasksCompleted}`}
              target={`${dashboard.tasksTotal} total`}
              progress={taskProgress}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                Habits
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Today's consistency
              </p>
            </div>

            <button
              onClick={() =>
                navigate('habits')
              }
              className="text-sm font-medium text-slate-600 dark:text-slate-300"
            >
              View
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center">
            <div className="relative w-36 h-36">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(#0f172a ${
                    dashboard.habitsTotal
                      ? Math.round(
                          (dashboard.habitsCompleted /
                            dashboard.habitsTotal) *
                            100,
                        )
                      : 0
                  }%, #e2e8f0 0)`,
                }}
              />

              <div className="absolute inset-3 rounded-full bg-white dark:bg-slate-900 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {dashboard.habitsCompleted}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  of {dashboard.habitsTotal}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 text-center">
            <div className="font-semibold text-slate-900 dark:text-white">
              {dashboard.habitsTotal > 0
                ? dashboard.habitsCompleted ===
                  dashboard.habitsTotal
                  ? 'All habits done'
                  : 'Keep going'
                : 'Create your first habit'}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Small actions build consistency.
            </p>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                Goals
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Overall completion
              </p>
            </div>

            <Target
              size={20}
              className="text-yellow-500"
            />
          </div>

          <div className="mt-5">
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {goalProgress}%
              </div>

              <div className="text-sm text-slate-500 dark:text-slate-400">
                {dashboard.goalsCompleted}/
                {dashboard.goalsTotal}
              </div>
            </div>

            <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-yellow-500"
                style={{
                  width: `${goalProgress}%`,
                }}
              />
            </div>

            <button
              onClick={() =>
                navigate('goals')
              }
              className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
            >
              Manage goals
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                Latest workout
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Today's training
              </p>
            </div>

            <Dumbbell
              size={20}
              className="text-purple-500"
            />
          </div>

          {dashboard.latestWorkout ? (
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 p-4">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {dashboard.latestWorkout.name}
                </div>

                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {formatDuration(
                    dashboard.latestWorkout
                      .duration_seconds,
                  )}
                </div>
              </div>

              <button
                onClick={() =>
                  navigate('fitness')
                }
                className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() =>
                openQuickLog('workout')
              }
              className="mt-5 w-full rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Plus
                size={20}
                className="mx-auto text-slate-400"
              />

              <div className="mt-2 font-medium text-slate-700 dark:text-slate-300">
                Log your first workout
              </div>
            </button>
          )}
        </div>
      </section>
    </div>
  );

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return renderHome();

      case 'study':
        return <StudyView />;

      case 'fitness':
        return <FitnessView />;

      case 'habits':
        return <HabitsView />;

      case 'goals':
        return <GoalsView />;

      case 'tasks':
        return <TasksView />;

      case 'calendar':
        return <CalendarView />;

      case 'analytics':
        return <AnalyticsView />;

      case 'reports':
        return <ReportsView />;

      case 'settings':
        return <SettingsView />;

      default:
        return renderHome();
    }
  };

  const currentTitle =
    navItems.find(
      (item) => item.id === activeView,
    )?.label ?? 'Home';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 ${
          sidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="h-full flex flex-col">
          <div className="h-20 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() =>
                navigate('home')
              }
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center">
                <LayoutDashboard
                  size={19}
                  className="text-white dark:text-slate-900"
                />
              </div>

              <div className="text-left">
                <div className="font-bold tracking-tight">
                  LifeOS
                </div>

                <div className="text-[11px] text-slate-400">
                  Personal OS
                </div>
              </div>
            </button>

            <button
              onClick={() =>
                setSidebarOpen(false)
              }
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active =
                  activeView === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() =>
                      navigate(item.id)
                    }
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    <span>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
              <button
                onClick={() =>
                  setSearchOpen(true)
                }
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Search size={18} />
                <span>Search</span>

                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  ⌘K
                </span>
              </button>

              <button
                onClick={() =>
                  navigate('settings')
                }
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  activeView === 'settings'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Settings size={18} />
                <span>Settings</span>
              </button>
            </div>
          </div>

          <div className="p-3 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() =>
                navigate('settings')
              }
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-semibold text-sm">
                  {firstName[0]?.toUpperCase()}
                </div>
              )}

              <div className="min-w-0 text-left">
                <div className="text-sm font-semibold truncate">
                  {currentName}
                </div>

                <div className="text-xs text-slate-400 truncate">
                  {user.email}
                </div>
              </div>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() =>
            setSidebarOpen(false)
          }
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      <div className="lg:pl-64 min-h-screen">
        <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="h-full px-4 md:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setSidebarOpen(true)
                }
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Menu size={20} />
              </button>

              <div>
                <h1 className="font-bold text-lg">
                  {currentTitle}
                </h1>

                <div className="hidden sm:block text-xs text-slate-400">
                  {new Date().toLocaleDateString(
                    'en-IN',
                    {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    },
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setSearchOpen(true)
                }
                className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Search"
              >
                <Search size={18} />
              </button>

              <button
                onClick={() =>
                  openQuickLog('study')
                }
                className="hidden sm:flex h-10 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 items-center gap-2 text-sm font-semibold"
              >
                <Plus size={17} />
                Quick log
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 md:px-6 py-6 pb-24 lg:pb-8 max-w-[1600px] mx-auto">
          {renderView()}
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800">
        <div className="h-16 px-3 flex items-center justify-around">
          <MobileNavButton
            active={activeView === 'home'}
            icon={<Home size={19} />}
            label="Home"
            onClick={() =>
              navigate('home')
            }
          />

          <MobileNavButton
            active={activeView === 'study'}
            icon={<BookOpen size={19} />}
            label="Study"
            onClick={() =>
              navigate('study')
            }
          />

          <button
            onClick={() =>
              openQuickLog('study')
            }
            className="w-12 h-12 -mt-6 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-lg border-4 border-slate-50 dark:border-slate-950"
          >
            <Plus size={22} />
          </button>

          <MobileNavButton
            active={
              activeView === 'fitness'
            }
            icon={<Activity size={19} />}
            label="Activity"
            onClick={() =>
              navigate('fitness')
            }
          />

          <MobileNavButton
            active={
              activeView === 'habits'
            }
            icon={<Trophy size={19} />}
            label="Habits"
            onClick={() =>
              navigate('habits')
            }
          />
        </div>
      </nav>

      <SearchModal
        isOpen={searchOpen}
        onClose={() =>
          setSearchOpen(false)
        }
        onNavigate={(section) => {
          setSearchOpen(false);
          navigate(section);
        }}
      />

      <QuickLogModal
        isOpen={quickLogOpen}
        onClose={() =>
          setQuickLogOpen(false)
        }
        initialType={quickLogType}
      />
    </div>
  );
}

function ProgressCard({
  icon,
  title,
  value,
  target,
  progress,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  target: string;
  progress: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <span className="text-slate-500 dark:text-slate-400">
            {icon}
          </span>
          {title}
        </div>

        <span className="text-xs text-slate-400">
          {progress}%
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="font-bold text-slate-900 dark:text-white">
          {value}
        </div>

        <div className="text-xs text-slate-400">
          / {target}
        </div>
      </div>

      <div className="mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-slate-900 dark:bg-white transition-all"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>
    </div>
  );
}

function MobileNavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-16 flex flex-col items-center gap-1 ${
        active
          ? 'text-slate-900 dark:text-white'
          : 'text-slate-400'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">
        {label}
      </span>
    </button>
  );
}

export default App;