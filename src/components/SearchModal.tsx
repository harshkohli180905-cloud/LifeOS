import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Search,
  X,
  BookOpen,
  CheckSquare,
  Target,
  Dumbbell,
  Utensils,
  Clock3,
  ChevronRight,
  ArrowUpRight,
  
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type SearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (section: string) => void;
};

type Result = {
  id: string;
  title: string;
  subtitle: string;
  type:
    | 'subject'
    | 'topic'
    | 'task'
    | 'goal'
    | 'workout'
    | 'meal';
  module: string;
  extra?: string;
  data?: Record<string, unknown>;
};

const RECENT_KEY = 'lifeos-recent-searches';

function getIcon(type: Result['type']) {
  switch (type) {
    case 'subject':
    case 'topic':
      return BookOpen;

    case 'task':
      return CheckSquare;

    case 'goal':
      return Target;

    case 'workout':
      return Dumbbell;

    case 'meal':
      return Utensils;

    default:
      return Search;
  }
}

function getTypeLabel(type: Result['type']) {
  switch (type) {
    case 'subject':
      return 'Subject';

    case 'topic':
      return 'Topic';

    case 'task':
      return 'Task';

    case 'goal':
      return 'Goal';

    case 'workout':
      return 'Workout';

    case 'meal':
      return 'Meal';

    default:
      return '';
  }
}

