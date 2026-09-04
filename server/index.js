import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { storage } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static directories
const uploadsDir = path.join(__dirname, 'uploads');
const publicDir = path.join(__dirname, '..', 'public');
const distDir = path.join(__dirname, '..', 'dist');

app.use('/uploads', express.static(uploadsDir));
app.use('/assets', express.static(path.join(publicDir, 'assets')));

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

// Multer storage configuration
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = 'photos';
    if (file.fieldname === 'audio' || file.mimetype.startsWith('audio/')) {
      dest = 'audio';
    } else if (file.fieldname === 'strip') {
      dest = 'strips';
    } else if (file.fieldname === 'cover') {
      dest = 'covers';
    } else if (file.fieldname === 'template' || file.fieldname === 'frame') {
      dest = 'templates';
    }
    const targetPath = path.join(uploadsDir, dest);
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }
    cb(null, targetPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype.startsWith('audio/') ? '.webm' : '.png');
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: fileStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB file size
    fieldSize: 50 * 1024 * 1024, // 50MB text field size (for base64 canvas images)
  }
});

// Socket.io Real-time connection handler
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Send current settings & memories immediately on connect
  socket.emit('init:data', {
    settings: storage.getSettings(),
    memories: storage.getMemories()
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Helper to broadcast changes
const broadcastSettings = () => {
  const settings = storage.getSettings();
  io.emit('settings:updated', settings);
};

const broadcastMemories = () => {
  const memories = storage.getMemories();
  io.emit('memories:updated', memories);
};

// --- REST API ENDPOINTS ---

// 1. Get Wedding Settings
app.get('/api/settings', (req, res) => {
  res.json({ success: true, data: storage.getSettings() });
});

// 2. Update Wedding Settings (Admin)
app.put('/api/settings', (req, res) => {
  try {
    const updatedCouple = storage.updateCoupleSettings(req.body);
    broadcastSettings();
    res.json({ success: true, data: updatedCouple });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Template Endpoints (Admin)
app.get('/api/templates', (req, res) => {
  res.json({ success: true, data: storage.getSettings().templates });
});

app.post('/api/templates', (req, res) => {
  try {
    const newTpl = storage.addTemplate(req.body);
    broadcastSettings();
    res.status(201).json({ success: true, data: newTpl });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/templates', (req, res) => {
  try {
    const updatedTemplates = storage.updateTemplates(req.body.templates);
    broadcastSettings();
    res.json({ success: true, data: updatedTemplates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/templates/:id', (req, res) => {
  try {
    const deleted = storage.deleteTemplate(req.params.id);
    if (deleted) {
      broadcastSettings();
      res.json({ success: true, data: deleted });
    } else {
      res.status(404).json({ success: false, message: 'Template not found' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.1 Upload Custom Frame Image
app.post('/api/upload/template', upload.single('frame'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No frame image uploaded' });
  }
  const fileUrl = `/uploads/templates/${req.file.filename}`;
  res.json({ success: true, url: fileUrl, filename: req.file.filename });
});

// 4. Upload Hero / Cover Image
app.post('/api/upload/cover', upload.single('cover'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const fileUrl = `/uploads/covers/${req.file.filename}`;
  // Automatically update couple heroImage
  storage.updateCoupleSettings({ heroImage: fileUrl });
  broadcastSettings();
  res.json({ success: true, url: fileUrl });
});

// 5. Upload Background Music
app.post('/api/upload/bgm', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No audio uploaded' });
  }
  const fileUrl = `/uploads/audio/${req.file.filename}`;
  const bgmTitle = req.body.title || req.file.originalname || "Wedding Song";
  storage.updateCoupleSettings({ bgmUrl: fileUrl, bgmTitle: bgmTitle });
  broadcastSettings();
  res.json({ success: true, url: fileUrl, title: bgmTitle });
});

// 6. Submit New Memory (Photostrip + Voice Note + Guest Wishes)
app.post('/api/memories', upload.fields([
  { name: 'strip', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'photos', maxCount: 6 }
]), (req, res) => {
  try {
    const { guestName, guestMessage, templateId, audioDuration } = req.body;
    const base64Input = req.body.stripDataUrl || req.body.stripBase64 || req.body.strip;
    let stripUrl = '';

    // If uploaded as file
    if (req.files && req.files['strip'] && req.files['strip'][0]) {
      stripUrl = `/uploads/strips/${req.files['strip'][0].filename}`;
    } else if (base64Input && typeof base64Input === 'string' && base64Input.startsWith('data:image/')) {
      // If sent as base64 data URL
      const base64Data = base64Input.replace(/^data:image\/\w+;base64,/, '');
      const filename = `strip-${Date.now()}-${Math.round(Math.random() * 1e6)}.png`;
      const filePath = path.join(uploadsDir, 'strips', filename);
      fs.writeFileSync(filePath, base64Data, 'base64');
      stripUrl = `/uploads/strips/${filename}`;
    }

    let audioUrl = null;
    if (req.files && req.files['audio'] && req.files['audio'][0]) {
      audioUrl = `/uploads/audio/${req.files['audio'][0].filename}`;
    } else if (req.body.audioDataUrl && req.body.audioDataUrl.startsWith('data:audio/')) {
      const base64Audio = req.body.audioDataUrl.replace(/^data:audio\/\w+;base64,/, '');
      const audioFilename = `voice-${Date.now()}-${Math.round(Math.random() * 1e6)}.webm`;
      const audioFilePath = path.join(uploadsDir, 'audio', audioFilename);
      fs.writeFileSync(audioFilePath, base64Audio, 'base64');
      audioUrl = `/uploads/audio/${audioFilename}`;
    }

    let rawPhotos = [];
    if (req.files && req.files['photos']) {
      rawPhotos = req.files['photos'].map(f => `/uploads/photos/${f.filename}`);
    }

    const newMemory = storage.addMemory({
      guestName: guestName ? guestName.trim() : "Tamu Spesial",
      guestMessage: guestMessage ? guestMessage.trim() : "",
      templateId: templateId || "midnight-velvet",
      stripUrl: stripUrl || "/assets/sample_strip_1.png",
      audioUrl: audioUrl,
      audioDuration: parseInt(audioDuration || '0', 10),
      rawPhotos: rawPhotos
    });

    // Notify all clients (Guest wall, Admin, Live Projector)
    io.emit('memory:new', newMemory);
    broadcastMemories();

    res.status(201).json({ success: true, data: newMemory });
  } catch (err) {
    console.error("Error creating memory:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Get All Memories
app.get('/api/memories', (req, res) => {
  res.json({ success: true, data: storage.getMemories() });
});

// 8. Like a Memory
app.post('/api/memories/:id/like', (req, res) => {
  const updated = storage.toggleLike(req.params.id);
  if (updated) {
    io.emit('memory:liked', { id: updated.id, likesCount: updated.likesCount });
    res.json({ success: true, data: updated });
  } else {
    res.status(404).json({ success: false, message: 'Memory not found' });
  }
});

// 9. Pin / Unpin Memory (Admin)
app.post('/api/memories/:id/pin', (req, res) => {
  const updated = storage.togglePin(req.params.id);
  if (updated) {
    broadcastMemories();
    res.json({ success: true, data: updated });
  } else {
    res.status(404).json({ success: false, message: 'Memory not found' });
  }
});

// 10. Delete Memory (Admin)
app.delete('/api/memories/:id', (req, res) => {
  const deleted = storage.deleteMemory(req.params.id);
  if (deleted) {
    broadcastMemories();
    res.json({ success: true, data: deleted });
  } else {
    res.status(404).json({ success: false, message: 'Memory not found' });
  }
});

// 11. Generate Venue QR Code
app.get('/api/qrcode', async (req, res) => {
  try {
    const host = req.headers.host || `localhost:${PORT}`;
    const protocol = req.protocol || 'http';
    const targetUrl = `${protocol}://${host}`;
    const qrDataUrl = await QRCode.toDataURL(targetUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#231123',
        light: '#faf8f5'
      }
    });
    res.json({ success: true, qrCode: qrDataUrl, url: targetUrl });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SPA Fallback
app.get('*', (req, res) => {
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    res.sendFile(path.join(distDir, 'index.html'));
  } else {
    res.send('Server is running. Please run frontend in development or build for production.');
  }
});

// Start Server
server.listen(PORT, () => {
  console.log(`✨ Wedding Photobooth Server running on http://localhost:${PORT}`);
});
