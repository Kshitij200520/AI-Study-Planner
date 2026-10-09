const dayMilliseconds = 24 * 60 * 60 * 1000;

const getLocalDateParts = (date, timezone) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return { year: Number(values.year), month: Number(values.month), day: Number(values.day), key: `${values.year}-${values.month}-${values.day}` };
};

const localDateOrdinal = ({ year, month, day }) => Date.UTC(year, month - 1, day) / dayMilliseconds;

const validateTimezone = (timezone) => {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
        return true;
    } catch {
        return false;
    }
};

const normalizeTask = (task, plan, dayIndex, taskIndex) => {
    const legacy = typeof task === 'string';
    const id = legacy ? `day-${dayIndex + 1}-task-${taskIndex + 1}` : task?.id;
    const title = legacy ? task : String(task?.text || '').trim();
    const duration = legacy ? null : Number(task?.estimatedMinutes);
    return {
        id: String(id || `day-${dayIndex + 1}-task-${taskIndex + 1}`),
        title,
        estimatedMinutes: Number.isFinite(duration) && duration > 0 ? duration : null,
        planId: String(plan._id),
        planName: plan.topic,
        planStartDate: plan.startDate || plan.createdAt,
        planDurationDays: Number(plan.durationDays),
        planProgress: Number(plan.progress || 0),
        scheduledDay: dayIndex + 1,
        focusTopics: Array.isArray(plan.dailyGoals[dayIndex]?.focusTopics) ? plan.dailyGoals[dayIndex].focusTopics : [],
        dayCompleted: (plan.completedDayNumbers || []).includes(dayIndex + 1),
        taskCompleted: (plan.completedTaskIds || []).includes(String(id || `day-${dayIndex + 1}-task-${taskIndex + 1}`)),
    };
};

const getPendingTasksForPlans = (plans, { timezone, now = new Date(), includeOverdue = false }) => {
    if (!validateTimezone(timezone)) throw new Error('Invalid timezone.');
    const today = getLocalDateParts(now, timezone);
    const todayOrdinal = localDateOrdinal(today);
    const tasks = [];
    const seenTasks = new Set();

    for (const plan of plans) {
        const start = plan.startDate || plan.createdAt;
        if (!start || !Number.isFinite(new Date(start).getTime()) || new Date(start) > now) continue;
        const startOrdinal = localDateOrdinal(getLocalDateParts(new Date(start), timezone));
        const todayDayIndex = todayOrdinal - startOrdinal;
        if (todayDayIndex < 0 || todayDayIndex >= Number(plan.durationDays)) continue;

        const firstDay = includeOverdue ? 0 : todayDayIndex;
        for (let dayIndex = firstDay; dayIndex <= todayDayIndex; dayIndex += 1) {
            const goal = plan.dailyGoals?.[dayIndex];
            if (!goal || (plan.completedDayNumbers || []).includes(dayIndex + 1)) continue;
            for (let taskIndex = 0; taskIndex < (goal.tasks || []).length; taskIndex += 1) {
                const task = normalizeTask(goal.tasks[taskIndex], plan, dayIndex, taskIndex);
                if (!task.title || task.taskCompleted) continue;
                const uniqueKey = `${task.planId}:${task.id}`;
                if (seenTasks.has(uniqueKey)) continue;
                seenTasks.add(uniqueKey);
                task.overdue = dayIndex < todayDayIndex;
                tasks.push(task);
            }
        }
    }

    const todayTasks = tasks.filter((task) => !task.overdue);
    const overdueTasks = tasks.filter((task) => task.overdue);
    return {
        date: today.key,
        timezone,
        today: todayTasks,
        overdue: includeOverdue ? overdueTasks : [],
        tasks: [...(includeOverdue ? overdueTasks : []), ...todayTasks],
        remainingMinutes: tasks.filter((task) => !task.overdue || includeOverdue).reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0),
        tasksWithoutEstimate: tasks.filter((task) => (!task.overdue || includeOverdue) && task.estimatedMinutes === null).length,
    };
};

const isReminderDue = (settings, now = new Date()) => {
    if (!settings?.enabled || !/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.time || '')) return false;
    const local = new Intl.DateTimeFormat('en-GB', {
        timeZone: settings.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).format(now);
    return local >= settings.time;
};

module.exports = { getLocalDateParts, localDateOrdinal, validateTimezone, getPendingTasksForPlans, isReminderDue };