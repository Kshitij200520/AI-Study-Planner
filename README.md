# AI Study Planner 🧠

A full-stack MERN application that generates personalized AI study plans using **Groq AI (LLaMA 3.3 70B)**.

## ✨ Features
- 🔐 JWT Authentication (Register / Login)
- 🤖 AI-Powered Study Plan Generator (Groq AI)
- 📅 Day-by-day study roadmap
- 📊 Dashboard with progress tracking
- 🎨 Premium dark glassmorphism UI

## 🚀 Tech Stack
- **Frontend:** React + Vite, React Router, Axios
- **Backend:** Node.js, Express.js
- **Database:** MongoDB + Mongoose
- **AI:** Groq SDK (LLaMA 3.3 70B)
- **Auth:** JWT + bcryptjs

## 🛠️ Setup

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd ai-study-planner
```

### 2. Setup Server
```bash
cd server
npm install
```
Create a `.env` file in `server/`:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/ai-study-planner
JWT_SECRET=your_jwt_secret
GROQ_API_KEY=your_groq_api_key
```
```bash
npm run dev
```

### 3. Setup Client
```bash
cd ../client
npm install
npm run dev
```

### 4. Open App
Visit **http://localhost:5173**

## 📁 Project Structure
```
ai-study-planner/
├── server/          # Express backend
│   ├── models/      # Mongoose models
│   ├── routes/      # API routes
│   ├── middleware/  # JWT auth middleware
│   └── server.js
└── client/          # React frontend
    └── src/
        ├── pages/
        ├── components/
        ├── context/
        └── utils/
```
