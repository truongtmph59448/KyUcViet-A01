import express, { type NextFunction, type Request, type Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import tulieuData from '../data/tulieu.json' with { type: 'json' };
import sourcesData from '../data/sources.json' with { type: 'json' };
import { sanitizePublicRecord } from '../src/utils/catalog.ts';
import type { HeritageRecord, SourceRecord } from '../src/types.ts';

function getPublishedRecords(): HeritageRecord[] {
  return (tulieuData as HeritageRecord[])
    .filter((r) => r.publication_status === 'Được công bố')
    .map(sanitizePublicRecord);
}

function getSources(): SourceRecord[] {
  return sourcesData as SourceRecord[];
}

// In-memory per-IP rate limiter for Gemini endpoints
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(
  ip: string,
  maxRequests = 20,
  windowMs = 60_000
): boolean {
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

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage: string
): Promise<T> {
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

export function createApiApp(): express.Express {
  const app = express();
  app.set('trust proxy', 1);

  // Support both Vercel pre-parsed bodies and standard Express JSON bodies
  app.use((req, res, next) => {
    if (
      req.body !== undefined &&
      req.body !== null &&
      typeof req.body === 'object' &&
      !Buffer.isBuffer(req.body)
    ) {
      next();
      return;
    }
    express.json({ limit: '5mb' })(req, res, next);
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      mode: 'static-json',
      recordCount: getPublishedRecords().length,
      sourceCount: getSources().length,
      geminiConfigured: Boolean(getGeminiClient()),
    });
  });

  // Server-side Gemini Assistant API
  app.post('/api/gemini/ask', async (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({
        error:
          'Quá giới hạn tần suất yêu cầu (tối đa 20 lượt/phút). Vui lòng thử lại sau.',
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
          'Trợ lý Gemini chưa sẵn sàng vì biến môi trường GEMINI_API_KEY chưa được cấu hình trên máy chủ. Các tính năng tra cứu kho tư liệu vẫn hoạt động bình thường.',
      });
      return;
    }

    try {
      const published = getPublishedRecords();
      const sources = getSources();

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
        err instanceof Error
          ? err.message
          : 'Lỗi không xác định khi gọi Gemini API.';
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

  // Explicit JSON 404 for unknown /api/* routes (prevents HTML index fallback)
  app.use('/api', (req, res) => {
    res.status(404).json({
      error: `Không tìm thấy API endpoint: ${req.method} ${req.originalUrl}`,
    });
  });

  // Global JSON error handler for /api/*
  app.use(
    (err: unknown, req: Request, res: Response, _next: NextFunction) => {
      const message =
        err instanceof Error
          ? err.message
          : 'Lỗi nội bộ máy chủ không xác định.';
      console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);
      res.status(500).json({ error: message });
    }
  );

  return app;
}
