import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

/* =========================================================
   COMPATIBILITY TYPES
========================================================= */

export type Priority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent'
  | string;

export type TaskCategory =
  | 'study'
  | 'fitness'
  | 'personal'
  | 'work'
  | 'other'
  | string;

export type MealType =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | string;

export type GoalCategory =
  | 'study'
  | 'fitness'
  | 'health'
  | 'career'
  | 'personal'
  | 'other'
  | string;

export type TopicStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'revision_due'
  | 'revision_completed';

/* =========================================================
   TOPIC / SYLLABUS TYPES
========================================================= */

export interface Topic {
  id: string;
  name: string;
  title: string;

  completed: boolean;
  status: TopicStatus;
  revisionsCompleted: number;

  children?: Topic[];

  subjectId?: string;
  parentTopicId?: string;
  position?: number;
}

export interface Chapter {
  id: string;
  name: string;
  title: string;

  topics: Topic[];

  completed?: boolean;
  status?: TopicStatus;
}

export interface Unit {
  id: string;
  name: string;
  title: string;

  chapters: Chapter[];
  topics?: Topic[];

  completed?: boolean;
  status?: TopicStatus;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  targetExamDate?: string;
  weightage?: number;

  topics: Topic[];
  units: Unit[];
}

/* =========================================================
   STUDY
========================================================= */

export interface StudySession {
  id: string;

  subjectId?: string;
  topicId?: string;

  name: string;

  startedAt: string;
  endedAt?: string;

  durationSeconds: number;

  date: string;
  durationMinutes: number;

  subjectName: string;
  topicTitle: string;
}

/* =========================================================
   TASKS
========================================================= */

export interface Task {
  id: string;
  title: string;
  description?: string;

  completed: boolean;

  priority?: Priority;

  /*
   * Empty string means no due date.
   * Keeping this required makes legacy UI
   * components type-safe.
   */
  dueDate: string;

  category?: TaskCategory;
  estimatedMinutes?: number;
}

/* =========================================================
   GOALS
========================================================= */

export interface Goal {
  id: string;
  title: string;
  description?: string;

  category: GoalCategory;

  target: number;
  progress: number;

  targetValue: number;
  currentValue: number;

  unit?: string;
  deadline?: string;
  completed: boolean;
}

/* =========================================================
   HABITS
========================================================= */

export interface Habit {
  id: string;
  name: string;

  icon?: string;
  frequency?: string;
  target?: number;
  reminderTime?: string;

  active: boolean;
  category?: TaskCategory;

  streak: number;

  completedDates: string[];
}

/* =========================================================
   RUNNING
========================================================= */

export interface Run {
  id: string;
  date: string;

  distanceKm: number;
  durationSeconds: number;

  pace?: number;
  calories?: number;
  notes?: string;
  routeLocation?: string;

  durationMinutes: number;

  avgPace: number;
}

export type RunLog = Run;

/* =========================================================
   WORKOUT
========================================================= */

export interface Workout {
  id: string;
  name: string;
  date: string;

  durationSeconds: number;

  notes?: string;

  totalVolumeKg: number;

  routineName: string;
  durationMinutes: number;
}

export type WorkoutLog = Workout;

/* =========================================================
   MEALS
========================================================= */

export interface Meal {
  id: string;

  mealType: MealType;

  name: string;

  calories: number;
  protein: number;
  carbs: number;
  fat: number;

  date: string;

  foodName: string;
  proteinGrams: number;
}

export type MealLog = Meal;

/* =========================================================
   WATER
========================================================= */

export interface WaterLog {
  id: string;
  amountMl: number;
  date: string;
}

/* =========================================================
   SETTINGS
========================================================= */

export interface UserSettings {
  name: string;

  dailyStudyTarget: number;
  dailyRunTarget: number;
  dailyWaterTarget: number;
  dailyProteinTarget: number;
  dailyCalorieTarget: number;

  userName: string;

  dailyStudyTargetHours: number;
  dailyRunTargetKm: number;
  dailyWaterTargetLiters: number;
  dailyProteinTargetGrams: number;
}

/* =========================================================
   INPUT TYPES
========================================================= */

export type StudySessionInput = {
  name?: string;

  subjectId?: string;
  topicId?: string;

  subjectName?: string;
  topicTitle?: string;

  startedAt?: string;
  endedAt?: string;

  durationSeconds?: number;
  durationMinutes?: number;

  date?: string;
};

export type TaskInput = {
  title: string;

  description?: string;

  completed?: boolean;

  priority?: Priority;

  dueDate?: string;

  category?: TaskCategory;

  estimatedMinutes?: number;
};

export type RunInput = {
  date?: string;

  distanceKm: number;

  durationSeconds?: number;
  durationMinutes?: number;

  pace?: number;

  /*
   * Legacy UI may send:
   * 5
   * "5"
   * "5.20 min/km"
   */
  avgPace?: number | string;

  calories?: number;

  notes?: string;

  routeLocation?: string;
};

export type WorkoutInput = {
  name?: string;

  routineName?: string;

  date?: string;

  durationSeconds?: number;

  durationMinutes?: number;

  notes?: string;

  totalVolumeKg?: number;
};

export type MealInput = {
  mealType?: MealType;
  name?: string;
  foodName?: string;
  calories?: number;
  protein?: number;
  proteinGrams?: number;
  carbs?: number;
  carbsGrams?: number;
  fat?: number;
  fatGrams?: number;
  date?: string;
};

export type GoalInput = {
  title: string;
  description?: string;
  category?: GoalCategory;
  target?: number;
  progress?: number;
  unit?: string;
  deadline?: string;
  completed?: boolean;
};

/* =========================================================
   CONTEXT TYPE
========================================================= */

export interface LifeOSContextType {
  subjects: Subject[];

  studySessions: StudySession[];

  tasks: Task[];

  goals: Goal[];

  habits: Habit[];

  runs: Run[];

  workouts: Workout[];

  meals: Meal[];

  waterLogs: WaterLog[];

  settings: UserSettings;

  loading: boolean;

  addStudySession: (
    session: StudySessionInput
  ) => Promise<void>;

  addTask: (
    task: TaskInput
  ) => Promise<void>;

  addGoal: (
    goal: GoalInput
  ) => Promise<void>;

  updateGoal: (
    id: string,
    goal: Partial<GoalInput>
  ) => Promise<void>;

  deleteGoal: (
    id: string
  ) => Promise<void>;
  
  toggleTask: (
    id: string
  ) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTask: (id: string, input: TaskInput) => Promise<void>;

  toggleTopicStatus: (
    ...args: string[]
  ) => Promise<void>;

  addRun: (
    run: RunInput
  ) => Promise<void>;

  addWorkout: (
    workout: WorkoutInput
  ) => Promise<void>;

  addMeal: (
    meal: MealInput
  ) => Promise<void>;

  addWater: (
    amountMl: number,
    date?: string
  ) => Promise<void>;

  toggleHabitToday: (
    habitId: string
  ) => Promise<void>;

  updateSettings: (
    settings: Partial<UserSettings>
  ) => Promise<void>;

  resetAllData: () => Promise<void>;

  exportAllData: () => void;

  importAllData: (
    input: File | string
  ) => boolean;

  getTodayProgress: () => number;

  getTodayStudySeconds: () => number;

  getTodayRunDistance: () => number;

