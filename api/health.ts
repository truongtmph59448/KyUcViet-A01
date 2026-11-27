import type { IncomingMessage, ServerResponse } from 'http';
import {
  getGeminiClient,
  getPublishedRecords,
  getSources,
  sendJson,
} from './_lib/geminiService.ts';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== 'GET') {
      sendJson(res, 405, {
        error: 'Phương thức không được hỗ trợ. Chỉ chấp nhận GET.',
      });
      return;
    }

    const records = getPublishedRecords();
    const sources = getSources();
    sendJson(res, 200, {
      ok: true,
      mode: 'static-json',
      recordCount: records.length,
      sourceCount: sources.length,
      geminiConfigured: Boolean(getGeminiClient()),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Lỗi kiểm tra trạng thái hệ thống.';
    sendJson(res, 500, { error: message });
  }
}
