import { useState, type ReactNode } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Dumbbell,
  Droplets,
  Flag,
  Target,
  User,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type OnboardingViewProps = {
  initialName?: string;
  initialAvatar?: string | null;
  onComplete: () => void;
};

type TargetInputProps = {
  icon: ReactNode;
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

type SummaryCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

export default function OnboardingView({
  initialName = '',
  initialAvatar = null,
  onComplete,
}: OnboardingViewProps) {
  const { user } = useAuth();

  const [step, setStep] = useState(1);

  const [name, setName] = useState(
    initialName ||
      user?.user_metadata?.full_name ||
      ''
  );

  const [studyTarget, setStudyTarget] = useState(120);
  const [waterTarget, setWaterTarget] = useState(3000);
  const [runTarget, setRunTarget] = useState(5);
  const [proteinTarget, setProteinTarget] = useState(140);
  const [calorieTarget, setCalorieTarget] = useState(2500);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function finishOnboarding() {
    if (!user) return;

    setSaving(true);
    setError('');

    const finalName =
      name.trim() ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'User';

    const avatar =
      initialAvatar ||
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null;

    const { error: saveError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          name: finalName,
          avatar_url: avatar,
          daily_study_target: studyTarget,
          daily_water_target: waterTarget,
          daily_run_target: runTarget,
          daily_protein_target: proteinTarget,
          daily_calorie_target: calorieTarget,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
        }
      );

    if (saveError) {
      console.error('Onboarding save error:', saveError);
      setError('Could not save your setup. Please try again.');
      setSaving(false);
      return;
    }

    setSaving(false);
    onComplete();
  }

  function nextStep() {
    setError('');

    if (step < 3) {
      setStep((current) => current + 1);
    } else {
      finishOnboarding();
    }
  }

  function backStep() {
    setError('');

    if (step > 1) {
      setStep((current) => current - 1);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-gray-50 dark:bg-[#0b0b0b]">
      <div className="flex min-h-screen items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white shadow-lg shadow-blue-600/20">
              L
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Welcome to LifeOS
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Let&apos;s set up your personal productivity system.
            </p>
          </div>

          <div className="mb-6 flex items-center justify-center gap-2">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className={`h-1.5 rounded-full transition-all ${
                  item === step
                    ? 'w-12 bg-blue-600'
                    : item < step
                      ? 'w-8 bg-blue-400'
                      : 'w-8 bg-gray-200 dark:bg-white/10'
                }`}
              />
            ))}
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03] md:p-8">
            {step === 1 && (
              <div>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10">
                  <User size={25} />
                </div>

                <div className="mt-5 text-center">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Let&apos;s start with you
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    Tell LifeOS what you&apos;d like to be called.
                  </p>
                </div>

                <div className="mt-8">
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Your name
                  </label>

                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter your name"
                    autoFocus
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                  />
                </div>

                {user?.email && (
                  <div className="mt-4 rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
                    <p className="text-xs text-gray-400">
                      Signed in as
                    </p>

                    <p className="mt-1 truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                      {user.email}
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10">
                  <Target size={25} />
                </div>

                <div className="mt-5 text-center">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Set your daily targets
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    You can change these anytime from Settings.
                  </p>
                </div>

                <div className="mt-8 space-y-4">
                  <TargetInput
                    icon={<BookOpen size={18} />}
                    label="Study"
                    value={studyTarget}
                    suffix="min/day"
                    min={15}
                    max={1440}
                    step={15}
                    onChange={setStudyTarget}
                  />

                  <TargetInput
                    icon={<Droplets size={18} />}
                    label="Water"
                    value={waterTarget}
                    suffix="ml/day"
                    min={500}
                    max={10000}
                    step={250}
                    onChange={setWaterTarget}
                  />

                  <TargetInput
                    icon={<Flag size={18} />}
                    label="Running"
                    value={runTarget}
                    suffix="km/day"
                    min={1}
                    max={100}
                    step={0.5}
                    onChange={setRunTarget}
                  />

                  <TargetInput
                    icon={<Dumbbell size={18} />}
                    label="Protein"
                    value={proteinTarget}
                    suffix="g/day"
                    min={20}
                    max={500}
                    step={5}
                    onChange={setProteinTarget}
                  />

                  <TargetInput
                    icon={<Target size={18} />}
                    label="Calories"
                    value={calorieTarget}
                    suffix="kcal/day"
                    min={500}
                    max={10000}
                    step={50}
                    onChange={setCalorieTarget}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600 dark:bg-green-500/10">
                  <Check size={25} />
                </div>

                <div className="mt-5 text-center">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    You&apos;re all set
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    Here&apos;s your initial LifeOS setup.
                  </p>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <SummaryCard
                    icon={<BookOpen size={18} />}
                    label="Study"
                    value={`${studyTarget} min/day`}
                  />

                  <SummaryCard
                    icon={<Droplets size={18} />}
                    label="Water"
                    value={`${waterTarget} ml/day`}
                  />

                  <SummaryCard
                    icon={<Flag size={18} />}
                    label="Running"
                    value={`${runTarget} km/day`}
                  />

                  <SummaryCard
                    icon={<Dumbbell size={18} />}
                    label="Protein"
                    value={`${proteinTarget} g/day`}
                  />

                  <SummaryCard
                    icon={<Target size={18} />}
                    label="Calories"
                    value={`${calorieTarget} kcal/day`}
                  />
                </div>

                <div className="mt-5 rounded-2xl bg-blue-50 p-4 dark:bg-blue-500/10">
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                    Your dashboard is ready.
                  </p>

                  <p className="mt-1 text-xs leading-5 text-blue-600/80 dark:text-blue-300/70">
                    You can update these targets later from Settings.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={backStep}
                  disabled={saving}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={nextStep}
                disabled={
                  saving ||
                  (step === 1 &&
                    !name.trim() &&
                    !user?.user_metadata?.full_name)
                }
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? 'Saving...'
                  : step === 3
                    ? 'Enter LifeOS'
                    : 'Continue'}

                {!saving && <ArrowRight size={17} />}
              </button>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-gray-400">
            Your settings are securely synced with your LifeOS account.
          </p>
        </div>
      </div>
    </div>
  );
}

function TargetInput({
  icon,
  label,
  value,
  suffix,
  min,
  max,
  step,
  onChange,
}: TargetInputProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-white/[0.06]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {label}
        </p>

        <p className="text-xs text-gray-400">
          Daily target
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const nextValue = Number(event.target.value);

            onChange(
              Number.isFinite(nextValue)
                ? nextValue
                : min
            );
          }}
          className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2 text-right text-sm font-bold text-gray-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
        />

        <span className="hidden w-16 text-xs text-gray-400 sm:block">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: SummaryCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 p-4 dark:border-white/10">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-gray-400">
          {label}
        </p>

        <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}