import fs from 'fs';
import type { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import type { HeritageRecord, SourceRecord } from '../../src/types.ts';
import { sanitizePublicRecord } from '../../src/utils/catalog.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
