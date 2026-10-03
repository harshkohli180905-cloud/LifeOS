import {
  useEffect,
  useRef,
  useState,
} from 'react';

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
import { getLocalDate } from '../lib/date';

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

  /*
   * App can use this to immediately refresh
   * dashboard data after a successful save.
   */
  onSaved?: () => void | Promise<void>;
};



const toPositiveNumber = (
  value: string,
) => {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return null;
  }

  return number;
};

const toNonNegativeNumber = (
  value: string,
) => {
  if (value.trim() === '') {
    return 0;
  }

  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return null;
  }

  return number;
};

function QuickLogModal({
  isOpen,
  onClose,
  initialType = 'study',
  onSaved,
}: QuickLogModalProps) {
  const { user } = useAuth();

  const [type, setType] =
    useState<QuickLogType>(
      initialType,
    );

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const closeTimerRef =
    useRef<number | null>(null);

  /* ---------------- Study ---------------- */

  const [studyName, setStudyName] =
    useState('');

  const [studyMinutes, setStudyMinutes] =
    useState('');

  const [studyPages, setStudyPages] =
    useState('');

  /* ---------------- Run ---------------- */

  const [runDistance, setRunDistance] =
    useState('');

  const [runMinutes, setRunMinutes] =
    useState('');

  const [runCalories, setRunCalories] =
    useState('');

  /* ---------------- Workout ---------------- */

  const [workoutName, setWorkoutName] =
    useState('');

  const [workoutMinutes, setWorkoutMinutes] =
    useState('');

  /* ---------------- Water ---------------- */

  const [waterAmount, setWaterAmount] =
    useState('250');

  /* ---------------- Meal ---------------- */

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

  /*
   * Sync selected quick-log type whenever
   * the modal is opened from a different action.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setType(initialType);
    setSaved(false);
  }, [
    isOpen,
    initialType,
  ]);

  /*
   * Cleanup delayed close timer.
   */
  useEffect(() => {
    return () => {
      if (
        closeTimerRef.current !== null
      ) {
        window.clearTimeout(
          closeTimerRef.current,
        );
      }
    };
  }, []);

  /*
   * Escape key.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === 'Escape' &&
        !saving
      ) {
        onClose();
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [
    isOpen,
    saving,
    onClose,
  ]);

  const resetForm = () => {
    setStudyName('');
    setStudyMinutes('');
    setStudyPages('');

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
    if (saving) {
      return;
    }

    if (
      closeTimerRef.current !== null
    ) {
      window.clearTimeout(
        closeTimerRef.current,
      );

      closeTimerRef.current = null;
    }

    resetForm();
    setSaved(false);
    onClose();
  };

  /* =====================================================
   * SAVE STUDY
   * ===================================================== */

  const saveStudy = async () => {
    if (!user) {
      return false;
    }

    const minutes =
      toPositiveNumber(
        studyMinutes,
      );

    if (
      !studyName.trim() ||
      minutes === null
    ) {
      return false;
    }

    const end = new Date();

    const start = new Date(
      end.getTime() -
        minutes * 60 * 1000,
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
            Math.round(
              minutes * 60,
            ),
          pages_read: Math.max(0, Math.round(Number(studyPages) || 0)),
        });

    if (error) {
      console.error(
        'Study log error:',
        error,
      );

      return false;
    }

    return true;
  };

  /* =====================================================
   * SAVE RUN
   * ===================================================== */

  const saveRun = async () => {
    if (!user) {
      return false;
    }

    const distance =
      toPositiveNumber(
        runDistance,
      );

    const minutes =
      toPositiveNumber(
        runMinutes,
      );

    const calories =
      toNonNegativeNumber(
        runCalories,
      );

    if (
      distance === null ||
      minutes === null ||
      calories === null
    ) {
      return false;
    }

    const durationSeconds =
      Math.round(
        minutes * 60,
      );

    const pace =
      Number(
        (
          minutes / distance
        ).toFixed(2),
      );

    const { error } =
      await supabase
        .from('runs')
        .insert({
          user_id: user.id,
          date: getLocalDate(),
          distance_km: distance,
          duration_seconds:
            durationSeconds,
          pace,
          calories,
          notes: null,
          route_location: null,
        });

    if (error) {
      console.error(
        'Run log error:',
        error,
      );

      return false;
    }

    return true;
  };

  /* =====================================================
   * SAVE WORKOUT
   * ===================================================== */

  const saveWorkout = async () => {
    if (!user) {
      return false;
    }

    const minutes =
      toPositiveNumber(
        workoutMinutes,
      );

    if (
      !workoutName.trim() ||
      minutes === null
    ) {
      return false;
    }

    const { error } =
      await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          name: workoutName.trim(),
          date: getLocalDate(),
          duration_seconds:
            Math.round(
              minutes * 60,
            ),
          notes: null,
        });

    if (error) {
      console.error(
        'Workout log error:',
        error,
      );

      return false;
    }

    return true;
  };

  /* =====================================================
   * SAVE WATER
   * ===================================================== */

  const saveWater = async () => {
    if (!user) {
      return false;
    }

    const amount =
      toPositiveNumber(
        waterAmount,
      );

    if (amount === null) {
      return false;
    }

    const { error } =
      await supabase
        .from('water_logs')
        .insert({
          user_id: user.id,
          amount_ml: Math.round(
            amount,
          ),
          date: getLocalDate(),
        });

    if (error) {
      console.error(
        'Water log error:',
        error,
      );

      return false;
    }

    return true;
  };

  /* =====================================================
   * SAVE MEAL
   * ===================================================== */

  const saveMeal = async () => {
    if (!user) {
      return false;
    }

    if (!mealName.trim()) {
      return false;
    }

    const calories =
      toNonNegativeNumber(
        mealCalories,
      );

    const protein =
      toNonNegativeNumber(
        mealProtein,
      );

    const carbs =
      toNonNegativeNumber(
        mealCarbs,
      );

    const fat =
      toNonNegativeNumber(
        mealFat,
      );

    if (
      calories === null ||
      protein === null ||
      carbs === null ||
      fat === null
    ) {
      return false;
    }

    const { error } =
      await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          meal_type: mealType,
          name: mealName.trim(),
          calories,
          protein,
          carbs,
          fat,
          date: getLocalDate(),
        });

    if (error) {
      console.error(
        'Meal log error:',
        error,
      );

      return false;
    }

    return true;
  };

  /* =====================================================
   * MAIN SAVE
   * ===================================================== */

  const handleSave = async () => {
    if (
      !user ||
      saving ||
      saved
    ) {
      return;
    }

    setSaving(true);
    setSaved(false);

    let success = false;

    try {
      switch (type) {
        case 'study':
          success =
            await saveStudy();
          break;

        case 'run':
          success =
            await saveRun();
          break;

        case 'workout':
          success =
            await saveWorkout();
          break;

        case 'water':
          success =
            await saveWater();
          break;

        case 'meal':
          success =
            await saveMeal();
          break;
      }

      if (!success) {
        window.alert(
          'Please fill all required fields correctly.',
        );

        return;
      }

      /*
       * Immediately tell App that the DB has changed.
       */
      setSaved(true);

      try {
        await onSaved?.();
      } catch (refreshError) {
        /*
         * The actual DB save succeeded.
         * A dashboard refresh failure should NOT
         * make the user think the log failed.
         */
        console.error(
          'Dashboard refresh error:',
          refreshError,
        );
      }

      closeTimerRef.current =
        window.setTimeout(() => {
          closeTimerRef.current =
            null;

          resetForm();
          setSaved(false);
          onClose();
        }, 650);
    } catch (error) {
      console.error(
        'Quick log error:',
        error,
      );

      window.alert(
        'Something went wrong while saving.',
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
          event.target ===
          event.currentTarget
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
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>

        {/* Tabs */}

        <div className="overflow-x-auto border-b border-gray-100 px-3 py-3 dark:border-white/10">
          <div className="flex min-w-max gap-2">
            {tabs.map((tab) => {
              const Icon =
                tab.icon;

              const active =
                type === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() =>
                    setType(tab.id)
                  }
                  disabled={saving}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
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
              pages={studyPages}
              setName={setStudyName}
              setMinutes={setStudyMinutes}
              setPages={setStudyPages}
            />
          )}

          {type === 'run' && (
            <RunForm
              distance={
                runDistance
              }
              minutes={
                runMinutes
              }
              calories={
                runCalories
              }
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
              name={
                workoutName
              }
              minutes={
                workoutMinutes
              }
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
              amount={
                waterAmount
              }
              setAmount={
                setWaterAmount
              }
            />
          )}

          {type === 'meal' && (
            <MealForm
              mealType={
                mealType
              }
              name={mealName}
              calories={
                mealCalories
              }
              protein={
                mealProtein
              }
              carbs={
                mealCarbs
              }
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
              setFat={
                setMealFat
              }
            />
          )}
        </div>

        {/* Footer */}

        <div className="border-t border-gray-100 bg-gray-50/80 p-4 dark:border-white/10 dark:bg-white/[0.02]">
          <button
            onClick={
              handleSave
            }
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

/* =====================================================
 * STUDY FORM
 * ===================================================== */

function StudyForm({
  name, minutes, pages, setName, setMinutes, setPages,
}: {
  name: string; minutes: string; pages: string;
  setName: (value: string) => void;
  setMinutes: (value: string) => void;
  setPages: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <FormIntro
        icon={
          <BookOpen size={21} />
        }
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
        onChange={
          setMinutes
        }
        placeholder="e.g. 60"
        type="number"
        suffix="minutes"
      />

      <Input
        label="Pages read"
        value={pages}
        onChange={setPages}
        placeholder="e.g. 20"
        type="number"
        suffix="pages"
      />
    </div>
  );
}

/* =====================================================
 * RUN FORM
 * ===================================================== */

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
    value: string,
  ) => void;

  setMinutes: (
    value: string,
  ) => void;

  setCalories: (
    value: string,
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <FormIntro
        icon={
          <Footprints size={21} />
        }
        title="Log a run"
        description="Record your running activity."
        iconClass="bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Distance"
          value={distance}
          onChange={
            setDistance
          }
          placeholder="5"
          type="number"
          suffix="km"
        />

        <Input
          label="Duration"
          value={minutes}
          onChange={
            setMinutes
          }
          placeholder="30"
          type="number"
          suffix="min"
        />
      </div>

      <Input
        label="Calories burned"
        value={calories}
        onChange={
          setCalories
        }
        placeholder="Optional"
        type="number"
        suffix="kcal"
      />
    </div>
  );
}

/* =====================================================
 * WORKOUT FORM
 * ===================================================== */

function WorkoutForm({
  name,
  minutes,
  setName,
  setMinutes,
}: {
  name: string;
  minutes: string;

  setName: (
    value: string,
  ) => void;

  setMinutes: (
    value: string,
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <FormIntro
        icon={
          <Dumbbell size={21} />
        }
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
        onChange={
          setMinutes
        }
        placeholder="45"
        type="number"
        suffix="minutes"
      />
    </div>
  );
}

/* =====================================================
 * WATER FORM
 * ===================================================== */

function WaterForm({
  amount,
  setAmount,
}: {
  amount: string;

  setAmount: (
    value: string,
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
        icon={
          <Droplets size={21} />
        }
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
                disabled={false}
                className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                  amount === value
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-700 dark:border-cyan-400 dark:bg-cyan-500/10 dark:text-cyan-300'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'
                }`}
              >
                {value} ml
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
 * MEAL FORM
 * ===================================================== */

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
    value: string,
  ) => void;

  setName: (
    value: string,
  ) => void;

  setCalories: (
    value: string,
  ) => void;

  setProtein: (
    value: string,
  ) => void;

  setCarbs: (
    value: string,
  ) => void;

  setFat: (
    value: string,
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <FormIntro
        icon={
          <Utensils size={21} />
        }
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
              event.target.value,
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
          onChange={
            setCalories
          }
          placeholder="600"
          type="number"
          suffix="kcal"
        />

        <Input
          label="Protein"
          value={protein}
          onChange={
            setProtein
          }
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

/* =====================================================
 * SHARED UI
 * ===================================================== */

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
    value: string,
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
          step={
            type === 'number'
              ? 'any'
              : undefined
          }
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
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