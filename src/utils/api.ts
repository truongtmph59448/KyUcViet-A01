export class ApiRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
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
    const serverMsg =
      parsed && typeof parsed.error === 'string' ? parsed.error : null;
    if (res.status === 404) {
      throw new ApiRequestError(
        serverMsg || `Không tìm thấy API hoặc dữ liệu tại ${url} (HTTP 404).`,
        404
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
