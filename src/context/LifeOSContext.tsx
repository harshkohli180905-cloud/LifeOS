/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Priority = 'low' | 'medium' | 'high';
export type TaskCategory = 'study' | 'fitness' | 'health' | 'work' | 'personal';
export type TopicStatus = 'not_started' | 'in_progress' | 'completed' | 'revision_due' | 'revision_completed';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type GoalCategory = 'study' | 'fitness' | 'personal';

export interface Topic {
  id: string;
  title: string;
  status: TopicStatus;
  revisionsCompleted: number;
}

export interface Chapter {
  id: string;
  title: string;
  topics: Topic[];
}

export interface Unit {
  id: string;
  title: string;
  chapters: Chapter[];
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string;
  targetExamDate: string;
  weightage: number;
  units: Unit[];
}

export interface StudySession {
  id: string;
  subjectId: string;
  subjectName: string;
  topicTitle?: string;
  durationMinutes: number;
  date: string;
}

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  priority: Priority;
  completed: boolean;
  dueDate: string;
  estimatedMinutes?: number;
}

export interface RunLog {
  id: string;
  date: string;
  distanceKm: number;
  durationMinutes: number;
  avgPace: string;
  calories: number;
  routeLocation?: string;
}

export interface WorkoutLog {
  id: string;
  date: string;
  routineName: string;
  durationMinutes: number;
  totalVolumeKg: number;
}

export interface MealLog {
  id: string;
  date: string;
  mealType: MealType;
  foodName: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface WaterLog {
  id: string;
  date: string;
  amountMl: number;
}

export interface Habit {
  id: string;
  name: string;
  category: string;
  streak: number;
  completedDates: string[];
}

export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
}

export interface UserSettings {
  userName: string;
  dailyStudyTargetHours: number;
  dailyRunTargetKm: number;
  dailyProteinTargetGrams: number;
  dailyWaterTargetLiters: number;
  dailyCalorieTarget: number;
}

export interface LifeOSContextType {
  subjects: Subject[];
  studySessions: StudySession[];
  tasks: Task[];
  runs: RunLog[];
  workouts: WorkoutLog[];
  meals: MealLog[];
  waterLogs: WaterLog[];
  habits: Habit[];
  goals: Goal[];
  settings: UserSettings;
  
  addStudySession: (session: Omit<StudySession, 'id'>) => void;
  toggleTask: (id: string) => void;
  addTask: (task: Omit<Task, 'id' | 'completed'>) => void;
  toggleTopicStatus: (subjectId: string, unitId: string, chapterId: string, topicId: string) => void;
  addRun: (run: Omit<RunLog, 'id'>) => void;
  addWorkout: (workout: Omit<WorkoutLog, 'id'>) => void;
  addMeal: (meal: Omit<MealLog, 'id'>) => void;
  addWater: (amountMl: number) => void;
  toggleHabitToday: (habitId: string) => void;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  exportAllData: () => void;
  importAllData: (jsonData: string) => boolean;
  resetAllData: () => void;
  
  getTodayProgress: () => number;
  getOverallSyllabusProgress: () => number;
  getTodayWaterTotal: () => number;
  getTodayProteinTotal: () => number;
  getTodayCaloriesTotal: () => number;
  getTodayStudyTimeMinutes: () => number;
  getTodayRunKm: () => number;
}

const defaultSettings: UserSettings = {
  userName: "Harsh Kohli",
  dailyStudyTargetHours: 4,
  dailyRunTargetKm: 5,
  dailyProteinTargetGrams: 140,
  dailyWaterTargetLiters: 3.5,
  dailyCalorieTarget: 2500,
};

const getTodayStr = (): string => new Date().toISOString().split('T')[0];