export default function SearchModal({
  isOpen,
  onClose,
  onNavigate,
}: SearchModalProps) {
  const { user } = useAuth();

  const [query, setQuery] =
    useState('');

  const [results, setResults] =
    useState<Result[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [activeFilter, setActiveFilter] =
    useState<'all' | Result['type']>(
      'all'
    );

  const [selected, setSelected] =
    useState<Result | null>(null);

  const [recentSearches, setRecentSearches] =
    useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    try {
      const stored =
        localStorage.getItem(
          RECENT_KEY
        );

      if (stored) {
        const parsed =
          JSON.parse(stored);

        if (Array.isArray(parsed)) {
          setRecentSearches(
            parsed.filter(
              (item): item is string =>
                typeof item === 'string'
            )
          );
        }
      }
    } catch {
      setRecentSearches([]);
    }
  }, [isOpen]);

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

  useEffect(() => {
    if (!isOpen) return;

    const handleSlash = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === '/' &&
        document.activeElement?.tagName !==
          'INPUT' &&
        document.activeElement?.tagName !==
          'TEXTAREA'
      ) {
        event.preventDefault();

        const input =
          document.getElementById(
            'lifeos-global-search'
          ) as HTMLInputElement | null;

        input?.focus();
      }
    };

    window.addEventListener(
      'keydown',
      handleSlash
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleSlash
      );
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !user) return;

    const trimmed =
      query.trim();

    if (!trimmed) {
      setResults([]);
      setSelected(null);
      return;
    }

    const timer = window.setTimeout(
      async () => {
        await searchEverything(trimmed);
      },
      180
    );

    return () =>
      window.clearTimeout(timer);
  }, [query, isOpen, user]);

  const searchEverything = async (
    searchText: string
  ) => {
    if (!user) return;

    setLoading(true);

    try {
      const pattern = `%${searchText}%`;

      const [
        subjectsResult,
        topicsResult,
        tasksResult,
        goalsResult,
        workoutsResult,
        mealsResult,
      ] = await Promise.all([
        supabase
          .from('subjects')
          .select(
            'id, name, description'
          )
          .eq('user_id', user.id)
          .or(
            `name.ilike.${pattern},description.ilike.${pattern}`
          )
          .limit(20),

        supabase
          .from('topics')
          .select(
            'id, name, completed, status'
          )
          .eq('user_id', user.id)
          .ilike(
            'name',
            pattern
          )
          .limit(30),

        supabase
          .from('tasks')
          .select(
            'id, title, description, completed, priority, due_date, category'
          )
          .eq('user_id', user.id)
          .or(
            `title.ilike.${pattern},description.ilike.${pattern}`
          )
          .limit(30),

        supabase
          .from('goals')
          .select(
            'id, title, description, progress, target, deadline, completed, category, unit'
          )
          .eq('user_id', user.id)
          .or(
            `title.ilike.${pattern},description.ilike.${pattern}`
          )
          .limit(30),

        supabase
          .from('workouts')
          .select(
            'id, name, date, duration_seconds, notes'
          )
          .eq('user_id', user.id)
          .or(
            `name.ilike.${pattern},notes.ilike.${pattern}`
          )
          .limit(30),

        supabase
          .from('meals')
          .select(
            'id, name, meal_type, date, calories, protein, carbs, fat'
          )
          .eq('user_id', user.id)
          .or(
            `name.ilike.${pattern},meal_type.ilike.${pattern}`
          )
          .limit(30),
      ]);

      const combined: Result[] = [];

      for (
        const subject of
        subjectsResult.data ?? []
      ) {
        combined.push({
          id: subject.id,
          title: subject.name,
          subtitle:
            subject.description ||
            'Study subject',
          type: 'subject',
          module: 'study',
        });
      }

      for (
        const topic of
        topicsResult.data ?? []
      ) {
        combined.push({
          id: topic.id,
          title: topic.name,
          subtitle:
            topic.completed
              ? 'Completed topic'
              : 'Study topic',
          type: 'topic',
          module: 'study',
          extra:
            topic.status ||
            'not_started',
        });
      }

      for (
        const task of
        tasksResult.data ?? []
      ) {
        combined.push({
          id: task.id,
          title: task.title,
          subtitle:
            task.description ||
            `${task.category || 'Personal'} task`,
          type: 'task',
          module: 'tasks',
          extra: task.completed
            ? 'Completed'
            : 'Active',
          data: task,
        });
      }

      for (
        const goal of
        goalsResult.data ?? []
      ) {
        combined.push({
          id: goal.id,
          title: goal.title,
          subtitle:
            goal.description ||
            `${goal.category || 'Goal'} goal`,
          type: 'goal',
          module: 'goals',
          extra: `${Number(
            goal.progress || 0
          )}${goal.unit || ''} / ${Number(
            goal.target || 0
          )}${goal.unit || ''}`,
          data: goal,
        });
      }

      for (
        const workout of
        workoutsResult.data ?? []
      ) {
        const durationMinutes =
          Math.round(
            Number(
              workout.duration_seconds || 0
            ) / 60
          );

        combined.push({
          id: workout.id,
          title: workout.name,
          subtitle:
            workout.notes ||
            'Workout session',
          type: 'workout',
          module: 'fitness',
          extra: `${durationMinutes} min`,
          data: workout,
        });
      }

      for (
        const meal of
        mealsResult.data ?? []
      ) {
        combined.push({
          id: meal.id,
          title: meal.name,
          subtitle:
            meal.meal_type ||
            'Meal',
          type: 'meal',
          module: 'fitness',
          extra: `${Number(
            meal.calories || 0
          )} kcal`,
          data: meal,
        });
      }

      setResults(combined);

      setSelected(
        combined.length > 0
          ? combined[0]
          : null
      );
    } catch (error) {
      console.error(
        'Search error:',
        error
      );

      setResults([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults =
    useMemo(() => {
      if (activeFilter === 'all') {
        return results;
      }

      return results.filter(
        (result) =>
          result.type === activeFilter
      );
    }, [results, activeFilter]);

  const availableTypes =
    useMemo(() => {
      return Array.from(
        new Set(
          results.map(
            (result) => result.type
          )
        )
      );
    }, [results]);

  const saveRecentSearch = (
    value: string
  ) => {
    const clean =
      value.trim();

    if (!clean) return;

    const next = [
      clean,
      ...recentSearches.filter(
        (item) =>
          item.toLowerCase() !==
          clean.toLowerCase()
      ),
    ].slice(0, 8);

    setRecentSearches(next);

    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(next)
    );
  };

  const removeRecentSearch = (
    value: string
  ) => {
    const next =
      recentSearches.filter(
        (item) => item !== value
      );

    setRecentSearches(next);

    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(next)
    );
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);

    localStorage.removeItem(
      RECENT_KEY
    );
  };

  const handleResultClick = (
    result: Result
  ) => {
    setSelected(result);
    saveRecentSearch(query);
  };

  const openModule = (
    result: Result
  ) => {
    saveRecentSearch(query);

    onNavigate?.(result.module);

    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-3 pt-[8vh] backdrop-blur-sm sm:p-6 sm:pt-[10vh]"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[82vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#151515]">
        <div className="border-b border-gray-200 p-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <Search
              size={20}
              className="shrink-0 text-gray-400"
            />

            <input
              id="lifeos-global-search"
              autoFocus
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  selected
                ) {
                  openModule(selected);
                }
              }}
              placeholder="Search anything in LifeOS..."
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-gray-400 dark:text-white"
            />

            <kbd className="hidden rounded-md border border-gray-200 px-2 py-1 text-[10px] text-gray-400 sm:block dark:border-white/10">
              ESC
            </kbd>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {query.trim() &&
            results.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() =>
                    setActiveFilter(
                      'all'
                    )
                  }
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                    activeFilter ===
                    'all'
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-gray-100 text-gray-500 dark:bg-white/5'
                  }`}
                >
                  All
                </button>

                {availableTypes.map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() =>
                        setActiveFilter(
                          type
                        )
                      }
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                        activeFilter ===
                        type
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'bg-gray-100 text-gray-500 dark:bg-white/5'
                      }`}
                    >
                      {getTypeLabel(
                        type
                      )}
                    </button>
                  )
                )}
              </div>
            )}
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[1.1fr_0.9fr]">
          <div className="min-h-0 overflow-y-auto border-b border-gray-200 dark:border-white/10 md:border-b-0 md:border-r">
            {!query.trim() ? (
              <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Recent searches
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Quickly return to something you searched before.
                    </p>
                  </div>

                  {recentSearches.length >
                    0 && (
                    <button
                      onClick={
                        clearRecentSearches
                      }
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {recentSearches.length ===
                0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-white/10">
                    <Clock3
                      className="mx-auto text-gray-400"
                      size={24}
                    />

                    <p className="mt-3 text-sm text-gray-500">
                      No recent searches
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Try searching for a subject, task or goal.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentSearches.map(
                      (item) => (
                        <div
                          key={item}
                          className="group flex items-center gap-2 rounded-xl px-3 py-3 transition hover:bg-gray-50 dark:hover:bg-white/5"
                        >
                          <Clock3
                            size={16}
                            className="text-gray-400"
                          />

                          <button
                            onClick={() =>
                              setQuery(
                                item
                              )
                            }
                            className="min-w-0 flex-1 truncate text-left text-sm text-gray-700 dark:text-gray-300"
                          >
                            {item}
                          </button>

                          <button
                            onClick={() =>
                              removeRecentSearch(
                                item
                              )
                            }
                            className="rounded-lg p-1.5 text-gray-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                          >
                            <X
                              size={14}
                            />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            ) : loading ? (
              <div className="flex min-h-[280px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-black dark:border-white/10 dark:border-t-white" />

                  <p className="mt-3 text-sm text-gray-500">
                    Searching...
                  </p>
                </div>
              </div>
            ) : filteredResults.length ===
              0 ? (
              <div className="flex min-h-[280px] items-center justify-center p-6 text-center">
                <div>
                  <Search
                    className="mx-auto text-gray-300 dark:text-gray-600"
                    size={32}
                  />

                  <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    No results found
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Try another keyword.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2">
                {filteredResults.map(
                  (result) => {
                    const Icon =
                      getIcon(
                        result.type
                      );

                    const isSelected =
                      selected?.id ===
                        result.id &&
                      selected?.type ===
                        result.type;

                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() =>
                          handleResultClick(
                            result
                          )
                        }
                        className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                          isSelected
                            ? 'bg-gray-100 dark:bg-white/10'
                            : 'hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300">
                          <Icon
                            size={18}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {result.title}
                            </p>

                            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-white/5">
                              {getTypeLabel(
                                result.type
                              )}
                            </span>
                          </div>

                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            {result.subtitle}
                          </p>
                        </div>

                        {result.extra && (
                          <span className="hidden shrink-0 text-xs text-gray-400 sm:block">
                            {result.extra}
                          </span>
                        )}

                        <ChevronRight
                          size={16}
                          className="shrink-0 text-gray-300"
                        />
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>

          <div className="hidden min-h-0 overflow-y-auto p-5 md:block">
            {selected ? (
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {(() => {
                      const Icon =
                        getIcon(
                          selected.type
                        );

                      return (
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white">
                          <Icon
                            size={22}
                          />
                        </div>
                      );
                    })()}

                    <span className="mt-4 inline-block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      {getTypeLabel(
                        selected.type
                      )}
                    </span>

                    <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                      {selected.title}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      {selected.subtitle}
                    </p>
                  </div>
                </div>

                {selected.extra && (
                  <div className="mt-5 rounded-xl bg-gray-50 p-4 dark:bg-white/5">
                    <p className="text-xs text-gray-400">
                      Status / Details
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                      {selected.extra}
                    </p>
                  </div>
                )}

                {selected.type ===
                  'task' &&
                  selected.data && (
                    <div className="mt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          Priority
                        </span>

                        <span className="font-medium text-gray-900 dark:text-white">
                          {String(
                            selected.data
                              .priority ||
                              'Normal'
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          Category
                        </span>

                        <span className="font-medium text-gray-900 dark:text-white">
                          {String(
                            selected.data
                              .category ||
                              'Personal'
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          Due
                        </span>

                        <span className="font-medium text-gray-900 dark:text-white">
                          {String(
                            selected.data
                              .due_date ||
                              'No date'
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                {selected.type ===
                  'goal' &&
                  selected.data && (
                    <div className="mt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          Progress
                        </span>

                        <span className="font-medium text-gray-900 dark:text-white">
                          {String(
                            selected.data
                              .progress ||
                              0
                          )}
                          {' / '}
                          {String(
                            selected.data
                              .target ||
                              0
                          )}
                          {String(
                            selected.data
                              .unit || ''
                          )}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-yellow-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Number(
                                selected.data
                                  .target ||
                                  0
                              ) > 0
                                ? (Number(
                                    selected.data
                                      .progress ||
                                      0
                                  ) /
                                    Number(
                                      selected.data
                                        .target ||
                                        1
                                    )) *
                                  100
                                : 0
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          Deadline
                        </span>

                        <span className="font-medium text-gray-900 dark:text-white">
                          {String(
                            selected.data
                              .deadline ||
                              'No deadline'
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                {selected.type ===
                  'meal' &&
                  selected.data && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/5">
                        <p className="text-xs text-gray-500">
                          Calories
                        </p>

                        <p className="mt-1 font-semibold">
                          {String(
                            selected.data
                              .calories ||
                              0
                          )}{' '}
                          kcal
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/5">
                        <p className="text-xs text-gray-500">
                          Protein
                        </p>

                        <p className="mt-1 font-semibold">
                          {String(
                            selected.data
                              .protein ||
                              0
                          )}
                          g
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/5">
                        <p className="text-xs text-gray-500">
                          Carbs
                        </p>

                        <p className="mt-1 font-semibold">
                          {String(
                            selected.data
                              .carbs ||
                              0
                          )}
                          g
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/5">
                        <p className="text-xs text-gray-500">
                          Fat
                        </p>

                        <p className="mt-1 font-semibold">
                          {String(
                            selected.data
                              .fat ||
                              0
                          )}
                          g
                        </p>
                      </div>
                    </div>
                  )}

                <button
                  onClick={() =>
                    openModule(
                      selected
                    )
                  }
                  className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-black"
                >
                  Open in{' '}
                  {selected.module ===
                  'study'
                    ? 'Study'
                    : selected.module ===
                      'fitness'
                    ? 'Fitness'
                    : selected.module ===
                      'tasks'
                    ? 'Tasks'
                    : 'Goals'}
                  <ArrowUpRight
                    size={16}
                  />
                </button>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <Search
                    className="mx-auto text-gray-300 dark:text-gray-600"
                    size={36}
                  />

                  <p className="mt-4 text-sm font-medium text-gray-500">
                    Select a result
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Its details will appear here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {query.trim() &&
          filteredResults.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-white/10">
              <p className="text-[11px] text-gray-400">
                {filteredResults.length}{' '}
                result
                {filteredResults.length !==
                1
                  ? 's'
                  : ''}
              </p>

              <p className="hidden text-[11px] text-gray-400 sm:block">
                Press Enter to open selected result
              </p>
            </div>
          )}
      </div>
    </div>
  );
}