// Vercel Serverless Function for /api/memories
let memoriesCache = [];

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      data: memoriesCache
    });
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const newMemory = {
        id: body.id || `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        guestName: body.guestName || 'Tamu Spesial',
        guestMessage: body.guestMessage || '',
        stripUrl: body.stripUrl || body.stripDataUrl || body.stripBase64 || null,
        rawPhotos: body.rawPhotos || [],
        templateId: body.templateId || 'classic',
        audioUrl: body.audioUrl || null,
        audioDuration: body.audioDuration || 0,
        createdAt: body.createdAt || new Date().toISOString(),
        likesCount: body.likesCount || 1,
        likedIps: body.likedIps || [],
        isPinned: false
      };

      memoriesCache = [newMemory, ...memoriesCache.filter((m) => m.id !== newMemory.id)];

      return res.status(201).json({
        success: true,
        data: newMemory
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
