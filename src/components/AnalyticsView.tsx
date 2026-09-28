import { useLifeOS } from '../context/useLifeOS';
import {
  BookOpen,
  Activity,
  Flame,
  CheckCircle2,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

export default function AnalyticsView() {
  const {
    studySessions,
    runs,
    workouts,
    meals,
    tasks,
    subjects,
    settings,
    getTodayProgress,
    getOverallSyllabusProgress,
    getTodayStudyTimeMinutes,
    getTodayRunKm,
    getTodayProteinTotal,
    getTodayCaloriesTotal,
    getTodayWaterTotal,
  } = useLifeOS();

  // ==========================================================
  // TODAY
  // ==========================================================

  const todayProgress =
    getTodayProgress();

  const overallSyllabus =
    getOverallSyllabusProgress();

  const todayStudyMins =
    getTodayStudyTimeMinutes();

  const todayRunKm =
    getTodayRunKm();

  const todayProtein =
    getTodayProteinTotal();

  const todayCalories =
    getTodayCaloriesTotal();

  const todayWater =
    getTodayWaterTotal();

  // ==========================================================
  // TOTALS
  // ==========================================================

  const totalStudyMins =
    studySessions.reduce(
      (total, session) =>
        total + session.durationMinutes,
      0
    );

  const totalRunKm =
    runs.reduce(
      (total, run) =>
        total + run.distanceKm,
      0
    );

  const totalVolume =
    workouts.reduce(
      (total, workout) =>
        total + workout.totalVolumeKg,
      0
    );

  const totalProtein =
    meals.reduce(
      (total, meal) =>
        total + meal.proteinGrams,
      0
    );

  const tasksDone =
    tasks.filter(
      task => task.completed
    ).length;

  const taskRate =
    tasks.length > 0
      ? Math.round(
          (tasksDone / tasks.length) * 100
        )
      : 0;

  // ==========================================================
  // SAFE PERFORMANCE CALCULATIONS
  // ==========================================================

  const studyPerformance =
    settings.dailyStudyTargetHours > 0
      ? Math.min(
          100,
          Math.round(
            (todayStudyMins / 60 /
              settings.dailyStudyTargetHours) *
              100
          )
        )
      : 0;

  const fitnessPerformance =
    settings.dailyRunTargetKm > 0
      ? Math.min(
          100,
          Math.round(
            (todayRunKm /
              settings.dailyRunTargetKm) *
              100
          )
        )
      : 0;

  const nutritionPerformance =
    settings.dailyProteinTargetGrams > 0
      ? Math.min(
          100,
          Math.round(
            (todayProtein /
              settings.dailyProteinTargetGrams) *
              100
          )
        )
      : 0;

  // ==========================================================
  // SUBJECT-WISE STUDY TIME
  // ==========================================================

  const subjectTime: Record<
    string,
    number
  > = {};

  studySessions.forEach(session => {
    subjectTime[session.subjectName] =
      (subjectTime[session.subjectName] || 0) +
      session.durationMinutes;
  });

  // ==========================================================
  // SMART INSIGHTS
  // ==========================================================

  const insights: string[] = [];

  if (studySessions.length > 0) {
    insights.push(
      `You studied ${(totalStudyMins / 60).toFixed(
        1
      )} hours total across ${
        studySessions.length
      } sessions.`
    );
  } else {
    insights.push(
      'No study sessions recorded yet. Start your Focus Timer to build your study history.'
    );
  }

  if (subjects.length > 0) {
    insights.push(
      `Your overall syllabus completion is ${overallSyllabus}%.`
    );
  } else {
    insights.push(
      'No subjects added yet. Add your first subject to start tracking your syllabus.'
    );
  }

  if (runs.length > 0) {
    insights.push(
      `You have logged ${totalRunKm.toFixed(
        1
      )} km across ${runs.length} runs.`
    );
  } else {
    insights.push(
      'No runs recorded yet. Log your first run to start tracking your fitness progress.'
    );
  }

  if (workouts.length > 0) {
    insights.push(
      `Gym total volume is ${totalVolume.toLocaleString()} kg across ${workouts.length} workouts.`
    );
  } else {
    insights.push(
      'No workouts recorded yet.'
    );
  }

  if (meals.length > 0) {
    insights.push(
      `Average protein logged is ${Math.round(
        totalProtein /
          meals.length
      )}g per meal.`
    );
  } else {
    insights.push(
      'No meals recorded yet. Log meals to track your nutrition.'
    );
  }

  if (tasks.length > 0) {
    insights.push(
      `Task completion rate is ${taskRate}% (${tasksDone}/${tasks.length}).`
    );
  } else {
    insights.push(
      'No tasks added yet. Add tasks to start tracking daily discipline.'
    );
  }

  insights.push(
    `Today's discipline score is ${todayProgress}%.`
  );

  // ==========================================================
  // PERFORMANCE DATA
  // ==========================================================

  const performanceData = [
    {
      label: '📚 STUDY',
      value: studyPerformance,
      color: 'from-blue-500 to-blue-400',
    },
    {
      label: '🏋️ FITNESS',
      value: fitnessPerformance,
      color: 'from-emerald-500 to-emerald-400',
    },
    {
      label: '🥗 NUTRITION',
      value: nutritionPerformance,
      color: 'from-amber-500 to-amber-400',
    },
    {
      label: '📋 DISCIPLINE',
      value: todayProgress,
      color: 'from-indigo-500 to-indigo-400',
    },
    {
      label: '📖 SYLLABUS',
      value: overallSyllabus,
      color: 'from-violet-500 to-violet-400',
    },
  ];

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="space-y-8">

      {/* ======================================================
          HEADER STATS
      ====================================================== */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {/* STUDY */}

        <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">

          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            Total Study
          </div>

          <div className="text-2xl font-black text-white">
            {(totalStudyMins / 60).toFixed(1)}h
          </div>

          <div className="text-xs text-slate-500 mt-1">
            {studySessions.length} sessions
          </div>

        </div>

        {/* RUNNING */}

        <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">

          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Total Running
          </div>

          <div className="text-2xl font-black text-white">
            {totalRunKm.toFixed(1)} km
          </div>

          <div className="text-xs text-slate-500 mt-1">
            {runs.length} runs
          </div>

        </div>

        {/* GYM */}

        <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">

          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <Flame className="w-4 h-4 text-indigo-400" />
            Gym Volume
          </div>

          <div className="text-2xl font-black text-white">
            {(totalVolume / 1000).toFixed(1)}t
          </div>

          <div className="text-xs text-slate-500 mt-1">
            {workouts.length} workouts
          </div>

        </div>

        {/* TASKS */}

        <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800">

          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            Tasks Done
          </div>

          <div className="text-2xl font-black text-white">
            {taskRate}%
          </div>

          <div className="text-xs text-slate-500 mt-1">
            {tasksDone}/{tasks.length} completed
          </div>

        </div>

      </div>

      {/* ======================================================
          PERFORMANCE SCORES
      ====================================================== */}

      <div className="bg-[#111622] rounded-2xl border border-slate-800 p-6">

        <div className="flex items-center gap-2 mb-6">

          <BarChart3 className="w-5 h-5 text-blue-400" />

          <h3 className="text-lg font-bold text-white">
            Personal Performance Scores
          </h3>

        </div>

        <div className="space-y-5">

          {performanceData.map(item => (

            <div key={item.label}>

              <div className="flex justify-between text-xs mb-1.5">

                <span className="font-semibold text-slate-300">
                  {item.label}
                </span>

                <span className="font-bold text-white">
                  {item.value}%
                </span>

              </div>

              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">

                <div
                  className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all`}
                  style={{
                    width: `${item.value}%`,
                  }}
                />

              </div>

            </div>

          ))}

        </div>

      </div>

      {/* ======================================================
          SUBJECT DISTRIBUTION
      ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* SUBJECT STUDY TIME */}

        <div className="bg-[#111622] rounded-2xl border border-slate-800 p-6">

          <h3 className="text-md font-bold text-white mb-4">
            Subject-wise Study Time
          </h3>

          <div className="space-y-3">

            {Object.keys(subjectTime).length === 0 && (

              <p className="text-sm text-slate-500">
                No study sessions yet. Start the
                Focus Timer!
              </p>

            )}

            {Object.entries(
              subjectTime
            ).map(([name, mins]) => (

              <div
                key={name}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800"
              >

                <span className="text-sm font-medium text-slate-200">
                  {name}
                </span>

                <span className="text-sm font-bold text-blue-400">
                  {(mins / 60).toFixed(1)}h ({mins}m)
                </span>

              </div>

            ))}

          </div>

        </div>

        {/* SYLLABUS */}

        <div className="bg-[#111622] rounded-2xl border border-slate-800 p-6">

          <h3 className="text-md font-bold text-white mb-4">
            Syllabus by Subject
          </h3>

          <div className="space-y-3">

            {subjects.length === 0 && (

              <p className="text-sm text-slate-500">
                No subjects added yet. Add your
                first subject to start tracking
                syllabus progress.
              </p>

            )}

            {subjects.map(subject => {

              let total = 0;
              let done = 0;

              subject.units.forEach(unit => {

                unit.chapters.forEach(
                  chapter => {

                    chapter.topics.forEach(
                      topic => {

                        total += 1;

                        if (
                          topic.status ===
                            'completed' ||
                          topic.status ===
                            'revision_due' ||
                          topic.status ===
                            'revision_completed'
                        ) {
                          done += 1;
                        }

                      }
                    );

                  }
                );

              });

              const percentage =
                total === 0
                  ? 0
                  : Math.round(
                      (done / total) *
                        100
                    );

              return (

                <div
                  key={subject.id}
                  className="p-3 rounded-xl bg-slate-900/50 border border-slate-800"
                >

                  <div className="flex justify-between text-sm mb-2">

                    <span className="font-medium text-slate-200">
                      {subject.name}
                    </span>

                    <span
                      className="font-bold"
                      style={{
                        color:
                          subject.color,
                      }}
                    >
                      {percentage}%
                    </span>

                  </div>

                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">

                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor:
                          subject.color,
                      }}
                    />

                  </div>

                  <p className="text-[11px] text-slate-500 mt-1">
                    {done}/{total} topics
                  </p>

                </div>

              );
            })}

          </div>

        </div>

      </div>

      {/* ======================================================
          SMART INSIGHTS
      ====================================================== */}

      <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/20 rounded-2xl border border-blue-500/20 p-6">

        <div className="flex items-center gap-2 mb-4">

          <TrendingUp className="w-5 h-5 text-blue-400" />

          <h3 className="text-lg font-bold text-white">
            Smart Insights
          </h3>

        </div>

        <div className="space-y-2">

          {insights.map(
            (text, index) => (

              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60"
              >

                <span className="text-blue-400 font-bold text-xs mt-0.5">
                  {index + 1}.
                </span>

                <p className="text-sm text-slate-300">
                  {text}
                </p>

              </div>

            )
          )}

        </div>

      </div>

      {/* ======================================================
          TODAY SNAPSHOT
      ====================================================== */}

      <div className="bg-[#111622] rounded-2xl border border-slate-800 p-6">

        <h3 className="text-md font-bold text-white mb-4">
          Today Snapshot
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">

          {/* STUDY */}

          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">

            <div className="text-lg font-black text-blue-400">
              {(todayStudyMins / 60).toFixed(1)}h
            </div>

            <div className="text-[11px] text-slate-500">
              Study
            </div>

          </div>

          {/* RUN */}

          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">

            <div className="text-lg font-black text-emerald-400">
              {todayRunKm}km
            </div>

            <div className="text-[11px] text-slate-500">
              Run
            </div>

          </div>

          {/* PROTEIN */}

          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">

            <div className="text-lg font-black text-rose-400">
              {todayProtein}g
            </div>

            <div className="text-[11px] text-slate-500">
              Protein
            </div>

          </div>

          {/* CALORIES */}

          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">

            <div className="text-lg font-black text-amber-400">
              {todayCalories}
            </div>

            <div className="text-[11px] text-slate-500">
              Calories
            </div>

          </div>

          {/* WATER */}

          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">

            <div className="text-lg font-black text-cyan-400">
              {(todayWater / 1000).toFixed(1)}L
            </div>

            <div className="text-[11px] text-slate-500">
              Water
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}