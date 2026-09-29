import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Droplets,
  Flame,
  Footprints,
  Loader2,
  Target,
  Trophy,
  User,
  Utensils,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type OnboardingViewProps = {
  initialName?: string;
  initialAvatar?: string | null;
  onComplete: () => void;
};

type Step = 1 | 2 | 3;

type TargetValues = {
  study: string;
  water: string;
  run: string;
  protein: string;
  calories: string;
};

const DEFAULT_TARGETS: TargetValues = {
  study: '2',
  water: '3',
  run: '5',
  protein: '140',
  calories: '2500',
};

function getStoredTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = localStorage.getItem('lifeos-theme');

  if (stored === 'dark') {
    return 'dark';
  }

  if (stored === 'light') {
    return 'light';
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function sanitizeNumber(value: string) {
  if (value === '') {
    return '';
  }

  return value.replace(/[^\d.]/g, '');
}

function positiveNumber(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function formatNumber(value: number, decimals = 1) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(decimals).replace(/\.?0+$/, '');
}

function getInitials(name: string) {
  const clean = name.trim();

  if (!clean) {
    return 'HK';
  }

  const parts = clean.split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function OnboardingView({
  initialName = '',
  initialAvatar = null,
  onComplete,
}: OnboardingViewProps) {
  const { user } = useAuth();

  const [theme] = useState<'light' | 'dark'>(
    getStoredTheme(),
  );

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar ?? '');

  const [targets, setTargets] =
    useState<TargetValues>(DEFAULT_TARGETS);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.classList.toggle(
      'dark',
      theme === 'dark',
    );

    localStorage.setItem('lifeos-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!initialName && user) {
      const metadataName =
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : typeof user.user_metadata?.name === 'string'
            ? user.user_metadata.name
            : '';

      if (metadataName) {
        setName(metadataName);
      }
    }

    if (!initialAvatar && user) {
      const metadataAvatar =
        typeof user.user_metadata?.avatar_url === 'string'
          ? user.user_metadata.avatar_url
          : typeof user.user_metadata?.picture === 'string'
            ? user.user_metadata.picture
            : '';

      if (metadataAvatar) {
        setAvatar(metadataAvatar);
      }
    }
  }, [initialAvatar, initialName, user]);

  const updateTarget = (
    key: keyof TargetValues,
    value: string,
  ) => {
    setTargets((previous) => ({
      ...previous,
      [key]: sanitizeNumber(value),
    }));
  };

  const studyHours = positiveNumber(targets.study);
  const waterLitres = positiveNumber(targets.water);
  const runKm = positiveNumber(targets.run);
  const proteinGrams = positiveNumber(targets.protein);
  const calories = positiveNumber(targets.calories);

  const progress = useMemo(() => {
    if (step === 1) return 33;
    if (step === 2) return 66;
    return 100;
  }, [step]);

  const canContinueFromStepOne =
    name.trim().length >= 2;

  const handleNext = () => {
    setError('');

    if (step === 1) {
      if (!canContinueFromStepOne) {
        setError('Please enter your name to continue.');
        return;
      }

      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setError('');

    if (step === 1) {
      return;
    }

    setStep((previous) => (previous - 1) as Step);
  };

  const handleComplete = async () => {
    if (!user) {
      setError(
        'Your account session is missing. Please sign in again.',
      );
      return;
    }

    if (!name.trim()) {
      setError('Please enter your name.');
      setStep(1);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const studyTargetMinutes = Math.round(
        studyHours * 60,
      );

      const waterTargetMl = Math.round(
        waterLitres * 1000,
      );

      const profilePayload = {
        id: user.id,
        name: name.trim(),
        avatar_url: avatar.trim() || null,
        daily_study_target: studyTargetMinutes,
        daily_water_target: waterTargetMl,
        daily_run_target: runKm,
        daily_protein_target: proteinGrams,
        daily_calorie_target: calories,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profilePayload, {
          onConflict: 'id',
        });

      if (profileError) {
        throw profileError;
      }

      localStorage.setItem(
        'lifeos-onboarding-completed',
        'true',
      );

      onComplete();
    } catch (err) {
      console.error('Onboarding save error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Could not save your profile. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="
        h-[100dvh]
        w-full
        min-w-0
        overflow-hidden
        bg-slate-50
        text-slate-900
        dark:bg-slate-950
        dark:text-white
      "
    >
      <div
        className="
          flex
          h-full
          min-h-0
          w-full
          min-w-0
          flex-col
          overflow-hidden
        "
      >
        {/* TOP BAR */}
        <header className="shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <Target size={18} />
              </div>

              <span className="text-base font-bold tracking-tight">
                LifeOS
              </span>
            </div>

            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Step {step} of 3
            </span>
          </div>

          <div className="h-1 w-full bg-slate-100 dark:bg-slate-900">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </header>

        {/* CONTENT */}
        <main
          className="
            flex
            h-0
            min-h-0
            flex-1
            w-full
            min-w-0
            items-start
            justify-center
            overflow-x-hidden
            overflow-y-auto
            overscroll-contain
            px-4
            py-8
            sm:px-6
            sm:py-12
          "
        >
          <div className="w-full max-w-2xl pb-8">
            {/* STEP 1 */}
            {step === 1 && (
              <section className="animate-in fade-in duration-300">
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                    <User size={28} />
                  </div>

                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Welcome to LifeOS
                  </h1>

                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
                    Let's personalize your workspace so everything
                    feels built around you.
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold">
                      What should we call you?
                    </span>

                    <input
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === 'Enter' &&
                          canContinueFromStepOne
                        ) {
                          handleNext();
                        }
                      }}
                      placeholder="Enter your name"
                      autoFocus
                      autoComplete="name"
                      className="
                        w-full
                        rounded-2xl
                        border
                        border-slate-200
                        bg-slate-50
                        px-4
                        py-3.5
                        text-sm
                        outline-none
                        transition
                        placeholder:text-slate-400
                        focus:border-blue-500
                        focus:bg-white
                        dark:border-slate-700
                        dark:bg-slate-800
                        dark:focus:bg-slate-800
                      "
                    />
                  </label>

                  {avatar && (
                    <div className="mt-6 flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        <img
                          src={avatar}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display =
                              'none';
                          }}
                        />
                      </div>

                      <div>
                        <p className="text-sm font-semibold">
                          Google profile detected
                        </p>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Your profile photo will be used automatically.
                        </p>
                      </div>
                    </div>
                  )}

                  {!avatar && name.trim() && (
                    <div className="mt-6 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                        {getInitials(name)}
                      </div>

                      <div>
                        <p className="text-sm font-semibold">
                          Nice to meet you, {name.trim()}.
                        </p>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          This is how your profile will look.
                        </p>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canContinueFromStepOne}
                    className="
                      mt-7
                      flex
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-2xl
                      bg-blue-600
                      px-4
                      py-3.5
                      text-sm
                      font-semibold
                      text-white
                      shadow-sm
                      transition
                      hover:bg-blue-700
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >
                    Continue
                    <ArrowRight size={17} />
                  </button>
                </div>
              </section>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <section className="animate-in fade-in duration-300">
                <div className="mb-7 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
                    <Target size={28} />
                  </div>

                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Set your daily targets
                  </h1>

                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
                    These targets will power your daily dashboard
                    and progress tracking.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <TargetCard
                    icon={<BookIcon />}
                    title="Study"
                    description="Focused study time"
                    value={targets.study}
                    unit="hours"
                    placeholder="2"
                    onChange={(value) =>
                      updateTarget('study', value)
                    }
                  />

                  <TargetCard
                    icon={<Droplets size={20} />}
                    title="Water"
                    description="Daily hydration"
                    value={targets.water}
                    unit="litres"
                    placeholder="3"
                    onChange={(value) =>
                      updateTarget('water', value)
                    }
                  />

                  <TargetCard
                    icon={<Footprints size={20} />}
                    title="Running"
                    description="Daily distance"
                    value={targets.run}
                    unit="km"
                    placeholder="5"
                    onChange={(value) =>
                      updateTarget('run', value)
                    }
                  />

                  <TargetCard
                    icon={<Utensils size={20} />}
                    title="Protein"
                    description="Daily protein"
                    value={targets.protein}
                    unit="g"
                    placeholder="140"
                    onChange={(value) =>
                      updateTarget('protein', value)
                    }
                  />

                  <TargetCard
                    icon={<Flame size={20} />}
                    title="Calories"
                    description="Daily calorie target"
                    value={targets.calories}
                    unit="kcal"
                    placeholder="2500"
                    onChange={(value) =>
                      updateTarget('calories', value)
                    }
                  />

                  <div
                    className="
                      rounded-2xl
                      border
                      border-slate-200
                      bg-white
                      p-4
                      dark:border-slate-800
                      dark:bg-slate-900
                      sm:col-span-2
                    "
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        <Trophy size={20} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          Workout
                        </p>

                        <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          Workout duration will be tracked in hours
                          throughout LifeOS.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="
                      flex
                      flex-1
                      items-center
                      justify-center
                      gap-2
                      rounded-2xl
                      border
                      border-slate-200
                      bg-white
                      px-4
                      py-3.5
                      text-sm
                      font-semibold
                      transition
                      hover:bg-slate-50
                      dark:border-slate-800
                      dark:bg-slate-900
                      dark:hover:bg-slate-800
                    "
                  >
                    <ArrowLeft size={17} />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="
                      flex
                      flex-[1.6]
                      items-center
                      justify-center
                      gap-2
                      rounded-2xl
                      bg-blue-600
                      px-4
                      py-3.5
                      text-sm
                      font-semibold
                      text-white
                      shadow-sm
                      transition
                      hover:bg-blue-700
                    "
                  >
                    Review
                    <ArrowRight size={17} />
                  </button>
                </div>
              </section>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <section className="animate-in fade-in duration-300">
                <div className="mb-7 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                    <Check size={30} strokeWidth={3} />
                  </div>

                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    You're all set, {name.trim()}!
                  </h1>

                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Here's a quick look at your LifeOS setup.
                  </p>
                </div>

                <div className="space-y-3">
                  <SummaryCard
                    icon={<User size={19} />}
                    title="Profile"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-sm font-bold text-white">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display =
                                'none';
                            }}
                          />
                        ) : (
                          getInitials(name)
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {name.trim()}
                        </p>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          LifeOS profile
                        </p>
                      </div>
                    </div>
                  </SummaryCard>

                  <SummaryCard
                    icon={<BookIcon />}
                    title="Study"
                  >
                    <SummaryValue
                      value={formatNumber(studyHours)}
                      unit="hours/day"
                    />
                  </SummaryCard>

                  <SummaryCard
                    icon={<Droplets size={19} />}
                    title="Water"
                  >
                    <SummaryValue
                      value={formatNumber(waterLitres)}
                      unit="litres/day"
                    />
                  </SummaryCard>

                  <SummaryCard
                    icon={<Footprints size={19} />}
                    title="Running"
                  >
                    <SummaryValue
                      value={formatNumber(runKm)}
                      unit="km/day"
                    />
                  </SummaryCard>

                  <SummaryCard
                    icon={<Utensils size={19} />}
                    title="Protein"
                  >
                    <SummaryValue
                      value={formatNumber(proteinGrams, 0)}
                      unit="g/day"
                    />
                  </SummaryCard>

                  <SummaryCard
                    icon={<Flame size={19} />}
                    title="Calories"
                  >
                    <SummaryValue
                      value={formatNumber(calories, 0)}
                      unit="kcal/day"
                    />
                  </SummaryCard>
                </div>

                {error && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={saving}
                    className="
                      flex
                      flex-1
                      items-center
                      justify-center
                      gap-2
                      rounded-2xl
                      border
                      border-slate-200
                      bg-white
                      px-4
                      py-3.5
                      text-sm
                      font-semibold
                      transition
                      hover:bg-slate-50
                      disabled:opacity-50
                      dark:border-slate-800
                      dark:bg-slate-900
                      dark:hover:bg-slate-800
                    "
                  >
                    <ArrowLeft size={17} />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={saving}
                    className="
                      flex
                      flex-[1.6]
                      items-center
                      justify-center
                      gap-2
                      rounded-2xl
                      bg-blue-600
                      px-4
                      py-3.5
                      text-sm
                      font-semibold
                      text-white
                      shadow-sm
                      transition
                      hover:bg-blue-700
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  >
                    {saving ? (
                      <>
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                        Setting up...
                      </>
                    ) : (
                      <>
                        Enter LifeOS
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

function BookIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 5.5C4 4.672 4.672 4 5.5 4H11V20H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M20 5.5C20 4.672 19.328 4 18.5 4H13V20h5.5a1.5 1.5 0 0 0 1.5-1.5v-13Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M11 7H8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TargetCard({
  icon,
  title,
  description,
  value,
  unit,
  placeholder,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: string;
  unit: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-4
        shadow-sm
        dark:border-slate-800
        dark:bg-slate-900
      "
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {title}
          </p>

          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={value}
          placeholder={placeholder}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="
            w-full
            rounded-xl
            border
            border-slate-200
            bg-slate-50
            px-3.5
            py-3
            pr-20
            text-base
            font-semibold
            outline-none
            transition
            placeholder:text-slate-400
            focus:border-blue-500
            focus:bg-white
            dark:border-slate-700
            dark:bg-slate-800
            dark:focus:bg-slate-800
          "
        />

        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
          {unit}
        </span>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        flex
        items-center
        gap-3
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-4
        shadow-sm
        dark:border-slate-800
        dark:bg-slate-900
      "
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {title}
        </p>

        {children}
      </div>
    </div>
  );
}

function SummaryValue({
  value,
  unit,
}: {
  value: string;
  unit: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-lg font-bold">
        {value}
      </span>

      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {unit}
      </span>
    </div>
  );
}