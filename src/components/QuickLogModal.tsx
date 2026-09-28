import { useEffect, useState } from 'react';
import {
  X,
  BookOpen,
  Footprints,
  Dumbbell,
  Droplets,
  Utensils,
  Save,
  Loader2,
  Check,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type QuickLogType =
  | 'study'
  | 'run'
  | 'workout'
  | 'water'
  | 'meal';

type QuickLogModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialType?: QuickLogType;
};

const getToday = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, '0');
  const day = String(
    now.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

function QuickLogModal({
  isOpen,
  onClose,
  initialType = 'study',
}: QuickLogModalProps) {
  const { user } = useAuth();

  const [type, setType] =
    useState<QuickLogType>(
      initialType
    );

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  /* Study */
  const [studyName, setStudyName] =
    useState('');
  const [studyMinutes, setStudyMinutes] =
    useState('');

  /* Run */
  const [runDistance, setRunDistance] =
    useState('');
  const [runMinutes, setRunMinutes] =
    useState('');
  const [runCalories, setRunCalories] =
    useState('');

  /* Workout */
  const [workoutName, setWorkoutName] =
    useState('');
  const [workoutMinutes, setWorkoutMinutes] =
    useState('');

  /* Water */
  const [waterAmount, setWaterAmount] =
    useState('250');

  /* Meal */
  const [mealType, setMealType] =
    useState('breakfast');
  const [mealName, setMealName] =
    useState('');
  const [mealCalories, setMealCalories] =
    useState('');
  const [mealProtein, setMealProtein] =
    useState('');
  const [mealCarbs, setMealCarbs] =
    useState('');
  const [mealFat, setMealFat] =
    useState('');

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setSaved(false);
    }
  }, [isOpen, initialType]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [isOpen, onClose]);

  const resetForm = () => {
    setStudyName('');
    setStudyMinutes('');

    setRunDistance('');
    setRunMinutes('');
    setRunCalories('');

    setWorkoutName('');
    setWorkoutMinutes('');

    setWaterAmount('250');

    setMealType('breakfast');
    setMealName('');
    setMealCalories('');
    setMealProtein('');
    setMealCarbs('');
    setMealFat('');
  };

  const closeModal = () => {
    if (saving) return;

    resetForm();
    setSaved(false);
    onClose();
  };

  const saveStudy = async () => {
    if (!user) return false;

    const minutes =
      Number(studyMinutes);

    if (
      !studyName.trim() ||
      !minutes ||
      minutes <= 0
    ) {
      return false;
    }

    const end = new Date();
    const start = new Date(
      end.getTime() -
        minutes * 60 * 1000
    );

    const { error } =
      await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          name: studyName.trim(),
          started_at:
            start.toISOString(),
          ended_at:
            end.toISOString(),
          duration_seconds:
            Math.round(minutes * 60),
        });

    if (error) {
      console.error(
        'Study log error:',
        error
      );
      return false;
    }

    return true;
  };

  const saveRun = async () => {
    if (!user) return false;

    const distance =
      Number(runDistance);
    const minutes =
      Number(runMinutes);
    const calories =
      Number(runCalories) || 0;

    if (
      !distance ||
      distance <= 0 ||
      !minutes ||
      minutes <= 0
    ) {
      return false;
    }

    const durationSeconds =
      Math.round(minutes * 60);

    const pace =
      distance > 0
        ? Number(
            (
              minutes / distance
            ).toFixed(2)
          )
        : null;

    const { error } =
      await supabase
        .from('runs')
        .insert({
          user_id: user.id,
          date: getToday(),
          distance_km: distance,
          duration_seconds:
            durationSeconds,
          pace,
          calories,
        });

    if (error) {
      console.error(
        'Run log error:',
        error
      );
      return false;
    }

    return true;
  };

  const saveWorkout = async () => {
    if (!user) return false;

    const minutes =
      Number(workoutMinutes);

    if (
      !workoutName.trim() ||
      !minutes ||
      minutes <= 0
    ) {
      return false;
    }

    const { error } =
      await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          name: workoutName.trim(),
          date: getToday(),
          duration_seconds:
            Math.round(minutes * 60),
        });

    if (error) {
      console.error(
        'Workout log error:',
        error
      );
      return false;
    }

    return true;
  };

  const saveWater = async () => {
    if (!user) return false;

    const amount =
      Number(waterAmount);

    if (
      !amount ||
      amount <= 0
    ) {
      return false;
    }

    const { error } =
      await supabase
        .from('water_logs')
        .insert({
          user_id: user.id,
          amount_ml: amount,
          date: getToday(),
        });

    if (error) {
      console.error(
        'Water log error:',
        error
      );
      return false;
    }

    return true;
  };

  const saveMeal = async () => {
    if (!user) return false;

    if (!mealName.trim()) {
      return false;
    }

    const { error } =
      await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          meal_type: mealType,
          name: mealName.trim(),
          calories:
            Number(mealCalories) || 0,
          protein:
            Number(mealProtein) || 0,
          carbs:
            Number(mealCarbs) || 0,
          fat:
            Number(mealFat) || 0,
          date: getToday(),
        });

    if (error) {
      console.error(
        'Meal log error:',
        error
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!user || saving) return;

    setSaving(true);
    setSaved(false);

    let success = false;

    try {
      if (type === 'study') {
        success = await saveStudy();
      }

      if (type === 'run') {
        success = await saveRun();
      }

      if (type === 'workout') {
        success =
          await saveWorkout();
      }

      if (type === 'water') {
        success = await saveWater();
      }

      if (type === 'meal') {
        success = await saveMeal();
      }

      if (success) {
        setSaved(true);

        window.setTimeout(() => {
          resetForm();
          setSaved(false);
          onClose();
        }, 700);
      } else {
        window.alert(
          'Please fill all required fields correctly.'
        );
      }
    } catch (error) {
      console.error(
        'Quick log error:',
        error
      );

      window.alert(
        'Something went wrong while saving.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const tabs = [
    {
      id: 'study' as QuickLogType,
      label: 'Study',
      icon: BookOpen,
    },
    {
      id: 'run' as QuickLogType,
      label: 'Run',
      icon: Footprints,
    },
    {
      id: 'workout' as QuickLogType,
      label: 'Workout',
      icon: Dumbbell,
    },
    {
      id: 'water' as QuickLogType,
      label: 'Water',
      icon: Droplets,
    },
    {
      id: 'meal' as QuickLogType,
      label: 'Meal',
      icon: Utensils,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          closeModal();
        }
      }}
    >
      <div className="max-h-[92vh] w-full max-w-xl overflow-hidden rounded-t-3xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#151515] sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Quick Log
            </h2>

            <p className="mt-0.5 text-xs text-gray-500">
              Add an activity to your day.
            </p>
          </div>

          <button
            onClick={closeModal}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto border-b border-gray-100 px-3 py-3 dark:border-white/10">
          <div className="flex min-w-max gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active =
                type === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() =>
                    setType(tab.id)
                  }
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <div className="max-h-[65vh] overflow-y-auto p-5">
          {type === 'study' && (
            <StudyForm
              name={studyName}
              minutes={studyMinutes}
              setName={setStudyName}
              setMinutes={
                setStudyMinutes
              }
            />
          )}

          {type === 'run' && (
            <RunForm
              distance={runDistance}
              minutes={runMinutes}
              calories={runCalories}
              setDistance={
                setRunDistance
              }
              setMinutes={
                setRunMinutes
              }
              setCalories={
                setRunCalories
              }
            />
          )}

          {type === 'workout' && (
            <WorkoutForm
              name={workoutName}
              minutes={workoutMinutes}
              setName={
                setWorkoutName
              }
              setMinutes={
                setWorkoutMinutes
              }
            />
          )}

          {type === 'water' && (
            <WaterForm
              amount={waterAmount}
              setAmount={
                setWaterAmount
              }
            />
          )}

          {type === 'meal' && (
            <MealForm
              mealType={mealType}
              name={mealName}
              calories={mealCalories}
              protein={mealProtein}
              carbs={mealCarbs}
              fat={mealFat}
              setMealType={
                setMealType
              }
              setName={
                setMealName
              }
              setCalories={
                setMealCalories
              }
              setProtein={
                setMealProtein
              }
              setCarbs={
                setMealCarbs
              }
              setFat={setMealFat}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50/80 p-4 dark:border-white/10 dark:bg-white/[0.02]">
          <button
            onClick={handleSave}
            disabled={
              saving || saved
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {saving ? (
              <>
                <Loader2
                  size={17}
                  className="animate-spin"
                />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check size={17} />
                Saved
              </>
            ) : (
              <>
                <Save size={17} />
                Save log
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Study ---------------- */

function StudyForm({
  name,
  minutes,
  setName,
  setMinutes,
}: {
  name: string;
  minutes: string;
  setName: (value: string) => void;
  setMinutes: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <FormIntro
        icon={<BookOpen size={21} />}
        title="Log study time"
        description="Record a completed study session."
        iconClass="bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
      />

      <Input
        label="Session name"
        value={name}
        onChange={setName}
        placeholder="e.g. Microeconomics revision"
      />

      <Input
        label="Duration"
        value={minutes}
        onChange={setMinutes}
        placeholder="e.g. 60"
        type="number"
        suffix="minutes"
      />
    </div>
  );
}

/* ---------------- Run ---------------- */

function RunForm({
  distance,
  minutes,
  calories,
  setDistance,
  setMinutes,
  setCalories,
}: {
  distance: string;
  minutes: string;
  calories: string;
  setDistance: (
    value: string
  ) => void;
  setMinutes: (
    value: string
  ) => void;
  setCalories: (
    value: string
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <FormIntro
        icon={<Footprints size={21} />}
        title="Log a run"
        description="Record your running activity."
        iconClass="bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Distance"
          value={distance}
          onChange={setDistance}
          placeholder="5"
          type="number"
          suffix="km"
        />

        <Input
          label="Duration"
          value={minutes}
          onChange={setMinutes}
          placeholder="30"
          type="number"
          suffix="min"
        />
      </div>

      <Input
        label="Calories burned"
        value={calories}
        onChange={setCalories}
        placeholder="Optional"
        type="number"
        suffix="kcal"
      />
    </div>
  );
}

/* ---------------- Workout ---------------- */

function WorkoutForm({
  name,
  minutes,
  setName,
  setMinutes,
}: {
  name: string;
  minutes: string;
  setName: (value: string) => void;
  setMinutes: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <FormIntro
        icon={<Dumbbell size={21} />}
        title="Log a workout"
        description="Record a completed workout session."
        iconClass="bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
      />

      <Input
        label="Workout name"
        value={name}
        onChange={setName}
        placeholder="e.g. Push Day"
      />

      <Input
        label="Duration"
        value={minutes}
        onChange={setMinutes}
        placeholder="45"
        type="number"
        suffix="minutes"
      />
    </div>
  );
}

/* ---------------- Water ---------------- */

function WaterForm({
  amount,
  setAmount,
}: {
  amount: string;
  setAmount: (
    value: string
  ) => void;
}) {
  const amounts = [
    '250',
    '500',
    '750',
    '1000',
  ];

  return (
    <div className="space-y-5">
      <FormIntro
        icon={<Droplets size={21} />}
        title="Log water"
        description="Track your hydration for today."
        iconClass="bg-cyan-100 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400"
      />

      <Input
        label="Amount"
        value={amount}
        onChange={setAmount}
        placeholder="250"
        type="number"
        suffix="ml"
      />

      <div>
        <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
          Quick amounts
        </p>

        <div className="grid grid-cols-4 gap-2">
          {amounts.map(
            (value) => (
              <button
                key={value}
                onClick={() =>
                  setAmount(value)
                }
                className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                  amount === value
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-700 dark:border-cyan-400 dark:bg-cyan-500/10 dark:text-cyan-300'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'
                }`}
              >
                {value} ml
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Meal ---------------- */

function MealForm({
  mealType,
  name,
  calories,
  protein,
  carbs,
  fat,
  setMealType,
  setName,
  setCalories,
  setProtein,
  setCarbs,
  setFat,
}: {
  mealType: string;
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  setMealType: (
    value: string
  ) => void;
  setName: (value: string) => void;
  setCalories: (
    value: string
  ) => void;
  setProtein: (
    value: string
  ) => void;
  setCarbs: (
    value: string
  ) => void;
  setFat: (
    value: string
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <FormIntro
        icon={<Utensils size={21} />}
        title="Log a meal"
        description="Add nutrition information for your meal."
        iconClass="bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400"
      />

      <div>
        <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">
          Meal type
        </label>

        <select
          value={mealType}
          onChange={(event) =>
            setMealType(
              event.target.value
            )
          }
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-white/10 dark:bg-[#202020] dark:text-white"
        >
          <option value="breakfast">
            Breakfast
          </option>
          <option value="lunch">
            Lunch
          </option>
          <option value="dinner">
            Dinner
          </option>
          <option value="snack">
            Snack
          </option>
        </select>
      </div>

      <Input
        label="Meal name"
        value={name}
        onChange={setName}
        placeholder="e.g. Paneer rice bowl"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Calories"
          value={calories}
          onChange={setCalories}
          placeholder="600"
          type="number"
          suffix="kcal"
        />

        <Input
          label="Protein"
          value={protein}
          onChange={setProtein}
          placeholder="30"
          type="number"
          suffix="g"
        />

        <Input
          label="Carbs"
          value={carbs}
          onChange={setCarbs}
          placeholder="60"
          type="number"
          suffix="g"
        />

        <Input
          label="Fat"
          value={fat}
          onChange={setFat}
          placeholder="20"
          type="number"
          suffix="g"
        />
      </div>
    </div>
  );
}

/* ---------------- Shared UI ---------------- */

function FormIntro({
  icon,
  title,
  description,
  iconClass,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconClass: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
      >
        {icon}
      </div>

      <div>
        <h3 className="font-bold text-gray-900 dark:text-white">
          {title}
        </h3>

        <p className="mt-0.5 text-xs text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  suffix,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
  type?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">
        {label}
      </label>

      <div className="relative">
        <input
          type={type}
          min={
            type === 'number'
              ? '0'
              : undefined
          }
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          placeholder={placeholder}
          className={`w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white/30 ${
            suffix
              ? 'pr-16'
              : ''
          }`}
        />

        {suffix && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default QuickLogModal;