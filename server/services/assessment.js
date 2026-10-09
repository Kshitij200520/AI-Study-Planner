const MAX_QUESTIONS = 15;

const normalizeAssessment = (assessment) => {
    if (!assessment || typeof assessment.topic !== 'string' || !Array.isArray(assessment.questions)) {
        throw new Error('Assessment response has an invalid structure');
    }

    if (assessment.questions.length < 3 || assessment.questions.length > MAX_QUESTIONS) {
        throw new Error(`Assessment must contain 3 to ${MAX_QUESTIONS} questions`);
    }

    const questions = assessment.questions.map((question, index) => {
        if (
            typeof question.topic !== 'string' || !question.topic.trim() ||
            typeof question.prompt !== 'string' || !question.prompt.trim() ||
            !Array.isArray(question.options) || question.options.length < 2 || question.options.length > 5 ||
            typeof question.correctOptionId !== 'string' ||
            typeof question.explanation !== 'string' || !question.explanation.trim()
        ) {
            throw new Error(`Question ${index + 1} is invalid`);
        }

        const options = question.options.map((option) => {
            if (typeof option.text !== 'string' || !option.text.trim()) {
                throw new Error(`Question ${index + 1} contains an invalid option`);
            }
            return { id: String(option.id), text: option.text.trim() };
        });

        const optionIds = new Set(options.map((option) => option.id));
        if (optionIds.size !== options.length || !optionIds.has(question.correctOptionId)) {
            throw new Error(`Question ${index + 1} has an invalid answer key`);
        }

        return {
            id: `q${index + 1}`,
            topic: question.topic.trim().slice(0, 120),
            prompt: question.prompt.trim().slice(0, 1200),
            options,
            correctOptionId: question.correctOptionId,
            explanation: question.explanation.trim().slice(0, 1000),
        };
    });

    return { topic: assessment.topic.trim().slice(0, 120), questions };
};

const toPublicAssessment = (assessment) => ({
    id: assessment._id ? String(assessment._id) : undefined,
    topic: assessment.topic,
    skillLevel: assessment.skillLevel,
    status: assessment.status,
    questions: assessment.questions.map(({ id, topic, prompt, options }) => ({ id, topic, prompt, options })),
});

const scoreAssessment = (questions, answers) => {
    if (!Array.isArray(answers) || answers.length !== questions.length) {
        throw new Error('Answer every question before submitting');
    }

    const answerByQuestion = new Map();
    for (const answer of answers) {
        if (!answer || typeof answer.questionId !== 'string' || typeof answer.optionId !== 'string' || answerByQuestion.has(answer.questionId)) {
            throw new Error('Answers are invalid or duplicated');
        }
        answerByQuestion.set(answer.questionId, answer.optionId);
    }

    const topicScores = new Map();
    let correct = 0;
    const reviewedQuestions = questions.map((question) => {
        const selectedOptionId = answerByQuestion.get(question.id);
        const optionExists = question.options.some((option) => option.id === selectedOptionId);
        if (!optionExists) throw new Error('An answer references an unknown question or option');

        const isCorrect = selectedOptionId === question.correctOptionId;
        if (isCorrect) correct += 1;
        const current = topicScores.get(question.topic) || { topic: question.topic, correct: 0, total: 0 };
        current.correct += Number(isCorrect);
        current.total += 1;
        topicScores.set(question.topic, current);

        return {
            questionId: question.id,
            topic: question.topic,
            selectedOptionId,
            correctOptionId: question.correctOptionId,
            isCorrect,
            explanation: question.explanation,
        };
    });

    const topics = [...topicScores.values()].map((result) => ({
        ...result,
        accuracy: Math.round((result.correct / result.total) * 100),
    }));

    return {
        correct,
        total: questions.length,
        accuracy: Math.round((correct / questions.length) * 100),
        topics,
        strengths: topics.filter(({ accuracy }) => accuracy >= 70).map(({ topic }) => topic),
        needsWork: topics.filter(({ accuracy }) => accuracy < 70).map(({ topic }) => topic),
        answers: reviewedQuestions,
    };
};

module.exports = { normalizeAssessment, toPublicAssessment, scoreAssessment };