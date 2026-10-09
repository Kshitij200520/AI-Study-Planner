const Groq = require('groq-sdk');

const getGroqModel = () => process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

const createGroqClient = () => {
    if (!process.env.GROQ_API_KEY) {
        const error = new Error('AI service is not configured');
        error.status = 503;
        throw error;
    }
    return new Groq({ apiKey: process.env.GROQ_API_KEY });
};

const requestJson = async (systemPrompt, userPrompt, maxTokens = 4096) => {
    let response;
    try {
        response = await createGroqClient().chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            model: getGroqModel(),
            temperature: 0.4,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
        });
    } catch (cause) {
        if (cause.status === 404 || cause.code === 'model_not_found') {
            const error = new Error(`Groq model "${getGroqModel()}" is unavailable. Set GROQ_MODEL to a model enabled for this account.`);
            error.status = 503;
            error.cause = cause;
            throw error;
        }
        if (cause.status === 401 || cause.status === 403) {
            const error = new Error('Groq rejected the configured API key or account access. Check the server-side Groq credentials.');
            error.status = 503;
            error.cause = cause;
            throw error;
        }
        throw cause;
    }

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error('AI returned an empty response');
    try {
        return JSON.parse(raw);
    } catch {
        const error = new Error('AI returned malformed structured data');
        error.status = 502;
        throw error;
    }
};

module.exports = { requestJson, getGroqModel, createGroqClient };