  getTodayWater: () => number;

  getTodayProtein: () => number;

  getTodayCalories: () => number;

  getTodayTasks: () => Task[];

  getTodayCompletedTasks: () => Task[];

  getOverallSyllabusProgress: () => number;

  getTodayStudyTimeMinutes: () => number;

  getTodayRunKm: () => number;

  getTodayProteinTotal: () => number;

  getTodayCaloriesTotal: () => number;

  getTodayWaterTotal: () => number;
}

const LifeOSContext =
  createContext<LifeOSContextType | undefined>(
    undefined
  );

/* =========================================================
   DEFAULT SETTINGS
========================================================= */

const DEFAULT_SETTINGS: UserSettings = {
  name: '',

  dailyStudyTarget: 4,
  dailyRunTarget: 5,
  dailyWaterTarget: 3.5,
  dailyProteinTarget: 140,
  dailyCalorieTarget: 2500,

  userName: '',

  dailyStudyTargetHours: 4,
  dailyRunTargetKm: 5,
  dailyWaterTargetLiters: 3.5,
  dailyProteinTargetGrams: 140,
};

/* =========================================================
   DATE HELPERS
========================================================= */

const todayISO = (): string => {
  const date = new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      date.getDate()
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const toDateString = (
  value?: string | null
): string => {
  if (!value) {
    return todayISO();
  }

  return value.slice(0, 10);
};

/* =========================================================
   TOPIC HELPERS
========================================================= */

const mapTopic = (
  row: any
): Topic => ({
  id: row.id,

  name: row.name,

  title: row.name,

  completed:
    Boolean(
      row.completed
    ),

  status:
    row.status ??
    (
      row.completed
        ? 'completed'
        : 'not_started'
    ),

  revisionsCompleted:
    Number(
      row.revisions_completed ?? 0
    ),

  subjectId:
    row.subject_id ??
    undefined,

  parentTopicId:
    row.parent_topic_id ??
    undefined,

  position:
    Number(
      row.position ?? 0
    ),

  children: [],
});

/* =========================================================
   BUILD LEGACY UNITS
========================================================= */

const buildUnits = (
  rootTopics: Topic[]
): Unit[] => {
  return rootTopics.map(
    (
      unitTopic
    ) => {

      const chapterTopics =
        unitTopic.children ?? [];

      const chapters: Chapter[] =
        chapterTopics.map(
          (
            chapterTopic
          ) => ({
            id:
              chapterTopic.id,

            name:
              chapterTopic.name,

            title:
              chapterTopic.name,

            completed:
              chapterTopic.completed,

            status:
              chapterTopic.status,

            topics:
              chapterTopic.children ??
              [],
          })
        );

      return {
        id:
          unitTopic.id,

        name:
          unitTopic.name,

        title:
          unitTopic.name,

        chapters,

        topics:
          chapterTopics.length === 0
            ? [unitTopic]
            : chapterTopics,

        completed:
          unitTopic.completed,

        status:
          unitTopic.status,
      };
    }
  );
};

/* =========================================================
   BUILD SUBJECTS
========================================================= */

const buildSubjects = (
  subjectRows: any[],
  topicRows: any[]
): Subject[] => {

  return subjectRows.map(
    (
      subject
    ) => {

      const subjectTopics =
        topicRows.filter(
          (
            topic
          ) =>
            topic.subject_id ===
            subject.id
        );

      const topicMap =
        new Map<
          string,
          Topic
        >();

      subjectTopics.forEach(
        (
          row
        ) => {
          topicMap.set(
            row.id,
            mapTopic(row)
          );
        }
      );

      const rootTopics:
        Topic[] = [];

      subjectTopics.forEach(
        (
          row
        ) => {

          const topic =
            topicMap.get(
              row.id
            );

          if (!topic) {
            return;
          }

          if (
            row.parent_topic_id
          ) {

            const parent =
              topicMap.get(
                row.parent_topic_id
              );

            if (parent) {

              parent.children ??=
                [];

              parent.children.push(
                topic
              );
            }

          } else {

            rootTopics.push(
              topic
            );
          }
        }
      );

      return {
        id:
          subject.id,

        name:
          subject.name,

        description:
          subject.description ??
          undefined,

        color:
          subject.color ??
          undefined,

        icon:
          subject.icon ??
          '📚',

        targetExamDate:
          subject.target_exam_date ??
          undefined,

        weightage:
          Number(
            subject.weightage ?? 0
          ),

        topics:
          rootTopics,

        units:
          buildUnits(
            rootTopics
          ),
      };
    }
  );
};

/* =========================================================
   FIND TOPIC
========================================================= */

const findTopicRecursive = (
  topics: Topic[],
  id: string
): Topic | undefined => {

  for (
    const topic of topics
  ) {

    if (
      topic.id === id
    ) {
      return topic;
    }

    if (
      topic.children?.length
    ) {

      const found =
        findTopicRecursive(
          topic.children,
          id
        );

      if (found) {
        return found;
      }
    }
  }

  return undefined;
};

/* =========================================================
   FIND TOPIC BY NAME
========================================================= */

const findTopicByName = (
  topics: Topic[],
  name: string
): Topic | undefined => {

  for (
    const topic of topics
  ) {

    if (
      topic.name === name ||
      topic.title === name
    ) {
      return topic;
    }

    if (
      topic.children?.length
    ) {

      const found =
        findTopicByName(
          topic.children,
          name
        );

      if (found) {
        return found;
      }
    }
  }

  return undefined;
};

/* =========================================================
   PROVIDER
========================================================= */

export function LifeOSProvider({
  children,
}: {
  children: ReactNode;
}) {

  const { user } =
    useAuth();

  const [
    subjects,
    setSubjects,
  ] = useState<Subject[]>([]);

  const [
    studySessions,
    setStudySessions,
  ] =
    useState<StudySession[]>([]);

  const [
    tasks,
    setTasks,
  ] = useState<Task[]>([]);

  const [
    goals,
    setGoals,
  ] = useState<Goal[]>([]);

  const [
    habits,
    setHabits,
  ] = useState<Habit[]>([]);

  const [
    runs,
    setRuns,
  ] = useState<Run[]>([]);

  const [
    workouts,
    setWorkouts,
  ] =
    useState<Workout[]>([]);

  const [
    meals,
    setMeals,
  ] = useState<Meal[]>([]);

  const [
    waterLogs,
    setWaterLogs,
  ] =
    useState<WaterLog[]>([]);

  const [
    settings,
    setSettings,
  ] =
    useState<UserSettings>(
      DEFAULT_SETTINGS
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  /* =======================================================
     LOAD DATA
  ======================================================= */

  useEffect(() => {

    if (!user) {

      setSubjects([]);
      setStudySessions([]);
      setTasks([]);
      setGoals([]);
      setHabits([]);
      setRuns([]);
      setWorkouts([]);
      setMeals([]);
      setWaterLogs([]);

      setSettings({
        ...DEFAULT_SETTINGS,
      });

      setLoading(false);

      return;
    }

    let cancelled =
      false;

    const loadData =
      async () => {

        setLoading(true);

        try {

          /* PROFILE */

          const {
            data: profile,
            error:
              profileError,
          } =
            await supabase
              .from('profiles')
              .select('*')
              .eq(
                'id',
                user.id
              )
              .maybeSingle();

          if (
            profileError
          ) {
            throw profileError;
          }

          let currentProfile =
            profile;

          if (
            !currentProfile
          ) {

            const {
              data,
              error,
            } =
              await supabase
                .from('profiles')
                .insert({
                  id:
                    user.id,

                  name:
                    user.user_metadata
                      ?.full_name ??
                    user.email?.split(
                      '@'
                    )[0] ??
                    '',

                  daily_study_target:
                    4,

                  daily_run_target:
                    5,

                  daily_water_target:
                    3500,

                  daily_protein_target:
                    140,

                  daily_calorie_target:
                    2500,

                  onboarding_completed:
                    false,
                })
                .select()
                .single();

            if (error) {
              throw error;
            }

            currentProfile =
              data;
          }

          /* =================================================
             FETCH ALL DATA
          ================================================= */

          const [
            subjectsResult,
            topicsResult,
            sessionsResult,
            tasksResult,
            goalsResult,
            habitsResult,
            habitLogsResult,
            runsResult,
            workoutsResult,
            mealsResult,
            waterResult,
          ] =
            await Promise.all([

              supabase
                .from('subjects')
                .select('*')
                .eq(
                  'user_id',
                  user.id
                )
                .order(
                  'created_at',
                  {
                    ascending:
                      true,
                  }
                ),

              supabase
                .from('topics')
                .select('*')
                .eq(
                  'user_id',
                  user.id
                )
                .order(
                  'position',
                  {
                    ascending:
                      true,
                  }
                ),

              supabase
                .from('study_sessions')
                .select('*')
                .eq(
                  'user_id',
                  user.id
                )
                .order(
                  'started_at',
                  {
                    ascending:
                      false,
                  }
                ),

              supabase
                .from('tasks')
                .select('*')
                .eq(
                  'user_id',
                  user.id
                )
                .order(
                  'created_at',
                  {
                    ascending:
                      false,
                  }
                ),

              supabase
                .from('goals')
                .select('*')
                .eq(
                  'user_id',
                  user.id
                )
                .order(
                  'created_at',
                  {
                    ascending:
                      false,
                  }
                ),

              supabase
                .from('habits')
                .select('*')
                .eq(
                  'user_id',
                  user.id
                )
                .order(
                  'created_at',
                  {
                    ascending:
                      true,
                  }
                ),

              supabase
                .from('habit_logs')
                .select('*')
                .eq(
                  'user_id',
                  user.id
                ),

              supabase
                .from('runs')
                .select('*')
                .eq(
                  'user_id',
                  user.id
                )
                .order(
                  'date',
                  {
                    ascending:
                      false,
                  }
                ),

              supabase
                .from('workouts')
                .select('*')
                .eq(
                  'user_id',
                  user.id
                )
                .order(
                  'date',
                  {
                    ascending:
                      false,
                  }
                ),

              supabase
                .from('meals')
                .select('*')
                .eq(
                  'user_id',
                  user.id
                )
                .order(
                  'date',
                  {
                    ascending:
                      false,
                  }
                ),

              supabase
                .from('water_logs')
                .select('*')
                .eq(
                  'user_id',
                  user.id
                )
                .order(
                  'created_at',
                  {
                    ascending:
                      false,
                  }
                ),
            ]);

          const results = [
            subjectsResult,
            topicsResult,
            sessionsResult,
            tasksResult,
            goalsResult,
            habitsResult,
            habitLogsResult,
            runsResult,
            workoutsResult,
            mealsResult,
            waterResult,
          ];

          for (
            const result of results
          ) {

            if (
              result.error
            ) {
              throw result.error;
            }
          }

          if (cancelled) {
            return;
          }

          /* =================================================
             SUBJECTS
          ================================================= */

          const builtSubjects =
            buildSubjects(
              subjectsResult.data ??
                [],
              topicsResult.data ??
                []
            );

          setSubjects(
            builtSubjects
          );

          /* =================================================
             STUDY SESSIONS
          ================================================= */

          const subjectMap =
            new Map(
              (
                subjectsResult.data ??
                []
              ).map(
                (
                  item
                ) => [
                  item.id,
                  item.name,
                ]
              )
            );

          const topicNameMap =
            new Map(
              (
                topicsResult.data ??
                []
              ).map(
                (
                  item
                ) => [
                  item.id,
                  item.name,
                ]
              )
            );

          setStudySessions(
            (
              sessionsResult.data ??
              []
            ).map(
              (
                row
              ) => {

                const durationSeconds =
                  Number(
                    row.duration_seconds ??
                      0
                  );

                return {
                  id:
                    row.id,

                  subjectId:
                    row.subject_id ??
                    undefined,

                  topicId:
                    row.topic_id ??
                    undefined,

                  name:
                    row.name ??
                    'Study Session',

                  startedAt:
                    row.started_at,

                  endedAt:
                    row.ended_at ??
                    undefined,

                  durationSeconds,

                  date:
                    toDateString(
                      row.started_at
                    ),

                  durationMinutes:
                    durationSeconds /
                    60,

                  subjectName:
                    row.subject_id
                      ? (
                          subjectMap.get(
                            row.subject_id
                          ) ??
                          ''
                        )
                      : '',

                  topicTitle:
                    row.topic_id
                      ? (
                          topicNameMap.get(
                            row.topic_id
                          ) ??
                          ''
                        )
                      : '',
                };
              }
            )
          );

          /* =================================================
             TASKS
          ================================================= */

          setTasks(
            (
              tasksResult.data ??
              []
            ).map(
              (
                row
              ) => ({
                id:
                  row.id,

                title:
                  row.title,

                description:
                  row.description ??
                  undefined,

                completed:
                  Boolean(
                    row.completed
                  ),

                priority:
                  row.priority ??
                  undefined,

                dueDate:
                  row.due_date ??
                  '',

                category:
                  row.category ??
                  'personal',

                estimatedMinutes:
                  row.estimated_minutes !=
                  null
                    ? Number(
                        row.estimated_minutes
                      )
                    : undefined,
              })
            )
          );

          /* =================================================
             GOALS
          ================================================= */

          setGoals(
            (
              goalsResult.data ??
              []
            ).map(
              (
                row
              ) => {

                const target =
                  Number(
                    row.target ??
                      0
                  );

                const progress =
                  Number(
                    row.progress ??
                      0
                  );

                return {
                  id:
                    row.id,

                  title:
                    row.title,

                  description:
                    row.description ??
                    undefined,

                  category:
                    row.category ??
                    'personal',

                  target,

                  progress,

                  targetValue:
                    target,

                  currentValue:
                    progress,

                  unit:
                    row.unit ??
                    undefined,

                  deadline:
                    row.deadline ??
                    undefined,

                  completed:
                    Boolean(
                      row.completed
                    ),
                };
              }
            )
          );

          /* =================================================
             HABITS
          ================================================= */

          const habitLogs =
            habitLogsResult.data ??
            [];

          setHabits(
            (
              habitsResult.data ??
              []
            ).map(
              (
                row
              ) => {

                const completedDates =
                  habitLogs
                    .filter(
                      (
                        log
                      ) =>
                        log.habit_id ===
                          row.id &&
                        Boolean(
                          log.completed
                        )
                    )
                    .map(
                      (
                        log
                      ) =>
                        log.date
                    );

                return {
                  id:
                    row.id,

                  name:
                    row.name,

                  icon:
                    row.icon ??
                    '✓',

                  frequency:
                    row.frequency ??
                    'daily',

                  target:
                    Number(
                      row.target ??
                        1
                    ),

                  reminderTime:
                    row.reminder_time ??
                    undefined,

                  active:
                    row.active ??
                    true,

                  category:
                    row.category ??
                    'personal',

                  streak:
                    Number(
                      row.streak ??
                        0
                    ),

                  completedDates,
                };
              }
            )
          );

          /* =================================================
             RUNS
          ================================================= */

          setRuns(
            (
              runsResult.data ??
              []
            ).map(
              (
                row
              ) => {

                const durationSeconds =
                  Number(
                    row.duration_seconds ??
                      0
                  );

                const distanceKm =
                  Number(
                    row.distance_km ??
                      0
                  );

                const pace =
                  row.pace != null
                    ? Number(
                        row.pace
                      )
                    : distanceKm >
                          0 &&
                        durationSeconds >
                          0
                      ? durationSeconds /
                        60 /
                        distanceKm
                      : 0;

                return {
                  id:
                    row.id,

                  date:
                    row.date ??
                    row.created_at,

                  distanceKm,

                  durationSeconds,

                  durationMinutes:
                    durationSeconds /
                    60,

                  pace,

                  avgPace:
                    pace,

                  calories:
                    row.calories !=
                    null
                      ? Number(
                          row.calories
                        )
                      : undefined,

                  notes:
                    row.notes ??
                    undefined,

                  routeLocation:
                    row.route_location ??
                    undefined,
                };
              }
            )
          );

          /* =================================================
             WORKOUTS
          ================================================= */

          setWorkouts(
            (
              workoutsResult.data ??
              []
            ).map(
              (
                row
              ) => {

                const durationSeconds =
                  Number(
                    row.duration_seconds ??
                      0
                  );

                return {
                  id:
                    row.id,

                  name:
                    row.name ??
                    'Workout',

                  routineName:
                    row.name ??
                    'Workout',

                  date:
                    row.date ??
                    row.created_at,

                  durationSeconds,

                  durationMinutes:
                    durationSeconds /
                    60,

                  notes:
                    row.notes ??
                    undefined,

                  totalVolumeKg:
                    0,
                };
              }
            )
          );

          /* =================================================
             MEALS
          ================================================= */

          setMeals(
            (
              mealsResult.data ??
              []
            ).map(
              (
                row
              ) => {

                const calories =
                  Number(
                    row.calories ??
                      0
                  );

                const protein =
                  Number(
                    row.protein ??
                      0
                  );

                const carbs =
                  Number(
                    row.carbs ??
                      0
                  );

                const fat =
                  Number(
                    row.fat ??
                      0
                  );

                return {
                  id:
                    row.id,

                  mealType:
                    row.meal_type ??
                    'meal',

                  name:
                    row.name ??
                    '',

                  foodName:
                    row.name ??
                    '',

                  calories,

                  protein,

                  proteinGrams:
                    protein,

                  carbs,

                  fat,

                  date:
                    row.date ??
                    row.created_at,
                };
              }
            )
          );

          /* =================================================
             WATER
          ================================================= */

          setWaterLogs(
            (
              waterResult.data ??
              []
            ).map(
              (
                row
              ) => ({
                id:
                  row.id,

                amountMl:
                  Number(
                    row.amount_ml ??
                      0
                  ),

                date:
                  row.date ??
                  row.created_at,
              })
            )
          );

          /* =================================================
             SETTINGS
          ================================================= */

          const name =
            currentProfile?.name ??
            user.user_metadata
              ?.full_name ??
            user.email?.split(
              '@'
            )[0] ??
            '';

          const dailyStudyTarget =
            Number(
              currentProfile
                ?.daily_study_target ??
                4
            );

          const dailyRunTarget =
            Number(
              currentProfile
                ?.daily_run_target ??
                5
            );

          const dailyWaterTarget =
            Number(
              currentProfile
                ?.daily_water_target ??
                3500
            ) / 1000;

          const dailyProteinTarget =
            Number(
              currentProfile
                ?.daily_protein_target ??
                140
            );

          const dailyCalorieTarget =
            Number(
              currentProfile
                ?.daily_calorie_target ??
                2500
            );

          setSettings({
            name,

            dailyStudyTarget,

            dailyRunTarget,

            dailyWaterTarget,

            dailyProteinTarget,

            dailyCalorieTarget,

            userName:
              name,

            dailyStudyTargetHours:
              dailyStudyTarget,

            dailyRunTargetKm:
              dailyRunTarget,

            dailyWaterTargetLiters:
              dailyWaterTarget,

            dailyProteinTargetGrams:
              dailyProteinTarget,
          });

        } catch (
          error
        ) {

          console.error(
            'LifeOS data loading error:',
            error
          );

        } finally {

          if (
            !cancelled
          ) {
            setLoading(
              false
            );
          }
        }
      };

    void loadData();

    return () => {
      cancelled = true;
    };

  }, [user]);

  /* =======================================================
     STUDY SESSION
  ======================================================= */

  const addStudySession =
    async (
      session: StudySessionInput
    ) => {

      if (!user) {
        return;
      }

      const startedAt =
        session.startedAt ??
        new Date().toISOString();

      const durationSeconds =
        session.durationSeconds ??
        Math.round(
          (
            session.durationMinutes ??
            0
          ) * 60
        );

      const name =
        session.name ??
        'Study Session';

      let subjectId =
        session.subjectId;

      let topicId =
        session.topicId;

      if (
        !subjectId &&
        session.subjectName
      ) {

        subjectId =
          subjects.find(
            (
              subject
            ) =>
              subject.name ===
              session.subjectName
          )?.id;
      }

      if (
        !topicId &&
        session.topicTitle
      ) {

        for (
          const subject of
            subjects
        ) {

          const found =
            findTopicByName(
              subject.topics,
              session.topicTitle
            );

          if (found) {

            topicId =
              found.id;

            break;
          }
        }
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'study_sessions'
          )
          .insert({
            user_id:
              user.id,

            subject_id:
              subjectId ??
              null,

            topic_id:
              topicId ??
              null,

            name,

            started_at:
              startedAt,

            ended_at:
              session.endedAt ??
              null,

            duration_seconds:
              durationSeconds,
          })
          .select()
          .single();

      if (error) {
        throw error;
      }

      const resolvedSubjectName =
        subjectId
          ? (
              subjects.find(
                (
                  subject
                ) =>
                  subject.id ===
                  subjectId
              )?.name ??
              ''
            )
          : (
              session.subjectName ??
              ''
            );

      let resolvedTopicTitle =
        session.topicTitle ??
        '';

      if (topicId) {

        for (
          const subject of
            subjects
        ) {

          const found =
            findTopicRecursive(
              subject.topics,
              topicId
            );

          if (found) {

            resolvedTopicTitle =
              found.name;

            break;
          }
        }
      }

      const newSession:
        StudySession = {
        id:
          data.id,

        subjectId:
          data.subject_id ??
          undefined,

        topicId:
          data.topic_id ??
          undefined,

        name:
          data.name,

        startedAt:
          data.started_at,

        endedAt:
          data.ended_at ??
          undefined,

        durationSeconds:
          Number(
            data.duration_seconds ??
              0
          ),

        date:
          toDateString(
            data.started_at
          ),

        durationMinutes:
          Number(
            data.duration_seconds ??
              0
          ) / 60,

        subjectName:
          resolvedSubjectName,

        topicTitle:
          resolvedTopicTitle,
      };

      setStudySessions(
        (
          previous
        ) => [
          newSession,
          ...previous,
        ]
      );
    };

  /* =======================================================
     TASKS
  ======================================================= */

  const addTask =
    async (
      task: TaskInput
    ) => {

      if (!user) {
        return;
      }

      const {
        data,
        error,
      } =
        await supabase
          .from('tasks')
          .insert({
            user_id:
              user.id,

            title:
              task.title,

            description:
              task.description ??
              null,

            completed:
              task.completed ??
              false,

            priority:
              task.priority ??
              null,

            due_date:
              task.dueDate ??
              null,

            category:
              task.category ??
              'personal',

            estimated_minutes:
              task.estimatedMinutes ??
              null,
          })
          .select()
          .single();

      if (error) {
        throw error;
      }

      const newTask:
        Task = {
        id:
          data.id,

        title:
          data.title,

        description:
          data.description ??
          undefined,

        completed:
          Boolean(
            data.completed
          ),

        priority:
          data.priority ??
          undefined,

        dueDate:
          data.due_date ??
          '',

        category:
          data.category ??
          'personal',

        estimatedMinutes:
          data.estimated_minutes !=
          null
            ? Number(
                data.estimated_minutes
              )
            : undefined,
      };

      setTasks(
        (
          previous
        ) => [
          newTask,
          ...previous,
        ]
      );
    };

  const toggleTask =
    async (
      id: string
    ) => {

      if (!user) {
        return;
      }

      const task =
        tasks.find(
          (
            item
          ) =>
            item.id === id
        );

      if (!task) {
        return;
      }

      const completed =
        !task.completed;

      const {
        error,
      } =
        await supabase
          .from('tasks')
          .update({
            completed,
          })
          .eq(
            'id',
            id
          )
          .eq(
            'user_id',
            user.id
          );

      if (error) {
        throw error;
      }

      setTasks(
        (
          previous
        ) =>
          previous.map(
            (
              item
            ) =>
              item.id === id
                ? {
                    ...item,
                    completed,
                  }
                : item
          )
      );
    };

const deleteTask = async (id: string) => {
  if (!user) return;

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;

  setTasks((previous) =>
    previous.filter((task) => task.id !== id)
  );
};

const updateTask = async (id: string, input: TaskInput) => {
  if (!user) return;

  const { error } = await supabase
    .from('tasks')
    .update({
      title: input.title,
      description: input.description ?? null,
      completed: input.completed ?? false,
      priority: input.priority ?? 'medium',
      due_date: input.dueDate ?? null,
      category: input.category ?? 'personal',
      estimated_minutes: input.estimatedMinutes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating task:', error);
    throw error;
  }

  setTasks((prev) =>
    prev.map((task) =>
      task.id === id
        ? {
            ...task,
            title: input.title,
            description: input.description,
            completed: input.completed ?? task.completed,
            priority: input.priority ?? task.priority,
            dueDate: input.dueDate ?? task.dueDate,
            category: input.category ?? task.category,
            estimatedMinutes:
              input.estimatedMinutes ?? task.estimatedMinutes,
          }
        : task
    )
  );
};

  /* =======================================================
     GOALS
  ======================================================= */

  const addGoal = async (
    goal: GoalInput
  ) => {
    if (!user) {
      return;
    }

    const target = Number(goal.target ?? 0);
    const progress = Number(goal.progress ?? 0);

    const completed =
      goal.completed ??
      (target > 0 && progress >= target);

    const {
      data,
      error,
    } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,

        title: goal.title,

        description:
          goal.description ??
          null,

        category:
          goal.category ??
          'personal',

        target,

        progress,

        unit:
          goal.unit ??
          null,

        deadline:
          goal.deadline ??
          null,

        completed,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const newGoal: Goal = {
      id: data.id,

      title:
        data.title,

      description:
        data.description ??
        undefined,

      category:
        data.category ??
        'personal',

      target:
        Number(
          data.target ??
            0
        ),

      progress:
        Number(
          data.progress ??
            0
        ),

      targetValue:
        Number(
          data.target ??
            0
        ),

      currentValue:
        Number(
          data.progress ??
            0
        ),

      unit:
        data.unit ??
        undefined,

      deadline:
        data.deadline ??
        undefined,

      completed:
        Boolean(
          data.completed
        ),
    };

    setGoals(
      (previous) => [
        newGoal,
        ...previous,
      ]
    );
  };

  const updateGoal = async (
    id: string,
    updates: Partial<GoalInput>
  ) => {
    if (!user) {
      return;
    }

    const existingGoal =
      goals.find(
        (goal) =>
          goal.id === id
      );

    if (!existingGoal) {
      return;
    }

    const target =
      updates.target !== undefined
        ? Number(updates.target)
        : existingGoal.target;

    const progress =
      updates.progress !== undefined
        ? Number(updates.progress)
        : existingGoal.progress;

    const completed =
      updates.completed !== undefined
        ? updates.completed
        : target > 0 &&
          progress >= target;

    const updatePayload: Record<
      string,
      unknown
    > = {
      updated_at:
        new Date().toISOString(),
    };

    if (
      updates.title !==
      undefined
    ) {
      updatePayload.title =
        updates.title;
    }

    if (
      updates.description !==
      undefined
    ) {
      updatePayload.description =
        updates.description || null;
    }

    if (
      updates.category !==
      undefined
    ) {
      updatePayload.category =
        updates.category;
    }

    if (
      updates.target !==
      undefined
    ) {
      updatePayload.target =
        target;
    }

    if (
      updates.progress !==
      undefined
    ) {
      updatePayload.progress =
        progress;
    }

    if (
      updates.unit !==
      undefined
    ) {
      updatePayload.unit =
        updates.unit || null;
    }

    if (
      updates.deadline !==
      undefined
    ) {
      updatePayload.deadline =
        updates.deadline || null;
    }

    updatePayload.completed =
      completed;

    const {
      data,
      error,
    } = await supabase
      .from('goals')
      .update(updatePayload)
      .eq(
        'id',
        id
      )
      .eq(
        'user_id',
        user.id
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    const updatedGoal: Goal = {
      id: data.id,

      title:
        data.title,

      description:
        data.description ??
        undefined,

      category:
        data.category ??
        'personal',

      target:
        Number(
          data.target ??
            0
        ),

      progress:
        Number(
          data.progress ??
            0
        ),

      targetValue:
        Number(
          data.target ??
            0
        ),

      currentValue:
        Number(
          data.progress ??
            0
        ),

      unit:
        data.unit ??
        undefined,

      deadline:
        data.deadline ??
        undefined,

      completed:
        Boolean(
          data.completed
        ),
    };

    setGoals(
      (previous) =>
        previous.map(
          (goal) =>
            goal.id === id
              ? updatedGoal
              : goal
        )
    );
  };

  const deleteGoal = async (
    id: string
  ) => {
    if (!user) {
      return;
    }

    const {
      error,
    } = await supabase
      .from('goals')
      .delete()
      .eq(
        'id',
        id
      )
      .eq(
        'user_id',
        user.id
      );

    if (error) {
      throw error;
    }

    setGoals(
      (previous) =>
        previous.filter(
          (goal) =>
            goal.id !== id
        )
    );
  };

  /* =======================================================
     TOPICS
  ======================================================= */

  const toggleTopicStatus =
    async (
      ...args: string[]
    ) => {

      if (!user) {
        return;
      }

      const id =
        args.length >= 4
          ? args[
              args.length - 1
            ]
          : args[0];

      if (!id) {
        return;
      }

      let targetTopic:
        Topic | undefined;

      for (
        const subject of
          subjects
      ) {

        const found =
          findTopicRecursive(
            subject.topics,
            id
          );

        if (found) {

          targetTopic =
            found;

          break;
        }
      }

      if (!targetTopic) {
        return;
      }

      const completed =
        !targetTopic.completed;

      const status:
        TopicStatus =
        completed
          ? 'completed'
          : 'not_started';

      const revisionsCompleted =
        completed
          ? Math.max(
              targetTopic.revisionsCompleted,
              1
            )
          : 0;

      const {
        error,
      } =
        await supabase
          .from('topics')
          .update({
            completed,

            status,

            revisions_completed:
              revisionsCompleted,
          })
          .eq(
            'id',
            id
          )
          .eq(
            'user_id',
            user.id
          );

      if (error) {
        throw error;
      }

      const updateTopics =
        (
          topicList: Topic[]
        ): Topic[] =>
          topicList.map(
            (
              topic
            ) => {

              if (
                topic.id === id
              ) {

                return {
                  ...topic,

                  completed,

                  status,

                  revisionsCompleted,
                };
              }

              if (
                topic.children
                  ?.length
              ) {

                return {
                  ...topic,

                  children:
                    updateTopics(
                      topic.children
                    ),
                };
              }

              return topic;
            }
          );

      setSubjects(
        (
          previous
        ) =>
          previous.map(
            (
              subject
            ) => {

              const topics =
                updateTopics(
                  subject.topics
                );

              return {
                ...subject,

                topics,

                units:
                  buildUnits(
                    topics
                  ),
              };
            }
          )
      );
    };

  /* =======================================================
     RUNS
  ======================================================= */

  const addRun =
    async (
      run: RunInput
    ) => {

      if (!user) {
        return;
      }

      const date =
        run.date ??
        todayISO();

      const durationSeconds =
        run.durationSeconds ??
        Math.round(
          (
            run.durationMinutes ??
            0
          ) * 60
        );

      let pace =
        run.pace;

      if (
        pace === undefined &&
        run.avgPace !== undefined
      ) {

        if (
          typeof run.avgPace ===
          'number'
        ) {

          pace =
            run.avgPace;

        } else {

          const parsed =
            Number.parseFloat(
              run.avgPace
            );

          if (
            Number.isFinite(
              parsed
            )
          ) {
            pace = parsed;
          }
        }
      }

      if (
        pace === undefined
      ) {

        pace =
          run.distanceKm > 0 &&
          durationSeconds > 0
            ? durationSeconds /
              60 /
              run.distanceKm
            : 0;
      }

      const {
        data,
        error,
      } =
        await supabase
          .from('runs')
          .insert({
            user_id:
              user.id,

            date,

            distance_km:
              run.distanceKm,

            duration_seconds:
              durationSeconds,

            pace,

            calories:
              run.calories ??
              null,

            notes:
              run.notes ??
              null,

            route_location:
              run.routeLocation ??
              null,
          })
          .select()
          .single();

      if (error) {
        throw error;
      }

      const numericPace =
        data.pace != null
          ? Number(
              data.pace
            )
          : 0;

      const newRun:
        Run = {
        id:
          data.id,

        date:
          data.date ??
          data.created_at,

        distanceKm:
          Number(
            data.distance_km ??
              0
          ),

        durationSeconds:
          Number(
            data.duration_seconds ??
              0
          ),

        durationMinutes:
          Number(
            data.duration_seconds ??
              0
          ) / 60,

        pace:
          numericPace,

        avgPace:
          numericPace,

        calories:
          data.calories != null
            ? Number(
                data.calories
              )
            : undefined,

        notes:
          data.notes ??
          undefined,

        routeLocation:
          data.route_location ??
          undefined,
      };

      setRuns(
        (
          previous
        ) => [
          newRun,
          ...previous,
        ]
      );
    };

  /* =======================================================
     WORKOUTS
  ======================================================= */

  const addWorkout =
    async (
      workout: WorkoutInput
    ) => {

      if (!user) {
        return;
      }

      const name =
        workout.name ??
        workout.routineName ??
        'Workout';

      const date =
        workout.date ??
        todayISO();

      const durationSeconds =
        workout.durationSeconds ??
        Math.round(
          (
            workout.durationMinutes ??
            0
          ) * 60
        );

      const {
        data,
        error,
      } =
        await supabase
          .from('workouts')
          .insert({
            user_id:
              user.id,

            name,

            date,

            duration_seconds:
              durationSeconds,

            notes:
              workout.notes ??
              null,
          })
          .select()
          .single();

      if (error) {
        throw error;
      }

      const newWorkout:
        Workout = {
        id:
          data.id,

        name:
          data.name,

        routineName:
          data.name,

        date:
          data.date ??
          data.created_at,

        durationSeconds:
          Number(
            data.duration_seconds ??
              0
          ),

        durationMinutes:
          Number(
            data.duration_seconds ??
              0
          ) / 60,

        notes:
          data.notes ??
          undefined,

        totalVolumeKg:
          workout.totalVolumeKg ??
          0,
      };

      setWorkouts(
        (
          previous
        ) => [
          newWorkout,
          ...previous,
        ]
      );
    };

  /* =======================================================
     MEALS
  ======================================================= */

  const addMeal = async (meal: MealInput) => {
  if (!user) {
    return;
  }

  const name = meal.name ?? meal.foodName ?? '';
  const protein = meal.protein ?? meal.proteinGrams ?? 0;
  const carbs = meal.carbs ?? meal.carbsGrams ?? 0;
  const fat = meal.fat ?? meal.fatGrams ?? 0;
  const date = meal.date ?? todayISO();

  const { data, error } = await supabase
    .from('meals')
    .insert({
      user_id: user.id,
      meal_type: meal.mealType ?? 'meal',
      name,
      calories: meal.calories ?? 0,
      protein,
      carbs,
      fat,
      date,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  const newMeal: Meal = {
    id: data.id,
    mealType: data.meal_type ?? 'meal',
    name: data.name ?? '',
    foodName: data.name ?? '',
    calories: Number(data.calories ?? 0),
    protein: Number(data.protein ?? 0),
    proteinGrams: Number(data.protein ?? 0),
    carbs: Number(data.carbs ?? 0),
    fat: Number(data.fat ?? 0),
    date: data.date ?? data.created_at ?? todayISO(),
  };

  setMeals((previous) => [
    newMeal,
    ...previous,
  ]);
};

  /* =======================================================
     WATER
  ======================================================= */

  const addWater =
    async (
      amountMl: number,
      date = todayISO()
    ) => {

      if (!user) {
        return;
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'water_logs'
          )
          .insert({
            user_id:
              user.id,

            amount_ml:
              amountMl,

            date,
          })
          .select()
          .single();

      if (error) {
        throw error;
      }

      const newWater:
        WaterLog = {
        id:
          data.id,

        amountMl:
          Number(
            data.amount_ml ??
              0
          ),

        date:
          data.date ??
          data.created_at,
      };

      setWaterLogs(
        (
          previous
        ) => [
          newWater,
          ...previous,
        ]
      );
    };

  /* =======================================================
     HABITS
  ======================================================= */

  const toggleHabitToday =
    async (
      habitId: string
    ) => {

      if (!user) {
        return;
      }

      const date =
        todayISO();

      const {
        data: existing,
        error:
          fetchError,
      } =
        await supabase
          .from(
            'habit_logs'
          )
          .select('*')
          .eq(
            'habit_id',
            habitId
          )
          .eq(
            'user_id',
            user.id
          )
          .eq(
            'date',
            date
          )
          .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      let completed =
        true;

      if (existing) {

        completed =
          !Boolean(
            existing.completed
          );

        const {
          error,
        } =
          await supabase
            .from(
              'habit_logs'
            )
            .update({
              completed,
            })
            .eq(
              'id',
              existing.id
            )
            .eq(
              'user_id',
              user.id
            );

        if (error) {
          throw error;
        }

      } else {

        const {
          error,
        } =
          await supabase
            .from(
              'habit_logs'
            )
            .insert({
              user_id:
                user.id,

              habit_id:
                habitId,

              date,

              completed:
                true,
            });

        if (error) {
          throw error;
        }
      }

      setHabits(
        (
          previous
        ) =>
          previous.map(
            (
              habit
            ) => {

              if (
                habit.id !==
                habitId
              ) {
                return habit;
              }

              const completedDates =
                completed
                  ? Array.from(
                      new Set([
                        ...habit.completedDates,
                        date,
                      ])
                    )
                  : habit.completedDates.filter(
                      (
                        item
                      ) =>
                        item !== date
                    );

              return {
                ...habit,

                completedDates,

                streak:
                  completed
                    ? habit.streak + 1
                    : Math.max(
                        0,
                        habit.streak - 1
                      ),
              };
            }
          )
      );
    };

  /* =======================================================
     SETTINGS
  ======================================================= */

  const updateSettings =
    async (
      updates: Partial<UserSettings>
    ) => {

      if (!user) {
        return;
      }

      const name =
        updates.userName !==
        undefined
          ? updates.userName
          : updates.name !==
              undefined
            ? updates.name
            : settings.name;

      const dailyStudyTarget =
        updates.dailyStudyTargetHours !==
        undefined
          ? updates.dailyStudyTargetHours
          : updates.dailyStudyTarget !==
              undefined
            ? updates.dailyStudyTarget
            : settings.dailyStudyTarget;

      const dailyRunTarget =
        updates.dailyRunTargetKm !==
        undefined
          ? updates.dailyRunTargetKm
          : updates.dailyRunTarget !==
              undefined
            ? updates.dailyRunTarget
            : settings.dailyRunTarget;

      const dailyWaterTarget =
        updates.dailyWaterTargetLiters !==
        undefined
          ? updates.dailyWaterTargetLiters
          : updates.dailyWaterTarget !==
              undefined
            ? updates.dailyWaterTarget
            : settings.dailyWaterTarget;

      const dailyProteinTarget =
        updates.dailyProteinTargetGrams !==
        undefined
          ? updates.dailyProteinTargetGrams
          : updates.dailyProteinTarget !==
              undefined
            ? updates.dailyProteinTarget
            : settings.dailyProteinTarget;

      const dailyCalorieTarget =
        updates.dailyCalorieTarget ??
        settings.dailyCalorieTarget;

      const nextSettings:
        UserSettings = {

        ...settings,

        name,

        dailyStudyTarget,

        dailyRunTarget,

        dailyWaterTarget,

        dailyProteinTarget,

        dailyCalorieTarget,

        userName:
          name,

        dailyStudyTargetHours:
          dailyStudyTarget,

        dailyRunTargetKm:
          dailyRunTarget,

        dailyWaterTargetLiters:
          dailyWaterTarget,

        dailyProteinTargetGrams:
          dailyProteinTarget,
      };

      const {
        error,
      } =
        await supabase
          .from('profiles')
          .update({
            name,

            daily_study_target:
              dailyStudyTarget,

            daily_run_target:
              dailyRunTarget,

            daily_water_target:
              Math.round(
                dailyWaterTarget *
                  1000
              ),

            daily_protein_target:
              dailyProteinTarget,

            daily_calorie_target:
              dailyCalorieTarget,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            user.id
          );

      if (error) {
        throw error;
      }

      setSettings(
        nextSettings
      );
    };

  /* =======================================================
     RESET
  ======================================================= */

  const resetAllData =
    async () => {

      if (!user) {
        return;
      }

      const tables = [
        'exercises',
        'habit_logs',
        'study_sessions',
        'tasks',
        'goals',
        'runs',
        'workouts',
        'meals',
        'water_logs',
        'habits',
        'topics',
        'subjects',
      ] as const;

      for (
        const table of tables
      ) {

        const {
          error,
        } =
          await supabase
            .from(table)
            .delete()
            .eq(
              'user_id',
              user.id
            );

        if (error) {

          console.error(
            `Failed deleting ${table}:`,
            error
          );
        }
      }

      const {
        error:
          profileError,
      } =
        await supabase
          .from('profiles')
          .update({
            name: '',

            daily_study_target:
              4,

            daily_run_target:
              5,

            daily_water_target:
              3500,

            daily_protein_target:
              140,

            daily_calorie_target:
              2500,

            onboarding_completed:
              false,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            user.id
          );

      if (profileError) {
        throw profileError;
      }

      setSubjects([]);
      setStudySessions([]);
      setTasks([]);
      setGoals([]);
      setHabits([]);
      setRuns([]);
      setWorkouts([]);
      setMeals([]);
      setWaterLogs([]);

      setSettings({
        ...DEFAULT_SETTINGS,
      });
    };

  /* =======================================================
     EXPORT DATA
  ======================================================= */

  const exportAllData =
    () => {

      const data = {
        exportedAt:
          new Date().toISOString(),

        version: 1,

        subjects,

        studySessions,

        tasks,

        goals,

        habits,

        runs,

        workouts,

        meals,

        waterLogs,

        settings,
      };

      const blob =
        new Blob(
          [
            JSON.stringify(
              data,
              null,
              2
            ),
          ],
          {
            type:
              'application/json',
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const anchor =
        document.createElement(
          'a'
        );

      anchor.href =
        url;

      anchor.download =
        `lifeos-backup-${todayISO()}.json`;

      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(
        url
      );
    };

  /* =======================================================
     IMPORT DATA
  ======================================================= */

  const importAllData =
    (
      input: File | string
    ): boolean => {

      try {

        if (
          typeof input !==
          'string'
        ) {

          if (
            !(input instanceof File)
          ) {
            return false;
          }

          void input
            .text()
            .then(
              (
                content
              ) => {

                importAllData(
                  content
                );
              }
            )
            .catch(
              (
                error
              ) => {

                console.error(
                  'LifeOS file import error:',
                  error
                );
              }
            );

          return true;
        }

        const imported =
          JSON.parse(input);

        if (
          !imported ||
          typeof imported !==
            'object'
        ) {
          return false;
        }

        if (
          Array.isArray(
            imported.tasks
          )
        ) {

          setTasks(
            imported.tasks
          );
        }

        if (
          Array.isArray(
            imported.goals
          )
        ) {

          setGoals(
            imported.goals
          );
        }

        if (
          Array.isArray(
            imported.habits
          )
        ) {

          setHabits(
            imported.habits
          );
        }

        if (
          Array.isArray(
            imported.runs
          )
        ) {

          setRuns(
            imported.runs
          );
        }

        if (
          Array.isArray(
            imported.workouts
          )
        ) {

          setWorkouts(
            imported.workouts
          );
        }

        if (
          Array.isArray(
            imported.meals
          )
        ) {

          setMeals(
            imported.meals
          );
        }

        if (
          Array.isArray(
            imported.waterLogs
          )
        ) {

          setWaterLogs(
            imported.waterLogs
          );
        }

        if (
          imported.settings &&
          typeof imported.settings ===
            'object'
        ) {

          setSettings(
            imported.settings
          );
        }

        return true;

      } catch (
        error
      ) {

        console.error(
          'LifeOS import error:',
          error
        );

        return false;
      }
    };

  /* =======================================================
     TODAY HELPERS
  ======================================================= */

  const getTodayStudySeconds =
    () => {

      const today =
        todayISO();

      return studySessions
        .filter(
          (
            session
          ) =>
            session.startedAt.startsWith(
              today
            )
        )
        .reduce(
          (
            total,
            session
          ) =>
            total +
            session.durationSeconds,
          0
        );
    };

  const getTodayRunDistance =
    () => {

      const today =
        todayISO();

      return runs
        .filter(
          (
            run
          ) =>
            run.date.startsWith(
              today
            )
        )
        .reduce(
          (
            total,
            run
          ) =>
            total +
            run.distanceKm,
          0
        );
    };

  const getTodayWater =
    () => {

      const today =
        todayISO();

      return waterLogs
        .filter(
          (
            log
          ) =>
            log.date.startsWith(
              today
            )
        )
        .reduce(
          (
            total,
            log
          ) =>
            total +
            log.amountMl,
          0
        );
    };

  const getTodayProtein =
    () => {

      const today =
        todayISO();

      return meals
        .filter(
          (
            meal
          ) =>
            meal.date.startsWith(
              today
            )
        )
        .reduce(
          (
            total,
            meal
          ) =>
            total +
            meal.protein,
          0
        );
    };

  const getTodayCalories =
    () => {

      const today =
        todayISO();

      return meals
        .filter(
          (
            meal
          ) =>
            meal.date.startsWith(
              today
            )
        )
        .reduce(
          (
            total,
            meal
          ) =>
            total +
            meal.calories,
          0
        );
    };

  const getTodayTasks =
    () => {

      const today =
        todayISO();

      return tasks.filter(
        (
          task
        ) =>
          task.dueDate ===
          today
      );
    };

  const getTodayCompletedTasks =
    () => {

      return getTodayTasks().filter(
        (
          task
        ) =>
          task.completed
      );
    };

  /* =======================================================
     DAILY PROGRESS
  ======================================================= */

  const getTodayProgress =
    () => {

      const studyTargetSeconds =
        settings.dailyStudyTarget *
        60 *
        60;

      const studyRatio =
        studyTargetSeconds > 0
          ? Math.min(
              getTodayStudySeconds() /
                studyTargetSeconds,
              1
            )
          : 0;

      const runRatio =
        settings.dailyRunTarget >
        0
          ? Math.min(
              getTodayRunDistance() /
                settings.dailyRunTarget,
              1
            )
          : 0;

      const proteinRatio =
        settings.dailyProteinTarget >
        0
          ? Math.min(
              getTodayProtein() /
                settings.dailyProteinTarget,
              1
            )
          : 0;

      const waterTargetMl =
        settings.dailyWaterTarget *
        1000;

      const waterRatio =
        waterTargetMl > 0
          ? Math.min(
              getTodayWater() /
                waterTargetMl,
              1
            )
          : 0;

      const todayTasks =
        getTodayTasks();

      const completedTasks =
        getTodayCompletedTasks();

      const taskRatio =
        todayTasks.length > 0
          ? completedTasks.length /
            todayTasks.length
          : 0;

      const progress =
        studyRatio * 0.3 +
        runRatio * 0.2 +
        proteinRatio * 0.2 +
        waterRatio * 0.15 +
        taskRatio * 0.15;

      return Math.round(
        progress * 100
      );
    };

  /* =======================================================
     SYLLABUS PROGRESS
  ======================================================= */

  const getOverallSyllabusProgress =
    () => {

      let total = 0;

      let completed = 0;

      const countTopics =
        (
          topicList: Topic[]
        ) => {

          for (
            const topic of
              topicList
          ) {

            total += 1;

            if (
              topic.completed ||
              topic.status ===
                'completed'
            ) {

              completed += 1;
            }

            if (
              topic.children
                ?.length
            ) {

              countTopics(
                topic.children
              );
            }
          }
        };

      subjects.forEach(
        (
          subject
        ) =>
          countTopics(
            subject.topics
          )
      );

      if (
        total === 0
      ) {
        return 0;
      }

      return Math.round(
        (
          completed /
          total
        ) * 100
      );
    };

  const getTodayStudyTimeMinutes =
    () =>
      Math.floor(
        getTodayStudySeconds() /
          60
      );

  const getTodayRunKm =
    () =>
      Number(
        getTodayRunDistance()
          .toFixed(2)
      );

  const getTodayProteinTotal =
    () =>
      Math.round(
        getTodayProtein()
      );

  const getTodayCaloriesTotal =
    () =>
      Math.round(
        getTodayCalories()
      );

  const getTodayWaterTotal =
    () =>
      Math.round(
        getTodayWater()
      );

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value =
    useMemo<LifeOSContextType>(
      () => ({
        subjects,

        studySessions,

        tasks,

        goals,

        habits,

        runs,

        workouts,

        meals,

        waterLogs,

        settings,

        loading,

        addStudySession,

        addTask,

                addGoal,

        updateGoal,

        deleteGoal,

        toggleTask,

        deleteTask,

        updateTask,

        toggleTopicStatus,

        addRun,

        addWorkout,

        addMeal,

        addWater,

        toggleHabitToday,

        updateSettings,

        resetAllData,

        exportAllData,

        importAllData,

        getTodayProgress,

        getTodayStudySeconds,

        getTodayRunDistance,

        getTodayWater,

        getTodayProtein,

        getTodayCalories,

        getTodayTasks,

        getTodayCompletedTasks,

        getOverallSyllabusProgress,

        getTodayStudyTimeMinutes,

        getTodayRunKm,

        getTodayProteinTotal,

        getTodayCaloriesTotal,

        getTodayWaterTotal,
      }),
      [
        subjects,
        studySessions,
        tasks,
        goals,
        habits,
        runs,
        workouts,
        meals,
        waterLogs,
        settings,
        loading,
      ]
    );

  return (
    <LifeOSContext.Provider
      value={value}
    >
      {children}
    </LifeOSContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useLifeOS() {

  const context =
    useContext(
      LifeOSContext
    );

  if (!context) {

    throw new Error(
      'useLifeOS must be used inside LifeOSProvider'
    );
  }

  return context;
}