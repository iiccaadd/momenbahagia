import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure upload folders exist
const dirs = ['photos', 'audio', 'strips', 'covers', 'templates'];
dirs.forEach(d => {
  const dirPath = path.join(UPLOADS_DIR, d);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

const defaultSettings = {
  couple: {
    groomName: "Irsyad",
    brideName: "Adisty",
    displayNames: "Adisty & Irsyad",
    eventDate: "2026-11-11",
    formattedDate: "11 November 2026",
    subtitle: "WEDDING MEMORIES",
    tagline: "CAPTURE EVERY BEAUTIFUL MOMENT AND CREATE MEMORIES TOGETHER",
    quote: "Snap a pic, leave a memory, help us celebrate our love story !",
    venue: "Grand Ballroom, Jakarta",
    heroImage: "/uploads/covers/1787992347172-237784708.jpg",
    laceDivider: "gold-lace-ornament",
    themeColor: "olive-gold",
    bgmUrl: "/uploads/audio/1788001682912-733496316.mp3",
    bgmTitle: "PARAMORE-The_Only_Exception_.mp3",
    enableBgm: true,
    requireGuestName: true,
    enableVoiceNote: true,
  },
  templates: [
    {
      id: "custom-tpl-mtmhdrc3-4xype",
      name: "Black and White Aesthetic Flowers Border Flyer",
      category: "Custom Design",
      theme: "light",
      bgColor: "#ffffff",
      textColor: "#333333",
      accentColor: "#c5a880",
      frameBorderColor: "#e8dfd5",
      customFrameUrl: "/uploads/templates/1788497729437-925254721.png",
      frameMode: "background",
      slotCount: 3,
      slots: null,
      startX: 42,
      startY: 276,
      frameWidth: 516,
      frameHeight: 348,
      gapY: 32,
      borderRadius: 8,
      topTitle: "HAPPY",
      mainScript: "Wedding Day",
      footerNames: "Adisty & Irsyad",
      footerDate: "11 November 2026",
      showText: false,
      isCustom: true
    },
    {
      id: "custom-tpl-mtmgdd1a-nomwy",
      name: "sunflower",
      category: "Custom Design",
      theme: "light",
      bgColor: "#ffffff",
      textColor: "#333333",
      accentColor: "#c5a880",
      frameBorderColor: "#e8dfd5",
      customFrameUrl: "/uploads/templates/1788496036034-560206870.png",
      frameMode: "background",
      slotCount: 3,
      slots: null,
      startX: 42,
      startY: 317,
      frameWidth: 516,
      frameHeight: 343,
      gapY: 32,
      borderRadius: 8,
      topTitle: "HAPPY",
      mainScript: "Wedding Day",
      footerNames: "Adisty & Irsyad",
      footerDate: "11 November 2026",
      showText: false,
      isCustom: true
    },
    {
      id: "custom-tpl-mtmgb5nw-btbca",
      name: "calla & roses",
      category: "Custom Design",
      theme: "light",
      bgColor: "#ffffff",
      textColor: "#333333",
      accentColor: "#c5a880",
      frameBorderColor: "#e8dfd5",
      customFrameUrl: "/uploads/templates/1788495917026-777124251.png",
      frameMode: "background",
      slotCount: 3,
      slots: null,
      startX: 42,
      startY: 296,
      frameWidth: 516,
      frameHeight: 345,
      gapY: 32,
      borderRadius: 8,
      topTitle: "HAPPY",
      mainScript: "Wedding Day",
      footerNames: "Adisty & Irsyad",
      footerDate: "11 November 2026",
      showText: false,
      isCustom: true
    },
    {
      id: "custom-tpl-mtmg82d1-kj98g",
      name: "Black and White Vintage Photo Booth Frame Bookmark",
      category: "Custom Design",
      theme: "light",
      bgColor: "#ffffff",
      textColor: "#333333",
      accentColor: "#c5a880",
      frameBorderColor: "#e8dfd5",
      customFrameUrl: "/uploads/templates/1788495799812-876861215.png",
      frameMode: "background",
      slotCount: 3,
      slots: null,
      startX: 48,
      startY: 192,
      frameWidth: 516,
      frameHeight: 403,
      gapY: 39,
      borderRadius: 8,
      topTitle: "HAPPY",
      mainScript: "Wedding Day",
      footerNames: "Adisty & Irsyad",
      footerDate: "11 November 2026",
      showText: false,
      isCustom: true
    },
    {
      id: "custom-tpl-rustic-gold",
      name: "Rustic Flora Gold",
      category: "Strip (3 Foto)",
      theme: "light",
      bgColor: "#ffffff",
      textColor: "#333333",
      accentColor: "#c5a880",
      frameBorderColor: "#e8dfd5",
      customFrameUrl: "/uploads/templates/1788015292109-821705614.png",
      frameMode: "background",
      slotCount: 3,
      slots: null,
      startX: 42,
      startY: 181,
      frameWidth: 516,
      frameHeight: 360,
      gapY: 32,
      borderRadius: 8,
      topTitle: "HAPPY",
      mainScript: "Wedding Day",
      footerNames: "Adisty & Irsyad",
      footerDate: "11 November 2026",
      showText: false,
      isCustom: true
    },
    {
      id: "midnight-velvet",
      name: "Midnight Velvet Floral",
      category: "Dark Elegant",
      theme: "dark",
      slotCount: 3,
      bgColor: "#1a0f1d",
      textColor: "#ffffff",
      accentColor: "#d4af37",
      frameBorderColor: "#c0c0c0",
      topTitle: "HAPPY",
      mainScript: "Wedding Day",
      footerNames: "Adisty & Irsyad",
      footerDate: "11 November 2026",
      decorativeStyle: "silver-bevel-frame",
      isDefault: true,
      pattern: "subtle-stars"
    },
    {
      id: "vintage-90s-film",
      name: "Vintage 90s Polaroid Film",
      category: "Vintage Film",
      theme: "light",
      slotCount: 3,
      bgColor: "#f4ede2",
      textColor: "#332211",
      accentColor: "#b27c3e",
      frameBorderColor: "#403024",
      topTitle: "OUR MEMORIES",
      mainScript: "Best Day Ever",
      footerNames: "Adisty & Irsyad",
      footerDate: "11 . 11 . 2026",
      decorativeStyle: "kodak-stamp",
      pattern: "film-grain"
    },
    {
      id: "champagne-gold-lace",
      name: "Romantic Champagne Lace",
      category: "Romantic",
      theme: "light",
      slotCount: 3,
      bgColor: "#faf6f0",
      textColor: "#5e4b3c",
      accentColor: "#c5a880",
      frameBorderColor: "#c5a880",
      topTitle: "THE WEDDING OF",
      mainScript: "",
      footerNames: "Adisty & Irsyad",
      footerDate: "11 NOVEMBER 2026",
      decorativeStyle: "ornate-gold-border",
      pattern: "lace-damask"
    },
    {
      id: "korean-kawaii-pastel",
      name: "Korean Life4Cuts Pastel Cherry",
      category: "Cute & Kawaii",
      theme: "light",
      slotCount: 3,
      bgColor: "#ffeef2",
      textColor: "#703a4b",
      accentColor: "#ff7597",
      frameBorderColor: "#ffb6c1",
      topTitle: "SWEET MOMENTS",
      mainScript: "Forever & Always",
      footerNames: "Adisty & Irsyad",
      footerDate: "♡ 2026.11.11 ♡",
      decorativeStyle: "cute-ribbon-stickers",
      pattern: "pastel-hearts"
    },
    {
      id: "minimalist-olive-botanical",
      name: "Minimalist Olive Botanical",
      category: "Modern Minimalist",
      theme: "light",
      slotCount: 3,
      bgColor: "#f1f3eb",
      textColor: "#2e3b2b",
      accentColor: "#7a8a65",
      frameBorderColor: "#9fa378",
      topTitle: "WEDDING CELEBRATION",
      mainScript: "Love in Bloom",
      footerNames: "Adisty & Irsyad",
      footerDate: "11.11.2026",
      decorativeStyle: "clean-botanical",
      pattern: "leaves"
    },
    {
      id: "monochrome-cinematic",
      name: "Classic Noir Cinematic",
      category: "Classic",
      theme: "dark",
      slotCount: 3,
      bgColor: "#0f0f11",
      textColor: "#f0f0f0",
      accentColor: "#ffffff",
      frameBorderColor: "#ffffff",
      topTitle: "TRUE LOVE",
      mainScript: "Eternal Romance",
      footerNames: "Adisty & Irsyad",
      footerDate: "2026 • 11 • 11",
      decorativeStyle: "sharp-minimal",
      pattern: "clean"
    }
  ],
  memories: []
};

class Storage {
  constructor() {
    this.data = { ...defaultSettings };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          ...defaultSettings,
          ...parsed,
          couple: { ...defaultSettings.couple, ...(parsed.couple || {}) },
          templates: parsed.templates || defaultSettings.templates,
          memories: parsed.memories || defaultSettings.memories,
        };
      } else {
        this.save();
      }
    } catch (e) {
      console.error("Error reading data.json, initializing with defaults:", e);
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error("Error saving data.json:", e);
    }
  }

  getSettings() {
    return {
      couple: this.data.couple,
      templates: this.data.templates
    };
  }

  updateCoupleSettings(newCouple) {
    this.data.couple = {
      ...this.data.couple,
      ...newCouple
    };
    this.save();
    return this.data.couple;
  }

  updateTemplates(templates) {
    this.data.templates = templates;
    this.save();
    return this.data.templates;
  }

  addTemplate(tpl) {
    const uniqueSuffix = Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
    const newTpl = {
      id: tpl.id && !tpl.id.startsWith('custom-tpl-') ? `${tpl.id}-${uniqueSuffix}` : `custom-tpl-${uniqueSuffix}`,
      name: tpl.name || "Custom Frame",
      category: tpl.category || (tpl.slotCount === 1 ? "Polaroid (1 Foto)" : tpl.slotCount === 2 ? "4R (2 Foto)" : "Strip (3 Foto)"),
      theme: tpl.theme || "light",
      bgColor: tpl.bgColor || "#ffffff",
      textColor: tpl.textColor || "#333333",
      accentColor: tpl.accentColor || "#c5a880",
      frameBorderColor: tpl.frameBorderColor || "#e8dfd5",
      customFrameUrl: tpl.customFrameUrl || null,
      frameMode: tpl.frameMode || "background", // 'overlay' or 'background'
      slotCount: Number(tpl.slotCount) || 3,
      // Slot coordinates
      slots: tpl.slots || null,
      startX: tpl.startX ?? 42,
      startY: tpl.startY ?? (tpl.showText ? 195 : 140),
      frameWidth: tpl.frameWidth ?? 516,
      frameHeight: tpl.frameHeight ?? (Number(tpl.slotCount) === 1 ? 950 : Number(tpl.slotCount) === 2 ? 620 : 360),
      gapY: tpl.gapY ?? (Number(tpl.slotCount) === 1 ? 0 : Number(tpl.slotCount) === 2 ? 50 : 32),
      borderRadius: tpl.borderRadius ?? 8,
      topTitle: tpl.topTitle || "HAPPY",
      mainScript: tpl.mainScript || "Wedding Day",
      footerNames: tpl.footerNames || this.data.couple.displayNames,
      footerDate: tpl.footerDate || this.data.couple.formattedDate,
      showText: tpl.showText !== false,
      isCustom: true,
    };
    this.data.templates.unshift(newTpl);
    this.save();
    return newTpl;
  }

  updateTemplate(id, updatedTpl) {
    const index = this.data.templates.findIndex(t => t.id === id);
    if (index !== -1) {
      this.data.templates[index] = {
        ...this.data.templates[index],
        ...updatedTpl
      };
      this.save();
      return this.data.templates[index];
    }
    return null;
  }

  deleteTemplate(id) {
    const index = this.data.templates.findIndex(t => t.id === id);
    if (index !== -1) {
      const removed = this.data.templates.splice(index, 1)[0];
      this.save();
      return removed;
    }
    return null;
  }

  getMemories() {
    return this.data.memories.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  addMemory(memory) {
    const newEntry = {
      id: "mem-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6),
      guestName: memory.guestName || "Tamu Spesial",
      guestMessage: memory.guestMessage || "",
      stripUrl: memory.stripUrl,
      rawPhotos: memory.rawPhotos || [],
      templateId: memory.templateId || "midnight-velvet",
      audioUrl: memory.audioUrl || null,
      audioDuration: memory.audioDuration || 0,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      isPinned: false
    };
    this.data.memories.unshift(newEntry);
    this.save();
    return newEntry;
  }

  toggleLike(id, clientIp = '127.0.0.1') {
    const memory = this.data.memories.find(m => m.id === id);
    if (!memory) return null;

    if (!Array.isArray(memory.likedIps)) {
      memory.likedIps = [];
    }

    const ip = String(clientIp).trim();
    const existingIndex = memory.likedIps.indexOf(ip);

    if (existingIndex > -1) {
      // Unlove: Remove IP and decrement likes
      memory.likedIps.splice(existingIndex, 1);
      memory.likesCount = Math.max(0, (memory.likesCount || 1) - 1);
    } else {
      // Love: Add IP and increment likes
      memory.likedIps.push(ip);
      memory.likesCount = (memory.likesCount || 0) + 1;
    }

    this.save();
    return memory;
  }

  togglePin(id) {
    const memory = this.data.memories.find(m => m.id === id);
    if (memory) {
      memory.isPinned = !memory.isPinned;
      this.save();
      return memory;
    }
    return null;
  }

  deleteMemory(id) {
    const index = this.data.memories.findIndex(m => m.id === id);
    if (index !== -1) {
      const removed = this.data.memories.splice(index, 1)[0];
      this.save();
      return removed;
    }
    return null;
  }

  clearMemories() {
    this.data.memories = [];
    this.save();

    // Clean physical uploaded strips
    try {
      const stripsDir = path.join(UPLOADS_DIR, 'strips');
      if (fs.existsSync(stripsDir)) {
        const files = fs.readdirSync(stripsDir);
        files.forEach((f) => {
          try { fs.unlinkSync(path.join(stripsDir, f)); } catch (e) {}
        });
      }
    } catch (e) {
      console.warn('Error clearing strips folder:', e);
    }

    // Clean physical uploaded voice notes (keep bgm!)
    try {
      const audioDir = path.join(UPLOADS_DIR, 'audio');
      if (fs.existsSync(audioDir)) {
        const files = fs.readdirSync(audioDir);
        files.forEach((f) => {
          if (f.endsWith('.webm')) {
            try { fs.unlinkSync(path.join(audioDir, f)); } catch (e) {}
          }
        });
      }
    } catch (e) {
      console.warn('Error clearing audio folder:', e);
    }

    return true;
  }
}

export const storage = new Storage();
