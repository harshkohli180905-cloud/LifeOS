export type Priority = 'low' | 'medium' | 'high';

export type TaskCategory =
  | 'study'
  | 'fitness'
  | 'health'
  | 'personal'
  | 'work';

export type GoalCategory =
  | 'study'
  | 'fitness'
  | 'health'
  | 'career'
  | 'personal'
  | 'finance';

export type TopicStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'revision_due'
  | 'revision_completed';

export type MealType =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack';

export type FocusArea =
  | 'study'
  | 'fitness'
  | 'health'
  | 'career'
  | 'personal';

export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  focus_areas: FocusArea[];
  daily_study_target: number;
  daily_water_target: number;
  daily_run_target: number;
  daily_protein_target: number;
  daily_calorie_target: number;
  onboarding_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  target_exam_date: string | null;
  weightage: number;
  created_at?: string;
  updated_at?: string;
}

export interface Topic {
  id: string;
  user_id: string;
  subject_id: string;
  parent_topic_id: string | null;
  name: string;
  completed: boolean;
  position: number;
  status: TopicStatus;
  revisions_completed: number;
  created_at?: string;
  updated_at?: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  subject_id: string | null;
  topic_id: string | null;
  name: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: Priority;
  due_date: string | null;
  category: TaskCategory;
  estimated_minutes: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: GoalCategory;
  target: number;
  progress: number;
  deadline: string | null;
  completed: boolean;
  unit: string;
  created_at?: string;
  updated_at?: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  frequency: string;
  target: number;
  reminder_time: string | null;
  active: boolean;
  category: TaskCategory;
  streak: number;
  created_at?: string;
  updated_at?: string;
}

export interface HabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  created_at?: string;
}

export interface Run {
  id: string;
  user_id: string;
  date: string;
  distance_km: number;
  duration_seconds: number;
  pace: number;
  calories: number;
  notes: string | null;
  route_location: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  date: string;
  duration_seconds: number;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Exercise {
  id: string;
  user_id: string;
  workout_id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  created_at?: string;
}

export interface Meal {
  id: string;
  user_id: string;
  meal_type: MealType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date: string;
  created_at?: string;
  updated_at?: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  amount_ml: number;
  date: string;
  created_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  enabled: boolean;
  reminder_time: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Settings {
  dailyStudyTarget: number;
  dailyWaterTarget: number;
  dailyRunTarget: number;
  dailyProteinTarget: number;
  dailyCalorieTarget: number;
}

export interface DashboardStats {
  studySeconds: number;
  studyTargetSeconds: number;
  studyProgress: number;
  completedTasks: number;
  totalTasks: number;
  runDistance: number;
  runTarget: number;
  waterAmount: number;
  waterTarget: number;
  calories: number;
  calorieTarget: number;
  protein: number;
  proteinTarget: number;
  completedGoals: number;
  totalGoals: number;
}

export interface SubjectInput {
  name: string;
  description?: string | null;
  color?: string;
  icon?: string;
  target_exam_date?: string | null;
  weightage?: number;
}

export interface TopicInput {
  subject_id: string;
  parent_topic_id?: string | null;
  name: string;
  completed?: boolean;
  position?: number;
  status?: TopicStatus;
  revisions_completed?: number;
}

export interface StudySessionInput {
  subject_id?: string | null;
  topic_id?: string | null;
  name: string;
  started_at: string;
  ended_at?: string | null;
  duration_seconds: number;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  completed?: boolean;
  priority?: Priority;
  due_date?: string | null;
  category?: TaskCategory;
  estimated_minutes?: number | null;
}

export interface GoalInput {
  title: string;
  description?: string | null;
  category?: GoalCategory;
  target: number;
  progress?: number;
  deadline?: string | null;
  completed?: boolean;
  unit?: string;
}

export interface RunInput {
  date: string;
  distance_km: number;
  duration_seconds: number;
  pace?: number;
  calories: number;
  notes?: string | null;
  route_location?: string | null;
}

export interface WorkoutInput {
  name: string;
  date: string;
  duration_seconds: number;
  notes?: string | null;
}

export interface ExerciseInput {
  workout_id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface MealInput {
  meal_type: MealType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date: string;
}

export interface ProfileInput {
  name?: string;
  avatar_url?: string | null;
  focus_areas?: FocusArea[];
  daily_study_target?: number;
  daily_water_target?: number;
  daily_run_target?: number;
  daily_protein_target?: number;
  daily_calorie_target?: number;
  onboarding_completed?: boolean;
}