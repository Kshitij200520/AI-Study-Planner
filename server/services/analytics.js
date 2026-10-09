const buildAnalytics = ({ plans, assessments, dueRevisions, now = new Date() }) => {
    const assessmentResults = assessments.filter((assessment) => assessment.status === 'submitted' && assessment.result);
    const topicTotals = new Map();
    for (const assessment of assessmentResults) {
        for (const topic of assessment.result.topics || []) {
            const current = topicTotals.get(topic.topic) || { topic: topic.topic, correct: 0, total: 0, attempts: 0 };
            current.correct += topic.correct;
            current.total += topic.total;
            current.attempts += 1;
            topicTotals.set(topic.topic, current);
        }
    }

    const topicPerformance = [...topicTotals.values()].map((topic) => ({
        ...topic,
        accuracy: topic.total ? Math.round((topic.correct / topic.total) * 100) : 0,
        basis: 'submitted diagnostic answers',
    })).sort((left, right) => left.accuracy - right.accuracy);

    const allActivity = plans.flatMap((plan) => plan.activity || []);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
    const completedEvents = allActivity.filter((event) => event.kind === 'task' && event.completed);
    const dailyCompletions = completedEvents.filter((event) => new Date(event.at) >= today).length;
    const weeklyCompletions = completedEvents.filter((event) => new Date(event.at) >= weekStart).length;
    const weeklyTrend = Array.from({ length: 7 }, (_, offset) => {
        const date = new Date(weekStart.getTime() + offset * 24 * 60 * 60 * 1000);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        return {
            date: date.toISOString().slice(0, 10),
            completedTasks: completedEvents.filter((event) => new Date(event.at) >= date && new Date(event.at) < nextDate).length,
        };
    });

    const totalTasks = plans.reduce((total, plan) => total + plan.dailyGoals.reduce((count, goal) => count + (goal.tasks || []).length, 0), 0);
    const completedTaskCount = plans.reduce((total, plan) => total + (plan.completedTaskIds || []).length, 0);
    const completedPlans = plans.filter((plan) => plan.progress === 100).length;
    return {
        plans: { total: plans.length, completed: completedPlans, totalScheduledDays: plans.reduce((total, plan) => total + plan.durationDays, 0) },
        taskCompletion: {
            completed: completedTaskCount,
            total: totalTasks,
            accuracyPercent: totalTasks ? Math.round((completedTaskCount / totalTasks) * 100) : 0,
            completedToday: dailyCompletions,
            completedThisWeek: weeklyCompletions,
        },
        quizPerformance: { submittedAssessments: assessmentResults.length, topicPerformance },
        masteryEstimates: topicPerformance.map(({ topic, accuracy, attempts }) => ({ topic, estimatePercent: accuracy, attempts, basis: 'aggregate diagnostic accuracy; not a formal certification' })),
        weakTopics: topicPerformance.filter(({ accuracy }) => accuracy < 70).map(({ topic, accuracy }) => ({ topic, accuracy })),
        weeklyTrend,
        studyTime: { tracked: false, message: 'Study time has not been measured by this app yet.' },
        revisionsDue: dueRevisions,
    };
};

module.exports = { buildAnalytics };