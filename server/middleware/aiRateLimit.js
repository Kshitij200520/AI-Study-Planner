const requestsByUser = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 8;

module.exports = function aiRateLimit(req, res, next) {
    const key = String(req.user?._id || req.ip);
    const now = Date.now();
    const recent = (requestsByUser.get(key) || []).filter((timestamp) => now - timestamp < WINDOW_MS);
    if (recent.length >= MAX_REQUESTS) {
        return res.status(429).json({ error: 'AI request limit reached. Please wait a minute and try again.' });
    }
    recent.push(now);
    requestsByUser.set(key, recent);
    next();
};