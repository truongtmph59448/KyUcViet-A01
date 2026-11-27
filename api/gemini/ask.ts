import type { IncomingMessage, ServerResponse } from 'http';
import {
  checkRateLimit,
  classifyGeminiError,
  generateContentWithRetry,
  getGeminiClient,
  getPublishedRecords,
  getSources,
  readJsonBody,
  sendJson,
} from '../_lib/geminiService.ts';

const MODE_LABELS: Record<string, string> = {
  qa: 'Hỏi đáp tra cứu di sản',
  summary: 'Tóm tắt hồ sơ theo trường chuẩn',
  compare: 'So sánh đối chiếu giữa các hồ sơ',
  glossary: 'Giải thích thuật ngữ di sản tư liệu và chuẩn Dublin Core',
};

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
        error:
          'Quá giới hạn tần suất yêu cầu (tối đa 20 lượt/phút). Vui lòng thử lại sau.',
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

    const question = String(body.question || '').trim();
    const mode = String(body.mode || 'qa');
    const selectedIds = Array.isArray(body.recordIds)
      ? body.recordIds.map(String)
      : [];

    if (!question || question.length > 1200) {
      sendJson(res, 400, {
        error: 'Câu hỏi không hợp lệ hoặc vượt quá 1.200 ký tự.',
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      sendJson(res, 503, {
        error:
          'Trợ lý Gemini chưa sẵn sàng vì biến môi trường GEMINI_API_KEY chưa được cấu hình trên máy chủ. Các tính năng tra cứu kho tư liệu vẫn hoạt động bình thường.',
      });
      return;
    }

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

    const modeDesc = MODE_LABELS[mode] || MODE_LABELS.qa;

    const systemInstruction = `Bạn là trợ lý tra cứu di sản tư liệu của dự án phi lợi nhuận "Ký Ức Việt – Hồ sơ số di sản tư liệu" (mã A01).
NGUYÊN TẮC BẮT BUỘC:
1. Chỉ sử dụng dữ liệu được duyệt cung cấp trong CONTEXT bên dưới. TUYỆT ĐỐI KHÔNG bịa thêm sự kiện, số đăng ký, niên đại, tên người cho phép hoặc thông tin ngoài ngữ cảnh.
2. Mọi câu trả lời liên quan đến hồ sơ phải trích dẫn rõ: Mã bản ghi (ví dụ A01-00001), URL nguồn chính thức từ danh mục nguồn, Nơi lưu giữ tham chiếu (current_location), và Loại bản hiển thị (display_copy).
3. Phân biệt rạch ròi: 13 di sản tư liệu Việt Nam được UNESCO ghi danh (4 Thế giới, 9 Khu vực châu Á – Thái Bình Dương) và 2 hồ sơ con chuyên đề bia Tiến sĩ (A01-00014, A01-00015 thuộc A01-00002). Không gọi là 15 di sản UNESCO.
4. Phân biệt rạch ròi Năm ghi danh UNESCO (recognition_year) với Niên đại tư liệu (Date, ví dụ khoa thi 1442 hay 1779).
5. Nếu câu hỏi yêu cầu thông tin không có hoặc không đủ căn cứ trong CONTEXT, bạn PHẢI trả lời nguyên văn câu sau ở đầu phản hồi: "Hiện tại hệ thống chưa có đủ tư liệu để xác nhận nội dung này." và không suy đoán thêm.
6. Trả lời bằng tiếng Việt rõ ràng, mạch lạc, đúng mực học thuật bảo tàng số. Chế độ hiện tại: ${modeDesc}.`;

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

    const { response, modelUsed } = await generateContentWithRetry(ai, {
      contents: prompt,
      systemInstruction,
    });

    sendJson(res, 200, {
      answer:
        response.text ||
        'Hiện tại hệ thống chưa có đủ tư liệu để xác nhận nội dung này.',
      groundedCount: focusRecords.length,
      model: modelUsed,
    });
  } catch (err: unknown) {
    console.error('[api/gemini/ask]', err);
    const { httpStatus, userMessage } = classifyGeminiError(err);
    sendJson(res, httpStatus, { error: userMessage });
  }
}
