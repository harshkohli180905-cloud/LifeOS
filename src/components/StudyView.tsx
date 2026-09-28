import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import RevisionTracker from './RevisionTracker';

type Subject = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  target_exam_date: string | null;
  weightage: number;
};

type Topic = {
  id: string;
  user_id: string;
  subject_id: string;
  parent_topic_id: string | null;
  name: string;
  completed: boolean;
  position: number;
  status: string;
  revisions_completed: number;
};

type StudySession = {
  id: string;
  user_id: string;
  subject_id: string | null;
  topic_id: string | null;
  name: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
};

const SUBJECT_COLORS = [
  '#3B82F6',
  '#8B5CF6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#06B6D4',
];

/* -------------------------------------------------------
   DATE / TIME HELPERS
------------------------------------------------------- */

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0',
  )}:${String(seconds).padStart(2, '0')}`;
}

function formatDuration(totalSeconds: number) {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

/* -------------------------------------------------------
   COMPONENT
------------------------------------------------------- */

export default function StudyView() {
  const { user } = useAuth();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null,
  );

  /* TIMER */
  const [sessionName, setSessionName] = useState('Study Session');
  const [sessionSubjectId, setSessionSubjectId] = useState('');
  const [sessionTopicId, setSessionTopicId] = useState('');

  const [isRunning, setIsRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  /* MODALS */
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showTopicForm, setShowTopicForm] = useState(false);

  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDescription, setNewSubjectDescription] = useState('');

  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicParentId, setNewTopicParentId] = useState('');

  const [activeTab, setActiveTab] = useState<
    'overview' | 'sessions' | 'revision'
  >('overview');

  /* -------------------------------------------------------
     LOAD DATA
  ------------------------------------------------------- */

  async function loadData() {
    if (!user) return;

    setLoading(true);

    const [subjectsResult, topicsResult, sessionsResult] =
      await Promise.all([
        supabase
          .from('subjects')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),

        supabase
          .from('topics')
          .select('*')
          .eq('user_id', user.id)
          .order('position', { ascending: true }),

        supabase
          .from('study_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false }),
      ]);

    if (subjectsResult.error) {
      console.error(subjectsResult.error);
    }

    if (topicsResult.error) {
      console.error(topicsResult.error);
    }

    if (sessionsResult.error) {
      console.error(sessionsResult.error);
    }

    const loadedSubjects = (subjectsResult.data ?? []) as Subject[];
    const loadedTopics = (topicsResult.data ?? []) as Topic[];
    const loadedSessions = (sessionsResult.data ?? []) as StudySession[];

    setSubjects(loadedSubjects);
    setTopics(loadedTopics);
    setSessions(loadedSessions);

    if (selectedSubjectId === null && loadedSubjects.length > 0) {
      setSelectedSubjectId(loadedSubjects[0].id);
    }

    if (sessionSubjectId === '' && loadedSubjects.length > 0) {
      setSessionSubjectId(loadedSubjects[0].id);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [user]);

  /* -------------------------------------------------------
     RUNNING TIMER
  ------------------------------------------------------- */

  useEffect(() => {
    if (!isRunning || startedAt === null) return;

    const interval = window.setInterval(() => {
      setElapsedSeconds(
        Math.floor((Date.now() - startedAt) / 1000),
      );
    }, 250);

    return () => window.clearInterval(interval);
  }, [isRunning, startedAt]);

  /* -------------------------------------------------------
     MIDNIGHT RESET
------------------------------------------------------- */

  useEffect(() => {
    if (!isRunning) return;

    const checkForNewDay = () => {
      const currentDay = getToday();

      const storedDay = sessionStorage.getItem(
        'lifeos-study-timer-day',
      );

      if (!storedDay) {
        sessionStorage.setItem(
          'lifeos-study-timer-day',
          currentDay,
        );
        return;
      }

      if (storedDay !== currentDay) {
        setIsRunning(false);
        setStartedAt(null);
        setElapsedSeconds(0);

        sessionStorage.removeItem(
          'lifeos-study-timer-day',
        );
      }
    };

    checkForNewDay();

    const interval = window.setInterval(
      checkForNewDay,
      1000,
    );

    return () => window.clearInterval(interval);
  }, [isRunning]);

  /* -------------------------------------------------------
     SUBJECT / TOPIC MEMOS
  ------------------------------------------------------- */

  const selectedSubject = useMemo(
    () =>
      subjects.find(
        (subject) => subject.id === selectedSubjectId,
      ) ?? null,
    [subjects, selectedSubjectId],
  );

  const selectedSubjectTopics = useMemo(
    () =>
      topics.filter(
        (topic) => topic.subject_id === selectedSubjectId,
      ),
    [topics, selectedSubjectId],
  );

  const sessionTopics = useMemo(
    () =>
      topics.filter(
        (topic) => topic.subject_id === sessionSubjectId,
      ),
    [topics, sessionSubjectId],
  );

  /* -------------------------------------------------------
     SUBJECT PROGRESS
  ------------------------------------------------------- */

  const subjectProgress = useMemo(() => {
    if (!selectedSubject) return 0;

    const subjectTopics = topics.filter(
      (topic) => topic.subject_id === selectedSubject.id,
    );

    if (subjectTopics.length === 0) return 0;

    const completed = subjectTopics.filter(
      (topic) =>
        topic.completed || topic.status === 'completed',
    ).length;

    return Math.round(
      (completed / subjectTopics.length) * 100,
    );
  }, [topics, selectedSubject]);

  const totalTopics = selectedSubjectTopics.length;

  const completedTopics = selectedSubjectTopics.filter(
    (topic) =>
      topic.completed || topic.status === 'completed',
  ).length;

  /* -------------------------------------------------------
     TODAY'S STUDY
  ------------------------------------------------------- */

  const todaySessions = useMemo(
    () =>
      sessions.filter(
        (session) =>
          new Date(session.started_at).toLocaleDateString(
            'en-CA',
          ) === getToday(),
      ),
    [sessions],
  );

  const todayStudySeconds = todaySessions.reduce(
    (sum, session) =>
      sum + session.duration_seconds,
    0,
  );

  /* -------------------------------------------------------
     SUBJECT CRUD
  ------------------------------------------------------- */

  async function addSubject() {
    if (!user || !newSubjectName.trim()) return;

    setSaving(true);

    const color =
      SUBJECT_COLORS[
        subjects.length % SUBJECT_COLORS.length
      ];

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        user_id: user.id,
        name: newSubjectName.trim(),
        description:
          newSubjectDescription.trim() || null,
        color,
        icon: '📚',
        weightage: 0,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert(error.message);
      setSaving(false);
      return;
    }

    if (data) {
      setSubjects((prev) => [
        ...prev,
        data as Subject,
      ]);

      setSelectedSubjectId(data.id);
      setSessionSubjectId(data.id);
    }

    setNewSubjectName('');
    setNewSubjectDescription('');
    setShowSubjectForm(false);
    setSaving(false);
  }

  async function deleteSubject(subjectId: string) {
    const subject = subjects.find(
      (item) => item.id === subjectId,
    );

    if (!subject) return;

    const confirmed = window.confirm(
      `Delete "${subject.name}" and all its topics?`,
    );

    if (!confirmed) return;

    const { error: topicsError } = await supabase
      .from('topics')
      .delete()
      .eq('subject_id', subjectId)
      .eq('user_id', user?.id ?? '');

    if (topicsError) {
      console.error(topicsError);
      alert(topicsError.message);
      return;
    }

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subjectId)
      .eq('user_id', user?.id ?? '');

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    const remainingSubjects = subjects.filter(
      (item) => item.id !== subjectId,
    );

    setSubjects(remainingSubjects);

    setTopics((prev) =>
      prev.filter(
        (topic) => topic.subject_id !== subjectId,
      ),
    );

    const nextSubject = remainingSubjects[0];

    setSelectedSubjectId(
      nextSubject?.id ?? null,
    );

    setSessionSubjectId(
      nextSubject?.id ?? '',
    );

    setSessionTopicId('');
  }

  /* -------------------------------------------------------
     TOPIC CRUD
  ------------------------------------------------------- */

  async function addTopic() {
    if (
      !user ||
      !selectedSubjectId ||
      !newTopicName.trim()
    ) {
      return;
    }

    setSaving(true);

    const subjectTopics = topics.filter(
      (topic) =>
        topic.subject_id === selectedSubjectId,
    );

    const { data, error } = await supabase
      .from('topics')
      .insert({
        user_id: user.id,
        subject_id: selectedSubjectId,
        parent_topic_id:
          newTopicParentId || null,
        name: newTopicName.trim(),
        completed: false,
        position: subjectTopics.length,
        status: 'not_started',
        revisions_completed: 0,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert(error.message);
      setSaving(false);
      return;
    }

    if (data) {
      setTopics((prev) => [
        ...prev,
        data as Topic,
      ]);
    }

    setNewTopicName('');
    setNewTopicParentId('');
    setShowTopicForm(false);
    setSaving(false);
  }

  async function toggleTopic(topic: Topic) {
    const completed = !(
      topic.completed ||
      topic.status === 'completed'
    );

    const status = completed
      ? 'completed'
      : 'in_progress';

    const { error } = await supabase
      .from('topics')
      .update({
        completed,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', topic.id)
      .eq('user_id', user?.id ?? '');

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setTopics((prev) =>
      prev.map((item) =>
        item.id === topic.id
          ? {
              ...item,
              completed,
              status,
            }
          : item,
      ),
    );
  }

  async function deleteTopic(topicId: string) {
    const confirmed = window.confirm(
      'Delete this topic?',
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('id', topicId)
      .eq('user_id', user?.id ?? '');

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setTopics((prev) =>
      prev.filter(
        (topic) => topic.id !== topicId,
      ),
    );

    if (sessionTopicId === topicId) {
      setSessionTopicId('');
    }
  }

  /* -------------------------------------------------------
     TIMER START
  ------------------------------------------------------- */

  function startTimer() {
    if (!sessionSubjectId) {
      alert('Please select a subject first.');
      return;
    }

    if (!sessionName.trim()) {
      alert('Please enter a session name.');
      return;
    }

    const now = Date.now();

    sessionStorage.setItem(
      'lifeos-study-timer-day',
      getToday(),
    );

    setStartedAt(now);
    setElapsedSeconds(0);
    setIsRunning(true);
  }

  /* -------------------------------------------------------
     TIMER STOP + SAVE
  ------------------------------------------------------- */

  async function stopTimer() {
    if (!startedAt || !user) return;

    const endTime = Date.now();

    const duration = Math.max(
      1,
      Math.floor(
        (endTime - startedAt) / 1000,
      ),
    );

    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.id,
        subject_id:
          sessionSubjectId || null,
        topic_id:
          sessionTopicId || null,
        name:
          sessionName.trim() ||
          'Study Session',
        started_at:
          new Date(
            startedAt,
          ).toISOString(),
        ended_at:
          new Date(
            endTime,
          ).toISOString(),
        duration_seconds: duration,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    if (data) {
      setSessions((prev) => [
        data as StudySession,
        ...prev,
      ]);
    }

    setIsRunning(false);
    setStartedAt(null);
    setElapsedSeconds(0);

    sessionStorage.removeItem(
      'lifeos-study-timer-day',
    );
  }

  /* -------------------------------------------------------
     TIMER CANCEL
  ------------------------------------------------------- */

  function cancelTimer() {
    const confirmed = window.confirm(
      'Discard this study session?',
    );

    if (!confirmed) return;

    setIsRunning(false);
    setStartedAt(null);
    setElapsedSeconds(0);

    sessionStorage.removeItem(
      'lifeos-study-timer-day',
    );
  }

  /* -------------------------------------------------------
     SESSION DELETE
  ------------------------------------------------------- */

  async function deleteSession(
    sessionId: string,
  ) {
    const confirmed = window.confirm(
      'Delete this study session?',
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user?.id ?? '');

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setSessions((prev) =>
      prev.filter(
        (session) =>
          session.id !== sessionId,
      ),
    );
  }

  /* -------------------------------------------------------
     TOPIC TREE
  ------------------------------------------------------- */

  function getChildTopics(parentId: string) {
    return selectedSubjectTopics.filter(
      (topic) =>
        topic.parent_topic_id === parentId,
    );
  }

  function renderTopic(
    topic: Topic,
    level = 0,
  ) {
    const children =
      getChildTopics(topic.id);

    const isCompleted =
      topic.completed ||
      topic.status === 'completed';

    return (
      <div key={topic.id}>
        <div
          className="group flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-gray-50 dark:hover:bg-white/[0.04]"
          style={{
            marginLeft: `${level * 24}px`,
          }}
        >
          <button
            type="button"
            onClick={() =>
              toggleTopic(topic)
            }
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
              isCompleted
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            {isCompleted && (
              <span className="text-xs font-bold">
                ✓
              </span>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-medium ${
                isCompleted
                  ? 'text-gray-400 line-through'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {topic.name}
            </p>

            <p className="mt-0.5 text-xs text-gray-400">
              {isCompleted
                ? 'Completed'
                : topic.status ===
                    'in_progress'
                  ? 'In progress'
                  : topic.status ===
                      'revision_due'
                    ? 'Revision due'
                    : 'Not started'}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              deleteTopic(topic.id)
            }
            className="rounded-lg px-2 py-1 text-xs text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-500/10"
          >
            Delete
          </button>
        </div>

        {children.map((child) =>
          renderTopic(
            child,
            level + 1,
          ),
        )}
      </div>
    );
  }

  const rootTopics =
    selectedSubjectTopics.filter(
      (topic) =>
        !topic.parent_topic_id,
    );

  /* -------------------------------------------------------
     LOADING
  ------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-sm text-gray-500">
          Loading your study data...
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-24">
      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Study
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
            Study Tracker
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Track your subjects, topics and focused study time.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowSubjectForm(true)
          }
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          + Add Subject
        </button>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">
            Subjects
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {subjects.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">
            Topics Done
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {completedTopics}/
            {totalTopics}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">
            Today
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatDuration(
              todayStudySeconds,
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">
            Sessions
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {sessions.length}
          </p>
        </div>
      </div>

      {/* TIMER */}

      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
        <div className="border-b border-gray-100 p-5 dark:border-white/10 md:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Study Timer
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Start a focused study session and save it automatically when you stop.
          </p>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-[1fr_280px] md:p-6">
          <div>
            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-500">
                  Session name
                </label>

                <input
                  value={sessionName}
                  onChange={(e) =>
                    setSessionName(
                      e.target.value,
                    )
                  }
                  disabled={isRunning}
                  placeholder="e.g. Microeconomics revision"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white dark:focus:bg-[#202020]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-500">
                  Subject
                </label>

                <select
                  value={sessionSubjectId}
                  onChange={(e) => {
                    setSessionSubjectId(
                      e.target.value,
                    );
                    setSessionTopicId('');
                  }}
                  disabled={isRunning}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                >
                  <option
                    value=""
                    className="bg-white text-gray-900 dark:bg-[#1a1a1a] dark:text-white"
                  >
                    Select subject
                  </option>

                  {subjects.map(
                    (subject) => (
                      <option
                        key={subject.id}
                        value={subject.id}
                        className="bg-white text-gray-900 dark:bg-[#1a1a1a] dark:text-white"
                      >
                        {subject.name}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-500">
                Topic{' '}
                <span className="font-normal">
                  (optional)
                </span>
              </label>

              <select
                value={sessionTopicId}
                onChange={(e) =>
                  setSessionTopicId(
                    e.target.value,
                  )
                }
                disabled={
                  isRunning ||
                  !sessionSubjectId
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
              >
                <option
                  value=""
                  className="bg-white text-gray-900 dark:bg-[#1a1a1a] dark:text-white"
                >
                  General study
                </option>

                {sessionTopics.map(
                  (topic) => (
                    <option
                      key={topic.id}
                      value={topic.id}
                      className="bg-white text-gray-900 dark:bg-[#1a1a1a] dark:text-white"
                    >
                      {topic.name}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="mt-7 flex flex-col items-center">
              <div className="text-5xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white md:text-6xl">
                {formatTime(
                  elapsedSeconds,
                )}
              </div>

              <div className="mt-3 text-xs font-medium text-gray-400">
                {isRunning
                  ? 'Study session in progress'
                  : 'Ready to study'}
              </div>

              <div className="mt-6 flex gap-3">
                {!isRunning ? (
                  <button
                    type="button"
                    onClick={startTimer}
                    className="rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    ▶ Start Study
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={stopTimer}
                      className="rounded-xl bg-gray-900 px-7 py-3 text-sm font-bold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                    >
                      ■ Stop & Save
                    </button>

                    <button
                      type="button"
                      onClick={cancelTimer}
                      className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                    >
                      Discard
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-blue-50 p-5 dark:bg-blue-500/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Selected session
            </p>

            <p className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
              {sessionName ||
                'Study Session'}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {subjects.find(
                (subject) =>
                  subject.id ===
                  sessionSubjectId,
              )?.name ||
                'No subject selected'}
            </p>

            {sessionTopicId && (
              <p className="mt-1 text-xs text-gray-400">
                {
                  topics.find(
                    (topic) =>
                      topic.id ===
                      sessionTopicId,
                  )?.name
                }
              </p>
            )}

            <div className="mt-6 border-t border-blue-200/60 pt-4 dark:border-blue-400/10">
              <p className="text-xs text-gray-500">
                Today's focused time
              </p>

              <p className="mt-1 text-xl font-bold text-blue-600">
                {formatDuration(
                  todayStudySeconds,
                )}
              </p>

              <p className="mt-1 text-[11px] text-gray-400">
                Resets automatically at midnight
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TABS */}

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-white/[0.05]">
        <button
          type="button"
          onClick={() =>
            setActiveTab('overview')
          }
          className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
            activeTab === 'overview'
              ? 'bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-white'
              : 'text-gray-500'
          }`}
        >
          Subjects & Topics
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab('revision')
          }
          className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
            activeTab === 'revision'
              ? 'bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-white'
              : 'text-gray-500'
          }`}
        >
          Revision
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab('sessions')
          }
          className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
            activeTab === 'sessions'
              ? 'bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-white'
              : 'text-gray-500'
          }`}
        >
          Session History
        </button>
      </div>

      {/* REVISION */}

      {activeTab === 'revision' ? (
        <RevisionTracker />
      ) : activeTab === 'overview' ? (
        /* OVERVIEW */

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* SUBJECT LIST */}

          <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 dark:text-white">
                Subjects
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowSubjectForm(true)
                }
                className="text-sm font-bold text-blue-600"
              >
                +
              </button>
            </div>

            {subjects.length === 0 ? (
              <div className="rounded-xl bg-gray-50 p-5 text-center dark:bg-white/[0.04]">
                <p className="text-sm text-gray-500">
                  No subjects yet.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setShowSubjectForm(true)
                  }
                  className="mt-2 text-sm font-semibold text-blue-600"
                >
                  Create your first subject
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {subjects.map(
                  (subject) => {
                    const subjectTopicList =
                      topics.filter(
                        (topic) =>
                          topic.subject_id ===
                          subject.id,
                      );

                    const done =
                      subjectTopicList.filter(
                        (topic) =>
                          topic.completed ||
                          topic.status ===
                            'completed',
                      ).length;

                    const progress =
                      subjectTopicList.length ===
                      0
                        ? 0
                        : Math.round(
                            (done /
                              subjectTopicList.length) *
                              100,
                          );

                    const active =
                      subject.id ===
                      selectedSubjectId;

                    return (
                      <button
                        key={subject.id}
                        type="button"
                        onClick={() =>
                          setSelectedSubjectId(
                            subject.id,
                          )
                        }
                        className={`w-full rounded-xl p-3 text-left transition ${
                          active
                            ? 'bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:ring-blue-500/20'
                            : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="mt-1 h-3 w-3 shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                subject.color,
                            }}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {subject.name}
                              </p>

                              <span className="text-xs font-bold text-blue-600">
                                {progress}%
                              </span>
                            </div>

                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                              <div
                                className="h-full rounded-full bg-blue-600 transition-all"
                                style={{
                                  width: `${progress}%`,
                                }}
                              />
                            </div>

                            <p className="mt-1 text-[11px] text-gray-400">
                              {done}/
                              {
                                subjectTopicList.length
                              }{' '}
                              topics
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </section>

          {/* SELECTED SUBJECT */}

          <section className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
            {!selectedSubject ? (
              <div className="flex min-h-[400px] items-center justify-center p-6 text-center">
                <div>
                  <div className="text-4xl">
                    📚
                  </div>

                  <p className="mt-3 font-semibold text-gray-900 dark:text-white">
                    Select a subject
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Create a subject to start tracking your syllabus.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-gray-100 p-5 dark:border-white/10 md:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {selectedSubject.icon}
                        </span>

                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                          {selectedSubject.name}
                        </h2>
                      </div>

                      {selectedSubject.description && (
                        <p className="mt-1 text-sm text-gray-500">
                          {
                            selectedSubject.description
                          }
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setShowTopicForm(true)
                        }
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        + Add Topic
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteSubject(
                            selectedSubject.id,
                          )
                        }
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 dark:border-white/10 dark:hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* PROGRESS */}

                  <div className="mt-6">
                    <div className="mb-2 flex items-end justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Subject completion
                        </p>

                        <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                          {subjectProgress}%
                        </p>
                      </div>

                      <p className="text-sm text-gray-500">
                        {completedTopics} of{' '}
                        {totalTopics} topics completed
                      </p>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{
                          width: `${subjectProgress}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-6">
                  {selectedSubjectTopics.length ===
                  0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center dark:border-white/10">
                      <div className="text-4xl">
                        📝
                      </div>

                      <p className="mt-3 font-semibold text-gray-900 dark:text-white">
                        No topics yet
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Add your chapters, topics and subtopics here.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          setShowTopicForm(true)
                        }
                        className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        + Add First Topic
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {rootTopics.map(
                        (topic) =>
                          renderTopic(
                            topic,
                          ),
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      ) : (
        /* SESSION HISTORY */

        <section className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
          <div className="border-b border-gray-100 p-5 dark:border-white/10">
            <h2 className="font-bold text-gray-900 dark:text-white">
              Study Session History
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Every completed timer session appears here.
            </p>
          </div>

          {sessions.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-4xl">
                ⏱️
              </div>

              <p className="mt-3 font-semibold text-gray-900 dark:text-white">
                No study sessions yet
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Start your first timer above.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/10">
              {sessions.map(
                (session) => {
                  const subject =
                    subjects.find(
                      (item) =>
                        item.id ===
                        session.subject_id,
                    );

                  const topic =
                    topics.find(
                      (item) =>
                        item.id ===
                        session.topic_id,
                    );

                  return (
                    <div
                      key={session.id}
                      className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            📖
                          </span>

                          <p className="truncate font-semibold text-gray-900 dark:text-white">
                            {session.name}
                          </p>
                        </div>

                        <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-gray-500">
                          <span>
                            {subject?.name ||
                              'General study'}
                          </span>

                          {topic && (
                            <>
                              <span>•</span>

                              <span>
                                {topic.name}
                              </span>
                            </>
                          )}

                          <span>•</span>

                          <span>
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
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <p className="text-lg font-bold tabular-nums text-blue-600">
                          {formatDuration(
                            session.duration_seconds,
                          )}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            deleteSession(
                              session.id,
                            )
                          }
                          className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>
      )}

      {/* ADD SUBJECT MODAL */}

      {showSubjectForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#151515]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Add Subject
              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowSubjectForm(false)
                }
                className="text-xl text-gray-400"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-500">
                  Subject name
                </label>

                <input
                  autoFocus
                  value={newSubjectName}
                  onChange={(e) =>
                    setNewSubjectName(
                      e.target.value,
                    )
                  }
                  placeholder="e.g. Microeconomics"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-500">
                  Description
                </label>

                <textarea
                  value={
                    newSubjectDescription
                  }
                  onChange={(e) =>
                    setNewSubjectDescription(
                      e.target.value,
                    )
                  }
                  placeholder="Optional"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                />
              </div>

              <button
                type="button"
                disabled={
                  saving ||
                  !newSubjectName.trim()
                }
                onClick={addSubject}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? 'Creating...'
                  : 'Create Subject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TOPIC MODAL */}

      {showTopicForm &&
        selectedSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#151515]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-600">
                    {selectedSubject.name}
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                    Add Topic
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowTopicForm(false)
                  }
                  className="text-xl text-gray-400"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-500">
                    Topic name
                  </label>

                  <input
                    autoFocus
                    value={newTopicName}
                    onChange={(e) =>
                      setNewTopicName(
                        e.target.value,
                      )
                    }
                    placeholder="e.g. Demand and Supply"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-500">
                    Parent topic
                  </label>

                  <select
                    value={
                      newTopicParentId
                    }
                    onChange={(e) =>
                      setNewTopicParentId(
                        e.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                  >
                    <option
                      value=""
                      className="bg-white text-gray-900 dark:bg-[#1a1a1a] dark:text-white"
                    >
                      Main topic / chapter
                    </option>

                    {selectedSubjectTopics.map(
                      (topic) => (
                        <option
                          key={topic.id}
                          value={topic.id}
                          className="bg-white text-gray-900 dark:bg-[#1a1a1a] dark:text-white"
                        >
                          {topic.name}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={
                    saving ||
                    !newTopicName.trim()
                  }
                  onClick={addTopic}
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? 'Adding...'
                    : 'Add Topic'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}