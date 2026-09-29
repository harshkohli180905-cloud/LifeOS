import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Edit3,
  FileText,
  Flame,
  History,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Square,
  Trash2,
  X,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getLocalDate } from '../lib/date';
import type { TopicStatus } from '../types';


type StudyTab =
  | 'overview'
  | 'revision'
  | 'sessions';

type Subject = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  target_exam_date: string | null;
  weightage: number | null;
  created_at: string;
};

type Topic = {
  id: string;
  user_id: string;
  subject_id: string;
  parent_topic_id: string | null;
  name: string;
  completed: boolean;
  position: number;
  status: TopicStatus;
  revisions_completed: number;
  created_at: string;
  updated_at: string;
};

type StudySession = {
  id: string;
  user_id: string;
  subject_id: string | null;
  topic_id: string | null;
  name: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  created_at: string;
};

type TimerState = {
  running: boolean;
  name: string;
  subjectId: string;
  topicId: string;
  startedAt: number | null;
  accumulatedSeconds: number;
};

const TIMER_STORAGE_PREFIX =
  'lifeos-active-study-timer:';

const EMPTY_TIMER: TimerState = {
  running: false,
  name: 'Study Session',
  subjectId: '',
  topicId: '',
  startedAt: null,
  accumulatedSeconds: 0,
};

const SUBJECT_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#059669',
  '#0891b2',
  '#ca8a04',
  '#475569',
];

const SUBJECT_ICONS = [
  '📚',
  '📖',
  '🧠',
  '💻',
  '📐',
  '🔬',
  '📝',
  '🎯',
];

function getTimerKey(
  userId: string,
) {
  return `${TIMER_STORAGE_PREFIX}${userId}`;
}



function formatTime(
  totalSeconds: number,
) {
  const safeSeconds =
    Math.max(
      0,
      Math.floor(
        totalSeconds || 0,
      ),
    );

  const hours = Math.floor(
    safeSeconds / 3600,
  );

  const minutes = Math.floor(
    (safeSeconds % 3600) /
      60,
  );

  const seconds =
    safeSeconds % 60;

  if (hours > 0) {
    return `${String(
      hours,
    ).padStart(
      2,
      '0',
    )}:${String(
      minutes,
    ).padStart(
      2,
      '0',
    )}:${String(
      seconds,
    ).padStart(
      2,
      '0',
    )}`;
  }

  return `${String(
    minutes,
  ).padStart(
    2,
    '0',
  )}:${String(
    seconds,
  ).padStart(
    2,
    '0',
  )}`;
}

