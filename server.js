require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// 1. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🚀 MongoDB Connected ✅ (Version 2.0)"))
    .catch(err => console.error("❌ DB Error:", err));

// 2. MODELS
const Institute = mongoose.models.Institute || mongoose.model('Institute', new mongoose.Schema({
    name: String, logo: String, primaryColor: String, apiKey: { type: String, unique: true }
}));

const Batch = mongoose.models.Batch || mongoose.model('Batch', new mongoose.Schema({
    instituteId: String, title: String, teacher: String, price: Number, banner: String, description: String,
    subjects: [{ subjectName: String, chapters: [{ chapterName: String, contents: [{ title: String, type: String, url: String }] }] }]
}));

// 3. ROUTES
// --- TEST ROUTE ---
app.get('/api/test', (req, res) => res.send("Server is LIVE and Updated to V2! 🚀"));

// --- DASHBOARD LOGIN (URL Parameter Based) ---
app.get('/api/institute/config/:apiKey', async (req, res) => {
    try {
        const key = req.params.apiKey.trim();
        const inst = await Institute.findOne({ apiKey: key });
        if (!inst) return res.status(404).json({ error: "ID Not Found in DB" });
        res.json(inst);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- OTHER ROUTES ---
app.post('/api/superadmin/add-institute', async (req, res) => {
    try {
        const inst = new Institute(req.body);
        await inst.save();
        res.status(201).json({ message: "Success", apiKey: inst.apiKey });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/add-batch', async (req, res) => {
    try {
        const batch = new Batch(req.body);
        await batch.save();
        res.status(201).json({ message: "Success" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/my-batches/:instId', async (req, res) => {
    try {
        const batches = await Batch.find({ instituteId: req.params.instId });
        res.json(batches);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server V2 on port ${PORT}`));