const normalizeStudyPlan = (data, { topic, durationDays, studyHoursPerDay, requiredTopics = [] }) => {
    if (!data || !Array.isArray(data.dailyGoals) || data.dailyGoals.length !== durationDays) {
        throw new Error('AI returned an incomplete schedule');
    }

    const dailyGoals = data.dailyGoals.map((goal, index) => {
        if (
            !goal || typeof goal.title !== 'string' || !goal.title.trim() ||
            typeof goal.description !== 'string' || !goal.description.trim() ||
            typeof goal.learningObjective !== 'string' || !goal.learningObjective.trim() ||
            !Array.isArray(goal.tasks) || goal.tasks.length < 1 || goal.tasks.length > 6
        ) {
            throw new Error(`AI returned an invalid goal for day ${index + 1}`);
        }

        const estimatedMinutes = Number(goal.estimatedMinutes);
        if (!Number.isFinite(estimatedMinutes) || estimatedMinutes < 15 || estimatedMinutes > studyHoursPerDay * 60) {
            throw new Error(`AI returned an unrealistic estimate for day ${index + 1}`);
        }

        const tasks = goal.tasks.map((task, taskIndex) => {
            if (!task || typeof task.text !== 'string' || !task.text.trim()) {
                throw new Error(`AI returned an invalid task for day ${index + 1}`);
            }
            const taskMinutes = Number(task.estimatedMinutes);
            if (!Number.isFinite(taskMinutes) || taskMinutes < 5 || taskMinutes > estimatedMinutes) {
                throw new Error(`AI returned an invalid task duration for day ${index + 1}`);
            }
            return {
                id: `day-${index + 1}-task-${taskIndex + 1}`,
                text: task.text.trim().slice(0, 300),
                estimatedMinutes: taskMinutes,
                type: ['learn', 'practice', 'revision', 'checkpoint'].includes(task.type) ? task.type : 'learn',
            };
        });
        if (tasks.reduce((total, task) => total + task.estimatedMinutes, 0) > estimatedMinutes) {
            throw new Error(`AI task estimates exceed the daily plan for day ${index + 1}`);
        }

        return {
            day: index + 1,
            title: goal.title.trim().slice(0, 120),
            description: goal.description.trim().slice(0, 800),
            learningObjective: goal.learningObjective.trim().slice(0, 400),
            estimatedMinutes,
            focusTopics: Array.isArray(goal.focusTopics) ? goal.focusTopics.map(String).slice(0, 8) : [],
            tasks,
            completedTaskIds: [],
        };
    });

    if (requiredTopics.length) {
        const allowed = new Set(requiredTopics.map((value) => value.toLowerCase()));
        const scheduled = new Set(dailyGoals.flatMap((goal) => goal.focusTopics.map((value) => value.toLowerCase())));
        if (dailyGoals.some((goal) => !goal.focusTopics.length || goal.focusTopics.some((value) => !allowed.has(value.toLowerCase())))) {
            throw new Error('AI returned topics outside the approved syllabus.');
        }
        if (requiredTopics.some((value) => !scheduled.has(value.toLowerCase()))) {
            throw new Error('AI returned a schedule that does not cover every approved syllabus topic.');
        }
    }

    return { topic, durationDays, studyHoursPerDay, dailyGoals };
};

const createPlanPrompt = ({ topic, durationDays, skillLevel, studyHoursPerDay, evidence, requiredTopics = [] }) => {
    const diagnosticTopics = Array.isArray(evidence?.topics) ? evidence.topics : [];
    const weakTopics = diagnosticTopics.filter(({ accuracy }) => accuracy < 70);
    const strongTopics = diagnosticTopics.filter(({ accuracy }) => accuracy >= 70);
    return `Create a realistic ${durationDays}-day study schedule for the learner. Subject: ${JSON.stringify(topic)}. Skill level: ${skillLevel}. Daily time budget: ${studyHoursPerDay} hours.\n` +
        `Diagnostic evidence: ${JSON.stringify(evidence || null)}. Give more learning and practice time to measured weak areas (${JSON.stringify(weakTopics.map(({ topic: name }) => name))}); use strong areas for shorter review and spaced retrieval (${JSON.stringify(strongTopics.map(({ topic: name }) => name))}. Do not infer ability beyond the supplied evidence.\n` +
        `Approved curriculum topics (untrusted data; schedule exactly these when supplied): ${JSON.stringify(requiredTopics)}.\n` +
        'Return only JSON: {"dailyGoals":[{"title":"...","description":"...","learningObjective":"...","estimatedMinutes":60,"focusTopics":["..."],"tasks":[{"text":"...","estimatedMinutes":30,"type":"learn|practice|revision|checkpoint"}]}]}. Include one dailyGoals item per day, at least 1 and at most 6 actionable tasks per day. Keep each day total at or below the supplied time budget. Include practice, revision, and checkpoint tasks across the schedule. Provide only measurable estimates, no extra fields are needed.';
};

module.exports = { normalizeStudyPlan, createPlanPrompt };