function formatDuration(
  seconds: number,
) {
  const safe =
    Math.max(
      0,
      Math.round(
        seconds || 0,
      ),
    );

  const hours =
    Math.floor(
      safe / 3600,
    );

  const minutes =
    Math.floor(
      (safe % 3600) /
        60,
    );

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function getElapsedSeconds(
  timer: TimerState,
) {
  if (
    !timer.running ||
    !timer.startedAt
  ) {
    return timer.accumulatedSeconds;
  }

  return (
    timer.accumulatedSeconds +
    Math.max(
      0,
      Math.floor(
        (Date.now() -
          timer.startedAt) /
          1000,
      ),
    )
  );
}

function loadStoredTimer(
  userId: string,
): TimerState {
  try {
    const raw =
      localStorage.getItem(
        getTimerKey(userId),
      );

    if (!raw) {
      return EMPTY_TIMER;
    }

    const parsed =
      JSON.parse(
        raw,
      ) as Partial<TimerState>;

    return {
      ...EMPTY_TIMER,
      ...parsed,
      running:
        parsed.running === true,
      accumulatedSeconds:
        Number(
          parsed.accumulatedSeconds ??
            0,
        ),
      startedAt:
        parsed.startedAt
          ? Number(
              parsed.startedAt,
            )
          : null,
    };
  } catch {
    return EMPTY_TIMER;
  }
}

function saveStoredTimer(
  userId: string,
  timer: TimerState,
) {
  localStorage.setItem(
    getTimerKey(userId),
    JSON.stringify(timer),
  );
}

function clearStoredTimer(
  userId: string,
) {
  localStorage.removeItem(
    getTimerKey(userId),
  );
}

function getStatusLabel(
  status: TopicStatus,
) {
  switch (status) {
    case 'in_progress':
      return 'In progress';

    case 'completed':
      return 'Completed';

    case 'revision_due':
      return 'Revision due';

    case 'revision_completed':
      return 'Revision completed';

    default:
      return 'Not started';
  }
}

function getStatusClass(
  status: TopicStatus,
) {
  switch (status) {
    case 'completed':
      return 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400';

    case 'in_progress':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400';

    case 'revision_due':
      return 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400';

    case 'revision_completed':
      return 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400';

    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  }
}

function StudyView() {
  const { user } =
    useAuth();

  const [tab, setTab] =
    useState<StudyTab>(
      'overview',
    );

  const [subjects, setSubjects] =
    useState<Subject[]>(
      [],
    );

  const [topics, setTopics] =
    useState<Topic[]>(
      [],
    );

  const [sessions, setSessions] =
    useState<StudySession[]>(
      [],
    );

  const [selectedSubjectId, setSelectedSubjectId] =
    useState('');

  const [selectedTopicId, setSelectedTopicId] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [showSubjectModal, setShowSubjectModal] =
    useState(false);

  const [showTopicModal, setShowTopicModal] =
    useState(false);

  const [showTimerModal, setShowTimerModal] =
    useState(false);

  const [editingSubject, setEditingSubject] =
    useState<Subject | null>(
      null,
    );

  const [editingTopic, setEditingTopic] =
    useState<Topic | null>(
      null,
    );

  const [subjectName, setSubjectName] =
    useState('');

  const [subjectDescription, setSubjectDescription] =
    useState('');

  const [subjectColor, setSubjectColor] =
    useState(
      SUBJECT_COLORS[0],
    );

  const [subjectIcon, setSubjectIcon] =
    useState(
      SUBJECT_ICONS[0],
    );

  const [topicName, setTopicName] =
    useState('');

  const [topicParentId, setTopicParentId] =
    useState('');

  const [timer, setTimer] =
    useState<TimerState>(
      EMPTY_TIMER,
    );

  const [timerSeconds, setTimerSeconds] =
    useState(0);

  const [sessionName, setSessionName] =
    useState(
      'Study Session',
    );

  const timerRef =
    useRef<TimerState>(
      EMPTY_TIMER,
    );

  const intervalRef =
    useRef<ReturnType<
      typeof setInterval
    > | null>(null);

  /*
   * --------------------------------------------------
   * TIMER STORAGE
   * --------------------------------------------------
   */

  const saveTimer = useCallback(
    (
      next: TimerState,
    ) => {
      timerRef.current =
        next;

      setTimer(next);

      if (user) {
        saveStoredTimer(
          user.id,
          next,
        );
      }
    },
    [user],
  );

  /*
   * --------------------------------------------------
   * LOAD DATA
   * --------------------------------------------------
   */

  const loadData =
    useCallback(
      async () => {
        if (!user) {
          return;
        }

        setLoading(true);

        const [
          subjectsResult,
          topicsResult,
          sessionsResult,
        ] =
          await Promise.all([
            supabase
              .from('subjects')
              .select(
                `
                id,
                user_id,
                name,
                description,
                color,
                icon,
                target_exam_date,
                weightage,
                created_at
                `,
              )
              .eq(
                'user_id',
                user.id,
              )
              .order(
                'created_at',
                {
                  ascending: true,
                },
              ),

            supabase
              .from('topics')
              .select(
                `
                id,
                user_id,
                subject_id,
                parent_topic_id,
                name,
                completed,
                position,
                status,
                revisions_completed,
                created_at,
                updated_at
                `,
              )
              .eq(
                'user_id',
                user.id,
              )
              .order(
                'position',
                {
                  ascending: true,
                },
              ),

            supabase
              .from(
                'study_sessions',
              )
              .select(
                `
                id,
                user_id,
                subject_id,
                topic_id,
                name,
                started_at,
                ended_at,
                duration_seconds,
                created_at
                `,
              )
              .eq(
                'user_id',
                user.id,
              )
              .order(
                'started_at',
                {
                  ascending: false,
                },
              )
              .limit(100),
          ]);

        if (
          subjectsResult.error
        ) {
          console.error(
            'Subjects load error:',
            subjectsResult.error,
          );
        }

        if (
          topicsResult.error
        ) {
          console.error(
            'Topics load error:',
            topicsResult.error,
          );
        }

        if (
          sessionsResult.error
        ) {
          console.error(
            'Sessions load error:',
            sessionsResult.error,
          );
        }

        const loadedSubjects =
          (subjectsResult.data ??
            []) as Subject[];

        const loadedTopics =
          (topicsResult.data ??
            []) as Topic[];

        const loadedSessions =
          (sessionsResult.data ??
            []) as StudySession[];

        setSubjects(
          loadedSubjects,
        );

        setTopics(
          loadedTopics,
        );

        setSessions(
          loadedSessions,
        );

        if (
          !selectedSubjectId &&
          loadedSubjects.length >
            0
        ) {
          setSelectedSubjectId(
            loadedSubjects[0].id,
          );
        }

        setLoading(false);
      },
      [
        user,
        selectedSubjectId,
      ],
    );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /*
   * --------------------------------------------------
   * RESTORE TIMER
   * --------------------------------------------------
   */

  useEffect(() => {
    if (!user) {
      return;
    }

    const stored =
      loadStoredTimer(
        user.id,
      );

    timerRef.current =
      stored;

    setTimer(stored);

    setTimerSeconds(
      getElapsedSeconds(
        stored,
      ),
    );

    if (
      stored.name
    ) {
      setSessionName(
        stored.name,
      );
    }

    if (
      stored.subjectId
    ) {
      setSelectedSubjectId(
        stored.subjectId,
      );
    }

    if (
      stored.topicId
    ) {
      setSelectedTopicId(
        stored.topicId,
      );
    }
  }, [user]);

  /*
   * --------------------------------------------------
   * TIMER INTERVAL
   * --------------------------------------------------
   */

  useEffect(() => {
    if (
      intervalRef.current
    ) {
      clearInterval(
        intervalRef.current,
      );

      intervalRef.current =
        null;
    }

    if (
      timer.running
    ) {
      setTimerSeconds(
        getElapsedSeconds(
          timer,
        ),
      );

      intervalRef.current =
        setInterval(() => {
          setTimerSeconds(
            getElapsedSeconds(
              timerRef.current,
            ),
          );
        }, 1000);
    }

    return () => {
      if (
        intervalRef.current
      ) {
        clearInterval(
          intervalRef.current,
        );

        intervalRef.current =
          null;
      }
    };
  }, [timer.running]);

  /*
   * --------------------------------------------------
   * VISIBILITY TIMER RECOVERY
   * --------------------------------------------------
   */

  useEffect(() => {
    const refreshTimer =
      () => {
        setTimerSeconds(
          getElapsedSeconds(
            timerRef.current,
          ),
        );
      };

    document.addEventListener(
      'visibilitychange',
      refreshTimer,
    );

    window.addEventListener(
      'focus',
      refreshTimer,
    );

    return () => {
      document.removeEventListener(
        'visibilitychange',
        refreshTimer,
      );

      window.removeEventListener(
        'focus',
        refreshTimer,
      );
    };
  }, []);

  /*
   * --------------------------------------------------
   * SELECTED SUBJECT / TOPICS
   * --------------------------------------------------
   */

  const selectedSubject =
    useMemo(
      () =>
        subjects.find(
          (subject) =>
            subject.id ===
            selectedSubjectId,
        ) ?? null,
      [
        subjects,
        selectedSubjectId,
      ],
    );

  const selectedSubjectTopics =
    useMemo(
      () =>
        topics.filter(
          (topic) =>
            topic.subject_id ===
            selectedSubjectId,
        ),
      [
        topics,
        selectedSubjectId,
      ],
    );

  const rootTopics =
    useMemo(
      () =>
        selectedSubjectTopics.filter(
          (topic) =>
            !topic.parent_topic_id,
        ),
      [
        selectedSubjectTopics,
      ],
    );

  const childTopics =
    useMemo(
      () =>
        selectedSubjectTopics.filter(
          (topic) =>
            Boolean(
              topic.parent_topic_id,
            ),
        ),
      [
        selectedSubjectTopics,
      ],
    );

  

  /*
   * --------------------------------------------------
   * SUBJECT STATS
   * --------------------------------------------------
   */

  const subjectStats =
    useMemo(() => {
      return subjects.map(
        (subject) => {
          const subjectTopics =
            topics.filter(
              (topic) =>
                topic.subject_id ===
                subject.id,
            );

          const completed =
            subjectTopics.filter(
              (topic) =>
                topic.completed,
            ).length;

          const progress =
            subjectTopics.length >
            0
              ? Math.round(
                  (completed /
                    subjectTopics.length) *
                    100,
                )
              : 0;

          const studySeconds =
            sessions
              .filter(
                (session) =>
                  session.subject_id ===
                  subject.id,
              )
              .reduce(
                (
                  sum,
                  session,
                ) =>
                  sum +
                  Number(
                    session.duration_seconds ??
                      0,
                  ),
                0,
              );

          return {
            subject,
            total:
              subjectTopics.length,
            completed,
            progress,
            studySeconds,
          };
        },
      );
    }, [
      subjects,
      topics,
      sessions,
    ]);

  /*
   * --------------------------------------------------
   * TODAY STATS
   * --------------------------------------------------
   */

  const today =
    getLocalDate();

  const todaySessions =
    useMemo(
      () =>
        sessions.filter(
          (session) =>
            session.started_at.slice(
              0,
              10,
            ) === today,
        ),
      [sessions, today],
    );

  const todayStudySeconds =
    todaySessions.reduce(
      (
        sum,
        session,
      ) =>
        sum +
        Number(
          session.duration_seconds ??
            0,
        ),
      0,
    );

  const completedTopics =
    topics.filter(
      (topic) =>
        topic.completed,
    ).length;

  const totalTopics =
    topics.length;

  const overallProgress =
    totalTopics > 0
      ? Math.round(
          (completedTopics /
            totalTopics) *
            100,
        )
      : 0;

  /*
   * --------------------------------------------------
   * SUBJECT CRUD
   * --------------------------------------------------
   */

  const openNewSubject =
    () => {
      setEditingSubject(
        null,
      );

      setSubjectName('');

      setSubjectDescription(
        '',
      );

      setSubjectColor(
        SUBJECT_COLORS[0],
      );

      setSubjectIcon(
        SUBJECT_ICONS[0],
      );

      setShowSubjectModal(
        true,
      );
    };

  const openEditSubject =
    (
      subject: Subject,
    ) => {
      setEditingSubject(
        subject,
      );

      setSubjectName(
        subject.name,
      );

      setSubjectDescription(
        subject.description ??
          '',
      );

      setSubjectColor(
        subject.color ??
          SUBJECT_COLORS[0],
      );

      setSubjectIcon(
        subject.icon ??
          SUBJECT_ICONS[0],
      );

      setShowSubjectModal(
        true,
      );
    };

  const saveSubject =
    async () => {
      if (
        !user ||
        !subjectName.trim()
      ) {
        return;
      }

      setSaving(true);

      const payload = {
        name: subjectName.trim(),
        description:
          subjectDescription.trim() ||
          null,
        color:
          subjectColor,
        icon:
          subjectIcon,
        updated_at:
          new Date().toISOString(),
      };

      if (editingSubject) {
        const {
          error,
        } = await supabase
          .from('subjects')
          .update(payload)
          .eq(
            'id',
            editingSubject.id,
          )
          .eq(
            'user_id',
            user.id,
          );

        if (error) {
          console.error(
            'Subject update error:',
            error,
          );
        }
      } else {
        const {
          error,
        } = await supabase
          .from('subjects')
          .insert({
            ...payload,
            user_id:
              user.id,
          });

        if (error) {
          console.error(
            'Subject create error:',
            error,
          );
        }
      }

      setSaving(false);

      setShowSubjectModal(
        false,
      );

      await loadData();
    };

  const deleteSubject =
    async (
      subject: Subject,
    ) => {
      if (!user) {
        return;
      }

      const confirmed =
        window.confirm(
          `Delete "${subject.name}" and all its topics?`,
        );

      if (!confirmed) {
        return;
      }

      setSaving(true);

      const {
        error: topicError,
      } = await supabase
        .from('topics')
        .delete()
        .eq(
          'subject_id',
          subject.id,
        )
        .eq(
          'user_id',
          user.id,
        );

      if (topicError) {
        console.error(
          'Topic delete error:',
          topicError,
        );
      }

      const {
        error,
      } = await supabase
        .from('subjects')
        .delete()
        .eq(
          'id',
          subject.id,
        )
        .eq(
          'user_id',
          user.id,
        );

      if (error) {
        console.error(
          'Subject delete error:',
          error,
        );
      }

      if (
        selectedSubjectId ===
        subject.id
      ) {
        setSelectedSubjectId(
          '',
        );

        setSelectedTopicId(
          '',
        );
      }

      setSaving(false);

      await loadData();
    };

  /*
   * --------------------------------------------------
   * TOPIC CRUD
   * --------------------------------------------------
   */

  const openNewTopic =
    (
      parentId = '',
    ) => {
      if (
        !selectedSubjectId
      ) {
        return;
      }

      setEditingTopic(
        null,
      );

      setTopicName('');

      setTopicParentId(
        parentId,
      );

      setShowTopicModal(
        true,
      );
    };

  const openEditTopic =
    (
      topic: Topic,
    ) => {
      setEditingTopic(
        topic,
      );

      setTopicName(
        topic.name,
      );

      setTopicParentId(
        topic.parent_topic_id ??
          '',
      );

      setSelectedSubjectId(
        topic.subject_id,
      );

      setShowTopicModal(
        true,
      );
    };

  const saveTopic =
    async () => {
      if (
        !user ||
        !selectedSubjectId ||
        !topicName.trim()
      ) {
        return;
      }

      setSaving(true);

      if (editingTopic) {
        const {
          error,
        } = await supabase
          .from('topics')
          .update({
            name:
              topicName.trim(),
            parent_topic_id:
              topicParentId ||
              null,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            editingTopic.id,
          )
          .eq(
            'user_id',
            user.id,
          );

        if (error) {
          console.error(
            'Topic update error:',
            error,
          );
        }
      } else {
        const maxPosition =
          selectedSubjectTopics.reduce(
            (
              max,
              topic,
            ) =>
              Math.max(
                max,
                Number(
                  topic.position ??
                    0,
                ),
              ),
            -1,
          );

        const {
          error,
        } = await supabase
          .from('topics')
          .insert({
            user_id:
              user.id,
            subject_id:
              selectedSubjectId,
            parent_topic_id:
              topicParentId ||
              null,
            name:
              topicName.trim(),
            completed:
              false,
            position:
              maxPosition + 1,
            status:
              'not_started',
            revisions_completed:
              0,
          });

        if (error) {
          console.error(
            'Topic create error:',
            error,
          );
        }
      }

      setSaving(false);

      setShowTopicModal(
        false,
      );

      await loadData();
    };

  const toggleTopic =
    async (
      topic: Topic,
    ) => {
      if (!user) {
        return;
      }

      const completed =
        !topic.completed;

      const status: TopicStatus =
        completed
          ? 'completed'
          : 'in_progress';

      setTopics(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              topic.id
                ? {
                    ...item,
                    completed,
                    status,
                  }
                : item,
          ),
      );

      const {
        error,
      } = await supabase
        .from('topics')
        .update({
          completed,
          status,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          topic.id,
        )
        .eq(
          'user_id',
          user.id,
        );

      if (error) {
        console.error(
          'Topic toggle error:',
          error,
        );

        await loadData();
      }
    };

  const setTopicInProgress =
    async (
      topic: Topic,
    ) => {
      if (!user) {
        return;
      }

      setTopics(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              topic.id
                ? {
                    ...item,
                    status:
                      'in_progress',
                    completed:
                      false,
                  }
                : item,
          ),
      );

      const {
        error,
      } = await supabase
        .from('topics')
        .update({
          status:
            'in_progress',
          completed:
            false,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          topic.id,
        )
        .eq(
          'user_id',
          user.id,
        );

      if (error) {
        console.error(
          'Topic status error:',
          error,
        );

        await loadData();
      }
    };

  const deleteTopic =
    async (
      topic: Topic,
    ) => {
      if (!user) {
        return;
      }

      const confirmed =
        window.confirm(
          `Delete "${topic.name}"?`,
        );

      if (!confirmed) {
        return;
      }

      setSaving(true);

      const {
        error: childrenError,
      } = await supabase
        .from('topics')
        .delete()
        .eq(
          'parent_topic_id',
          topic.id,
        )
        .eq(
          'user_id',
          user.id,
        );

      if (childrenError) {
        console.error(
          'Child topic delete error:',
          childrenError,
        );
      }

      const {
        error,
      } = await supabase
        .from('topics')
        .delete()
        .eq(
          'id',
          topic.id,
        )
        .eq(
          'user_id',
          user.id,
        );

      if (error) {
        console.error(
          'Topic delete error:',
          error,
        );
      }

      if (
        selectedTopicId ===
        topic.id
      ) {
        setSelectedTopicId(
          '',
        );
      }

      setSaving(false);

      await loadData();
    };

  /*
   * --------------------------------------------------
   * REVISION
   * --------------------------------------------------
   */

  const markRevisionDue =
    async (
      topic: Topic,
    ) => {
      if (!user) {
        return;
      }

      const {
        error,
      } = await supabase
        .from('topics')
        .update({
          status:
            'revision_due',
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          topic.id,
        )
        .eq(
          'user_id',
          user.id,
        );

      if (error) {
        console.error(
          'Revision due error:',
          error,
        );

        return;
      }

      await loadData();
    };

  const completeRevision =
    async (
      topic: Topic,
    ) => {
      if (!user) {
        return;
      }

      const {
        error,
      } = await supabase
        .from('topics')
        .update({
          status:
            'revision_completed',
          revisions_completed:
            Number(
              topic.revisions_completed ??
                0,
            ) + 1,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          topic.id,
        )
        .eq(
          'user_id',
          user.id,
        );

      if (error) {
        console.error(
          'Revision complete error:',
          error,
        );

        return;
      }

      await loadData();
    };

  /*
   * --------------------------------------------------
   * TIMER
   * --------------------------------------------------
   */

  const saveTimerDetails =
    () => {
      const current =
        timerRef.current;

      const next: TimerState =
        {
          ...current,
          name:
            current.name.trim() ||
            'Study Session',
          subjectId:
            selectedSubjectId,
          topicId:
            selectedTopicId,
        };

      saveTimer(next);

      setSessionName(
        next.name,
      );
    };

  const startTimer =
    () => {
      if (!user) {
        return;
      }

      if (
        timerRef.current
          .running
      ) {
        setShowTimerModal(
          false,
        );

        return;
      }

      const next: TimerState =
        {
          ...timerRef.current,
          name:
            timerRef.current.name.trim() ||
            'Study Session',
          subjectId:
            selectedSubjectId ||
            timerRef.current
              .subjectId ||
            '',
          topicId:
            selectedTopicId ||
            timerRef.current
              .topicId ||
            '',
          running:
            true,
          startedAt:
            Date.now(),
        };

      saveTimer(next);

      setTimerSeconds(
        getElapsedSeconds(
          next,
        ),
      );

      setShowTimerModal(
        false,
      );
    };

  const pauseTimer =
    () => {
      const current =
        timerRef.current;

      if (
        !current.running
      ) {
        return;
      }

      const elapsed =
        getElapsedSeconds(
          current,
        );

      const next: TimerState =
        {
          ...current,
          running:
            false,
          startedAt:
            null,
          accumulatedSeconds:
            elapsed,
        };

      saveTimer(next);

      setTimerSeconds(
        elapsed,
      );
    };

  const startNewTimer =
    () => {
      const current =
        timerRef.current;

      const next: TimerState =
        {
          ...EMPTY_TIMER,
          name:
            current.name.trim() ||
            'Study Session',
          subjectId:
            selectedSubjectId,
          topicId:
            selectedTopicId,
          running:
            true,
          startedAt:
            Date.now(),
        };

      saveTimer(next);

      setTimerSeconds(
        0,
      );

      setShowTimerModal(
        false,
      );
    };

  const stopTimer =
    async () => {
      if (
        !user ||
        !timerRef.current
          .running
      ) {
        return;
      }

      const current =
        timerRef.current;

      const duration =
        getElapsedSeconds(
          current,
        );

      if (
        duration <= 0
      ) {
        const reset: TimerState =
          {
            ...EMPTY_TIMER,
            name:
              current.name ||
              'Study Session',
            subjectId:
              current.subjectId,
            topicId:
              current.topicId,
          };

        saveTimer(reset);

        setTimerSeconds(
          0,
        );

        return;
      }

      const startedAt =
        current.startedAt
          ? new Date(
              current.startedAt,
            ).toISOString()
          : new Date(
              Date.now() -
                duration *
                  1000,
            ).toISOString();

      const endedAt =
        new Date().toISOString();

      setSaving(true);

      const {
        error,
      } = await supabase
        .from(
          'study_sessions',
        )
        .insert({
          user_id:
            user.id,
          subject_id:
            current.subjectId ||
            null,
          topic_id:
            current.topicId ||
            null,
          name:
            current.name.trim() ||
            'Study Session',
          started_at:
            startedAt,
          ended_at:
            endedAt,
          duration_seconds:
            duration,
        });

      setSaving(false);

      if (error) {
        console.error(
          'Study session save error:',
          error,
        );

        return;
      }

      const reset: TimerState =
        {
          ...EMPTY_TIMER,
          name:
            current.name.trim() ||
            'Study Session',
          subjectId:
            current.subjectId,
          topicId:
            current.topicId,
        };

      saveTimer(reset);

      clearStoredTimer(
        user.id,
      );

      setTimerSeconds(
        0,
      );

      await loadData();
    };

  const handleTimerModalStart =
    () => {
      saveTimerDetails();

      const current =
        timerRef.current;

      if (
        current.accumulatedSeconds >
        0
      ) {
        startTimer();

        return;
      }

      startNewTimer();
    };

  /*
   * --------------------------------------------------
   * SEARCH
   * --------------------------------------------------
   */

  const filteredTopics =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return selectedSubjectTopics;
      }

      return selectedSubjectTopics.filter(
        (topic) =>
          topic.name
            .toLowerCase()
            .includes(query),
      );
    }, [
      search,
      selectedSubjectTopics,
    ]);

  const revisionTopics =
    useMemo(
      () =>
        topics.filter(
          (topic) =>
            topic.status ===
              'revision_due' ||
            topic.status ===
              'revision_completed',
        ),
      [topics],
    );

  const sessionSearch =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return sessions;
      }

      return sessions.filter(
        (session) =>
          session.name
            .toLowerCase()
            .includes(query),
      );
    }, [
      sessions,
      search,
    ]);

  /*
   * --------------------------------------------------
   * SUBJECT NAME LOOKUP
   * --------------------------------------------------
   */

  const getSubjectName =
    (
      subjectId:
        | string
        | null,
    ) => {
      if (!subjectId) {
        return 'General';
      }

      return (
        subjects.find(
          (subject) =>
            subject.id ===
            subjectId,
        )?.name ??
        'Unknown subject'
      );
    };

  const getTopicName =
    (
      topicId:
        | string
        | null,
    ) => {
      if (!topicId) {
        return null;
      }

      return (
        topics.find(
          (topic) =>
            topic.id ===
            topicId,
        )?.name ?? null
      );
    };

  /*
   * --------------------------------------------------
   * RENDER
   * --------------------------------------------------
   */

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-5">
      {/* HEADER */}
      <section className="rounded-3xl bg-blue-600 dark:bg-blue-700 text-white p-5 sm:p-6 md:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-blue-100 text-sm">
              <BookOpen
                size={17}
              />
              Study workspace
            </div>

            <h1 className="mt-2 text-2xl md:text-3xl font-bold">
              Build your study
              system
            </h1>

            <p className="mt-2 text-blue-100 text-sm max-w-xl">
              Organize subjects,
              track topics,
              run focused study
              sessions and stay
              on top of revisions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                setShowTimerModal(
                  true,
                )
              }
              className="h-11 px-4 rounded-xl bg-white text-blue-700 font-semibold flex items-center gap-2 hover:bg-blue-50"
            >
              {timer.running ? (
                <Clock3
                  size={18}
                />
              ) : (
                <Play
                  size={18}
                  fill="currentColor"
                />
              )}

              {timer.running
                ? 'Timer running'
                : 'Start study'}
            </button>

            <button
              onClick={() =>
                openNewSubject()
              }
              className="h-11 px-4 rounded-xl bg-blue-500 border border-blue-400 text-white font-semibold flex items-center gap-2 hover:bg-blue-400"
            >
              <Plus
                size={18}
              />
              Subject
            </button>
          </div>
        </div>

        {timer.running && (
          <div className="mt-5 rounded-2xl bg-black/15 border border-white/10 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs text-blue-100">
                  Currently studying
                </div>

                <div className="mt-1 font-semibold truncate">
                  {
                    timer.name
                  }
                </div>

                <div className="mt-1 text-xs text-blue-100 truncate">
                  {getSubjectName(
                    timer.subjectId ||
                      null,
                  )}

                  {timer.topicId
                    ? ` • ${getTopicName(
                        timer.topicId,
                      ) ?? ''}`
                    : ''}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-2xl font-mono font-bold tracking-wider">
                  {formatTime(
                    timerSeconds,
                  )}
                </div>

                <button
                  onClick={
                    pauseTimer
                  }
                  className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center hover:bg-white/20"
                  title="Pause"
                >
                  <Pause
                    size={17}
                  />
                </button>

                <button
                  onClick={() =>
                    void stopTimer()
                  }
                  disabled={
                    saving
                  }
                  className="w-10 h-10 rounded-xl bg-red-500/80 flex items-center justify-center hover:bg-red-500 disabled:opacity-50"
                  title="Stop"
                >
                  <Square
                    size={16}
                    fill="currentColor"
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* TABS */}
      <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 w-full sm:w-fit overflow-x-auto">
        <TabButton
          active={
            tab ===
            'overview'
          }
          onClick={() =>
            setTab(
              'overview',
            )
          }
          icon={
            <BookOpen
              size={16}
            />
          }
          label="Overview"
        />

        <TabButton
          active={
            tab ===
            'revision'
          }
          onClick={() =>
            setTab(
              'revision',
            )
          }
          icon={
            <RefreshCw
              size={16}
            />
          }
          label="Revision"
        />

        <TabButton
          active={
            tab ===
            'sessions'
          }
          onClick={() =>
            setTab(
              'sessions',
            )
          }
          icon={
            <History
              size={16}
            />
          }
          label="Sessions"
        />
      </div>

      {/* OVERVIEW */}
      {tab ===
        'overview' && (
        <>
          {/* STATS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={
                <Clock3
                  size={19}
                />
              }
              title="Today"
              value={formatDuration(
                todayStudySeconds,
              )}
              subtitle="study time"
              className="text-blue-600 dark:text-blue-400"
            />

            <StatCard
              icon={
                <BookOpen
                  size={19}
                />
              }
              title="Topics"
              value={`${completedTopics}/${totalTopics}`}
              subtitle={`${overallProgress}% complete`}
              className="text-green-600 dark:text-green-400"
            />

            <StatCard
              icon={
                <Flame
                  size={19}
                />
              }
              title="Sessions"
              value={`${todaySessions.length}`}
              subtitle="today"
              className="text-orange-600 dark:text-orange-400"
            />

            <StatCard
              icon={
                <RefreshCw
                  size={19}
                />
              }
              title="Revision"
              value={`${revisionTopics.filter(
                (topic) =>
                  topic.status ===
                  'revision_due',
              ).length}`}
              subtitle="due"
              className="text-purple-600 dark:text-purple-400"
            />
          </div>

          {/* SUBJECTS + TOPICS */}
          <div className="grid xl:grid-cols-[320px_minmax(0,1fr)] gap-5 min-w-0">
            {/* SUBJECT LIST */}
            <section className="min-w-0 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-bold">
                      Subjects
                    </h2>

                    <p className="text-xs text-slate-400 mt-1">
                      {
                        subjects.length
                      }{' '}
                      subjects
                    </p>
                  </div>

                  <button
                    onClick={
                      openNewSubject
                    }
                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                  >
                    <Plus
                      size={17}
                    />
                  </button>
                </div>
              </div>

              <div className="p-2 max-h-[620px] overflow-y-auto">
                {loading &&
                subjects.length ===
                  0 ? (
                  <div className="p-8 flex justify-center">
                    <Loader2
                      className="animate-spin text-slate-400"
                      size={22}
                    />
                  </div>
                ) : subjects.length ===
                  0 ? (
                  <EmptyState
                    icon={
                      <BookOpen
                        size={24}
                      />
                    }
                    title="No subjects yet"
                    text="Create a subject to start organizing your syllabus."
                    action={
                      <button
                        onClick={
                          openNewSubject
                        }
                        className="mt-3 text-sm font-semibold text-blue-600 dark:text-blue-400"
                      >
                        Create subject
                      </button>
                    }
                  />
                ) : (
                  subjectStats.map(
                    ({
                      subject,
                      total,
                      completed,
                      progress,
                      studySeconds,
                    }) => (
                      <button
                        key={
                          subject.id
                        }
                        onClick={() => {
                          setSelectedSubjectId(
                            subject.id,
                          );
                          setSelectedTopicId(
                            '',
                          );
                          setSearch(
                            '',
                          );
                        }}
                        className={`w-full text-left p-3 rounded-2xl mb-1 transition ${
                          selectedSubjectId ===
                          subject.id
                            ? 'bg-blue-50 dark:bg-blue-950/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-lg"
                            style={{
                              backgroundColor:
                                `${subject.color ?? '#2563eb'}18`,
                            }}
                          >
                            {subject.icon ??
                              '📚'}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-sm truncate">
                                {
                                  subject.name
                                }
                              </span>

                              <span className="text-xs text-slate-400 shrink-0">
                                {
                                  progress
                                }
                                %
                              </span>
                            </div>

                            <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${progress}%`,
                                  backgroundColor:
                                    subject.color ??
                                    '#2563eb',
                                }}
                              />
                            </div>

                            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                              <span>
                                {
                                  completed
                                }
                                /
                                {
                                  total
                                }{' '}
                                topics
                              </span>

                              <span>
                                {formatDuration(
                                  studySeconds,
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ),
                  )
                )}
              </div>
            </section>

            {/* TOPICS */}
            <section className="min-w-0 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-bold truncate">
                      {selectedSubject?.icon ??
                        '📚'}{' '}
                      {selectedSubject?.name ??
                        'Select a subject'}
                    </h2>

                    <p className="text-xs text-slate-400 mt-1">
                      {selectedSubject
                        ? `${selectedSubjectTopics.length} topics`
                        : 'Choose a subject from the left'}
                    </p>
                  </div>

                  {selectedSubject && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() =>
                          openEditSubject(
                            selectedSubject,
                          )
                        }
                        className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm flex items-center gap-2"
                      >
                        <Edit3
                          size={15}
                        />
                        <span className="hidden sm:inline">
                          Edit
                        </span>
                      </button>

                      <button
                        onClick={() =>
                          openNewTopic()
                        }
                        className="h-9 px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold flex items-center gap-2"
                      >
                        <Plus
                          size={15}
                        />
                        Topic
                      </button>
                    </div>
                  )}
                </div>

                {selectedSubject && (
                  <div className="mt-4 relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      value={
                        search
                      }
                      onChange={(
                        event,
                      ) =>
                        setSearch(
                          event.target.value,
                        )
                      }
                      placeholder="Search topics..."
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm"
                    />
                  </div>
                )}
              </div>

              {!selectedSubject ? (
                <EmptyState
                  icon={
                    <BookOpen
                      size={28}
                    />
                  }
                  title="Select a subject"
                  text="Your topics will appear here."
                />
              ) : filteredTopics.length ===
                0 ? (
                <EmptyState
                  icon={
                    <FileText
                      size={28}
                    />
                  }
                  title="No topics yet"
                  text="Add topics and subtopics to build your syllabus."
                  action={
                    <button
                      onClick={() =>
                        openNewTopic()
                      }
                      className="mt-3 text-sm font-semibold text-blue-600 dark:text-blue-400"
                    >
                      Add first topic
                    </button>
                  }
                />
              ) : (
                <div className="p-3 space-y-2">
                  {rootTopics
                    .filter(
                      (topic) =>
                        !search.trim() ||
                        topic.name
                          .toLowerCase()
                          .includes(
                            search
                              .trim()
                              .toLowerCase(),
                          ) ||
                        childTopics.some(
                          (child) =>
                            child.parent_topic_id ===
                              topic.id &&
                            child.name
                              .toLowerCase()
                              .includes(
                                search
                                  .trim()
                                  .toLowerCase(),
                              ),
                        ),
                    )
                    .map(
                      (
                        topic,
                      ) => (
                        <TopicTree
                          key={
                            topic.id
                          }
                          topic={
                            topic
                          }
                          children={childTopics.filter(
                            (
                              child,
                            ) =>
                              child.parent_topic_id ===
                              topic.id,
                          )}
                          selectedTopicId={
                            selectedTopicId
                          }
                          onSelect={
                            setSelectedTopicId
                          }
                          onToggle={
                            toggleTopic
                          }
                          onEdit={
                            openEditTopic
                          }
                          onDelete={
                            deleteTopic
                          }
                          onAddChild={() =>
                            openNewTopic(
                              topic.id,
                            )
                          }
                          onProgress={
                            setTopicInProgress
                          }
                        />
                      ),
                    )}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {/* REVISION */}
      {tab ===
        'revision' && (
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">
                  Revision tracker
                </h2>

                <p className="text-sm text-slate-400 mt-1">
                  Mark topics for
                  revision and track
                  completed revisions.
                </p>
              </div>

              <RefreshCw
                size={20}
                className="text-purple-500"
              />
            </div>
          </div>

          {revisionTopics.length ===
          0 ? (
            <EmptyState
              icon={
                <RefreshCw
                  size={28}
                />
              }
              title="No revision items"
              text="Mark completed topics for revision when you want to revisit them."
            />
          ) : (
            <div className="p-4 grid md:grid-cols-2 gap-3">
              {revisionTopics.map(
                (topic) => (
                  <div
                    key={
                      topic.id
                    }
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-400">
                          {
                            getSubjectName(
                              topic.subject_id,
                            )
                          }
                        </div>

                        <div className="mt-1 font-semibold truncate">
                          {
                            topic.name
                          }
                        </div>

                        <div className="mt-2 text-xs text-slate-400">
                          Revisions completed:{' '}
                          {
                            topic.revisions_completed
                          }
                        </div>
                      </div>

                      <span
                        className={`px-2 py-1 rounded-lg text-[11px] font-medium shrink-0 ${getStatusClass(
                          topic.status,
                        )}`}
                      >
                        {getStatusLabel(
                          topic.status,
                        )}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {topic.status ===
                      'revision_due' ? (
                        <button
                          onClick={() =>
                            void completeRevision(
                              topic,
                            )
                          }
                          className="h-9 px-3 rounded-xl bg-purple-600 text-white text-sm font-semibold flex items-center gap-2"
                        >
                          <Check
                            size={15}
                          />
                          Mark revised
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            void markRevisionDue(
                              topic,
                            )
                          }
                          className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium flex items-center gap-2"
                        >
                          <RotateCcw
                            size={15}
                          />
                          Due again
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedSubjectId(
                            topic.subject_id,
                          );
                          setSelectedTopicId(
                            topic.id,
                          );
                          setTab(
                            'overview',
                          );
                        }}
                        className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm"
                      >
                        Open topic
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      )}

      {/* SESSIONS */}
      {tab ===
        'sessions' && (
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-bold">
                  Study sessions
                </h2>

                <p className="text-sm text-slate-400 mt-1">
                  Your saved focus
                  sessions.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Search sessions..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {sessionSearch.length ===
          0 ? (
            <EmptyState
              icon={
                <History
                  size={28}
                />
              }
              title="No study sessions"
              text="Completed timer sessions will appear here."
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sessionSearch.map(
                (session) => (
                  <div
                    key={
                      session.id
                    }
                    className="p-4 sm:p-5 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Clock3
                          size={18}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold truncate">
                          {
                            session.name
                          }
                        </div>

                        <div className="text-xs text-slate-400 mt-1 truncate">
                          {getSubjectName(
                            session.subject_id,
                          )}

                          {session.topic_id
                            ? ` • ${getTopicName(
                                session.topic_id,
                              ) ?? ''}`
                            : ''}

                          {' • '}

                          {new Date(
                            session.started_at,
                          ).toLocaleDateString(
                            'en-IN',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            },
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold">
                        {formatDuration(
                          session.duration_seconds,
                        )}
                      </div>

                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(
                          session.started_at,
                        ).toLocaleTimeString(
                          'en-IN',
                          {
                            hour:
                              '2-digit',
                            minute:
                              '2-digit',
                          },
                        )}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      )}

      {/* SUBJECT MODAL */}
      {showSubjectModal && (
        <Modal
          title={
            editingSubject
              ? 'Edit subject'
              : 'Create subject'
          }
          onClose={() =>
            setShowSubjectModal(
              false,
            )
          }
        >
          <div className="space-y-4">
            <Field
              label="Subject name"
            >
              <input
                autoFocus
                value={
                  subjectName
                }
                onChange={(
                  event,
                ) =>
                  setSubjectName(
                    event.target
                      .value,
                  )
                }
                placeholder="e.g. Microeconomics"
                className="input"
              />
            </Field>

            <Field
              label="Description"
            >
              <textarea
                value={
                  subjectDescription
                }
                onChange={(
                  event,
                ) =>
                  setSubjectDescription(
                    event.target
                      .value,
                  )
                }
                placeholder="Optional description"
                rows={3}
                className="input resize-none"
              />
            </Field>

            <Field label="Icon">
              <div className="flex flex-wrap gap-2">
                {SUBJECT_ICONS.map(
                  (icon) => (
                    <button
                      key={icon}
                      onClick={() =>
                        setSubjectIcon(
                          icon,
                        )
                      }
                      className={`w-11 h-11 rounded-xl text-xl border ${
                        subjectIcon ===
                        icon
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {icon}
                    </button>
                  ),
                )}
              </div>
            </Field>

            <Field label="Color">
              <div className="flex flex-wrap gap-2">
                {SUBJECT_COLORS.map(
                  (color) => (
                    <button
                      key={
                        color
                      }
                      onClick={() =>
                        setSubjectColor(
                          color,
                        )
                      }
                      className={`w-9 h-9 rounded-full border-2 ${
                        subjectColor ===
                        color
                          ? 'border-slate-900 dark:border-white scale-110'
                          : 'border-transparent'
                      }`}
                      style={{
                        backgroundColor:
                          color,
                      }}
                    />
                  ),
                )}
              </div>
            </Field>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() =>
                  setShowSubjectModal(
                    false,
                  )
                }
                className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 font-medium"
              >
                Cancel
              </button>

              <button
                onClick={() =>
                  void saveSubject()
                }
                disabled={
                  saving ||
                  !subjectName.trim()
                }
                className="flex-1 h-11 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold disabled:opacity-50"
              >
                {saving ? (
                  <Loader2
                    size={18}
                    className="animate-spin mx-auto"
                  />
                ) : editingSubject ? (
                  'Save changes'
                ) : (
                  'Create subject'
                )}
              </button>
            </div>

            {editingSubject && (
              <button
                onClick={() => {
                  setShowSubjectModal(
                    false,
                  );

                  void deleteSubject(
                    editingSubject,
                  );
                }}
                className="w-full h-10 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium"
              >
                Delete subject
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* TOPIC MODAL */}
      {showTopicModal && (
        <Modal
          title={
            editingTopic
              ? 'Edit topic'
              : 'Add topic'
          }
          onClose={() =>
            setShowTopicModal(
              false,
            )
          }
        >
          <div className="space-y-4">
            <Field label="Topic name">
              <input
                autoFocus
                value={
                  topicName
                }
                onChange={(
                  event,
                ) =>
                  setTopicName(
                    event.target
                      .value,
                  )
                }
                placeholder="e.g. Demand and Supply"
                className="input"
              />
            </Field>

            <Field label="Parent topic">
              <select
                value={
                  topicParentId
                }
                onChange={(
                  event,
                ) =>
                  setTopicParentId(
                    event.target
                      .value,
                  )
                }
                className="input"
              >
                <option value="">
                  Main topic
                </option>

                {selectedSubjectTopics
                  .filter(
                    (topic) =>
                      topic.id !==
                        editingTopic?.id &&
                      !topic.parent_topic_id,
                  )
                  .map(
                    (topic) => (
                      <option
                        key={
                          topic.id
                        }
                        value={
                          topic.id
                        }
                      >
                        {
                          topic.name
                        }
                      </option>
                    ),
                  )}
              </select>
            </Field>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() =>
                  setShowTopicModal(
                    false,
                  )
                }
                className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 font-medium"
              >
                Cancel
              </button>

              <button
                onClick={() =>
                  void saveTopic()
                }
                disabled={
                  saving ||
                  !topicName.trim()
                }
                className="flex-1 h-11 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold disabled:opacity-50"
              >
                {saving ? (
                  <Loader2
                    size={18}
                    className="animate-spin mx-auto"
                  />
                ) : editingTopic ? (
                  'Save changes'
                ) : (
                  'Add topic'
                )}
              </button>
            </div>

            {editingTopic && (
              <button
                onClick={() => {
                  setShowTopicModal(
                    false,
                  );

                  void deleteTopic(
                    editingTopic,
                  );
                }}
                className="w-full h-10 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium"
              >
                Delete topic
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* TIMER MODAL */}
      {showTimerModal && (
        <Modal
          title={
            timer.running
              ? 'Study timer'
              : timer.accumulatedSeconds >
                0
              ? 'Resume study'
              : 'Start study session'
          }
          onClose={() =>
            setShowTimerModal(
              false,
            )
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-5 text-center">
              <div className="text-4xl font-mono font-bold tracking-wider">
                {formatTime(
                  timerSeconds,
                )}
              </div>

              <div className="mt-2 text-xs text-slate-400">
                {timer.running
                  ? 'Session is running'
                  : timer.accumulatedSeconds >
                    0
                  ? 'Paused session'
                  : 'Ready to focus'}
              </div>
            </div>

            <Field label="Session name">
              <input
                value={
                  sessionName
                }
                onChange={(
                  event,
                ) => {
                  const value =
                    event.target
                      .value;

                  setSessionName(
                    value,
                  );

                  const current =
                    timerRef.current;

                  saveTimer({
                    ...current,
                    name:
                      value ||
                      'Study Session',
                  });
                }}
                placeholder="e.g. Microeconomics revision"
                className="input"
              />
            </Field>

            <Field label="Subject">
              <select
                value={
                  selectedSubjectId
                }
                onChange={(
                  event,
                ) => {
                  setSelectedSubjectId(
                    event.target
                      .value,
                  );

                  setSelectedTopicId(
                    '',
                  );
                }}
                className="input"
              >
                <option value="">
                  Select subject
                </option>

                {subjects.map(
                  (subject) => (
                    <option
                      key={
                        subject.id
                      }
                      value={
                        subject.id
                      }
                    >
                      {subject.icon ??
                        '📚'}{' '}
                      {
                        subject.name
                      }
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Topic">
              <select
                value={
                  selectedTopicId
                }
                onChange={(
                  event,
                ) =>
                  setSelectedTopicId(
                    event.target
                      .value,
                  )
                }
                className="input"
              >
                <option value="">
                  No specific topic
                </option>

                {topics
                  .filter(
                    (topic) =>
                      topic.subject_id ===
                      selectedSubjectId,
                  )
                  .map(
                    (topic) => (
                      <option
                        key={
                          topic.id
                        }
                        value={
                          topic.id
                        }
                      >
                        {
                          topic.name
                        }
                      </option>
                    ),
                  )}
              </select>
            </Field>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() =>
                  setShowTimerModal(
                    false,
                  )
                }
                className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 font-medium"
              >
                Cancel
              </button>

              {timer.running ? (
                <button
                  onClick={() => {
                    setShowTimerModal(
                      false,
                    );
                  }}
                  className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2"
                >
                  <Clock3
                    size={17}
                  />
                  Continue
                </button>
              ) : (
                <button
                  onClick={
                    handleTimerModalStart
                  }
                  className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2"
                >
                  <Play
                    size={17}
                    fill="currentColor"
                  />
                  {timer.accumulatedSeconds >
                  0
                    ? 'Resume'
                    : 'Start'}
                </button>
              )}
            </div>

            {!timer.running &&
              timer.accumulatedSeconds >
                0 && (
                <button
                  onClick={
                    startNewTimer
                  }
                  className="w-full h-10 rounded-xl text-sm text-slate-500 dark:text-slate-400"
                >
                  Start a new session
                </button>
              )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/*
 * --------------------------------------------------
 * TOPIC TREE
 * --------------------------------------------------
 */

function TopicTree({
  topic,
  children,
  selectedTopicId,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  onAddChild,
  onProgress,
}: {
  topic: Topic;
  children: Topic[];
  selectedTopicId: string;
  onSelect: (
    id: string,
  ) => void;
  onToggle: (
    topic: Topic,
  ) => void;
  onEdit: (
    topic: Topic,
  ) => void;
  onDelete: (
    topic: Topic,
  ) => void;
  onAddChild: () => void;
  onProgress: (
    topic: Topic,
  ) => void;
}) {
  const [expanded, setExpanded] =
    useState(true);

  return (
    <div>
      <div
        className={`rounded-2xl border p-3 transition ${
          selectedTopicId ===
          topic.id
            ? 'border-blue-300 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/20'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2">
          {children.length >
          0 ? (
            <button
              onClick={() =>
                setExpanded(
                  (value) =>
                    !value,
                )
              }
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              {expanded ? (
                <ChevronDown
                  size={16}
                />
              ) : (
                <ChevronRight
                  size={16}
                />
              )}
            </button>
          ) : (
            <div className="w-7 shrink-0" />
          )}

          <button
            onClick={() =>
              onToggle(
                topic,
              )
            }
            className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition ${
              topic.completed
                ? 'bg-green-600 border-green-600 text-white'
                : 'border-slate-300 dark:border-slate-600'
            }`}
          >
            {topic.completed && (
              <Check
                size={14}
              />
            )}
          </button>

          <button
            onClick={() =>
              onSelect(
                topic.id,
              )
            }
            className="flex-1 min-w-0 text-left"
          >
            <div
              className={`font-semibold text-sm truncate ${
                topic.completed
                  ? 'line-through text-slate-400'
                  : ''
              }`}
            >
              {topic.name}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusClass(
                  topic.status,
                )}`}
              >
                {getStatusLabel(
                  topic.status,
                )}
              </span>

              {topic.revisions_completed >
                0 && (
                <span className="text-[10px] text-slate-400">
                  {
                    topic.revisions_completed
                  }{' '}
                  revisions
                </span>
              )}
            </div>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            {!topic.completed && (
              <button
                onClick={() =>
                  onProgress(
                    topic,
                  )
                }
                className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-500"
                title="Mark in progress"
              >
                <Play
                  size={14}
                />
              </button>
            )}

            <button
              onClick={
                onAddChild
              }
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Add subtopic"
            >
              <Plus
                size={15}
              />
            </button>

            <button
              onClick={() =>
                onEdit(
                  topic,
                )
              }
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Edit"
            >
              <Edit3
                size={14}
              />
            </button>

            <button
              onClick={() =>
                void onDelete(
                  topic,
                )
              }
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500"
              title="Delete"
            >
              <Trash2
                size={14}
              />
            </button>
          </div>
        </div>
      </div>

      {expanded &&
        children.length >
          0 && (
          <div className="ml-7 pl-3 border-l border-slate-200 dark:border-slate-800 mt-2 space-y-2">
            {children.map(
              (child) => (
                <div
                  key={
                    child.id
                  }
                  className={`rounded-xl border p-3 ${
                    selectedTopicId ===
                    child.id
                      ? 'border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onToggle(
                          child,
                        )
                      }
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                        child.completed
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {child.completed && (
                        <Check
                          size={12}
                        />
                      )}
                    </button>

                    <button
                      onClick={() =>
                        onSelect(
                          child.id,
                        )
                      }
                      className="flex-1 min-w-0 text-left"
                    >
                      <div
                        className={`text-sm font-medium truncate ${
                          child.completed
                            ? 'line-through text-slate-400'
                            : ''
                        }`}
                      >
                        {
                          child.name
                        }
                      </div>
                    </button>

                    <button
                      onClick={() =>
                        onEdit(
                          child,
                        )
                      }
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                    >
                      <Edit3
                        size={13}
                      />
                    </button>

                    <button
                      onClick={() =>
                        void onDelete(
                          child,
                        )
                      }
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 shrink-0"
                    >
                      <Trash2
                        size={13}
                      />
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
    </div>
  );
}

/*
 * --------------------------------------------------
 * UI HELPERS
 * --------------------------------------------------
 */

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-10 px-3 sm:px-4 rounded-xl text-sm font-medium flex items-center gap-2 whitespace-nowrap ${
        active
          ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white'
          : 'text-slate-500 dark:text-slate-400'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  className: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 min-w-0">
      <div
        className={`w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${className}`}
      >
        {icon}
      </div>

      <div className="mt-3 text-xs text-slate-400">
        {title}
      </div>

      <div className="mt-1 text-xl font-bold truncate">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-400 truncate">
        {subtitle}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="p-10 text-center">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
        {icon}
      </div>

      <div className="mt-4 font-semibold">
        {title}
      </div>

      <p className="mt-1 text-sm text-slate-400 max-w-sm mx-auto">
        {text}
      </p>

      {action}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-2">
        {label}
      </div>

      {children}
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <h2 className="font-bold text-lg">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
          >
            <X
              size={18}
            />
          </button>
        </div>

        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

export default StudyView;