const defaultSubjects: Subject[] = [
  {
    id: 'sub-1',
    name: 'Economics',
    color: '#3B82F6',
    icon: 'BookOpen',
    targetExamDate: '2026-11-15',
    weightage: 35,
    units: [
      {
        id: 'u-1',
        title: 'Unit 1: Microeconomics',
        chapters: [
          {
            id: 'c-1',
            title: 'Consumer Theory',
            topics: [
              { id: 't-1', title: 'Consumer Utility Analysis', status: 'completed', revisionsCompleted: 2 },
              { id: 't-2', title: 'Demand & Elasticity', status: 'completed', revisionsCompleted: 1 },
              { id: 't-3', title: 'Indifference Curve Analysis', status: 'revision_due', revisionsCompleted: 1 }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'sub-2',
    name: 'Mathematics',
    color: '#8B5CF6',
    icon: 'Calculator',
    targetExamDate: '2026-11-20',
    weightage: 35,
    units: [
      {
        id: 'u-3',
        title: 'Unit 1: Calculus',
        chapters: [
          {
            id: 'c-4',
            title: 'Integration',
            topics: [
              { id: 't-8', title: 'Definite Integrals', status: 'completed', revisionsCompleted: 3 }
            ]
          }
        ]
      }
    ]
  }
];

const defaultStudySessions: StudySession[] = [
  { id: 's1', subjectId: 'sub-1', subjectName: 'Economics', topicTitle: 'Consumer Utility', durationMinutes: 90, date: getTodayStr() }
];

const defaultTasks: Task[] = [
  { id: 'tk1', title: 'Complete Economics Chapter 1', category: 'study', priority: 'high', completed: false, dueDate: getTodayStr() },
  { id: 'tk2', title: 'Evening 5KM Tempo Run', category: 'fitness', priority: 'high', completed: true, dueDate: getTodayStr() }
];

const defaultRuns: RunLog[] = [
  { id: 'r1', date: getTodayStr(), distanceKm: 5.2, durationMinutes: 28, avgPace: '5:23 min/km', calories: 410, routeLocation: 'Central Park' }
];

const defaultWorkouts: WorkoutLog[] = [
  { id: 'w1', date: getTodayStr(), routineName: 'Push Day', durationMinutes: 55, totalVolumeKg: 4850 }
];

const defaultMeals: MealLog[] = [
  { id: 'm1', date: getTodayStr(), mealType: 'Breakfast', foodName: 'Oats & Eggs', calories: 550, proteinGrams: 45, carbsGrams: 60, fatGrams: 12 }
];

const defaultWaterLogs: WaterLog[] = [
  { id: 'wt1', date: getTodayStr(), amountMl: 1500 }
];

const defaultHabits: Habit[] = [
  { id: 'h1', name: 'Wake Up at 6:00 AM', category: 'Discipline', streak: 12, completedDates: [getTodayStr()] }
];

const defaultGoals: Goal[] = [
  { id: 'g1', title: 'Complete Syllabus', category: 'study', targetValue: 100, currentValue: 48, unit: '%', deadline: '2026-11-15' }
];

const safeParse = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

export const LifeOSContext = createContext<LifeOSContextType | undefined>(undefined);

export const LifeOSProvider = ({ children }: { children: ReactNode }) => {
  const [subjects, setSubjects] = useState<Subject[]>(() => safeParse('lifeos_subjects', defaultSubjects));
  const [studySessions, setStudySessions] = useState<StudySession[]>(() => safeParse('lifeos_study', defaultStudySessions));
  const [tasks, setTasks] = useState<Task[]>(() => safeParse('lifeos_tasks', defaultTasks));
  const [runs, setRuns] = useState<RunLog[]>(() => safeParse('lifeos_runs', defaultRuns));
  const [workouts, setWorkouts] = useState<WorkoutLog[]>(() => safeParse('lifeos_workouts', defaultWorkouts));
  const [meals, setMeals] = useState<MealLog[]>(() => safeParse('lifeos_meals', defaultMeals));
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>(() => safeParse('lifeos_water', defaultWaterLogs));
  const [habits, setHabits] = useState<Habit[]>(() => safeParse('lifeos_habits', defaultHabits));
  const [goals] = useState<Goal[]>(defaultGoals);
  const [settings, setSettings] = useState<UserSettings>(() => safeParse('lifeos_settings', defaultSettings));

  useEffect(() => localStorage.setItem('lifeos_subjects', JSON.stringify(subjects)), [subjects]);
  useEffect(() => localStorage.setItem('lifeos_study', JSON.stringify(studySessions)), [studySessions]);
  useEffect(() => localStorage.setItem('lifeos_tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem('lifeos_runs', JSON.stringify(runs)), [runs]);
  useEffect(() => localStorage.setItem('lifeos_workouts', JSON.stringify(workouts)), [workouts]);
  useEffect(() => localStorage.setItem('lifeos_meals', JSON.stringify(meals)), [meals]);
  useEffect(() => localStorage.setItem('lifeos_water', JSON.stringify(waterLogs)), [waterLogs]);
  useEffect(() => localStorage.setItem('lifeos_habits', JSON.stringify(habits)), [habits]);
  useEffect(() => localStorage.setItem('lifeos_settings', JSON.stringify(settings)), [settings]);

  const addStudySession = (session: Omit<StudySession, 'id'>) => {
    setStudySessions(prev => [{ ...session, id: Date.now().toString() }, ...prev]);
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const addTask = (task: Omit<Task, 'id' | 'completed'>) => {
    setTasks(prev => [{ ...task, id: Date.now().toString(), completed: false }, ...prev]);
  };

  const toggleTopicStatus = (subjectId: string, unitId: string, chapterId: string, topicId: string) => {
    const statusMap: Record<TopicStatus, TopicStatus> = {
      'not_started': 'in_progress',
      'in_progress': 'completed',
      'completed': 'revision_due',
      'revision_due': 'revision_completed',
      'revision_completed': 'completed'
    };

    setSubjects(prev => prev.map(sub => {
      if (sub.id !== subjectId) return sub;
      return {
        ...sub,
        units: sub.units.map(u => {
          if (u.id !== unitId) return u;
          return {
            ...u,
            chapters: u.chapters.map(c => {
              if (c.id !== chapterId) return c;
              return {
                ...c,
                topics: c.topics.map(tp => {
                  if (tp.id !== topicId) return tp;
                  return {
                    ...tp,
                    status: statusMap[tp.status],
                    revisionsCompleted: tp.status === 'in_progress' ? tp.revisionsCompleted + 1 : tp.revisionsCompleted
                  };
                })
              };
            })
          };
        })
      };
    }));
  };

  const addRun = (run: Omit<RunLog, 'id'>) => {
    setRuns(prev => [{ ...run, id: Date.now().toString() }, ...prev]);
  };

  const addWorkout = (workout: Omit<WorkoutLog, 'id'>) => {
    setWorkouts(prev => [{ ...workout, id: Date.now().toString() }, ...prev]);
  };

  const addMeal = (meal: Omit<MealLog, 'id'>) => {
    setMeals(prev => [{ ...meal, id: Date.now().toString() }, ...prev]);
  };

  const addWater = (amountMl: number) => {
    setWaterLogs(prev => [{ id: Date.now().toString(), date: getTodayStr(), amountMl }, ...prev]);
  };

  const toggleHabitToday = (habitId: string) => {
    const today = getTodayStr();
    setHabits(prev => prev.map(h => {
      if (h.id !== habitId) return h;
      const doneToday = h.completedDates.includes(today);
      return {
        ...h,
        completedDates: doneToday 
          ? h.completedDates.filter(d => d !== today)
          : [...h.completedDates, today],
        streak: doneToday ? Math.max(0, h.streak - 1) : h.streak + 1
      };
    }));
  };

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const exportAllData = () => {
    const backupData = {
      settings, subjects, studySessions, tasks, runs, workouts, meals, waterLogs, habits, goals,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LifeOS_Backup_${getTodayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importAllData = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.settings) setSettings(parsed.settings);
      if (parsed.subjects) setSubjects(parsed.subjects);
      if (parsed.studySessions) setStudySessions(parsed.studySessions);
      if (parsed.tasks) setTasks(parsed.tasks);
      if (parsed.runs) setRuns(parsed.runs);
      if (parsed.workouts) setWorkouts(parsed.workouts);
      if (parsed.meals) setMeals(parsed.meals);
      if (parsed.waterLogs) setWaterLogs(parsed.waterLogs);
      if (parsed.habits) setHabits(parsed.habits);
      return true;
    } catch {
      return false;
    }
  };

  const resetAllData = () => {
    localStorage.clear();
    setSubjects(defaultSubjects);
    setStudySessions(defaultStudySessions);
    setTasks(defaultTasks);
    setRuns(defaultRuns);
    setWorkouts(defaultWorkouts);
    setMeals(defaultMeals);
    setWaterLogs(defaultWaterLogs);
    setHabits(defaultHabits);
    setSettings(defaultSettings);
  };

  const getTodayStudyTimeMinutes = (): number => {
    const today = getTodayStr();
    return studySessions.filter(s => s.date === today).reduce((acc, curr) => acc + curr.durationMinutes, 0);
  };

  const getTodayRunKm = (): number => {
    const today = getTodayStr();
    return runs.filter(r => r.date === today).reduce((acc, curr) => acc + curr.distanceKm, 0);
  };

  const getTodayWaterTotal = (): number => {
    const today = getTodayStr();
    return waterLogs.filter(w => w.date === today).reduce((acc, curr) => acc + curr.amountMl, 0);
  };

  const getTodayProteinTotal = (): number => {
    const today = getTodayStr();
    return meals.filter(m => m.date === today).reduce((acc, curr) => acc + curr.proteinGrams, 0);
  };

  const getTodayCaloriesTotal = (): number => {
    const today = getTodayStr();
    return meals.filter(m => m.date === today).reduce((acc, curr) => acc + curr.calories, 0);
  };

  const getOverallSyllabusProgress = (): number => {
    let total = 0;
    let completed = 0;
    subjects.forEach(sub => {
      sub.units.forEach(u => {
        u.chapters.forEach(c => {
          c.topics.forEach(tp => {
            total++;
            if (tp.status === 'completed' || tp.status === 'revision_due' || tp.status === 'revision_completed') {
              completed++;
            }
          });
        });
      });
    });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  };

  const getTodayProgress = (): number => {
    const studyRatio = Math.min(1, (getTodayStudyTimeMinutes() / 60) / settings.dailyStudyTargetHours);
    const runRatio = Math.min(1, getTodayRunKm() / settings.dailyRunTargetKm);
    const proteinRatio = Math.min(1, getTodayProteinTotal() / settings.dailyProteinTargetGrams);
    const waterRatio = Math.min(1, (getTodayWaterTotal() / 1000) / settings.dailyWaterTargetLiters);
    
    const todayTasks = tasks.filter(t => t.dueDate === getTodayStr());
    const tasksDone = todayTasks.filter(t => t.completed).length;
    const taskRatio = todayTasks.length > 0 ? tasksDone / todayTasks.length : 1;

    const overall = (studyRatio * 0.3) + (runRatio * 0.2) + (proteinRatio * 0.2) + (waterRatio * 0.15) + (taskRatio * 0.15);
    return Math.round(overall * 100);
  };

  return (
    <LifeOSContext.Provider value={{
      subjects, studySessions, tasks, runs, workouts, meals, waterLogs, habits, goals, settings,
      addStudySession, toggleTask, addTask, toggleTopicStatus, addRun, addWorkout, addMeal, addWater, toggleHabitToday,
      updateSettings, exportAllData, importAllData, resetAllData,
      getTodayProgress, getOverallSyllabusProgress, getTodayWaterTotal, getTodayProteinTotal, getTodayCaloriesTotal,
      getTodayStudyTimeMinutes, getTodayRunKm
    }}>
      {children}
    </LifeOSContext.Provider>
  );
};

export const useLifeOS = () => {
  const context = useContext(LifeOSContext);
  if (!context) throw new Error("useLifeOS must be used within a LifeOSProvider");
  return context;
};