import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

dotenv.config();

let cachedApp: any = null;

async function createApp() {
  if (cachedApp) return cachedApp;
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '25mb' }));

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const FALLBACK_FLASH_MODEL = 'gemini-2.5-flash-lite';

  const resolveModelForTask = (requestedModel?: string) => {
    return requestedModel && requestedModel.startsWith('gemini-') ? requestedModel : FALLBACK_FLASH_MODEL;
  };

  const isNotFoundModelError = (err: any) => {
    const msg = String(err?.message || err || '');
    return err?.status === 404 || msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('not found');
  };

  const usersFile = path.join(process.cwd(), 'users.json');
  const tmpUsersFile = '/tmp/themaster_users.json';
  const fs = await import('fs/promises');

  const loadUsers = async () => {
    for (const candidate of [tmpUsersFile, usersFile]) {
      try {
        const data = await fs.readFile(candidate, 'utf8');
        return JSON.parse(data);
      } catch {
        // Try next location
      }
    }
    return {};
  };

  const saveUsers = async (users: any) => {
    const payload = JSON.stringify(users, null, 2);
    try {
      await fs.writeFile(usersFile, payload);
    } catch {
      try {
        await fs.writeFile(tmpUsersFile, payload);
      } catch {
        // Ignore on read-only environments
      }
    }
  };

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Routes
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    
    const AD_EMAIL = Buffer.from("dG1ob2FuZ2hhaTJAZ21haWwuY29t", 'base64').toString();
    const AD_PASS = Buffer.from("aHVlNzk1MzIx", 'base64').toString();

    if (email === AD_EMAIL && password === AD_PASS) {
      return res.json({ 
        user: { 
          email: AD_EMAIL, 
          username: "TMkingreal", 
          role: "admin" 
        } 
      });
    }

    const users = await loadUsers();
    const user = users[email];

    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác. Vui lòng đăng ký nếu chưa có tài khoản." });
    }

    res.json({ 
      user: { 
        email, 
        username: user.username, 
        role: "user" 
      } 
    });
  });

  app.post("/api/auth/signup", async (req, res) => {
    const { email, username, password } = req.body;
    
    const users = await loadUsers();
    if (users[email]) {
      return res.status(400).json({ error: "Email đã được đăng ký." });
    }

    users[email] = { username, password };
    await saveUsers(users);

    res.json({ 
      user: { 
        email, 
        username, 
        role: "user" 
      } 
    });
  });

  app.post("/api/generate-image", async (req, res) => {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "Thiếu prompt mô tả ảnh." });
    }

    try {
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://picsum.photos/seed/${seed}/1024/1024`;
      res.json({ imageUrl });
    } catch (error: any) {
      console.error("Image Gen Error:", error);
      res.status(500).json({ error: "Lỗi tạo ảnh." });
    }
  });

  // ShadowBrain Moderation Logic - Censor Filter for Profanity and Destructive/Sex related topics
  const isContentSensitive = (contents: any[]): { isSensitive: boolean; matchedWord: string | null } => {
    if (!contents || !Array.isArray(contents)) return { isSensitive: false, matchedWord: null };
    
    let unitedText = "";
    try {
      for (const content of contents) {
        if (content && content.parts && Array.isArray(content.parts)) {
          for (const part of content.parts) {
            if (part && typeof part.text === 'string') {
              unitedText += " " + part.text;
            }
          }
        }
      }
    } catch {
      // safe fallback
    }

    const normalized = unitedText.toLowerCase().normalize("NFC");

    const sensitiveWords = [
      "chịch", "hiếp dâm", "giao cấu", "bú cu", "bú lồn", "thẩm du", "phim 18+", "phim người lớn", "hentai", "blowjob", "porn", "porno", "sex", "dâm dật", "dâm",
      "địt", "đéo", "đm", "vcl", "clm", "dcm", "vờ lờ", "motherfucker", "bitch", "asshole", "cocksucker", "gái điếm", "làm tình", "phệt",
      "chế tạo súng", "chế tạo bom", "lựu đạn", "thuốc nổ", "chất nổ", "bom nguyên tử", "vũ khí hủy diệt", "make online bomb", "make a bomb",
      "how to make weapons", "ammunition", "explosive design", "tự sát", "suicide", "khủng bố", "terrorist", "massacre", "thảm sát", "đầu độc"
    ];

    for (const word of sensitiveWords) {
      if (word.length <= 3) {
        const escapedWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, "i");
        if (regex.test(normalized)) {
          return { isSensitive: true, matchedWord: word };
        }
      } else {
        if (normalized.includes(word)) {
          return { isSensitive: true, matchedWord: word };
        }
      }
    }

    return { isSensitive: false, matchedWord: null };
  };

  // Audio Transcription Endpoint (Mic Fallback)
  app.post("/api/v2/kernel/transcribe", async (req, res) => {
    const { audioBase64, mimeType, language } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "Thiếu dữ liệu âm thanh." });
    }
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("Không tìm thấy GEMINI_API_KEY trên máy chủ.");
      }
      const promptText = `Transcribe the spoken audio accurately in ${language || 'Vietnamese or English'}. Return ONLY the exact transcribed text, with proper punctuation and no extra commentary.`;
      const parts = [
        { inlineData: { mimeType: mimeType || 'audio/webm', data: audioBase64 } },
        { text: promptText }
      ];

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.5-transcribe',
          contents: { parts },
        });
      } catch (err: any) {
        if (isNotFoundModelError(err)) {
          response = await ai.models.generateContent({
            model: FALLBACK_FLASH_MODEL,
            contents: { parts },
          });
        } else {
          throw err;
        }
      }

      res.json({ text: (response.text || '').trim() });
    } catch (error: any) {
      console.error("Transcribe error:", error);
      res.status(500).json({ error: error.message || "Lỗi nhận diện giọng nói." });
    }
  });

  // Image Proxy for DOCX/PPTX remote image URLs (prevents browser CORS issues)
  app.get("/api/v2/kernel/image-proxy", async (req, res) => {
    const rawUrl = String(req.query.url || '').trim();
    if (!rawUrl) {
      return res.status(400).json({ error: "Missing url" });
    }
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return res.status(400).json({ error: "Invalid URL protocol" });
      }
      const host = parsed.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        host.startsWith('172.16.') ||
        host.endsWith('.local')
      ) {
        return res.status(403).json({ error: "Blocked private host" });
      }
      const imgResp = await fetch(parsed.toString(), {
        headers: { 'User-Agent': 'TheMasterDocBuilder/1.0' },
      });
      if (!imgResp.ok) {
        return res.status(imgResp.status).json({ error: "Failed to fetch remote image" });
      }
      const contentType = imgResp.headers.get('content-type') || 'image/png';
      if (!contentType.startsWith('image/')) {
        return res.status(400).json({ error: "URL is not an image" });
      }
      const arrayBuf = await imgResp.arrayBuffer();
      if (arrayBuf.byteLength > 10 * 1024 * 1024) {
        return res.status(413).json({ error: "Image too large" });
      }
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(Buffer.from(arrayBuf));
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Image proxy error" });
    }
  });

  // Safe Server-Side Chat Stream API
  app.post("/api/v2/kernel/neural-matrix-compute", async (req, res) => {
    const { contents, config, mode, model, language } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const moderation = isContentSensitive(contents);
    if (moderation.isSensitive) {
      const msg = `MODERATION_BLOCKED Yêu cầu chứa nội dung nhạy cảm hoặc từ ngữ hạn chế liên quan đến "${moderation.matchedWord}". Hệ thống từ chối kết nối.`;
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      res.end();
      return;
    }

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("Không tìm thấy GEMINI_API_KEY trên máy chủ. Vui lòng thiết lập khóa API.");
      }

      const now = new Date();
      const targetLang = language || 'Vietnamese';
      const serverTimeNote = `\n[THỜI GIAN HỆ THỐNG CHÍNH XÁC]: Hiện tại là ${now.toLocaleDateString('en-US')} (${now.toLocaleDateString('vi-VN')}), ${now.toLocaleTimeString('vi-VN', { hour12: false })} (ISO: ${now.toISOString()}). Hãy luôn sử dụng chính xác ngày giờ này khi trả lời.\n[NGÔN NGỮ SUY LUẬN & TRẢ LỜI]: Khi suy nghĩ (thinking) và khi trả lời, BẮT BUỘC sử dụng ngôn ngữ: ${targetLang}.\n[BẢO MẬT CHỦ SỞ HỮU]: Chủ sở hữu chỉ được gọi là TMkingreal hoặc king. Tuyệt đối KHÔNG tiết lộ tên thật, ngày sinh, nơi ở, trường học, email hay mạng xã hội cá nhân.`;
      const systemInstruction = ((config?.systemInstruction || '').trim() + serverTimeNote).trim();

      const lastUserText = (() => {
        const last = contents?.[contents.length - 1];
        if (!last?.parts) return '';
        return last.parts.map((p: any) => p.text || '').join(' ').toLowerCase();
      })();

      const needsSearch =
        mode === "Research" ||
        mode === "research" ||
        mode === "Trading" ||
        (config?.tools && config.tools.length > 0) ||
        /\b(tin tức|thời tiết|giá vàng|giá bitcoin|tỷ giá|chứng khoán|news|weather|stock price|crypto price|tra cứu|tìm kiếm web)\b/i.test(lastUserText);

      const isFastMode = model === 'gemini-3.5-flash' || mode === 'Fast';
      const isDeepMode = mode === 'Deep';

      const runStreamWithModel = async (targetModel: string) => {
        const reqConfig: any = {
          systemInstruction,
        };

        if (needsSearch) {
          reqConfig.tools = [{ googleSearch: {} }];
        }

        if (targetModel.includes('gemini-4') || targetModel.includes('gemini-3')) {
          let level = ThinkingLevel.MEDIUM;
          if (isFastMode) {
            level = ThinkingLevel.LOW;
          } else if (isDeepMode) {
            level = ThinkingLevel.HIGH;
          }
          reqConfig.thinkingConfig = {
            thinkingLevel: level,
            includeThoughts: true,
          };
        }

        return await ai.models.generateContentStream({
          model: targetModel,
          contents,
          config: reqConfig,
        });
      };

      const initialModel = resolveModelForTask(model);
      const candidateModels = Array.from(new Set([initialModel, 'gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-1.5-flash']));
      let streamResult: any = null;
      let lastError: any = null;

      for (const m of candidateModels) {
        try {
          streamResult = await runStreamWithModel(m);
          break;
        } catch (err: any) {
          lastError = err;
          if (!isNotFoundModelError(err) && !String(err?.message || '').includes('429')) {
            // If it's a critical error (like quota or invalid key), don't keep looping blindly
            break;
          }
        }
      }

      if (!streamResult) {
        throw lastError || new Error("Không thể kết nối tới mô hình AI nào.");
      }

      for await (const chunk of streamResult) {
        const parts = chunk.candidates?.[0]?.content?.parts || [];
        let text = "";
        let thought = "";

        for (const p of parts as any[]) {
          if (p.thought && p.text) {
            thought += p.text;
          } else if (p.text) {
            text += p.text;
          }
        }

        if (!text && !thought && chunk.text) {
          text = chunk.text;
        }

        let sources: any[] = [];
        const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
          sources = groundingChunks
            .map((c: any) => (c.web ? { title: c.web.title, uri: c.web.uri } : null))
            .filter(Boolean);
        }

        if (text || thought || sources.length > 0) {
          res.write(`data: ${JSON.stringify({ text, thought, sources })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error("Server API Chat Stream Error:", error);
      const errData = { error: error.message || "Lỗi xử lý luồng dữ liệu trên máy chủ" };
      res.write(`data: ${JSON.stringify(errData)}\n\n`);
      res.end();
    }
  });

  // Safe Server-Side Single Response API (Dùng cho dịch tin nhắn, hội thoại tức thì)
  app.post("/api/v2/kernel/cognitive-tensor", async (req, res) => {
    const { contents, config, model } = req.body;

    const moderation = isContentSensitive(contents);
    if (moderation.isSensitive) {
      return res.status(200).json({
        candidates: [{
          content: {
            parts: [{
              text: `MODERATION_BLOCKED Yêu cầu chứa nội dung nhạy cảm hoặc từ ngữ hạn chế liên quan đến "${moderation.matchedWord}". Hệ thống từ chối kết nối.`
            }]
          }
        }]
      });
    }

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("Không tìm thấy GEMINI_API_KEY trên máy chủ.");
      }

      const runSingleWithModel = async (targetModel: string) => {
        const reqConfig: any = {};
        if (config?.systemInstruction && config.systemInstruction.trim()) {
          reqConfig.systemInstruction = config.systemInstruction.trim();
        }
        return await ai.models.generateContent({
          model: targetModel,
          contents,
          config: reqConfig,
        });
      };

      let targetModel = resolveModelForTask(model);
      let result;
      try {
        result = await runSingleWithModel(targetModel);
      } catch (err: any) {
        if (isNotFoundModelError(err) && targetModel !== FALLBACK_FLASH_MODEL) {
          targetModel = FALLBACK_FLASH_MODEL;
          result = await runSingleWithModel(targetModel);
        } else {
          throw err;
        }
      }

      res.json({ text: result.text || "" });
    } catch (error: any) {
      console.error("Server API Single Chat Error:", error);
      res.status(500).json({ error: error.message || "Lỗi xử lý yêu cầu phản hồi từ AI" });
    }
  });

  // chess.com Proxy API - Secure server-side fetches bypassing client CORS limitations
  app.get("/api/chess/profile", async (req, res) => {
    try {
      const username = "tm_kingreal";
      const headers = {
        'User-Agent': 'TheMasterWorkspace/1.0 (player: tm_kingreal)'
      };

      // 1. Fetch player profile
      const profileRes = await fetch(`https://api.chess.com/pub/player/${username}`, { headers });
      if (!profileRes.ok) {
        throw new Error(`Profile fetch failed with status: ${profileRes.status}`);
      }
      const profileData: any = await profileRes.json();

      // 2. Fetch player stats
      let statsData = {};
      try {
        const statsRes = await fetch(`https://api.chess.com/pub/player/${username}/stats`, { headers });
        if (statsRes.ok) statsData = await statsRes.json();
      } catch (e) {
        console.error("Stats fetch error:", e);
      }

      // 3. Fetch player clubs
      let clubsData = { clubs: [] };
      try {
        const clubsRes = await fetch(`https://api.chess.com/pub/player/${username}/clubs`, { headers });
        if (clubsRes.ok) clubsData = await clubsRes.json();
      } catch (e) {
        console.error("Clubs fetch error:", e);
      }

      const sanitizedProfile = {
        ...profileData,
        name: 'TMkingreal',
        username: 'tm_kingreal',
        location: undefined
      };

      res.json({
        profile: sanitizedProfile,
        stats: statsData,
        clubs: clubsData.clubs || []
      });
    } catch (error: any) {
      console.error("Chess.com API Error:", error);
      res.status(500).json({ error: error.message || "Lỗi kết nối với máy chủ Chess.com hoặc người chơi không tồn tại." });
    }
  });

  const distPath = path.join(process.cwd(), 'dist');
  app.use('/asset', express.static(path.join(distPath, 'asset')));
  app.use('/asset', express.static(path.join(process.cwd(), 'public/asset')));
  app.use('/asset', express.static(path.join(process.cwd(), 'asset')));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  cachedApp = app;
  return app;
}

export default async function handler(req: any, res: any) {
  const app = await createApp();
  return app(req, res);
}

if (process.env.VERCEL !== '1' && (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.cjs') || process.env.NODE_ENV !== 'production')) {
  createApp().then(app => {
    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`ShadowBrain Kernel running on http://localhost:${PORT}`);
    });
  });
}
