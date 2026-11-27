import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  buildCsvWithUtf8Bom,
  computeCatalogStats,
  sanitizePublicRecord,
  validateRecordsDataset,
} from './src/utils/catalog.ts';
import type { HeritageRecord, SourceRecord } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const TULIEU_PATH = path.resolve(DATA_DIR, 'tulieu.json');
const SOURCES_PATH = path.resolve(DATA_DIR, 'sources.json');
const ADMIN_AUTH_PATH = path.resolve(__dirname, '.admin-auth.json');

const PORT = 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

interface StoredAdminHash {
  salt: string;
  hash: string;
  createdAt: string;
}

function readTulieu(): HeritageRecord[] {
  const raw = fs.readFileSync(TULIEU_PATH, 'utf-8');
  return JSON.parse(raw) as HeritageRecord[];
}

function writeTulieu(records: HeritageRecord[]): void {
  fs.writeFileSync(TULIEU_PATH, JSON.stringify(records, null, 2) + '\n', 'utf-8');
}

function readSources(): SourceRecord[] {
  const raw = fs.readFileSync(SOURCES_PATH, 'utf-8');
  return JSON.parse(raw) as SourceRecord[];
}

function getEnvAdminPassword(): string {
  return (process.env.ADMIN_PASSWORD || '').trim();
}

function readClaimedAdminHash(): StoredAdminHash | null {
  if (!fs.existsSync(ADMIN_AUTH_PATH)) return null;
  try {
    const raw = fs.readFileSync(ADMIN_AUTH_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as StoredAdminHash;
    if (parsed.salt && parsed.hash) return parsed;
    return null;
  } catch {
    return null;
  }
}

function hashPassword(password: string, saltHex?: string): { salt: string; hash: string } {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash: derived };
}

function verifyPasswordAgainstStored(password: string, stored: StoredAdminHash): boolean {
  const { hash } = hashPassword(password, stored.salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(stored.hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifyAdminPassword(candidate: string): boolean {
  const envPass = getEnvAdminPassword();
  if (envPass) {
    const a = crypto.createHash('sha256').update(candidate).digest();
    const b = crypto.createHash('sha256').update(envPass).digest();
    return crypto.timingSafeEqual(a, b);
  }
  const claimed = readClaimedAdminHash();
  if (!claimed) return false;
  return verifyPasswordAgainstStored(candidate, claimed);
}

function signSessionToken(role: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      role,
      exp: Date.now() + SESSION_TTL_MS,
      nonce: crypto.randomBytes(8).toString('hex'),
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): { role: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      role: string;
      exp: number;
    };
    if (decoded.exp < Date.now()) return null;
    return { role: decoded.role };
  } catch {
    return null;
  }
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Yêu cầu xác thực quản trị viên hợp lệ.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const session = verifySessionToken(token);
  if (!session) {
    res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
    return;
  }
  next();
}

// Simple in-memory per-IP rate limiter for Gemini endpoint
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, maxRequests = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count += 1;
  return true;
}

