import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { HeritageRecord, SourceRecord } from '../types.ts';
import { VerificationBadge } from '../components/VerificationBadge.tsx';

interface TimelinePageProps {
  records: HeritageRecord[];
  sources: SourceRecord[];
  onNavigate: (path: string) => void;
}

export function TimelinePage({
  records,
  sources,
  onNavigate,
}: TimelinePageProps) {
  const [filterLevel, setFilterLevel] = useState<'Tất cả' | 'Thế giới' | 'Khu vực'>(
    'Tất cả'
  );

  const milestones = useMemo(() => {
    return records
      .filter(
        (r) =>
          r.parent_id === null &&
          r.recognition_level !== 'Bản ghi con' &&
          r.recognition_year !== null
      )
      .filter((r) =>
        filterLevel === 'Tất cả' ? true : r.recognition_level === filterLevel
      )
      .sort((a, b) => (a.recognition_year ?? 0) - (b.recognition_year ?? 0));
  }, [records, filterLevel]);

  const childRecords = useMemo(
    () => records.filter((r) => r.parent_id !== null),
    [records]
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div className="space-y-3 border-b border-[#E2DACB] pb-6">
        <p className="text-xs uppercase tracking-widest text-[#782F35] font-medium">
          Mốc ghi danh UNESCO 2009 – 2026
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#35261C]">
          Dòng thời gian 13 di sản tư liệu Việt Nam
        </h1>
        <p className="text-sm text-[#5C534A] max-w-2xl">
          Toàn bộ mốc thời gian dưới đây được trích xuất trực tiếp từ trường{' '}
          <code className="text-xs bg-[#F3EFE6] px-1.5 py-0.5 rounded">
            recognition_year
          </code>{' '}
          trong dữ liệu đã duyệt, phân biệt rạch ròi cấp Thế giới (4) và cấp Khu
          vực châu Á – Thái Bình Dương (9).
        </p>

        <div
          className="inline-flex items-center gap-1 p-1 bg-[#F3EFE6] border border-[#E2DACB] rounded-md pt-1"
          role="group"
          aria-label="Lọc cấp ghi danh trên dòng thời gian"
        >
          {(['Tất cả', 'Thế giới', 'Khu vực'] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setFilterLevel(lvl)}
              aria-pressed={filterLevel === lvl}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors ${
                filterLevel === lvl
                  ? 'bg-[#35261C] text-[#F8F5EE]'
                  : 'text-[#5C534A] hover:text-[#35261C]'
              }`}
            >
              {lvl === 'Tất cả'
                ? 'Tất cả (13)'
                : lvl === 'Thế giới'
                ? 'Thế giới (4)'
                : 'Khu vực (9)'}
            </button>
          ))}
        </div>
      </div>

      {/* Chronological List */}
      <ol className="relative border-l border-[#D6CEBE] ml-3 sm:ml-4 space-y-8 pl-6 sm:pl-8">
        {milestones.map((item) => (
          <li key={item.Identifier} className="relative">
            <span
              className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#F8F5EE] ${
                item.recognition_level === 'Thế giới'
                  ? 'bg-[#782F35]'
                  : 'bg-[#B39359]'
              }`}
              aria-hidden="true"
            />

            <article className="bg-white border border-[#E2DACB] rounded-lg p-5 sm:p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-serif text-lg font-bold text-[#782F35] tabular-nums">
                    {item.recognition_year}
                  </span>
                  <span aria-hidden="true" className="text-[#8C8275]">
                    ·
                  </span>
                  <span
                    className={`font-semibold ${
                      item.recognition_level === 'Thế giới'
                        ? 'text-[#782F35]'
                        : 'text-[#6D5221]'
                    }`}
                  >
                    Cấp {item.recognition_level}
                  </span>
                  <span aria-hidden="true" className="text-[#8C8275]">
                    ·
                  </span>
                  <span className="text-[#5C534A] tabular-nums">
                    {item.Identifier}
                  </span>
                </div>

                <VerificationBadge record={item} sources={sources} />
              </div>

              <h2 className="font-serif text-xl font-bold text-[#35261C]">
                <a
                  href={`/tu-lieu/${item.Identifier}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(`/tu-lieu/${item.Identifier}`);
                  }}
                  className="hover:text-[#782F35]"
                >
                  {item.Title}
                </a>
              </h2>

              <p className="text-sm text-[#292524] leading-relaxed">
                {item.Description}
              </p>

              <div className="pt-2 border-t border-[#E2DACB] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#5C534A]">
                <div>
                  <span>Niên đại tư liệu: {item.Date}</span>
                  <span className="mx-2" aria-hidden="true">
                    ·
                  </span>
                  <span>Lưu giữ tham chiếu: {item.current_location}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate(`/tu-lieu/${item.Identifier}`)}
                  className="inline-flex items-center gap-1 font-semibold text-[#782F35] hover:underline whitespace-nowrap shrink-0"
                >
                  <span>Mở hồ sơ</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </article>
          </li>
        ))}
      </ol>

      {/* Child Records Disclaimer */}
      {childRecords.length > 0 && (
        <section className="bg-[#F3EFE6] border border-[#E2DACB] rounded-lg p-6 space-y-3">
          <h2 className="font-serif text-lg font-bold text-[#35261C]">
            Lưu ý về 2 bản ghi con không xếp vào dòng thời gian ghi danh UNESCO
          </h2>
          <p className="text-xs text-[#5C534A] leading-relaxed">
            Các bản ghi dưới đây thuộc bộ hồ sơ cha A01-00002 (ghi danh năm
            2011). Các năm 1442 và 1779 là niên đại khoa thi lịch sử, không phải
            năm UNESCO ghi danh độc lập:
          </p>
          <ul className="space-y-2 text-sm">
            {childRecords.map((c) => (
              <li key={c.Identifier}>
                <button
                  type="button"
                  onClick={() => onNavigate(`/tu-lieu/${c.Identifier}`)}
                  className="font-semibold text-[#782F35] hover:underline text-left"
                >
                  {c.Identifier} – {c.Title}
                </button>{' '}
                <span className="text-xs text-[#5C534A]">
                  (Niên đại tư liệu: {c.Date})
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
