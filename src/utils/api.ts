export class ApiRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

function sanitizeServerErrorMessage(
  raw: string | null,
  status: number
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const looksLikeJson =
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'));

  if (
    status === 503 ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    (looksLikeJson && lower.includes('"code":503'))
  ) {
    // Preserve explicit Vietnamese configuration messages (e.g. missing GEMINI_API_KEY)
    if (lower.includes('gemini_api_key')) {
      return trimmed;
    }
    return 'Trợ lý Gemini đang quá tải. Vui lòng thử lại sau ít phút.';
  }

  if (status === 429 || lower.includes('resource_exhausted')) {
    return 'Trợ lý Gemini đang quá tải hoặc vượt giới hạn lượt truy cập. Vui lòng thử lại sau ít phút.';
  }

  if (looksLikeJson) {
    return status >= 500
      ? 'Trợ lý Gemini đang quá tải hoặc gặp sự cố tạm thời. Vui lòng thử lại sau ít phút.'
      : 'Yêu cầu chưa hợp lệ. Vui lòng kiểm tra lại thông tin và thử lại.';
  }

  return trimmed;
}

export async function apiFetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init);
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  let parsed: Record<string, unknown> | null = null;
  if (text.trim()) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      if (contentType.includes('text/html') || text.trim().startsWith('<')) {
        throw new ApiRequestError(
          `Máy chủ trả về HTML thay vì JSON tại ${url} (HTTP ${res.status}). Kiểm tra cấu hình định tuyến /api/* trên Vercel.`,
          res.status
        );
      }
      throw new ApiRequestError(
        `Phản hồi từ ${url} không đúng định dạng JSON (HTTP ${res.status}).`,
        res.status
      );
    }
  }

  if (!res.ok) {
    const rawMsg =
      parsed && typeof parsed.error === 'string' ? parsed.error : null;
    const serverMsg = sanitizeServerErrorMessage(rawMsg, res.status);

    if (res.status === 404) {
      throw new ApiRequestError(
        serverMsg || `Không tìm thấy API hoặc dữ liệu tại ${url} (HTTP 404).`,
        404
      );
    }
    if (res.status === 503) {
      throw new ApiRequestError(
        serverMsg || 'Trợ lý Gemini đang quá tải. Vui lòng thử lại sau ít phút.',
        503
      );
    }
    if (res.status >= 500) {
      throw new ApiRequestError(
        serverMsg ||
          `Lỗi máy chủ tại ${url} (HTTP ${res.status}). Kiểm tra nhật ký Serverless Function và biến môi trường.`,
        res.status
      );
    }
    throw new ApiRequestError(
      serverMsg || `Yêu cầu tới ${url} thất bại (HTTP ${res.status}).`,
      res.status
    );
  }

  return (parsed ?? {}) as T;
}
