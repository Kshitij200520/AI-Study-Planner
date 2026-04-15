const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const StudyPlan = require('../models/StudyPlan');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Generate a study plan using Groq AI
router.post('/generate', auth, async (req, res) => {
    try {
        const { topic, durationDays, currentKnowledgeLevel } = req.body;

        const prompt = `You are an expert AI study planner. Create a detailed ${durationDays}-day study plan for learning "${topic}". The user's current knowledge level is "${currentKnowledgeLevel}".

Respond ONLY with valid JSON — no markdown, no code fences, no extra text. The JSON must exactly match this structure:
{
  "topic": "${topic}",
  "durationDays": ${durationDays},
  "dailyGoals": [
    {
      "day": 1,
      "title": "Short day title",
      "description": "What the learner will cover today",
      "tasks": ["Task 1", "Task 2", "Task 3"]
    }
  ]
}

Generate an entry for every day from 1 to ${durationDays}.`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 8192,
        });

        let rawResponse = chatCompletion.choices[0]?.message?.content || '';

        // Strip any markdown code fences if present
        rawResponse = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();

        // Extract first JSON object in case there's extra text
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('No JSON found in AI response:', rawResponse);
            return res.status(500).json({ error: 'AI returned an invalid response. Try again.' });
        }

        const planData = JSON.parse(jsonMatch[0]);

        const newPlan = new StudyPlan({
            userId: req.user._id,
            topic: planData.topic,
            durationDays: planData.durationDays,
            dailyGoals: planData.dailyGoals,
        });

        await newPlan.save();
        res.status(201).json(newPlan);

    } catch (error) {
        console.error('Generate error:', error.message || error);
        res.status(500).json({ error: 'Failed to generate study plan. Please try again.' });
    }
});

// Get all plans for logged-in user
router.get('/', auth, async (req, res) => {
    try {
        const plans = await StudyPlan.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(plans);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single plan by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const plan = await StudyPlan.findOne({ _id: req.params.id, userId: req.user._id });
        if (!plan) return res.status(404).json({ error: 'Plan not found' });
        res.json(plan);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update progress
router.put('/:id/progress', auth, async (req, res) => {
    try {
        const { progress } = req.body;
        const plan = await StudyPlan.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { $set: { progress } },
            { new: true }
        );
        if (!plan) return res.status(404).json({ error: 'Plan not found' });
        res.json(plan);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
