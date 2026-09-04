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
    groomName: "Naufal",
    brideName: "Fatimah",
    displayNames: "Fatimah & Naufal",
    eventDate: "2026-08-13",
    formattedDate: "13 AGUSTUS 2026",
    subtitle: "WEDDING MEMORIES",
    tagline: "ABADIKAN SETIAP MOMEN INDAH DAN CIPTAKAN KENANGAN BERSAMA",
    quote: "LET’S CELEBRATE THIS DAY THROUGH YOUR EYES",
    venue: "Grand Ballroom, Jakarta",
    heroImage: "/assets/sample_couple.jpg",
    laceDivider: "gold-lace-ornament",
    themeColor: "olive-gold",
    bgmUrl: "/assets/romantic-wedding.mp3",
    bgmTitle: "A Thousand Years - Romantic Piano",
    enableBgm: true,
    requireGuestName: true,
    enableVoiceNote: true,
  },
  templates: [
    {
      id: "kisah-strip-film",
      name: "Strip Classic 3-Grid",
      category: "Strip (3 Foto)",
      theme: "light",
      slotCount: 3,
      bgColor: "#F6F4EE",
      textColor: "#263727",
      accentColor: "#E9DDC5",
      frameBorderColor: "#263727",
      topTitle: "OUR MEMORIES",
      mainScript: "Best Day Ever",
      footerNames: "Fatimah & Naufal",
      footerDate: "13 AGUSTUS 2026",
      decorativeStyle: "kodak-stamp",
      isDefault: true,
      pattern: "film-grain"
    },
    {
      id: "kisah-polaroid-single",
      name: "Polaroid Minimalist Single",
      category: "Polaroid (1 Foto)",
      theme: "light",
      slotCount: 1,
      bgColor: "#F6F4EE",
      textColor: "#263727",
      accentColor: "#E9DDC5",
      frameBorderColor: "#263727",
      topTitle: "WEDDING MEMORY",
      mainScript: "Forever with You",
      footerNames: "Fatimah & Naufal",
      footerDate: "13.08.2026",
      decorativeStyle: "clean-botanical",
      pattern: "clean"
    },
    {
      id: "kisah-4r-duo",
      name: "4R Romantic Duo",
      category: "4R (2 Foto)",
      theme: "light",
      slotCount: 2,
      bgColor: "#faf6f0",
      textColor: "#263727",
      accentColor: "#c5a880",
      frameBorderColor: "#c5a880",
      topTitle: "THE WEDDING OF",
      mainScript: "Fatimah & Naufal",
      footerNames: "With Love & Joy",
      footerDate: "13 AGUSTUS 2026",
      decorativeStyle: "ornate-gold-border",
      pattern: "lace-damask"
    },
    {
      id: "midnight-velvet",
      name: "Midnight Velvet Floral",
      category: "Strip (3 Foto)",
      theme: "dark",
      slotCount: 3,
      bgColor: "#1a0f1d",
      textColor: "#ffffff",
      accentColor: "#d4af37",
      frameBorderColor: "#c0c0c0",
      topTitle: "HAPPY",
      mainScript: "Wedding Day",
      footerNames: "Fatimah & Naufal",
      footerDate: "13-08-2026",
      decorativeStyle: "silver-bevel-frame",
      pattern: "subtle-stars"
    },
    {
      id: "korean-kawaii-pastel",
      name: "Korean Life4Cuts Cherry",
      category: "Cute & Kawaii",
      theme: "light",
      slotCount: 3,
      bgColor: "#ffeef2",
      textColor: "#703a4b",
      accentColor: "#ff7597",
      frameBorderColor: "#ffb6c1",
      topTitle: "SWEET MOMENTS",
      mainScript: "Forever & Always",
      footerNames: "Fatimah & Naufal",
      footerDate: "♡ 2026.08.13 ♡",
      decorativeStyle: "cute-ribbon-stickers",
      pattern: "pastel-hearts"
    }
  ],
  memories: [
    {
      id: "mem-sample-1",
      guestName: "Sarah & Dimas",
      guestMessage: "Selamat berbahagia ya Atikah & Shafiq! Semoga menjadi keluarga yang sakinah, mawaddah, warrahmah. Till Jannah! ✨🕊️",
      stripUrl: "/assets/sample_strip_1.png",
      rawPhotos: [],
      templateId: "midnight-velvet",
      audioUrl: "/assets/sample_voice_1.mp3",
      audioDuration: 7,
      createdAt: "2026-08-29T10:15:00Z",
      likesCount: 14,
      isPinned: true
    },
    {
      id: "mem-sample-2",
      guestName: "Budi Santoso & Teman SMA",
      guestMessage: "Congratulation Shafiq bro! Akhirnya halal juga, bahagia selalu kawan! 🎉🥂",
      stripUrl: "/assets/sample_strip_2.png",
      rawPhotos: [],
      templateId: "champagne-gold-lace",
      audioUrl: null,
      audioDuration: 0,
      createdAt: "2026-08-29T11:30:00Z",
      likesCount: 8,
      isPinned: false
    }
  ]
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
}

export const storage = new Storage();
