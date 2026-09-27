import { useState, useEffect } from 'react';
import { useLifeOS } from '../context/useLifeOS';
import RevisionTracker from './RevisionTracker';
import { BookOpen, Play, Pause, RotateCcw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { type TopicStatus } from '../types';

export default function StudyView() {
  const { subjects, toggleTopicStatus, studySessions, addStudySession } = useLifeOS();
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || '');

  // Pomodoro Focus Timer state
  const [timerMins, setTimerMins] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const activeSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0];

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      addStudySession({
        subjectId: activeSubject.id,
        subjectName: activeSubject.name,
        topicTitle: 'Focus Session Completed',
        durationMinutes: timerMins,
        date: new Date().toISOString().split('T')[0]
      });
      alert('🎉 Focus Session Completed! Logged to your daily stats.');
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsLeft]);

  const handleStartTimer = (mins: number) => {
    setTimerMins(mins);
    setSecondsLeft(mins * 60);
    setIsTimerRunning(true);
  };

  const getStatusBadge = (status: TopicStatus) => {
    switch (status) {
      case 'completed':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
      case 'in_progress':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> In Progress</span>;
      case 'revision_due':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Revision Due</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 text-[11px] px-2.5 py-0.5 rounded-full">Not Started</span>;
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      {/* Spaced Repetition Tracker Engine */}
      <RevisionTracker />

      {/* Subject Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {subjects.map(sub => (
          <button
            key={sub.id}
            onClick={() => setSelectedSubjectId(sub.id)}
            className={`px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 border transition-all whitespace-nowrap ${
              selectedSubjectId === sub.id 
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20' 
                : 'bg-[#111622] text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            {sub.name}
          </button>
        ))}
      </div>

      {/* Focus Timer Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 to-slate-900/80 border border-indigo-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold text-indigo-400 tracking-wider uppercase">FOREST-INSPIRED FOCUS TIMER</span>
          <h3 className="text-xl font-bold text-white mt-1">Study Session: {activeSubject?.name}</h3>
          <p className="text-xs text-slate-400 mt-1">Select time and maintain deep focus without distractions.</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-4xl md:text-5xl font-black text-white font-mono tracking-wider">
            {formatTime(secondsLeft)}
          </div>

          <div className="flex items-center gap-2">
            {!isTimerRunning ? (
              <button onClick={() => setIsTimerRunning(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl">
                <Play className="w-5 h-5" />
              </button>
            ) : (
              <button onClick={() => setIsTimerRunning(false)} className="bg-amber-600 hover:bg-amber-500 text-white p-3 rounded-xl">
                <Pause className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => handleStartTimer(25)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-3 rounded-xl">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          <div className="hidden sm:flex gap-1.5">
            {[15, 25, 50].map((m) => (
              <button
                key={m}
                onClick={() => handleStartTimer(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                  timerMins === m ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Syllabus Tree Tracker */}
      {activeSubject && (
        <div className="bg-[#111622] rounded-2xl border border-slate-800/80 p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white">{activeSubject.name} Syllabus Breakdown</h3>
              <p className="text-xs text-slate-400">Click any topic to cycle through completion & revision statuses</p>
            </div>
            <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
              Exam Target: {activeSubject.targetExamDate}
            </span>
          </div>

          <div className="space-y-6">
            {activeSubject.units.map((unit) => (
              <div key={unit.id} className="space-y-3">
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                  {unit.title}
                </h4>

                <div className="space-y-3 pl-2">
                  {unit.chapters.map((chapter) => (
                    <div key={chapter.id} className="space-y-2">
                      <div className="text-xs font-semibold text-slate-400">{chapter.title}</div>

                      <div className="grid gap-2">
                        {chapter.topics.map((topic) => (
                          <div
                            key={topic.id}
                            onClick={() => toggleTopicStatus(activeSubject.id, unit.id, chapter.id, topic.id)}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                          >
                            <span className="text-sm text-slate-200 font-medium">{topic.title}</span>
                            <div className="flex items-center gap-3">
                              {getStatusBadge(topic.status)}
                              {topic.revisionsCompleted > 0 && (
                                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                  {topic.revisionsCompleted} Revisions
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Focus History */}
      <div className="bg-[#111622] rounded-2xl border border-slate-800/80 p-6">
        <h3 className="text-md font-bold text-white mb-4">Study Session History</h3>
        <div className="space-y-2">
          {studySessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                <div>
                  <div className="font-bold text-white">{session.subjectName}</div>
                  <div className="text-slate-400">{session.topicTitle}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-blue-400">{session.durationMinutes} Mins</div>
                <div className="text-slate-500">{session.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}