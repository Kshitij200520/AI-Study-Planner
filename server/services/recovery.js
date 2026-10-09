const buildCatchUpSchedule = ({ dailyGoals, completedTaskIds = [], completedDayNumbers = [], topicPriorities = [], remainingDays, studyHoursPerDay }) => {
    if (!Array.isArray(dailyGoals) || !Number.isInteger(remainingDays) || remainingDays < 1 || remainingDays > 30) {
        throw new Error('Choose between 1 and 30 remaining days.');
    }
    if (!Number.isFinite(studyHoursPerDay) || studyHoursPerDay < 0.5 || studyHoursPerDay > 12) {
        throw new Error('Daily study time must be between 0.5 and 12 hours.');
    }

    const completed = new Set(completedTaskIds);
    const completedDays = new Set(completedDayNumbers);
    const pending = [];
    const completedTasks = [];
    dailyGoals.forEach((goal, dayIndex) => {
        (goal.tasks || []).forEach((task, taskIndex) => {
            const normalized = typeof task === 'string'
                ? { id: `day-${dayIndex + 1}-task-${taskIndex + 1}`, text: task, estimatedMinutes: 30, type: 'learn' }
                : { ...task, id: task.id || `day-${dayIndex + 1}-task-${taskIndex + 1}` };
            if (completed.has(normalized.id) || completedDays.has(dayIndex + 1)) completedTasks.push(normalized);
            else pending.push({ ...normalized, sourceDay: dayIndex + 1, focusTopics: goal.focusTopics || [] });
        });
    });

    const priorityIndex = new Map(topicPriorities.map((topic, index) => [String(topic).toLowerCase(), index]));
    pending.sort((left, right) => {
        const leftPriority = Math.min(...left.focusTopics.map((topic) => priorityIndex.get(String(topic).toLowerCase()) ?? Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
        const rightPriority = Math.min(...right.focusTopics.map((topic) => priorityIndex.get(String(topic).toLowerCase()) ?? Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
        return leftPriority - rightPriority || left.sourceDay - right.sourceDay;
    });

    const dailyCapacity = Math.floor(studyHoursPerDay * 60);
    const requiredMinutes = pending.reduce((total, task) => total + Math.max(5, Number(task.estimatedMinutes) || 30), 0);
    const totalCapacityMinutes = dailyCapacity * remainingDays;
    if (pending.some((task) => Number(task.estimatedMinutes) > dailyCapacity) || requiredMinutes > totalCapacityMinutes) {
        const error = new Error('There is not enough time for a realistic catch-up schedule. Increase remaining days or daily study hours.');
        error.status = 422;
        error.requiredMinutes = requiredMinutes;
        error.availableMinutes = totalCapacityMinutes;
        throw error;
    }

    const revisedDailyGoals = Array.from({ length: remainingDays }, (_, index) => ({
        day: index + 1,
        title: `Catch-up day ${index + 1}`,
        description: 'Redistributed unfinished tasks, keeping within your daily time budget.',
        learningObjective: 'Complete the scheduled pending tasks and record any topics that need another review.',
        estimatedMinutes: 0,
        focusTopics: [],
        tasks: [],
        completedTaskIds: [],
    }));

    for (const task of pending) {
        const duration = Math.max(5, Number(task.estimatedMinutes) || 30);
        const fittingDays = revisedDailyGoals
            .map((goal, index) => ({ index, remaining: dailyCapacity - goal.estimatedMinutes }))
            .filter((goal) => goal.remaining >= duration)
            .sort((left, right) => left.remaining - right.remaining || left.index - right.index);
        if (!fittingDays.length) {
            const error = new Error('The pending tasks exceed the available daily schedule.');
            error.status = 422;
            throw error;
        }
        const targetDay = fittingDays[0].index;
        const goal = revisedDailyGoals[targetDay];
        goal.tasks.push({
            id: `rebuild-day-${targetDay + 1}-task-${goal.tasks.length + 1}`,
            text: task.text,
            estimatedMinutes: duration,
            type: task.type || 'learn',
            sourceTaskId: task.id,
        });
        goal.estimatedMinutes += duration;
        goal.focusTopics.push(...task.focusTopics);
    }

    revisedDailyGoals.forEach((goal) => {
        goal.focusTopics = [...new Set(goal.focusTopics)];
        if (!goal.tasks.length) goal.title = `Flexible study day ${goal.day}`;
    });

    return {
        revisedDailyGoals,
        completedTasks,
        pendingTaskCount: pending.length,
        requiredMinutes,
        availableMinutes: totalCapacityMinutes,
        explanation: `Scheduled ${pending.length} pending tasks across ${remainingDays} days, within ${studyHoursPerDay} hours per day. ${topicPriorities.length ? `Priority topics were placed first: ${topicPriorities.join(', ')}. ` : ''}${completedTasks.length} completed tasks are preserved in the prior plan version.`,
    };
};

module.exports = { buildCatchUpSchedule };