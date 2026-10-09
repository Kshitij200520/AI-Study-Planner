const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const dns = require('dns');

const lookupIPv4 = (hostname, options, callback) => {
    dns.resolve4(hostname, (err, addresses) => {
        if (err || !addresses || !addresses.length) {
            return dns.lookup(hostname, { ...options, family: 4 }, callback);
        }
        callback(null, addresses[0], 4);
    });
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendResetOTPEmail = async (email, otp) => {
    const allowDemoMode = process.env.NODE_ENV !== 'production';
    const placeholderValues = ['your_email@gmail.com', 'your_app_password_here'];
    const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS &&
        !placeholderValues.includes(process.env.SMTP_USER) &&
        !placeholderValues.includes(process.env.SMTP_PASS);

    if (!hasSmtpConfig) {
        if (!allowDemoMode) throw new Error('SMTP is not configured');
        console.log(`Password reset OTP for ${email}: ${otp} (demo mode)`);
        return { demoOtp: otp, demoMode: true };
    }

    try {
        const host = process.env.SMTP_HOST || 'smtp.gmail.com';
        const isGmail = host === 'smtp.gmail.com' || host === 'gmail';
        const configuredPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null;
        const portsToTry = configuredPort
            ? [configuredPort, configuredPort === 465 ? 587 : 465]
            : (isGmail ? [465, 587] : [465, 587]);

        let sent = false;
        let lastError = null;
        for (const port of portsToTry) {
            const transporter = nodemailer.createTransport({
                host: isGmail ? 'smtp.gmail.com' : host,
                port,
                secure: port === 465,
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
                lookup: lookupIPv4,
                family: 4,
                connectionTimeout: 8000,
                greetingTimeout: 8000,
                socketTimeout: 10000,
            });
            try {
                await transporter.sendMail({
                    from: process.env.SMTP_FROM || process.env.SMTP_USER,
                    to: email,
                    subject: 'StudyAI Password Reset OTP',
                    text: `Your StudyAI password reset OTP is ${otp}. It is valid for 10 minutes.`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px;">
                            <h2>StudyAI Password Reset</h2>
                            <p>Your OTP is:</p>
                            <h3 style="letter-spacing: 2px; font-size: 28px;">${otp}</h3>
                            <p>This OTP is valid for 10 minutes.</p>
                        </div>
                    `,
                });
                sent = true;
                break;
            } catch (err) {
                lastError = err;
            } finally {
                transporter.close();
            }
        }
        if (!sent) throw lastError || new Error('SMTP send failed');

        return { demoMode: false };
    } catch (error) {
        if (!allowDemoMode) throw error;
        console.warn('SMTP send failed, falling back to demo OTP mode:', error.message);
        return { demoOtp: otp, demoMode: true };
    }
};

// Register User
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const normalizedEmail = normalizeEmail(email);
        let user = await User.findOne({ email: normalizedEmail });
        if (user) return res.status(400).json({ error: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ name, email: normalizedEmail, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login User
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) return res.status(400).json({ error: 'Invalid email or password' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid email or password' });

        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'No account found with this email' });

        const otp = generateOTP();
        const hashedOTP = await bcrypt.hash(otp, 10);

        user.resetOTP = hashedOTP;
        user.resetOTPExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        const result = await sendResetOTPEmail(email, otp);

        res.status(200).json({
            message: 'OTP has been sent to your email.',
            ...(result.demoOtp ? { demoOtp: result.demoOtp } : {}),
            ...(result.demoMode ? { demoMode: true } : {}),
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Unable to send reset OTP right now.' });
    }
});

router.post('/verify-otp', async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const otp = String(req.body.otp || '').trim();

        if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

        const user = await User.findOne({ email });
        if (!user || !user.resetOTP || !user.resetOTPExpires) return res.status(400).json({ error: 'Invalid or expired OTP' });

        if (user.resetOTPExpires < Date.now()) {
            user.resetOTP = null;
            user.resetOTPExpires = null;
            await user.save();
            return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
        }

        const isValidOTP = await bcrypt.compare(otp, user.resetOTP);
        if (!isValidOTP) return res.status(400).json({ error: 'Invalid OTP' });

        res.status(200).json({ message: 'OTP verified successfully' });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Unable to verify OTP' });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const otp = String(req.body.otp || '').trim();
        const password = req.body.password;

        if (!email || !otp || !password) return res.status(400).json({ error: 'Email, OTP, and new password are required' });
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters long' });

        const user = await User.findOne({ email });
        if (!user || !user.resetOTP || !user.resetOTPExpires) return res.status(400).json({ error: 'Invalid or expired OTP' });

        if (user.resetOTPExpires < Date.now()) {
            user.resetOTP = null;
            user.resetOTPExpires = null;
            await user.save();
            return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
        }

        const isValidOTP = await bcrypt.compare(otp, user.resetOTP);
        if (!isValidOTP) return res.status(400).json({ error: 'Invalid OTP' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetOTP = null;
        user.resetOTPExpires = null;
        await user.save();

        res.status(200).json({ message: 'Password reset successfully. Please login again.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Unable to reset password' });
    }
});

router.get('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