function getGeminiClient(): GoogleGenAI | null {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key || key === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // Public catalog API (strictly returns only published records without restricted data)
  app.get('/api/public/records', (_req, res) => {
    try {
      const all = readTulieu();
      const published = all
        .filter((r) => r.publication_status === 'Được công bố')
        .map(sanitizePublicRecord);
      const stats = computeCatalogStats(published);
      res.json({ records: published, stats });
    } catch (error) {
      res.status(500).json({ error: 'Không thể đọc dữ liệu hồ sơ công khai.' });
    }
  });

  app.get('/api/public/records/:id', (req, res) => {
    try {
      const all = readTulieu();
      const published = all
        .filter((r) => r.publication_status === 'Được công bố')
        .map(sanitizePublicRecord);
      const record = published.find((r) => r.Identifier === req.params.id);
      if (!record) {
        res.status(404).json({ error: 'Không tìm thấy hồ sơ đã công bố với mã này.' });
        return;
      }
      const parent = record.parent_id
        ? published.find((r) => r.Identifier === record.parent_id) || null
        : null;
      const children = published.filter((r) => r.parent_id === record.Identifier);
      const sources = readSources().filter((s) => record.source_ids.includes(s.source_id));
      res.json({ record, parent, children, sources });
    } catch {
      res.status(500).json({ error: 'Không thể tải chi tiết hồ sơ.' });
    }
  });

  app.get('/api/public/sources', (_req, res) => {
    try {
      const sources = readSources();
      res.json({ sources });
    } catch {
      res.status(500).json({ error: 'Không thể đọc danh mục nguồn tư liệu.' });
    }
  });

  app.get('/api/public/export', (req, res) => {
    try {
      const format = String(req.query.format || 'json').toLowerCase();
      const published = readTulieu()
        .filter((r) => r.publication_status === 'Được công bố')
        .map(sanitizePublicRecord);

      if (format === 'csv') {
        const csv = buildCsvWithUtf8Bom(published);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="ky-uc-viet-tu-lieu-cong-khai.csv"'
        );
        res.send(csv);
        return;
      }

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="ky-uc-viet-tu-lieu-cong-khai.json"'
      );
      res.send(JSON.stringify(published, null, 2));
    } catch {
      res.status(500).json({ error: 'Không thể xuất dữ liệu công khai.' });
    }
  });

  // Server-side Gemini Assistant API
  app.post('/api/gemini/ask', async (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({
        error: 'Quá giới hạn tần suất yêu cầu (tối đa 20 lượt/phút). Vui lòng thử lại sau.',
      });
      return;
    }

    const question = String(req.body?.question || '').trim();
    const mode = String(req.body?.mode || 'qa');
    const selectedIds = Array.isArray(req.body?.recordIds)
      ? req.body.recordIds.map(String)
      : [];

    if (!question || question.length > 1200) {
      res.status(400).json({
        error: 'Câu hỏi không hợp lệ hoặc vượt quá 1.200 ký tự.',
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'Trợ lý Gemini chưa sẵn sàng vì biến môi trường GEMINI_API_KEY chưa được cấu hình trên máy chủ.',
      });
      return;
    }

    try {
      const published = readTulieu()
        .filter((r) => r.publication_status === 'Được công bố')
        .map(sanitizePublicRecord);
      const sources = readSources();

      // Restrict context strictly to approved records
      const focusRecords =
        selectedIds.length > 0
          ? published.filter((r) => selectedIds.includes(r.Identifier))
          : published;

      const contextPayload = focusRecords.map((r) => ({
        Identifier: r.Identifier,
        Title: r.Title,
        recognition_level: r.recognition_level,
        recognition_year: r.recognition_year,
        parent_id: r.parent_id,
        Date: r.Date,
        Creator: r.Creator,
        Type: r.Type,
        Format: r.Format,
        Language: r.Language,
        current_location: r.current_location,
        display_copy: r.display_copy,
        original_condition: r.original_condition,
        Description: r.Description,
        Source: r.Source,
        source_ids: r.source_ids,
        verification_status: r.verification.status,
        unknown_notes: r.unknown_notes,
      }));

      const systemInstruction = `Bạn là trợ lý tra cứu di sản tư liệu của dự án phi lợi nhuận "Ký Ức Việt – Hồ sơ số di sản tư liệu" (mã A01).
NGUYÊN TẮC BẮT BUỘC:
1. Chỉ sử dụng dữ liệu được duyệt cung cấp trong CONTEXT bên dưới. TUYỆT ĐỐI KHÔNG bịa thêm sự kiện, số đăng ký, niên đại, tên người cho phép hoặc thông tin ngoài ngữ cảnh.
2. Mọi câu trả lời liên quan đến hồ sơ phải trích dẫn rõ: Mã bản ghi (ví dụ A01-00001), URL nguồn chính thức từ danh mục nguồn, Nơi lưu giữ tham chiếu (current_location), và Loại bản hiển thị (display_copy).
3. Phân biệt rạch ròi: 13 di sản tư liệu Việt Nam được UNESCO ghi danh (4 Thế giới, 9 Khu vực châu Á – Thái Bình Dương) và 2 hồ sơ con chuyên đề bia Tiến sĩ (A01-00014, A01-00015 thuộc A01-00002). Không gọi là 15 di sản UNESCO.
4. Phân biệt rạch ròi Năm ghi danh UNESCO (recognition_year) với Niên đại tư liệu (Date, ví dụ khoa thi 1442 hay 1779).
5. Nếu câu hỏi yêu cầu thông tin không có hoặc không đủ căn cứ trong CONTEXT, bạn PHẢI trả lời nguyên văn câu sau ở đầu phản hồi: "Hiện tại hệ thống chưa có đủ tư liệu để xác nhận nội dung này." và không suy đoán thêm.
6. Trả lời bằng tiếng Việt rõ ràng, mạch lạc, đúng mực học thuật bảo tàng số. Chế độ hiện tại: ${mode}.`;

      const prompt = `CONTEXT HỒ SƠ ĐÃ DUYỆT (${contextPayload.length} bản ghi):
${JSON.stringify(contextPayload)}

DANH MỤC NGUỒN THAM CHIẾU:
${JSON.stringify(
  sources.map((s) => ({
    source_id: s.source_id,
    title: s.title,
    url: s.url,
    scope: s.scope,
    is_metadata_standard_only: s.is_metadata_standard_only,
  }))
)}

YÊU CẦU CỦA NGƯỜI DÙNG:
${question}`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction,
          },
        }),
        25_000,
        'Yêu cầu tới Gemini API quá thời gian chờ (25 giây).'
      );

      res.json({
        answer:
          response.text ||
          'Hiện tại hệ thống chưa có đủ tư liệu để xác nhận nội dung này.',
        groundedCount: focusRecords.length,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Lỗi không xác định khi gọi Gemini API.';
      res.status(502).json({ error: message });
    }
  });

  app.post('/api/gemini/transcribe-preview', async (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({
        error: 'Quá giới hạn tần suất yêu cầu. Vui lòng thử lại sau.',
      });
      return;
    }

    const rightsConfirmed = Boolean(req.body?.rightsConfirmed);
    const isRestricted = Boolean(req.body?.isRestricted);
    const mimeType = String(req.body?.mimeType || '');
    const imageBase64 = String(req.body?.imageBase64 || '');

    if (isRestricted) {
      res.status(403).json({
        error: 'Không gọi Gemini API đối với tư liệu thuộc diện hạn chế.',
      });
      return;
    }

    if (!rightsConfirmed) {
      res.status(400).json({
        error:
          'Bắt buộc xác nhận ảnh đã được cấp phép sử dụng hợp lệ trước khi thử phiên âm.',
      });
      return;
    }

    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType) ||
      !imageBase64 ||
      imageBase64.length > 4_000_000
    ) {
      res.status(400).json({
        error: 'Định dạng ảnh không hợp lệ (chỉ nhận JPG/PNG/WEBP dưới 3MB).',
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'Chưa cấu hình GEMINI_API_KEY trên máy chủ nên không thể chạy thử phiên âm ảnh.',
      });
      return;
    }

    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
              {
                text: 'Hãy đọc nhận diện văn tự (OCR/phiên âm thô) xuất hiện trong ảnh tư liệu này bằng tiếng Việt/Hán Nôm nếu thấy rõ. Chỉ ghi lại đúng ký tự đọc được, phần nào mờ hãy ghi [không rõ]. Không tự suy đoán nội dung lịch sử và lưu ý đây là bản nháp chưa kiểm chứng.',
              },
            ],
          },
        }),
        25_000,
        'Yêu cầu phiên âm thử quá thời gian chờ.'
      );

      res.json({
        transcription: response.text || '[Không nhận diện được văn tự]',
        verificationLabel: 'Chưa kiểm chứng — bản nháp AI tham khảo',
        savedToCatalog: false,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Lỗi khi gọi Gemini API nhận diện ảnh.';
      res.status(502).json({ error: message });
    }
  });

  // Admin Auth & Internal Management API
  app.get('/api/admin/status', (_req, res) => {
    const envPass = getEnvAdminPassword();
    const claimed = readClaimedAdminHash();
    res.json({
      configured: Boolean(envPass || claimed),
      needsSetup: !envPass && !claimed,
      mode: envPass ? 'env' : claimed ? 'claimed' : 'unconfigured',
    });
  });

  app.post('/api/admin/bootstrap', (req, res) => {
    if (getEnvAdminPassword() || readClaimedAdminHash()) {
      res.status(403).json({
        error: 'Mật khẩu quản trị đã được thiết lập từ trước.',
      });
      return;
    }
    const password = String(req.body?.password || '');
    if (password.length < 8) {
      res.status(400).json({
        error: 'Mật khẩu quản trị phải có tối thiểu 8 ký tự.',
      });
      return;
    }
    const hashed = hashPassword(password);
    const payload: StoredAdminHash = {
      ...hashed,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(ADMIN_AUTH_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    const token = signSessionToken('Quản trị viên');
    res.json({ token, role: 'Quản trị viên' });
  });

  app.post('/api/admin/login', (req, res) => {
    const password = String(req.body?.password || '');
    if (!getEnvAdminPassword() && !readClaimedAdminHash()) {
      res.status(400).json({
        error: 'Chưa thiết lập mật khẩu quản trị trên máy chủ.',
      });
      return;
    }
    if (!verifyAdminPassword(password)) {
      res.status(401).json({ error: 'Mật khẩu quản trị không chính xác.' });
      return;
    }
    const token = signSessionToken('Quản trị viên');
    res.json({ token, role: 'Quản trị viên' });
  });

  app.get('/api/admin/records', requireAdminAuth, (_req, res) => {
    try {
      const all = readTulieu();
      const validation = validateRecordsDataset(all);
      res.json({ records: all, validation });
    } catch {
      res.status(500).json({ error: 'Không thể tải danh mục nội bộ.' });
    }
  });

  app.post('/api/admin/records', requireAdminAuth, (req, res) => {
    try {
      const incoming = req.body?.record as HeritageRecord | undefined;
      if (!incoming || !incoming.Identifier || !incoming.Title) {
        res.status(400).json({ error: 'Thiếu mã Identifier hoặc Nhan đề tư liệu.' });
        return;
      }

      const all = readTulieu();
      if (all.some((r) => r.Identifier === incoming.Identifier.trim())) {
        res.status(409).json({
          error: `Mã định danh ${incoming.Identifier} đã tồn tại trong hệ thống.`,
        });
        return;
      }

      const nextRecord: HeritageRecord = {
        ...incoming,
        Identifier: incoming.Identifier.trim(),
        updated_at: new Date().toISOString().slice(0, 10),
      };

      const check = validateRecordsDataset([nextRecord]);
      if (check.missingFields.length > 0) {
        res.status(400).json({
          error: `Hồ sơ thiếu trường bắt buộc: ${check.missingFields
            .map((m) => m.field)
            .join(', ')}`,
        });
        return;
      }

      all.push(nextRecord);
      writeTulieu(all);
      res.status(201).json({ record: nextRecord });
    } catch {
      res.status(500).json({ error: 'Không thể lưu hồ sơ mới.' });
    }
  });

  app.put('/api/admin/records/:id', requireAdminAuth, (req, res) => {
    try {
      const targetId = req.params.id;
      const incoming = req.body?.record as HeritageRecord | undefined;
      if (!incoming) {
        res.status(400).json({ error: 'Dữ liệu cập nhật không hợp lệ.' });
        return;
      }

      const all = readTulieu();
      const idx = all.findIndex((r) => r.Identifier === targetId);
      if (idx === -1) {
        res.status(404).json({ error: `Không tìm thấy hồ sơ ${targetId}.` });
        return;
      }

      const updated: HeritageRecord = {
        ...incoming,
        Identifier: targetId,
        updated_at: new Date().toISOString().slice(0, 10),
      };

      const check = validateRecordsDataset([updated]);
      if (check.missingFields.length > 0) {
        res.status(400).json({
          error: `Thiếu trường bắt buộc: ${check.missingFields
            .map((m) => m.field)
            .join(', ')}`,
        });
        return;
      }

      all[idx] = updated;
      writeTulieu(all);
      res.json({ record: updated });
    } catch {
      res.status(500).json({ error: 'Không thể cập nhật hồ sơ.' });
    }
  });

  app.delete('/api/admin/records/:id', requireAdminAuth, (req, res) => {
    try {
      const targetId = req.params.id;
      const all = readTulieu();
      const idx = all.findIndex((r) => r.Identifier === targetId);
      if (idx === -1) {
        res.status(404).json({ error: `Không tìm thấy hồ sơ ${targetId}.` });
        return;
      }
      all.splice(idx, 1);
      writeTulieu(all);
      res.json({ deleted: targetId });
    } catch {
      res.status(500).json({ error: 'Không thể xóa hồ sơ.' });
    }
  });

  // Vite middleware in dev, static dist in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ky Uc Viet server listening on http://localhost:${PORT}`);
  });
}

startServer();
