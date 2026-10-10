const Groq = require('groq-sdk');

const DEFAULT_MODELS = ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b'];

const getGroqModel = () => process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

const createGroqClient = () => {
    if (!process.env.GROQ_API_KEY) {
        const error = new Error('AI service is not configured');
        error.status = 503;
        throw error;
    }
    return new Groq({ apiKey: process.env.GROQ_API_KEY });
};

const requestChatCompletion = async ({ messages, max_tokens = 1200, temperature = 0.5 }) => {
    const client = createGroqClient();
    const primaryModel = getGroqModel();
    const candidateModels = [...new Set([primaryModel, ...DEFAULT_MODELS])];

    let lastError = null;
    for (const model of candidateModels) {
        try {
            return await client.chat.completions.create({
                messages,
                model,
                temperature,
                max_tokens,
            });
        } catch (error) {
            lastError = error;
            console.warn(`Groq chat call with model "${model}" failed: ${error.message}. Trying fallback model...`);
        }
    }
    throw lastError || new Error('All Groq AI models failed');
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

module.exports = { requestJson, requestChatCompletion, getGroqModel, createGroqClient };