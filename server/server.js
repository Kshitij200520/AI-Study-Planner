const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const plannerRoutes = require('./routes/planner');
const assessmentRoutes = require('./routes/assessments');
const revisionRoutes = require('./routes/revisions');
const tutorRoutes = require('./routes/tutor');
const syllabusRoutes = require('./routes/syllabus');
const analyticsRoutes = require('./routes/analytics');
const reminderRoutes = require('./routes/reminders');
const { startReminderScheduler } = require('./services/reminderScheduler');
const ReminderDelivery = require('./models/ReminderDelivery');

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'AI Study Planner API is running successfully' });
});

app.use('/api/auth', authRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/revisions', revisionRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reminders', reminderRoutes);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to MongoDB');
    await ReminderDelivery.init();
    startReminderScheduler();
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('MongoDB connection error:', err);
});
