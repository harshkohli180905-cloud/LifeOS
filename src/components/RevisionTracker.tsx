import { useLifeOS } from '../context/useLifeOS';
import { AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';

export default function RevisionTracker() {
  const { subjects, toggleTopicStatus } = useLifeOS();

  // Spaced Repetition Intervals (in days)
  const intervals = [1, 3, 7, 15, 30];

  // Collect all topics with revision statuses
  const revisionTopics: {
    subjectId: string;
    unitId: string;
    chapterId: string;
    topicId: string;
    subjectName: string;
    topicTitle: string;
    status: string;
    revisionsCompleted: number;
    nextInterval: number;
  }[] = [];

  subjects.forEach(sub => {
    sub.units.forEach(u => {
      u.chapters.forEach(c => {
        c.topics.forEach(tp => {
          if (tp.status === 'completed' || tp.status === 'revision_due' || tp.status === 'revision_completed' || tp.revisionsCompleted > 0) {
            const currentRev = tp.revisionsCompleted;
            const nextDayInterval = intervals[Math.min(currentRev, intervals.length - 1)];
            revisionTopics.push({
              subjectId: sub.id,
              unitId: u.id,
              chapterId: c.id,
              topicId: tp.id,
              subjectName: sub.name,
              topicTitle: tp.title,
              status: tp.status,
              revisionsCompleted: currentRev,
              nextInterval: nextDayInterval
            });
          }
        });
      });
    });
  });

  const dueTodayCount = revisionTopics.filter(t => t.status === 'revision_due').length;

  return (
    <div className="bg-[#111622] rounded-2xl border border-slate-800 p-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold">
            🔄
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Spaced Repetition Revision Engine</h3>
            <p className="text-xs text-slate-400">Scientific intervals: Day 1 → Day 3 → Day 7 → Day 15 → Day 30</p>
          </div>
        </div>

        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
          dueTodayCount > 0 
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        }`}>
          {dueTodayCount > 0 ? `⚠️ ${dueTodayCount} Revisions Due Today` : '✅ All Revisions Caught Up!'}
        </span>
      </div>

      {/* Interval Badge Info */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-medium">Interval Schedule:</span>
        {intervals.map((day, idx) => (
          <span key={day} className="bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg">
            Rev {idx + 1}: +{day}d
          </span>
        ))}
      </div>

      {/* Topics List */}
      <div className="space-y-3">
        {revisionTopics.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No completed topics yet. Mark topics as "Completed" in your Syllabus Tracker to start spaced repetition!
          </div>
        ) : (
          revisionTopics.map(item => (
            <div
              key={item.topicId}
              className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                item.status === 'revision_due'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-slate-900/50 border-slate-800'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-blue-400">
                    {item.subjectName}
                  </span>
                  <span className="text-sm font-bold text-white">{item.topicTitle}</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Next Interval: +{item.nextInterval} days
                  </span>
                  <span>•</span>
                  <span>{item.revisionsCompleted} Revisions Completed</span>
                </div>
              </div>

              <button
                onClick={() => toggleTopicStatus(item.subjectId, item.unitId, item.chapterId, item.topicId)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  item.status === 'revision_due'
                    ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {item.status === 'revision_due' ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" /> Revise Now
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Mark Revised (+1)
                  </>
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}