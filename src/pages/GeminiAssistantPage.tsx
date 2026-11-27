import { useState } from 'react';
import {
  AlertTriangle,
  Loader2,
  Send,
  Upload,
} from 'lucide-react';
import type { HeritageRecord } from '../types.ts';
import { apiFetchJson } from '../utils/api.ts';

interface GeminiAssistantPageProps {
  records: HeritageRecord[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  groundedCount?: number;
  error?: boolean;
}

const SUGGESTED_QUESTIONS = [
  'Tóm tắt 13 di sản tư liệu Việt Nam được UNESCO ghi danh trong danh mục và phân biệt với 2 hồ sơ con.',
  'So sánh Mộc bản triều Nguyễn (A01-00001) và Châu bản triều Nguyễn (A01-00006) về loại hình, nơi lưu giữ và năm ghi danh.',
  'Giải thích sự khác nhau giữa năm ghi danh UNESCO và niên đại tư liệu trong hồ sơ Bia Tiến sĩ khoa Nhâm Tuất 1442 (A01-00014).',
  'Hiện nay có hồ sơ nào đã có ảnh được phép công bố hoặc phiên âm kiểm chứng chưa?',
];

export function GeminiAssistantPage({ records }: GeminiAssistantPageProps) {
  const [mode, setMode] = useState<'qa' | 'summary' | 'compare' | 'glossary'>('qa');
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Image OCR Preview state (strictly requires rights confirmation & never auto-saves)
  const [ocrOpen, setOcrOpen] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<{
    transcription: string;
    verificationLabel: string;
  } | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const toggleRecordSelection = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submitQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);

