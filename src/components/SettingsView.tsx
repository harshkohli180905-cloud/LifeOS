import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Bell,
  Check,
  ChevronRight,
  Droplets,
  Flame,
  LogOut,
  Moon,
  Save,
  Sun,
  Target,
  User,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Theme = 'light' | 'dark';

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

type NotificationType =
  | 'study'
  | 'workout'
  | 'water'
  | 'task';

type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  enabled: boolean;
  reminder_time: string | null;
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
  onboarding_completed: true,
};

const NOTIFICATION_CONFIG: Array<{
  type: NotificationType;
  title: string;
  description: string;
}> = [
  {
    type: 'study',
    title: 'Study reminders',
    description:
      'Get reminded about your planned study time.',
  },
  {
    type: 'workout',
    title: 'Workout reminders',
    description:
      'Get reminded to stay consistent with training.',
  },
  {
    type: 'water',
    title: 'Water reminders',
    description:
      'Get reminders to stay hydrated.',
  },
  {
    type: 'task',
    title: 'Task reminders',
    description:
      'Get reminders about your pending tasks.',
  },
];

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return localStorage.getItem('lifeos-theme') ===
    'dark'
    ? 'dark'
    : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle(
    'dark',
    theme === 'dark',
  );

  localStorage.setItem(
    'lifeos-theme',
    theme,
  );
}

function getInitials(
  name: string,
  email?: string | null,
) {
  const source =
    name.trim() ||
    email?.split('@')[0] ||
    'U';

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part: string) =>
        part[0]?.toUpperCase() ?? '',
    )
    .join('');
}

