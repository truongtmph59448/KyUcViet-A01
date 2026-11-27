import type { IncomingMessage, ServerResponse } from 'http';
import {
  checkRateLimit,
  getGeminiClient,
  readJsonBody,
  sendJson,
  withTimeout,
} from '../_lib/geminiService.ts';

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
) {
  try {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, {
        error: 'Phương thức không được hỗ trợ. Vui lòng gửi yêu cầu POST.',
      });
      return;
    }

    if (!checkRateLimit(req)) {
      sendJson(res, 429, {
        error: 'Quá giới hạn tần suất yêu cầu. Vui lòng thử lại sau.',
      });
      return;
    }

    let body: Record<string, unknown>;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { error: 'Dữ liệu JSON gửi lên không hợp lệ.' });
      return;
    }

    const rightsConfirmed = Boolean(body.rightsConfirmed);
    const isRestricted = Boolean(body.isRestricted);
    const mimeType = String(body.mimeType || '');
    const imageBase64 = String(body.imageBase64 || '');

    if (isRestricted) {
      sendJson(res, 403, {
        error: 'Không gọi Gemini API đối với tư liệu thuộc diện hạn chế.',
      });
      return;
    }

    if (!rightsConfirmed) {
      sendJson(res, 400, {
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
      sendJson(res, 400, {
        error: 'Định dạng ảnh không hợp lệ (chỉ nhận JPG/PNG/WEBP dưới 3MB).',
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      sendJson(res, 503, {
        error:
          'Chưa cấu hình GEMINI_API_KEY trên máy chủ nên không thể chạy thử phiên âm ảnh.',
      });
      return;
    }

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

    sendJson(res, 200, {
      transcription: response.text || '[Không nhận diện được văn tự]',
      verificationLabel: 'Chưa kiểm chứng — bản nháp AI tham khảo',
      savedToCatalog: false,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Lỗi khi gọi Gemini API nhận diện ảnh.';
    console.error('[api/gemini/transcribe-preview]', err);
    sendJson(res, 502, { error: message });
  }
}