    try {
      const data = await apiFetchJson<{
        answer?: string;
        groundedCount?: number;
      }>('/api/gemini/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          mode,
          recordIds: selectedRecordIds,
        }),
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            data.answer ||
            'Hiện tại hệ thống chưa có đủ tư liệu để xác nhận nội dung này.',
          groundedCount: data.groundedCount,
        },
      ]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            err instanceof Error
              ? err.message
              : 'Lỗi kết nối tới máy chủ Gemini.',
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrError(null);
    setOcrResult(null);

    if (isRestricted) {
      setOcrError('Không gọi Gemini API đối với tư liệu thuộc diện hạn chế.');
      return;
    }

    if (!rightsConfirmed) {
      setOcrError(
        'Vui lòng tích xác nhận ảnh có quyền sử dụng hợp lệ trước khi tải lên.'
      );
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setOcrError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.');
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      setOcrError('Kích thước ảnh vượt quá 2.5MB.');
      return;
    }

    setOcrLoading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          const commaIdx = result.indexOf(',');
          resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
        };
        reader.onerror = () => reject(new Error('Không đọc được tệp ảnh.'));
        reader.readAsDataURL(file);
      });

      const data = await apiFetchJson<{
        transcription?: string;
        verificationLabel?: string;
      }>('/api/gemini/transcribe-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rightsConfirmed,
          isRestricted,
          mimeType: file.type,
          imageBase64: base64,
        }),
      });

      setOcrResult({
        transcription: data.transcription || '',
        verificationLabel:
          data.verificationLabel || 'Chưa kiểm chứng — bản nháp AI tham khảo',
      });
    } catch (err: unknown) {
      setOcrError(
        err instanceof Error ? err.message : 'Lỗi đọc hoặc gửi tệp ảnh.'
      );
    } finally {
      setOcrLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="space-y-2 border-b border-[#E2DACB] pb-6">
        <p className="text-xs uppercase tracking-widest text-[#782F35] font-medium">
          Trợ lý tra cứu gắn nguồn phía máy chủ
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#35261C]">
          Trợ lý Gemini – Di sản tư liệu
        </h1>
        <p className="text-sm text-[#5C534A] max-w-3xl leading-relaxed">
          Trợ lý chỉ sử dụng dữ liệu đã được duyệt công bố trong kho tư liệu,
          luôn trích dẫn mã bản ghi (A01-xxxxx), URL nguồn, nơi lưu giữ tham
          chiếu và loại bản hiển thị. Không gọi API với tư liệu bị hạn chế và
          không tự động ghi đè dữ liệu gốc.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Controls */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="bg-white border border-[#E2DACB] rounded-lg p-5 space-y-3">
            <h2 className="font-serif text-base font-bold text-[#35261C]">
              Chế độ hỗ trợ
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'qa', label: 'Hỏi đáp' },
                  { id: 'summary', label: 'Tóm tắt' },
                  { id: 'compare', label: 'So sánh' },
                  { id: 'glossary', label: 'Thuật ngữ' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={`px-3 py-2 text-xs font-semibold rounded-md border transition-colors ${
                    mode === item.id
                      ? 'bg-[#35261C] text-[#F8F5EE] border-[#35261C]'
                      : 'bg-[#F8F5EE] text-[#292524] border-[#D6CEBE] hover:border-[#782F35]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E2DACB] rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-base font-bold text-[#35261C]">
                Giới hạn phạm vi hồ sơ
              </h2>
              {selectedRecordIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedRecordIds([])}
                  className="text-xs text-[#782F35] hover:underline"
                >
                  Bỏ chọn ({selectedRecordIds.length})
                </button>
              )}
            </div>
            <p className="text-xs text-[#5C534A]">
              Để trống để đối chiếu toàn bộ {records.length} hồ sơ công bố, hoặc
              chọn cụ thể hồ sơ cần so sánh / tóm tắt:
            </p>
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {records.map((r) => (
                <label
                  key={r.Identifier}
                  className="flex items-start gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-[#F8F5EE]"
                >
                  <input
                    type="checkbox"
                    checked={selectedRecordIds.includes(r.Identifier)}
                    onChange={() => toggleRecordSelection(r.Identifier)}
                    className="mt-0.5 accent-[#782F35]"
                  />
                  <span>
                    <strong className="text-[#35261C] tabular-nums">
                      {r.Identifier}
                    </strong>{' '}
                    — {r.Title}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Optional OCR Preview Box */}
          <div className="bg-[#F3EFE6] border border-[#E2DACB] rounded-lg p-5 space-y-3">
            <button
              type="button"
              onClick={() => setOcrOpen((v) => !v)}
              className="w-full flex items-center justify-between text-left font-serif text-sm font-bold text-[#35261C]"
            >
              <span>Phiên âm thử từ ảnh (chỉ khi có quyền)</span>
              <span className="text-xs font-sans text-[#782F35]">
                {ocrOpen ? 'Thu gọn' : 'Mở'}
              </span>
            </button>

            {ocrOpen && (
              <div className="space-y-3 text-xs">
                <p className="text-[#5C534A] leading-relaxed">
                  Kết quả nhận diện chỉ phục vụ tham khảo, gắn nhãn{' '}
                  <strong>Chưa kiểm chứng</strong> và tuyệt đối không tự lưu vào
                  CSDL.
                </p>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rightsConfirmed}
                    onChange={(e) => setRightsConfirmed(e.target.checked)}
                    className="mt-0.5 accent-[#782F35]"
                  />
                  <span>
                    Tôi xác nhận ảnh tải lên đã được cấp phép sử dụng hợp lệ.
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRestricted}
                    onChange={(e) => setIsRestricted(e.target.checked)}
                    className="mt-0.5 accent-[#782F35]"
                  />
                  <span>Tư liệu thuộc diện hạn chế (sẽ chặn gọi API).</span>
                </label>

                <label className="block">
                  <span className="sr-only">Chọn ảnh tư liệu để phiên âm thử</span>
                  <div className="px-3 py-2.5 bg-white border border-dashed border-[#B39359] rounded-md text-center cursor-pointer hover:border-[#782F35] inline-flex items-center justify-center gap-2 w-full font-medium text-[#35261C]">
                    {ocrLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>
                      {ocrLoading ? 'Đang xử lý ảnh...' : 'Tải ảnh (JPG/PNG)'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    disabled={ocrLoading}
                    className="sr-only"
                  />
                </label>

                {ocrError && (
                  <p className="text-[#782F35] font-medium">{ocrError}</p>
                )}

                {ocrResult && (
                  <div className="p-3 bg-white border border-[#E2DACB] rounded-md space-y-1.5">
                    <p className="font-semibold text-[#6D5221]">
                      {ocrResult.verificationLabel}
                    </p>
                    <p className="whitespace-pre-wrap text-[#292524]">
                      {ocrResult.transcription}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Right Chat Area */}
        <section className="lg:col-span-8 bg-white border border-[#E2DACB] rounded-lg flex flex-col min-h-[540px]">
          <div className="p-5 border-b border-[#E2DACB] space-y-2">
            <p className="text-xs font-semibold text-[#5C534A]">
              Câu hỏi gợi ý nhanh:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => submitQuestion(q)}
                  disabled={loading}
                  className="text-left text-xs px-3 py-1.5 bg-[#F8F5EE] border border-[#E2DACB] rounded-md text-[#35261C] hover:border-[#782F35] transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation History */}
          <div
            className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[520px]"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-2 text-[#5C534A]">
                <p className="font-serif text-lg font-semibold text-[#35261C]">
                  Sẵn sàng đối chiếu dữ liệu di sản
                </p>
                <p className="text-xs max-w-md leading-relaxed">
                  Nhập câu hỏi hoặc chọn câu hỏi gợi ý phía trên. Nếu hệ thống
                  chưa có đủ tư liệu, trợ lý sẽ thông báo nguyên văn thay vì suy
                  đoán.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#35261C] text-[#F8F5EE] ml-8'
                      : msg.error
                      ? 'bg-[#782F35]/10 border border-[#782F35]/30 text-[#782F35] mr-4'
                      : 'bg-[#F8F5EE] border border-[#E2DACB] text-[#292524] mr-4'
                  }`}
                >
                  {msg.error && (
                    <div className="flex items-center gap-1.5 font-semibold text-xs mb-1">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Thông báo lỗi thực tế từ máy chủ</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.role === 'assistant' && !msg.error && msg.groundedCount && (
                    <p className="mt-2 pt-2 border-t border-[#E2DACB] text-xs text-[#5C534A]">
                      Đã đối chiếu từ {msg.groundedCount} hồ sơ được công bố.
                    </p>
                  )}
                </div>
              ))
            )}

            {loading && (
              <div className="p-4 rounded-lg bg-[#F8F5EE] border border-[#E2DACB] text-xs text-[#5C534A] inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#782F35]" />
                <span>Đang đối chiếu hồ sơ và tạo câu trả lời...</span>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitQuestion(input);
            }}
            className="p-4 border-t border-[#E2DACB] flex gap-3"
          >
            <label htmlFor="gemini-input" className="sr-only">
              Nhập câu hỏi tra cứu tư liệu
            </label>
            <input
              id="gemini-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1200}
              placeholder="Đặt câu hỏi về mã hồ sơ, nơi lưu giữ, năm ghi danh hoặc thuật ngữ..."
              className="flex-1 px-4 py-2.5 bg-[#F8F5EE] border border-[#D6CEBE] rounded-md text-sm"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-[#782F35] text-[#F8F5EE] text-xs font-semibold rounded-md hover:bg-[#5F2328] disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>Gửi</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
