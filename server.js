require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// 1. CORS CONFIGURATION
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "x-api-key", "x-institute-id"]
}));

app.use(express.json());

// 2. MONGODB CONNECTION
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🚀 Cloud DB Connected ✅"))
    .catch((err) => console.log("❌ Connection Error: ", err));

// 3. DATA MODELS

// Institute Model
const Institute = mongoose.model('Institute', new mongoose.Schema({
    name: String,
    logo: String,
    primaryColor: String,
    apiKey: { type: String, unique: true },
    adminEmail: String,
    status: { type: String, default: 'active' },
    createdAt: { type: Date, default: Date.now }
}));

// Batch Model (PW Style Subject-Wise)
const Batch = mongoose.model('Batch', new mongoose.Schema({
    instituteId: String,
    title: String,
    teacher: String,
    price: Number,
    banner: String,
    description: String,
    subjects: [
        {
            subjectName: String,
            chapters: [
                {
                    chapterName: String,
                    contents: [
                        {
                            title: String,
                            type: { type: String, enum: ['video', 'pdf'] },
                            url: String,
                            duration: String
                        }
                    ]
                }
            ]
        }
    ]
}));

// User Model
const User = mongoose.model('User', new mongoose.Schema({
    phoneNumber: { type: String, required: true },
    name: String,
    instituteId: String,
    enrolledBatches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
    createdAt: { type: Date, default: Date.now }
}));

// ==========================================
// 4. ROUTES (APIs)
// ==========================================

// --- A. SUPER ADMIN ROUTES ---

app.post('/api/superadmin/add-institute', async (req, res) => {
    try {
        const { name, logo, primaryColor, adminEmail, apiKey } = req.body;
        const finalKey = apiKey || "COACH_" + Math.floor(1000 + Math.random() * 9000);
        const inst = new Institute({ name, logo, primaryColor, adminEmail, apiKey: finalKey });
        await inst.save();
        res.status(201).json({ message: "Success", apiKey: finalKey });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- B. TEACHER / ADMIN ROUTES ---

app.post('/api/admin/add-batch', async (req, res) => {
    try {
        const newBatch = new Batch(req.body);
        await newBatch.save();
        res.status(201).json({ message: "Success" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/my-batches/:instId', async (req, res) => {
    try {
        const batches = await Batch.find({ instituteId: req.params.instId });
        res.json(batches);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/add-material/:batchId', async (req, res) => {
    try {
        const { subjectName, chapterName, title, type, url } = req.body;
        const batch = await Batch.findById(req.params.batchId);
        if (!batch) return res.status(404).json({ error: "Batch not found" });

        let subject = batch.subjects.find(s => s.subjectName === subjectName);
        if (!subject) {
            batch.subjects.push({ subjectName, chapters: [] });
            subject = batch.subjects[batch.subjects.length - 1];
        }

        let chapter = subject.chapters.find(c => c.chapterName === chapterName);
        if (!chapter) {
            subject.chapters.push({ chapterName, contents: [] });
            chapter = subject.chapters[subject.chapters.length - 1];
        }

        chapter.contents.push({ title, type, url });
        await batch.save();
        res.json({ message: "Content Added Successfully! ✅" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/delete-batch/:id', async (req, res) => {
    try {
        await Batch.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted Successfully! 🗑️" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- C. STUDENT APP ROUTES ---

app.get('/api/institute/config', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];
        const inst = await Institute.findOne({ apiKey });
        if (!inst) return res.status(404).json({ error: "Institute not found" });
        res.json(inst);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/batches', async (req, res) => {
    try {
        const instId = req.headers['x-institute-id'];
        const batches = await Batch.find({ instituteId: instId });
        res.json(batches);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { phoneNumber, name, instituteId } = req.body;
        let user = await User.findOne({ phoneNumber, instituteId });
        if (!user) {
            user = new User({ phoneNumber, name, instituteId });
            await user.save();
        }
        res.status(200).json({ message: "Success", user });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/enroll', async (req, res) => {
    try {
        const { phoneNumber, batchId, instituteId } = req.body;
        await User.findOneAndUpdate(
            { phoneNumber, instituteId },
            { $addToSet: { enrolledBatches: batchId } }
        );
        res.status(200).json({ success: true, message: "Enrolled Successfully!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/my-batches/:phone/:instId', async (req, res) => {
    try {
        const user = await User.findOne({
            phoneNumber: req.params.phone,
            instituteId: req.params.instId
        }).populate('enrolledBatches');
        res.json(user ? user.enrolledBatches : []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend live on port ${PORT}`);
});