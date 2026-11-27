import fs from 'fs';
import type { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  GoogleGenAI,
  ThinkingLevel,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from '@google/genai';
import type { HeritageRecord, SourceRecord } from '../../src/types.ts';
import { sanitizePublicRecord } from '../../src/utils/catalog.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PRIMARY_GEMINI_MODEL = 'gemini-4-hydrogen';
export const FALLBACK_GEMINI_MODEL = 'gemini-3.1-flash-lite';

function resolveDataFile(filename: string): string {
  const candidates = [
    path.resolve(process.cwd(), 'data', filename),
    path.resolve(__dirname, '..', '..', 'data', filename),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`Không tìm thấy tệp dữ liệu ${filename} trên máy chủ.`);
}

export function getPublishedRecords(): HeritageRecord[] {
  const filePath = resolveDataFile('tulieu.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as HeritageRecord[];
  return parsed
    .filter((r) => r.publication_status === 'Được công bố')
    .map(sanitizePublicRecord);
}

export function getSources(): SourceRecord[] {
  const filePath = resolveDataFile('sources.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as SourceRecord[];
}

export function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown
): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export async function readJsonBody(
  req: IncomingMessage & { body?: unknown }
): Promise<Record<string, unknown>> {
  if (
    req.body !== undefined &&
    req.body !== null &&
    typeof req.body === 'object' &&
    !Buffer.isBuffer(req.body)
  ) {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body) as Record<string, unknown>;
  }
  if (Buffer.isBuffer(req.body) && req.body.length > 0) {
    return JSON.parse(req.body.toString('utf-8')) as Record<string, unknown>;
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  const maxBytes = 5 * 1024 * 1024;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buf.length;
    if (totalBytes > maxBytes) {
      throw new Error('Dung lượng dữ liệu gửi lên vượt quá giới hạn 5MB.');
    }
    chunks.push(buf);
  }
  const raw = Buffer.concat(chunks).toString('utf-8').trim();
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  req: IncomingMessage,
  maxRequests = 20,
  windowMs = 60_000
): boolean {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket?.remoteAddress || 'unknown';

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

export function getGeminiClient(): GoogleGenAI | null {
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function withTimeout<T>(
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

function getErrorInfo(err: unknown): { status?: number; rawMessage: string } {
  const rawMessage = err instanceof Error ? err.message : String(err ?? '');
  const statusProp =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status?: unknown }).status)
      : undefined;

  if (statusProp && !Number.isNaN(statusProp)) {
    return { status: statusProp, rawMessage };
  }

  // Extract status code if wrapped in SDK JSON string
  const codeMatch = rawMessage.match(/"code"\s*:\s*(\d{3})/);
  if (codeMatch) {
    return { status: Number(codeMatch[1]), rawMessage };
  }
  return { rawMessage };
}

function isServiceUnavailableError(err: unknown): boolean {
  const { status, rawMessage } = getErrorInfo(err);
  const lower = rawMessage.toLowerCase();
  return (
    status === 503 ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('temporarily')
  );
}

function isModelNotFoundError(err: unknown): boolean {
  const { status, rawMessage } = getErrorInfo(err);
  const lower = rawMessage.toLowerCase();
  return status === 404 || lower.includes('not_found') || lower.includes('is not found');
}

function isRateLimitError(err: unknown): boolean {
  const { status, rawMessage } = getErrorInfo(err);
  const lower = rawMessage.toLowerCase();
  return status === 429 || lower.includes('resource_exhausted');
}

function isAuthOrKeyError(err: unknown): boolean {
  const { status, rawMessage } = getErrorInfo(err);
  const lower = rawMessage.toLowerCase();
  return (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    lower.includes('api_key_invalid') ||
    lower.includes('permission_denied') ||
    lower.includes('api key not valid')
  );
}

export function classifyGeminiError(err: unknown): {
  httpStatus: number;
  userMessage: string;
} {
  const { rawMessage } = getErrorInfo(err);
  if (isServiceUnavailableError(err)) {
    return {
      httpStatus: 503,
      userMessage: 'Trợ lý Gemini đang quá tải. Vui lòng thử lại sau ít phút.',
    };
  }
  if (isRateLimitError(err)) {
    return {
      httpStatus: 429,
      userMessage:
        'Trợ lý Gemini đang quá tải hoặc vượt giới hạn lượt truy cập. Vui lòng thử lại sau ít phút.',
    };
  }
  if (isAuthOrKeyError(err)) {
    return {
      httpStatus: 502,
      userMessage:
        'Khóa GEMINI_API_KEY trên máy chủ chưa hợp lệ hoặc chưa được cấp quyền truy cập model.',
    };
  }
  if (rawMessage.toLowerCase().includes('thời gian chờ') || rawMessage.toLowerCase().includes('timeout')) {
    return {
      httpStatus: 504,
      userMessage:
        'Trợ lý Gemini phản hồi chậm vượt giới hạn thời gian của máy chủ. Vui lòng thử lại.',
    };
  }
  return {
    httpStatus: 502,
    userMessage: 'Trợ lý Gemini đang quá tải hoặc gặp sự cố tạm thời. Vui lòng thử lại sau ít phút.',
  };
}

export async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    contents: GenerateContentParameters['contents'];
    systemInstruction?: string;
  }
): Promise<{ response: GenerateContentResponse; modelUsed: string }> {
  const totalDeadline = Date.now() + 24_000; // Fits safely inside Vercel 30s maxDuration
  const backoffDelaysMs = [500, 1000, 2000]; // Max 3 retries with increasing delay
  let lastError: unknown = null;

  const callModel = async (
    model: string,
    perCallTimeoutMs: number
  ): Promise<GenerateContentResponse> => {
    const config: GenerateContentParameters['config'] = {};
    if (params.systemInstruction) {
      config.systemInstruction = params.systemInstruction;
    }
    if (model === PRIMARY_GEMINI_MODEL) {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
    }

    return withTimeout(
      ai.models.generateContent({
        model,
        contents: params.contents,
        config: Object.keys(config).length > 0 ? config : undefined,
      }),
      perCallTimeoutMs,
      'Yêu cầu tới Gemini API vượt quá thời gian chờ.'
    );
  };

  // 1. Primary model with up to 3 retries on 503 UNAVAILABLE
  for (let attempt = 0; attempt <= backoffDelaysMs.length; attempt++) {
    const remaining = totalDeadline - Date.now();
    if (remaining < 3_000) break;

    try {
      const response = await callModel(
        PRIMARY_GEMINI_MODEL,
        Math.min(9_000, remaining - 500)
      );
      return { response, modelUsed: PRIMARY_GEMINI_MODEL };
    } catch (err) {
      lastError = err;
      if (isModelNotFoundError(err)) {
        // Switch immediately to fallback model if primary alias is unavailable
        break;
      }
      if (!isServiceUnavailableError(err) || attempt === backoffDelaysMs.length) {
        if (!isServiceUnavailableError(err)) {
          throw err;
        }
        break;
      }
      const waitMs = backoffDelaysMs[attempt];
      if (totalDeadline - Date.now() <= waitMs + 3_000) {
        break;
      }
      await sleep(waitMs);
    }
  }

  // 2. Fallback to compatible Gemini Flash Lite model if primary is overloaded/unavailable
  const remainingForFallback = totalDeadline - Date.now();
  if (
    remainingForFallback >= 3_000 &&
    (isServiceUnavailableError(lastError) || isModelNotFoundError(lastError))
  ) {
    try {
      const response = await callModel(
        FALLBACK_GEMINI_MODEL,
        Math.min(9_000, remainingForFallback)
      );
      return { response, modelUsed: FALLBACK_GEMINI_MODEL };
    } catch (fallbackErr) {
      lastError = fallbackErr;
    }
  }

  throw lastError;
}
