import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  ExternalLink,
  Printer,
  Share2,
  Square,
  Volume2,
} from 'lucide-react';
import type { HeritageRecord, SourceRecord } from '../types.ts';
import { isSafeHttpUrl } from '../utils/catalog.ts';
import { ArchivalPlate } from '../components/ArchivalPlate.tsx';
import { VerificationBadge } from '../components/VerificationBadge.tsx';

interface RecordDetailPageProps {
  recordId: string;
  records: HeritageRecord[];
  sources: SourceRecord[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onNavigate: (path: string) => void;
}

export function RecordDetailPage({
  recordId,
  records,
  sources,
  favorites,
  onToggleFavorite,
  onNavigate,
}: RecordDetailPageProps) {
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [ttsNotice, setTtsNotice] = useState<string | null>(null);

  const record = records.find((r) => r.Identifier === recordId);

  useEffect(() => {
    if (record) {
      document.title = `${record.Identifier} – ${record.Title} | Ký Ức Việt`;
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      document.title = 'Ký Ức Việt – Hồ sơ số di sản tư liệu';
    };
  }, [record]);

  if (!record) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
        <h1 className="font-serif text-2xl font-bold text-[#35261C]">
          Không tìm thấy hồ sơ tư liệu ({recordId})
        </h1>
        <p className="text-sm text-[#5C534A]">
          Hồ sơ không tồn tại hoặc đang ở trạng thái chưa công bố công khai.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/kho-tu-lieu')}
          className="px-4 py-2.5 bg-[#35261C] text-[#F8F5EE] text-xs font-semibold rounded-md"
        >
          Quay lại kho tư liệu
        </button>
      </div>
    );
  }

  const parentRecord = record.parent_id
    ? records.find((r) => r.Identifier === record.parent_id)
    : null;
  const childRecords = records.filter((r) => r.parent_id === record.Identifier);
  const matchedSources = sources.filter((s) =>
    record.source_ids.includes(s.source_id)
  );
  const isFav = favorites.includes(record.Identifier);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback('Đã sao chép liên kết hồ sơ.');
    } catch {
      setShareFeedback(shareUrl);
    }
    setTimeout(() => setShareFeedback(null), 3500);
  };

  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setTtsNotice('Trình duyệt hiện tại không hỗ trợ đọc thành tiếng.');
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find((v) => v.lang.toLowerCase().startsWith('vi'));

    const textToRead = `${record.Title}. Mã hồ sơ ${record.Identifier}. ${
      record.recognition_year
        ? `Năm ghi danh UNESCO ${record.recognition_year}, cấp ${record.recognition_level}.`
        : `Hồ sơ con thuộc bộ ${record.parent_id}.`
    } Niên đại tư liệu: ${record.Date}. Nơi lưu giữ tham chiếu: ${
      record.current_location
    }. ${record.Description}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'vi-VN';
    if (viVoice) utterance.voice = viVoice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      setTtsNotice('Không thể phát giọng đọc tiếng Việt trên thiết bị này.');
    };

    if (!viVoice && voices.length > 0) {
      setTtsNotice(
        'Thiết bị chưa cài gói giọng đọc tiếng Việt chuyên biệt; trình duyệt sẽ dùng giọng mặc định.'
      );
    } else {
      setTtsNotice(null);
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const dublinCoreRows: Array<{ label: string; value: string }> = [
    { label: 'Title (Nhan đề)', value: record.Title },
    { label: 'Identifier (Mã định danh)', value: record.Identifier },
    { label: 'Creator (Người/Cơ quan tạo)', value: record.Creator },
    { label: 'Subject (Chủ đề / Từ khóa)', value: record.Subject.join(', ') },
    { label: 'Description (Mô tả)', value: record.Description },
    { label: 'Date (Niên đại tư liệu)', value: record.Date },
    { label: 'Type (Loại tài nguyên)', value: record.Type },
    { label: 'Format (Chất liệu / Định dạng)', value: record.Format },
    { label: 'Language (Ngôn ngữ / Chữ viết)', value: record.Language },
    { label: 'Source (Nguồn dẫn)', value: record.Source },
    { label: 'Relation (Quan hệ cha–con)', value: record.Relation },
    { label: 'Coverage (Phạm vi không gian – thời gian)', value: record.Coverage },
    { label: 'Publisher (Nơi công bố)', value: record.Publisher },
    { label: 'Contributor (Người đóng góp)', value: record.Contributor },
    { label: 'Rights (Quyền & điều kiện)', value: record.Rights },
  ];

  const archivalRows: Array<{ label: string; value: string }> = [
    {
      label: 'Năm & cấp ghi danh UNESCO',
      value: record.recognition_year
        ? `${record.recognition_year} — ${record.recognition_level}`
        : `${record.recognition_level} (không tính là di sản UNESCO riêng)`,
    },
    { label: 'Nơi lưu giữ hiện nay (tham chiếu)', value: record.current_location },
    { label: 'Địa danh lịch sử', value: record.historical_location },
    { label: 'Loại bản hiển thị (display_copy)', value: record.display_copy },
    { label: 'Tình trạng bản gốc', value: record.original_condition },
    { label: 'Số đăng ký lưu trữ', value: record.registration_no },
    {
      label: 'Cấp phép sử dụng tư liệu',
      value: `${record.permission.granted_by} · Vai trò: ${record.permission.role} · Ngày: ${record.permission.agreed_date} · Phạm vi: ${record.permission.scope}`,
    },
    { label: 'Nội dung không công bố', value: record.excluded_content },
    {
      label: 'Số hóa (người / ngày)',
      value: `${record.digitized_by} · ${record.digitized_at}`,
    },
    {
      label: 'Kiểm chứng (người / ngày)',
      value: `${record.verification_by} · ${record.verification_date}`,
    },
    { label: 'Trạng thái công bố', value: record.publication_status },
    { label: 'Cập nhật gần nhất', value: record.updated_at },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 print-sheet">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <button
          type="button"
          onClick={() => onNavigate('/kho-tu-lieu')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#782F35] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Quay lại kho tư liệu</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleFavorite(record.Identifier)}
            aria-pressed={isFav}
            className={`px-3 py-2 text-xs font-medium rounded-md border inline-flex items-center gap-1.5 ${
              isFav
                ? 'bg-[#782F35]/10 border-[#782F35] text-[#782F35]'
                : 'bg-white border-[#D6CEBE] text-[#35261C]'
            }`}
          >
            <Bookmark
              className="w-3.5 h-3.5"
              fill={isFav ? 'currentColor' : 'none'}
            />
            <span>{isFav ? 'Đã lưu' : 'Lưu vào thiết bị'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleSpeech}
            className="px-3 py-2 text-xs font-medium rounded-md border bg-white border-[#D6CEBE] text-[#35261C] hover:border-[#782F35] inline-flex items-center gap-1.5"
          >
            {speaking ? (
              <Square className="w-3.5 h-3.5 text-[#782F35]" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            <span>{speaking ? 'Dừng đọc' : 'Đọc thành tiếng'}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="px-3 py-2 text-xs font-medium rounded-md border bg-white border-[#D6CEBE] text-[#35261C] hover:border-[#782F35] inline-flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Chia sẻ URL</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 text-xs font-semibold rounded-md bg-[#35261C] text-[#F8F5EE] hover:bg-[#782F35] inline-flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In phiếu tư liệu</span>
          </button>
        </div>
      </div>

      {(shareFeedback || ttsNotice) && (
        <div
          role="status"
          className="px-4 py-2.5 bg-[#F3EFE6] border border-[#B39359] rounded-md text-xs text-[#35261C] no-print"
        >
          {shareFeedback || ttsNotice}
        </div>
      )}

      {/* Title & Key Distinction Header */}
      <header className="bg-white border border-[#E2DACB] rounded-lg p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C534A]">
            <span className="font-bold text-[#782F35] tabular-nums">
              {record.Identifier}
            </span>
            <span aria-hidden="true">·</span>
            <span>{record.recognition_level}</span>
            <span aria-hidden="true">·</span>
            <span>
              {record.recognition_year
                ? `Năm ghi danh UNESCO: ${record.recognition_year}`
                : 'Bản ghi con (không tính năm ghi danh UNESCO riêng)'}
            </span>
          </div>

          <VerificationBadge record={record} sources={sources} showDetail />
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#35261C] leading-tight">
          {record.Title}
        </h1>

        <p className="text-sm sm:text-base text-[#292524] leading-relaxed">
          {record.Description}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[#E2DACB] text-xs">
          <div>
            <span className="text-[#5C534A] block">Niên đại tư liệu (khác năm ghi danh)</span>
            <span className="font-semibold text-[#35261C] mt-0.5 block">
              {record.Date}
            </span>
          </div>
          <div>
            <span className="text-[#5C534A] block">Loại bản hiển thị</span>
            <span className="font-semibold text-[#35261C] mt-0.5 block">
              {record.display_copy}
            </span>
          </div>
          <div>
            <span className="text-[#5C534A] block">Nơi lưu giữ tham chiếu</span>
            <span className="font-semibold text-[#35261C] mt-0.5 block">
              {record.current_location}
            </span>
          </div>
        </div>
      </header>

      {/* Media / Neutral Plate Viewer */}
      <section aria-label="Hiển thị tư liệu hình ảnh" className="space-y-2">
        <h2 className="font-serif text-lg font-bold text-[#35261C]">
          Tư liệu hình ảnh &amp; Quyền hiển thị
        </h2>
        <ArchivalPlate record={record} />
      </section>

      {/* Parent / Child Relationship */}
      {(parentRecord || childRecords.length > 0) && (
        <section className="bg-[#F3EFE6] border border-[#E2DACB] rounded-lg p-6 space-y-3">
          <h2 className="font-serif text-lg font-bold text-[#35261C]">
            Liên kết hồ sơ cha – con
          </h2>
          {parentRecord && (
            <p className="text-sm text-[#292524]">
              Thuộc hồ sơ cha:{' '}
              <button
                type="button"
                onClick={() => onNavigate(`/tu-lieu/${parentRecord.Identifier}`)}
                className="font-semibold text-[#782F35] underline"
              >
                {parentRecord.Identifier} – {parentRecord.Title}
              </button>
            </p>
          )}
          {childRecords.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-[#5C534A]">
                Các bản ghi con nghiên cứu bổ sung (tách khỏi thống kê 13 di sản
                UNESCO):
              </p>
              <ul className="space-y-1.5">
                {childRecords.map((child) => (
                  <li key={child.Identifier}>
                    <button
                      type="button"
                      onClick={() => onNavigate(`/tu-lieu/${child.Identifier}`)}
                      className="text-sm font-semibold text-[#782F35] hover:underline text-left"
                    >
                      {child.Identifier} – {child.Title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Dublin Core & Extended Archival Metadata */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E2DACB] rounded-lg p-6 space-y-4">
          <h2 className="font-serif text-lg font-bold text-[#35261C] border-b border-[#E2DACB] pb-3">
            15 trường chuẩn Dublin Core
          </h2>
          <dl className="divide-y divide-[#E2DACB]/70 text-xs sm:text-sm">
            {dublinCoreRows.map((row) => (
              <div key={row.label} className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1">
                <dt className="font-semibold text-[#5C534A]">{row.label}</dt>
                <dd className="sm:col-span-2 text-[#292524] break-words">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="bg-white border border-[#E2DACB] rounded-lg p-6 space-y-4">
          <h2 className="font-serif text-lg font-bold text-[#35261C] border-b border-[#E2DACB] pb-3">
            Trường nghiệp vụ di sản &amp; kiểm chứng
          </h2>
          <dl className="divide-y divide-[#E2DACB]/70 text-xs sm:text-sm">
            {archivalRows.map((row) => (
              <div key={row.label} className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1">
                <dt className="font-semibold text-[#5C534A]">{row.label}</dt>
                <dd className="sm:col-span-2 text-[#292524] break-words">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Transcription & Translation + Unknown Notes */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E2DACB] rounded-lg p-6 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-[#E2DACB] pb-2">
            <h2 className="font-serif text-lg font-bold text-[#35261C]">
              Phiên âm &amp; Dịch nghĩa
            </h2>
            <span className="text-xs text-[#6D5221] font-medium">
              {record.verification.transcription_level}
            </span>
          </div>
          <div className="space-y-3 text-sm text-[#5C534A]">
            <div>
              <p className="text-xs font-semibold text-[#35261C]">
                Phiên âm ({record.verification.transcription_level}):
              </p>
              <p className="mt-1">
                {record.transcription ||
                  'Chưa có văn bản phiên âm được kiểm chứng cho hồ sơ này.'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#35261C]">
                Dịch nghĩa ({record.verification.translation_level}):
              </p>
              <p className="mt-1">
                {record.translation ||
                  'Chưa có bản dịch nghĩa được kiểm chứng cho hồ sơ này.'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#F3EFE6] border border-[#E2DACB] rounded-lg p-6 space-y-3">
          <h2 className="font-serif text-lg font-bold text-[#35261C] border-b border-[#E2DACB] pb-2">
            Thông tin chưa rõ &amp; Việc cần bổ sung
          </h2>
          <p className="text-sm text-[#292524] leading-relaxed">
            {record.unknown_notes}
          </p>
        </div>
      </section>

      {/* Sources Referenced */}
      <section className="bg-white border border-[#E2DACB] rounded-lg p-6 space-y-4">
        <h2 className="font-serif text-lg font-bold text-[#35261C] border-b border-[#E2DACB] pb-3">
          Nguồn đối chiếu của hồ sơ ({matchedSources.length})
        </h2>
        <div className="space-y-3">
          {matchedSources.map((src) => (
            <div
              key={src.source_id}
              className="p-4 bg-[#F8F5EE] border border-[#E2DACB] rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#35261C]">
                  {src.source_id} — {src.title}
                </p>
                <p className="text-xs text-[#5C534A]">
                  {src.organization} · Truy cập: {src.accessed_at}
                </p>
                <p className="text-xs text-[#5C534A]">{src.url_check_status}</p>
              </div>
              {isSafeHttpUrl(src.url) && (
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#D6CEBE] rounded-md text-xs font-semibold text-[#782F35] hover:border-[#782F35] whitespace-nowrap shrink-0"
                >
                  <span>Mở nguồn</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
