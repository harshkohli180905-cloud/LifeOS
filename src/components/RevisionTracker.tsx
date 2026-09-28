import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  RotateCcw,
  Search,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type RevisionTopic = {
  id: string;
  name: string;
  subject_id: string;
  parent_topic_id: string | null;
  completed: boolean;
  status:
    | 'not_started'
    | 'in_progress'
    | 'completed'
    | 'revision_due'
    | 'revision_completed';
  revisions_completed: number;
  updated_at: string;
};

type Subject = {
  id: string;
  name: string;
  color: string | null;
};

type RevisionTrackerProps = {
  onTopicSelect?: (topicId: string) => void;
};

function getRevisionLabel(count: number) {
  if (count <= 0) return 'Not revised';
  if (count === 1) return '1 revision';
  return `${count} revisions`;
}

export default function RevisionTracker({
  onTopicSelect,
}: RevisionTrackerProps) {
  const { user } = useAuth();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<RevisionTopic[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [expandedSubjects, setExpandedSubjects] = useState<
    Record<string, boolean>
  >({});

  const loadData = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const [subjectsResult, topicsResult] = await Promise.all([
        supabase
          .from('subjects')
          .select('id, name, color')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),

        supabase
          .from('topics')
          .select(
            'id, name, subject_id, parent_topic_id, completed, status, revisions_completed, updated_at'
          )
          .eq('user_id', user.id)
          .order('position', { ascending: true }),
      ]);

      if (subjectsResult.error) {
        throw subjectsResult.error;
      }

      if (topicsResult.error) {
        throw topicsResult.error;
      }

      const loadedSubjects = (subjectsResult.data ?? []) as Subject[];

      const loadedTopics = (
        topicsResult.data ?? []
      ).map((topic) => ({
        ...topic,
        revisions_completed: Number(topic.revisions_completed ?? 0),
      })) as RevisionTopic[];

      setSubjects(loadedSubjects);
      setTopics(loadedTopics);

      setExpandedSubjects((previous) => {
        const next = { ...previous };

        loadedSubjects.forEach((subject) => {
          if (!(subject.id in next)) {
            next[subject.id] = true;
          }
        });

        return next;
      });
    } catch (error) {
      console.error('Revision tracker loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const revisionTopics = useMemo(() => {
    return topics.filter(
      (topic) =>
        topic.completed ||
        topic.status === 'completed' ||
        topic.status === 'revision_due' ||
        topic.status === 'revision_completed'
    );
  }, [topics]);

  const filteredTopics = useMemo(() => {
    const query = search.trim().toLowerCase();

    return revisionTopics.filter((topic) => {
      const matchesSubject =
        selectedSubject === 'all' ||
        topic.subject_id === selectedSubject;

      const matchesSearch =
        !query || topic.name.toLowerCase().includes(query);

      return matchesSubject && matchesSearch;
    });
  }, [revisionTopics, selectedSubject, search]);

  const groupedSubjects = useMemo(() => {
    return subjects
      .map((subject) => ({
        subject,
        topics: filteredTopics.filter(
          (topic) => topic.subject_id === subject.id
        ),
      }))
      .filter((group) => group.topics.length > 0);
  }, [subjects, filteredTopics]);

  const stats = useMemo(() => {
    const total = revisionTopics.length;

    const revised = revisionTopics.filter(
      (topic) => topic.revisions_completed > 0
    ).length;

    const due = revisionTopics.filter(
      (topic) => topic.status === 'revision_due'
    ).length;

    const completed = revisionTopics.filter(
      (topic) => topic.status === 'revision_completed'
    ).length;

    const totalRevisions = revisionTopics.reduce(
      (sum, topic) => sum + topic.revisions_completed,
      0
    );

    return {
      total,
      revised,
      due,
      completed,
      totalRevisions,
    };
  }, [revisionTopics]);

  const markRevision = async (topic: RevisionTopic) => {
    if (!user) return;

    const newCount = topic.revisions_completed + 1;

    const { error } = await supabase
      .from('topics')
      .update({
        revisions_completed: newCount,
        status: 'revision_completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', topic.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Revision update error:', error);
      return;
    }

    setTopics((current) =>
      current.map((item) =>
        item.id === topic.id
          ? {
              ...item,
              revisions_completed: newCount,
              status: 'revision_completed',
              updated_at: new Date().toISOString(),
            }
          : item
      )
    );
  };

  const markRevisionDue = async (topic: RevisionTopic) => {
    if (!user) return;

    const { error } = await supabase
      .from('topics')
      .update({
        status: 'revision_due',
        updated_at: new Date().toISOString(),
      })
      .eq('id', topic.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Revision due update error:', error);
      return;
    }

    setTopics((current) =>
      current.map((item) =>
        item.id === topic.id
          ? {
              ...item,
              status: 'revision_due',
              updated_at: new Date().toISOString(),
            }
          : item
      )
    );
  };

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((current) => ({
      ...current,
      [subjectId]: !current[subjectId],
    }));
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-white/10 dark:bg-[#141414]">
        <div className="flex items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-black dark:border-white/10 dark:border-t-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
            <RotateCcw size={21} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Revision Tracker
            </h2>

            <p className="text-sm text-gray-500">
              Keep completed topics fresh with regular revisions.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#141414]">
          <p className="text-xs text-gray-500">Topics</p>

          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#141414]">
          <p className="text-xs text-gray-500">Revised</p>

          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.revised}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#141414]">
          <p className="text-xs text-gray-500">Due</p>

          <p className="mt-2 text-2xl font-bold text-orange-500">
            {stats.due}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#141414]">
          <p className="text-xs text-gray-500">Total revisions</p>

          <p className="mt-2 text-2xl font-bold text-purple-500">
            {stats.totalRevisions}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#141414]">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search topics..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-purple-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          <select
            value={selectedSubject}
            onChange={(event) => setSelectedSubject(event.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
          >
            <option value="all">All subjects</option>

            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty */}
      {groupedSubjects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-white/10 dark:bg-[#141414]">
          <RotateCcw
            size={28}
            className="mx-auto text-gray-400"
          />

          <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
            No revision topics found
          </h3>

          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
            Complete some study topics first and they will appear
            here for revision.
          </p>
        </div>
      )}

      {/* Subject Groups */}
      <div className="space-y-3">
        {groupedSubjects.map(({ subject, topics: subjectTopics }) => {
          const expanded = expandedSubjects[subject.id] ?? true;

          const dueCount = subjectTopics.filter(
            (topic) => topic.status === 'revision_due'
          ).length;

          return (
            <div
              key={subject.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#141414]"
            >
              {/* Subject header */}
              <button
                onClick={() => toggleSubject(subject.id)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-white/5"
              >
                {expanded ? (
                  <ChevronDown
                    size={18}
                    className="text-gray-400"
                  />
                ) : (
                  <ChevronRight
                    size={18}
                    className="text-gray-400"
                  />
                )}

                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor:
                      subject.color || '#8b5cf6',
                  }}
                />

                <span className="flex-1 font-semibold text-gray-900 dark:text-white">
                  {subject.name}
                </span>

                <span className="text-xs text-gray-500">
                  {subjectTopics.length} topic
                  {subjectTopics.length !== 1 ? 's' : ''}
                </span>

                {dueCount > 0 && (
                  <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                    {dueCount} due
                  </span>
                )}
              </button>

              {/* Topics */}
              {expanded && (
                <div className="border-t border-gray-200 dark:border-white/10">
                  {subjectTopics.map((topic) => {
                    const isDue =
                      topic.status === 'revision_due';

                    const isCompleted =
                      topic.status === 'revision_completed';

                    return (
                      <div
                        key={topic.id}
                        className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 last:border-b-0 dark:border-white/5 md:flex-row md:items-center"
                      >
                        <button
                          onClick={() =>
                            onTopicSelect?.(topic.id)
                          }
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              isCompleted
                                ? 'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400'
                                : isDue
                                  ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
                                  : 'bg-gray-100 text-gray-500 dark:bg-white/5'
                            }`}
                          >
                            {isCompleted ? (
                              <Check size={16} />
                            ) : (
                              <Clock3 size={16} />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                              {topic.name}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {getRevisionLabel(
                                  topic.revisions_completed
                                )}
                              </span>

                              {isDue && (
                                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                                  Revision due
                                </span>
                              )}

                              {isCompleted && (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:bg-green-500/10 dark:text-green-400">
                                  Revised
                                </span>
                              )}
                            </div>
                          </div>
                        </button>

                        <div className="flex items-center gap-2 pl-11 md:pl-0">
                          {!isDue && (
                            <button
                              onClick={() =>
                                markRevisionDue(topic)
                              }
                              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                            >
                              Mark due
                            </button>
                          )}

                          <button
                            onClick={() => markRevision(topic)}
                            className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-black"
                          >
                            <Check size={14} />
                            Revise
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}