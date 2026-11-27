import { useState } from 'react';
import { Expand, FileText, ShieldAlert, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { ArchivalImage, HeritageRecord } from '../types.ts';
import { isSafeHttpUrl } from '../utils/catalog.ts';

interface ArchivalPlateProps {
  record: HeritageRecord;
  compact?: boolean;
}

export function ArchivalPlate({ record, compact = false }: ArchivalPlateProps) {
  const [zoom, setZoom] = useState(1);
  const [fullscreenImage, setFullscreenImage] = useState<ArchivalImage | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const validImages = (record.images || []).filter(
    (img) => img.url && img.rights && isSafeHttpUrl(img.url)
  );
  const primaryImage = validImages[0];

  if (!primaryImage || imgFailed) {
    return (
      <div
        className={`relative flex flex-col justify-between bg-[#F3EFE6] border border-[#E2DACB] rounded-lg overflow-hidden ${
          compact ? 'p-4 min-h-[168px]' : 'p-6 sm:p-8 min-h-[260px]'
        }`}
        role="region"
        aria-label={`Trạng thái hình ảnh của ${record.Title}`}
      >
        <div className="flex items-center justify-between gap-2 text-xs text-[#5C534A]">
          <span className="font-medium tracking-wide tabular-nums text-[#35261C]">
            {record.Identifier}
          </span>
          <span>{record.display_copy}</span>
        </div>

        <div className="my-auto py-4 flex flex-col items-center text-center gap-2">
          <div className="w-10 h-10 rounded-full border border-[#B39359]/50 bg-[#F8F5EE] flex items-center justify-center text-[#782F35]">
            {compact ? (
              <FileText className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ShieldAlert className="w-5 h-5" aria-hidden="true" />
            )}
          </div>
          <p className="font-serif text-sm sm:text-base font-semibold text-[#35261C]">
            Chưa có ảnh được phép công bố
          </p>
          {!compact && (
            <p className="text-xs text-[#5C534A] max-w-md leading-relaxed">
              Bản ghi này là hồ sơ mô tả nghiên cứu thứ cấp. Hệ thống không dùng ảnh
              minh họa giả lập hoặc sao chép ảnh khi chưa có văn bản xác nhận quyền.
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-[#E2DACB] flex items-center justify-between gap-2 text-xs text-[#5C534A]">
          <span className="truncate">{record.Type}</span>
          <span className="shrink-0 tabular-nums">
            {record.recognition_year
              ? `UNESCO ${record.recognition_year}`
              : 'Hồ sơ con'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative bg-[#F3EFE6] border border-[#E2DACB] rounded-lg overflow-hidden">
        <div className="overflow-auto max-h-[480px] flex items-center justify-center p-4">
          <img
            src={primaryImage.url}
            alt={primaryImage.caption || record.Title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            className="max-h-[420px] w-auto object-contain transition-transform duration-200"
          />
        </div>

        {!compact && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#F8F5EE]/95 border border-[#E2DACB] rounded-md p-1 no-print">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))}
              className="p-1.5 rounded hover:bg-[#E2DACB]/50 text-[#35261C]"
              aria-label="Thu nhỏ ảnh"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs tabular-nums px-1 text-[#5C534A]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
              className="p-1.5 rounded hover:bg-[#E2DACB]/50 text-[#35261C]"
              aria-label="Phóng to ảnh"
              title="Phóng to"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setFullscreenImage(primaryImage)}
              className="p-1.5 rounded hover:bg-[#E2DACB]/50 text-[#35261C]"
              aria-label="Xem toàn màn hình"
              title="Toàn màn hình"
            >
              <Expand className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Caption & source directly below permitted image */}
      <figcaption className="text-xs text-[#5C534A] space-y-1 border-t border-[#E2DACB] pt-2">
        <p className="font-medium text-[#292524]">{primaryImage.caption}</p>
        <p>
          Nguồn ảnh:{' '}
          <a
            href={primaryImage.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#782F35] underline hover:text-[#35261C]"
          >
            {primaryImage.source_url}
          </a>{' '}
          · Quyền: {primaryImage.rights} · Ghi công: {primaryImage.credit || 'Chưa xác định'}
        </p>
      </figcaption>

      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/95 flex flex-col items-center justify-center p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh toàn màn hình"
        >
          <button
            type="button"
            onClick={() => setFullscreenImage(null)}
            className="self-end mb-3 px-3 py-2 rounded-md bg-[#F8F5EE] text-[#35261C] text-xs font-medium inline-flex items-center gap-1.5"
            aria-label="Đóng chế độ toàn màn hình"
          >
            <X className="w-4 h-4" />
            <span>Đóng</span>
          </button>
          <img
            src={fullscreenImage.url}
            alt={fullscreenImage.caption}
            referrerPolicy="no-referrer"
            className="max-h-[78vh] max-w-full object-contain rounded"
          />
          <p className="mt-3 text-xs text-[#F8F5EE]/90 text-center max-w-2xl">
            {fullscreenImage.caption} — Quyền: {fullscreenImage.rights}
          </p>
        </div>
      )}
    </div>
  );
}
