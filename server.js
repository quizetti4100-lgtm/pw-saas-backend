require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// 1. CORS Setup - इसे खुला रखा है ताकि ब्राउज़र ब्लॉक न करे
app.use(cors({ origin: "*" }));
app.use(express.json());

// 2. MONGODB CONNECTION
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🚀 Cloud DB Connected ✅"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// 3. MODELS (Schemas)
const Institute = mongoose.model('Institute', new mongoose.Schema({
    name: String,
    logo: String,
    primaryColor: String,
    apiKey: { type: String, unique: true },
    adminEmail: { type: String, unique: true },
    password: { type: String, required: true }
}));

const Batch = mongoose.model('Batch', new mongoose.Schema({
    instituteId: String,
    title: String,
    teacher: String,
    price: Number,
    banner: String,
    description: String,
    subjects: [{
        subjectName: String,
        chapters: [{
            chapterName: String,
            contents: [{ title: String, type: String, url: String }]
        }]
    }]
}));

const User = mongoose.model('User', new mongoose.Schema({
    phoneNumber: String,
    name: String,
    instituteId: String,
    enrolledBatches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }]
}));

// ==========================================
// 4. ROUTES (लॉगिन और डेटा)
// ==========================================

// --- A. SUPER ADMIN (कोचिंग बनाने के लिए) ---
app.post('/api/superadmin/add-institute', async (req, res) => {
    try {
        const inst = new Institute(req.body);
        // अगर apiKey नहीं भेजी तो रैंडम बना देगा
        if (!inst.apiKey) inst.apiKey = "ID_" + Math.floor(1000 + Math.random() * 9000);
        await inst.save();
        res.status(201).json({ message: "Success", apiKey: inst.apiKey });
    } catch (err) { res.status(500).json({ error: "Duplicate Email or Server Error" }); }
});

// --- B. TEACHER LOGIN (Email & Password से) ---
app.post('/api/teacher/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const inst = await Institute.findOne({ adminEmail: email, password: password });
        if (!inst) return res.status(401).json({ error: "Invalid Email or Password" });
        res.json(inst);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- C. TEACHER LOGIN (Direct API Key से - तुम्हारे डैशबोर्ड के लिए) ---
app.get('/api/institute/login/:key', async (req, res) => {
    try {
        const inst = await Institute.findOne({ apiKey: req.params.key });
        if (!inst) return res.status(404).json({ error: "Institute ID not found" });
        res.json(inst);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- D. BATCH MANAGEMENT (डैशबोर्ड से बैच डालने के लिए) ---
app.get('/api/batches/:instId', async (req, res) => {
    try {
        const batches = await Batch.find({ instituteId: req.params.instId });
        res.json(batches);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/add-batch', async (req, res) => {
    try {
        const batch = new Batch(req.body);
        await batch.save();
        res.json({ message: "Success" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- E. CONTENT MANAGEMENT (वीडियो/पीडीएफ जोड़ने के लिए) ---
app.post('/api/admin/add-material/:batchId', async (req, res) => {
    try {
        const { subjectName, chapterName, title, type, url } = req.body;
        const batch = await Batch.findById(req.params.batchId);

        let sub = batch.subjects.find(s => s.subjectName === subjectName) ||
            (batch.subjects.push({ subjectName, chapters: [] }), batch.subjects[batch.subjects.length - 1]);

        let chap = sub.chapters.find(c => c.chapterName === chapterName) ||
            (sub.chapters.push({ chapterName, contents: [] }), sub.chapters[sub.chapters.length - 1]);

        chap.contents.push({ title, type, url });
        await batch.save();
        res.json({ message: "Success" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- F. SECRET: ALL INSTITUTES (तुम्हारे चेक करने के लिए) ---
app.get('/api/superadmin/all', async (req, res) => {
    const list = await Institute.find({}, { password: 0 }); // पासवर्ड छुपा कर लिस्ट देगा
    res.json(list);
});

// 5. START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Live on port ${PORT}`));