export default function SettingsView() {
  const { user, signOut } = useAuth();

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] =
    useState('');

  const [studyTarget, setStudyTarget] =
    useState('120');
  const [waterTarget, setWaterTarget] =
    useState('3000');
  const [runTarget, setRunTarget] =
    useState('5');
  const [proteinTarget, setProteinTarget] =
    useState('140');
  const [calorieTarget, setCalorieTarget] =
    useState('2500');

  const [theme, setTheme] =
    useState<Theme>(getStoredTheme());

  const [notifications, setNotifications] =
    useState<
      Record<
        NotificationType,
        NotificationRow | null
      >
    >({
      study: null,
      workout: null,
      water: null,
      task: null,
    });

  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [savingNotification, setSavingNotification] =
    useState<NotificationType | null>(null);

  const [message, setMessage] =
    useState('');

  const [errorMessage, setErrorMessage] =
    useState('');

  const loadProfile = useCallback(
    async () => {
      if (!user) return;

      const { data, error } =
        await supabase
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
        console.error(
          'Settings profile error:',
          error,
        );
        setErrorMessage(
          'Could not load your profile.',
        );
        return;
      }

      if (!data) {
        const metadata =
          user.user_metadata ?? {};

        const fallback: Profile = {
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
          ...DEFAULT_PROFILE,
        };

        setProfile(fallback);
        setName(fallback.name);
        setAvatarUrl(
          fallback.avatar_url ?? '',
        );
        setStudyTarget(
          String(
            fallback.daily_study_target,
          ),
        );
        setWaterTarget(
          String(
            fallback.daily_water_target,
          ),
        );
        setRunTarget(
          String(fallback.daily_run_target),
        );
        setProteinTarget(
          String(
            fallback.daily_protein_target,
          ),
        );
        setCalorieTarget(
          String(
            fallback.daily_calorie_target,
          ),
        );

        return;
      }

      const normalized: Profile = {
        id: data.id,
        name: data.name ?? '',
        avatar_url:
          data.avatar_url ?? null,
        focus_areas:
          data.focus_areas ?? [],
        daily_study_target:
          Number(
            data.daily_study_target ??
              DEFAULT_PROFILE.daily_study_target,
          ),
        daily_water_target:
          Number(
            data.daily_water_target ??
              DEFAULT_PROFILE.daily_water_target,
          ),
        daily_run_target:
          Number(
            data.daily_run_target ??
              DEFAULT_PROFILE.daily_run_target,
          ),
        daily_protein_target:
          Number(
            data.daily_protein_target ??
              DEFAULT_PROFILE.daily_protein_target,
          ),
        daily_calorie_target:
          Number(
            data.daily_calorie_target ??
              DEFAULT_PROFILE.daily_calorie_target,
          ),
        onboarding_completed:
          Boolean(
            data.onboarding_completed,
          ),
      };

      setProfile(normalized);
      setName(normalized.name);
      setAvatarUrl(
        normalized.avatar_url ?? '',
      );
      setStudyTarget(
        String(
          normalized.daily_study_target,
        ),
      );
      setWaterTarget(
        String(
          normalized.daily_water_target,
        ),
      );
      setRunTarget(
        String(normalized.daily_run_target),
      );
      setProteinTarget(
        String(
          normalized.daily_protein_target,
        ),
      );
      setCalorieTarget(
        String(
          normalized.daily_calorie_target,
        ),
      );
    },
    [user],
  );

  const loadNotifications =
    useCallback(async () => {
      if (!user) return;

      const { data, error } =
        await supabase
          .from('notifications')
          .select(
            'id,user_id,type,title,enabled,reminder_time',
          )
          .eq('user_id', user.id);

      if (error) {
        console.error(
          'Notification load error:',
          error,
        );
        return;
      }

      const next: Record<
        NotificationType,
        NotificationRow | null
      > = {
        study: null,
        workout: null,
        water: null,
        task: null,
      };

      (data ?? []).forEach(
        (row: NotificationRow) => {
          if (
            row.type in next
          ) {
            next[row.type] = row;
          }
        },
      );

      setNotifications(next);
    }, [user]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);

      await Promise.all([
        loadProfile(),
        loadNotifications(),
      ]);

      if (!cancelled) {
        setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    loadProfile,
    loadNotifications,
  ]);

  const initials = useMemo(
    () =>
      getInitials(
        name,
        user?.email,
      ),
    [name, user?.email],
  );

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);
    setMessage('');
    setErrorMessage('');

    const parsedStudy = Number(
      studyTarget,
    );
    const parsedWater = Number(
      waterTarget,
    );
    const parsedRun = Number(runTarget);
    const parsedProtein = Number(
      proteinTarget,
    );
    const parsedCalories = Number(
      calorieTarget,
    );

    if (
      !Number.isFinite(parsedStudy) ||
      parsedStudy <= 0 ||
      !Number.isFinite(parsedWater) ||
      parsedWater <= 0 ||
      !Number.isFinite(parsedRun) ||
      parsedRun <= 0 ||
      !Number.isFinite(parsedProtein) ||
      parsedProtein <= 0 ||
      !Number.isFinite(parsedCalories) ||
      parsedCalories <= 0
    ) {
      setErrorMessage(
        'Please enter valid positive target values.',
      );
      setSaving(false);
      return;
    }

    const payload = {
      id: user.id,
      name: name.trim(),
      avatar_url:
        avatarUrl.trim() || null,
      daily_study_target:
        parsedStudy,
      daily_water_target:
        parsedWater,
      daily_run_target:
        parsedRun,
      daily_protein_target:
        parsedProtein,
      daily_calorie_target:
        parsedCalories,
      onboarding_completed:
        profile?.onboarding_completed ??
        true,
      updated_at:
        new Date().toISOString(),
    };

    const { data, error } =
      await supabase
        .from('profiles')
        .upsert(payload)
        .select()
        .single();

    if (error) {
      console.error(
        'Profile save error:',
        error,
      );
      setErrorMessage(
        error.message ||
          'Could not save your settings.',
      );
      setSaving(false);
      return;
    }

    if (data) {
      setProfile({
        id: data.id,
        name: data.name ?? '',
        avatar_url:
          data.avatar_url ?? null,
        focus_areas:
          data.focus_areas ?? [],
        daily_study_target:
          Number(
            data.daily_study_target ??
              parsedStudy,
          ),
        daily_water_target:
          Number(
            data.daily_water_target ??
              parsedWater,
          ),
        daily_run_target:
          Number(
            data.daily_run_target ??
              parsedRun,
          ),
        daily_protein_target:
          Number(
            data.daily_protein_target ??
              parsedProtein,
          ),
        daily_calorie_target:
          Number(
            data.daily_calorie_target ??
              parsedCalories,
          ),
        onboarding_completed:
          Boolean(
            data.onboarding_completed,
          ),
      });
    }

    setMessage(
      'Your settings have been saved.',
    );
    setSaving(false);

    window.setTimeout(() => {
      setMessage('');
    }, 3000);
  };

  const toggleNotification = async (
    type: NotificationType,
  ) => {
    if (!user) return;

    const existing =
      notifications[type];

    const nextEnabled =
      existing
        ? !existing.enabled
        : true;

    setSavingNotification(type);
    setErrorMessage('');

    if (existing) {
      const { data, error } =
        await supabase
          .from('notifications')
          .update({
            enabled: nextEnabled,
            updated_at:
              new Date().toISOString(),
          })
          .eq('id', existing.id)
          .eq('user_id', user.id)
          .select(
            'id,user_id,type,title,enabled,reminder_time',
          )
          .single();

      if (error) {
        console.error(
          'Notification update error:',
          error,
        );
        setErrorMessage(
          'Could not update notification.',
        );
        setSavingNotification(null);
        return;
      }

      setNotifications(
        (previous) => ({
          ...previous,
          [type]: data as NotificationRow,
        }),
      );
    } else {
      const config =
        NOTIFICATION_CONFIG.find(
          (item) =>
            item.type === type,
        );

      const { data, error } =
        await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            type,
            title:
              config?.title ??
              'LifeOS reminder',
            enabled: true,
            reminder_time: null,
          })
          .select(
            'id,user_id,type,title,enabled,reminder_time',
          )
          .single();

      if (error) {
        console.error(
          'Notification create error:',
          error,
        );
        setErrorMessage(
          'Could not enable notification.',
        );
        setSavingNotification(null);
        return;
      }

      setNotifications(
        (previous) => ({
          ...previous,
          [type]:
            data as NotificationRow,
        }),
      );
    }

    setSavingNotification(null);
  };

  const handleThemeChange = (
    nextTheme: Theme,
  ) => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error(
        'Sign out error:',
        error,
      );
      setErrorMessage(
        'Could not sign out. Please try again.',
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          Settings
        </h1>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your profile, daily targets,
          appearance and reminders.
        </p>
      </div>

      {message && (
        <div className="rounded-2xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30 px-4 py-3 flex items-center gap-3 text-sm text-green-700 dark:text-green-300">
          <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
            <Check size={15} />
          </div>

          {message}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <User size={19} />
            </div>

            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                Profile
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your LifeOS identity
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {avatarUrl.trim() ? (
              <img
                src={avatarUrl}
                alt=""
                className="w-20 h-20 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                onError={(
                  event,
                ) => {
                  event.currentTarget.style.display =
                    'none';
                }}
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-2xl font-bold">
                {initials}
              </div>
            )}

            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Name
              </label>

              <input
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value,
                  )
                }
                placeholder="Your name"
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-700"
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Avatar URL
            </label>

            <input
              value={avatarUrl}
              onChange={(event) =>
                setAvatarUrl(
                  event.target.value,
                )
              }
              placeholder="https://..."
              className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-700"
            />

            <p className="mt-2 text-xs text-slate-400">
              Optional. Your Google profile
              picture is used automatically when
              available.
            </p>
          </div>

          <div className="mt-5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Email
            </label>

            <div className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 flex items-center text-sm text-slate-500 dark:text-slate-400">
              {user?.email ??
                'No email available'}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
              <Target size={19} />
            </div>

            <div>
              <h2 className="font-bold">
                Daily targets
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                These targets power your dashboard
                and analytics.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-6 grid sm:grid-cols-2 gap-4">
          <TargetInput
            label="Study"
            value={studyTarget}
            onChange={setStudyTarget}
            suffix="min/day"
            icon={<User size={17} />}
          />

          <TargetInput
            label="Running"
            value={runTarget}
            onChange={setRunTarget}
            suffix="km/day"
            icon={<Target size={17} />}
          />

          <TargetInput
            label="Water"
            value={waterTarget}
            onChange={setWaterTarget}
            suffix="ml/day"
            icon={<Droplets size={17} />}
          />

          <TargetInput
            label="Protein"
            value={proteinTarget}
            onChange={setProteinTarget}
            suffix="g/day"
            icon={<Flame size={17} />}
          />

          <TargetInput
            label="Calories"
            value={calorieTarget}
            onChange={setCalorieTarget}
            suffix="kcal/day"
            icon={<Flame size={17} />}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              {theme === 'dark' ? (
                <Moon size={19} />
              ) : (
                <Sun size={19} />
              )}
            </div>

            <div>
              <h2 className="font-bold">
                Appearance
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose how LifeOS looks.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-6 grid grid-cols-2 gap-3">
          <button
            onClick={() =>
              handleThemeChange('light')
            }
            className={`rounded-2xl border p-4 text-left transition ${
              theme === 'light'
                ? 'border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <Sun size={20} />

            <div className="mt-3 font-semibold">
              Light
            </div>

            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Clean and bright
            </div>
          </button>

          <button
            onClick={() =>
              handleThemeChange('dark')
            }
            className={`rounded-2xl border p-4 text-left transition ${
              theme === 'dark'
                ? 'border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <Moon size={20} />

            <div className="mt-3 font-semibold">
              Dark
            </div>

            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Easy on the eyes
            </div>
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Bell size={19} />
            </div>

            <div>
              <h2 className="font-bold">
                Notifications
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage your existing LifeOS
                reminders.
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {NOTIFICATION_CONFIG.map(
            (item) => {
              const current =
                notifications[item.type];

              const enabled =
                current?.enabled ?? false;

              const updating =
                savingNotification ===
                item.type;

              return (
                <div
                  key={item.type}
                  className="p-5 md:p-6 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="font-semibold">
                      {item.title}
                    </div>

                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {item.description}
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      void toggleNotification(
                        item.type,
                      )
                    }
                    disabled={updating}
                    className={`relative shrink-0 w-12 h-7 rounded-full transition ${
                      enabled
                        ? 'bg-slate-900 dark:bg-white'
                        : 'bg-slate-200 dark:bg-slate-700'
                    } ${
                      updating
                        ? 'opacity-50'
                        : ''
                    }`}
                    aria-label={`Toggle ${item.title}`}
                  >
                    <span
                      className={`absolute top-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 transition ${
                        enabled
                          ? 'left-6'
                          : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              );
            },
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-5 md:p-6">
          <button
            onClick={() =>
              void saveProfile()
            }
            disabled={saving}
            className="w-full h-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? (
              <span>
                Saving...
              </span>
            ) : (
              <>
                <Save size={18} />
                Save changes
              </>
            )}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-900 overflow-hidden">
        <button
          onClick={() =>
            void handleSignOut()
          }
          className="w-full p-5 md:p-6 flex items-center justify-between gap-4 text-left hover:bg-red-50 dark:hover:bg-red-950/20 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center">
              <LogOut size={18} />
            </div>

            <div>
              <div className="font-semibold text-red-600 dark:text-red-400">
                Sign out
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                Sign out of your LifeOS account.
              </div>
            </div>
          </div>

          <ChevronRight
            size={18}
            className="text-slate-400"
          />
        </button>
      </section>
    </div>
  );
}

function TargetInput({
  label,
  value,
  onChange,
  suffix,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        <span className="flex items-center gap-2">
          <span className="text-slate-400">
            {icon}
          </span>
          {label}
        </span>
      </label>

      <div className="relative">
        <input
          type="number"
          min="0"
          step="any"
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 pr-20 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-700"
        />

        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
          {suffix}
        </span>
      </div>
    </div>
  );
}