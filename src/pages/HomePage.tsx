import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Compass,
  Landmark,
  Search,
  ShieldCheck,
} from 'lucide-react';
import type { CatalogStats, HeritageRecord, SourceRecord } from '../types.ts';
import { ArchivalPlate } from '../components/ArchivalPlate.tsx';
import { VerificationBadge } from '../components/VerificationBadge.tsx';

interface HomePageProps {
  records: HeritageRecord[];
  sources: SourceRecord[];
  stats: CatalogStats;
  onNavigate: (path: string) => void;
}

export function HomePage({
  records,
  sources,
  stats,
  onNavigate,
}: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    onNavigate(q ? `/kho-tu-lieu?q=${encodeURIComponent(q)}` : '/kho-tu-lieu');
  };

  const featuredIds = [
    'A01-00001',
    'A01-00002',
    'A01-00006',
    'A01-00011',
    'A01-00012',
    'A01-00013',
  ];
  const featuredRecords = featuredIds
    .map((id) => records.find((r) => r.Identifier === id))
    .filter((r): r is HeritageRecord => Boolean(r));

  const unescoTimeline = records
    .filter(
      (r) =>
        r.parent_id === null &&
        r.recognition_level !== 'Bản ghi con' &&
        r.recognition_year !== null
    )
    .sort((a, b) => (a.recognition_year ?? 0) - (b.recognition_year ?? 0));

  const uniqueLocations = Array.from(
    new Set(records.map((r) => r.current_location))
  ).slice(0, 8);

  return (
    <div className="space-y-16 sm:space-y-20 pb-12">
      {/* Hero Section */}
      <section className="border-b border-[#E2DACB] bg-[#F3EFE6]/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <p className="text-xs font-medium tracking-widest uppercase text-[#782F35]">
              Dự án xã hội phi lợi nhuận · Mã A01 · Mốc tuần 4 (05/11/2026)
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#35261C] leading-tight text-balance">
              Ký Ức Việt – Hồ sơ số 13 di sản tư liệu Việt Nam được UNESCO ghi danh
            </h1>
            <p className="text-base sm:text-lg text-[#5C534A] leading-relaxed max-w-2xl">
              Cổng tra cứu mở theo chuẩn Dublin Core hỗ trợ học tập, nghiên cứu và
              bảo tồn di sản tư liệu: gồm 4 di sản Ký ức Thế giới, 9 di sản khu vực
              châu Á – Thái Bình Dương và 2 hồ sơ con chuyên đề bia Tiến sĩ (tổng
              15 bản ghi danh mục dự kiến).
            </p>

            {/* Quick Search */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-xl pt-1"
              role="search"
              aria-label="Tìm kiếm nhanh trong kho tư liệu"
            >
              <label htmlFor="home-search" className="sr-only">
                Tìm theo tên di sản, mã A01, địa điểm hoặc từ khóa
              </label>
              <div className="relative flex-1">
                <Search
                  className="w-4 h-4 text-[#5C534A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="home-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tên di sản, mã A01-00001, Hà Tĩnh, chữ Hán..."
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#D6CEBE] rounded-md text-sm text-[#292524] placeholder:text-[#8C8275] focus:border-[#782F35]"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-3 bg-[#782F35] text-[#F8F5EE] text-sm font-semibold rounded-md hover:bg-[#5F2328] transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              >
                <span>Tra cứu kho</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#5C534A] pt-1">
              <span>Thực hiện: Trần Mạnh Trường (PH59448 – Nhóm 1)</span>
              <span aria-hidden="true">·</span>
              <span>Thực tập sinh Đợt 15 FPT Polytechnic × IMTA TECH</span>
            </div>
          </div>

          {/* Right Curatorial Overview Box */}
          <div className="lg:col-span-5 bg-white border border-[#E2DACB] rounded-lg p-6 sm:p-8 space-y-5">
            <div className="space-y-1 border-b border-[#E2DACB] pb-4">
              <p className="text-xs uppercase tracking-widest text-[#5C534A]">
                Tổng quan phạm vi danh mục
              </p>
              <h2 className="font-serif text-xl font-bold text-[#35261C]">
                Thống kê trực tiếp từ dữ liệu công bố
              </h2>
            </div>

            <dl className="grid grid-cols-2 gap-4">
              <div className="p-3.5 bg-[#F8F5EE] border border-[#E2DACB] rounded-md">
                <dt className="text-xs text-[#5C534A]">Di sản UNESCO</dt>
                <dd className="mt-1 font-serif text-2xl font-bold text-[#35261C] tabular-nums">
                  {stats.unesco_total}
                </dd>
              </div>
              <div className="p-3.5 bg-[#F8F5EE] border border-[#E2DACB] rounded-md">
                <dt className="text-xs text-[#5C534A]">Cấp Thế giới / Khu vực</dt>
                <dd className="mt-1 font-serif text-2xl font-bold text-[#782F35] tabular-nums">
                  {stats.world_count} / {stats.regional_count}
                </dd>
              </div>
              <div className="p-3.5 bg-[#F8F5EE] border border-[#E2DACB] rounded-md">
                <dt className="text-xs text-[#5C534A]">Hồ sơ con (Bia Tiến sĩ)</dt>
                <dd className="mt-1 font-serif text-2xl font-bold text-[#35261C] tabular-nums">
                  {stats.child_count}
                </dd>
              </div>
              <div className="p-3.5 bg-[#F8F5EE] border border-[#E2DACB] rounded-md">
                <dt className="text-xs text-[#5C534A]">Hồ sơ &ge; 2 nguồn đối chiếu</dt>
                <dd className="mt-1 font-serif text-2xl font-bold text-[#35261C] tabular-nums">
                  {stats.records_with_2plus_sources} / {stats.catalog_total}
                </dd>
              </div>
            </dl>

            <p className="text-xs text-[#5C534A] leading-relaxed">
              Lưu ý: Hai bản ghi con ({' '}
              <button
                type="button"
                onClick={() => onNavigate('/tu-lieu/A01-00014')}
                className="text-[#782F35] underline font-medium"
              >
                A01-00014
              </button>
              ,{' '}
              <button
                type="button"
                onClick={() => onNavigate('/tu-lieu/A01-00015')}
                className="text-[#782F35] underline font-medium"
              >
                A01-00015
              </button>
              ) thuộc bộ bia A01-00002, được tách riêng và không cộng dồn thành 15
              di sản UNESCO. Toàn bộ bản ghi hiện là hồ sơ mô tả thứ cấp, chưa gắn
              ảnh tự số hóa.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Collections */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2DACB] pb-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest text-[#782F35] font-medium">
              Bộ sưu tập nổi bật
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#35261C]">
              Hồ sơ tiêu biểu qua các giai đoạn ghi danh
            </h2>
          </div>
          <a
            href="/kho-tu-lieu"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/kho-tu-lieu');
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#782F35] hover:underline whitespace-nowrap shrink-0"
          >
            <span>Xem toàn bộ {stats.catalog_total} bản ghi</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredRecords.map((record) => (
            <article
              key={record.Identifier}
              className="bg-white border border-[#E2DACB] rounded-lg p-5 flex flex-col justify-between gap-4 hover:border-[#B39359] transition-colors"
            >
              <div className="space-y-3">
                <ArchivalPlate record={record} compact />

                <div className="flex items-center gap-2 text-xs text-[#5C534A] pt-1">
                  <span className="font-semibold text-[#35261C] tabular-nums">
                    {record.Identifier}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{record.recognition_level}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    Ghi danh {record.recognition_year}
                  </span>
                </div>

                <h3 className="font-serif text-lg font-bold text-[#35261C] leading-snug">
                  <a
                    href={`/tu-lieu/${record.Identifier}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(`/tu-lieu/${record.Identifier}`);
                    }}
                    className="hover:text-[#782F35] transition-colors"
                  >
                    {record.Title}
                  </a>
                </h3>

                <p className="text-sm text-[#5C534A] line-clamp-2 leading-relaxed">
                  {record.Description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#E2DACB] flex items-center justify-between gap-2">
                <VerificationBadge record={record} sources={sources} />
                <button
                  type="button"
                  onClick={() => onNavigate(`/tu-lieu/${record.Identifier}`)}
                  className="text-xs font-semibold text-[#782F35] hover:underline whitespace-nowrap shrink-0"
                >
                  Chi tiết
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Timeline & Repositories Split */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Timeline Preview */}
        <div className="lg:col-span-7 bg-white border border-[#E2DACB] rounded-lg p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-4 border-b border-[#E2DACB] pb-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-[#5C534A]">
                Mốc ghi danh UNESCO 2009–2026
              </p>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#35261C]">
                Dòng thời gian 13 di sản tư liệu
              </h2>
            </div>
            <a
              href="/dong-thoi-gian"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/dong-thoi-gian');
              }}
              className="text-xs font-semibold text-[#782F35] hover:underline whitespace-nowrap shrink-0"
            >
              Xem đầy đủ
            </a>
          </div>

          <ol className="space-y-3 divide-y divide-[#E2DACB]/70">
            {unescoTimeline.slice(0, 7).map((item) => (
              <li
                key={item.Identifier}
                className="pt-3 first:pt-0 flex items-baseline justify-between gap-4"
              >
                <div className="flex items-baseline gap-3 min-w-0">
                  <span className="font-serif font-bold text-sm text-[#782F35] tabular-nums shrink-0">
                    {item.recognition_year}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate(`/tu-lieu/${item.Identifier}`)}
                    className="text-sm font-medium text-[#292524] hover:text-[#782F35] text-left truncate"
                  >
                    {item.Title}
                  </button>
                </div>
                <span className="text-xs text-[#5C534A] whitespace-nowrap shrink-0">
                  {item.recognition_level}
                </span>
              </li>
            ))}
          </ol>

          <p className="text-xs text-[#5C534A] pt-2">
            Hiển thị 7 mốc đầu trong tổng số {unescoTimeline.length} hồ sơ UNESCO.
            Không hiển thị các sự kiện không có nguồn dẫn chiếu.
          </p>
        </div>

        {/* Custody Locations & Rights */}
        <div className="lg:col-span-5 bg-[#F3EFE6] border border-[#E2DACB] rounded-lg p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#782F35]">
              <Landmark className="w-5 h-5" aria-hidden="true" />
              <p className="text-xs uppercase tracking-widest font-semibold">
                Nơi lưu giữ &amp; Quyền tư liệu
              </p>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#35261C]">
              Đơn vị bảo quản tham chiếu
            </h2>
            <p className="text-xs text-[#5C534A] leading-relaxed">
              Địa điểm dưới đây ghi nhận theo phạm vi tham chiếu từ kế hoạch và
              nguồn công khai; đang chờ xác minh cấp xã/phường và đơn vị giữ trực
              tiếp trước khi gắn bản số.
            </p>
            <ul className="space-y-2 text-xs text-[#292524]">
              {uniqueLocations.map((loc) => (
                <li key={loc} className="pb-2 border-b border-[#E2DACB] last:border-b-0">
                  {loc}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('/nguon-va-quyen')}
              className="px-4 py-2.5 bg-[#35261C] text-[#F8F5EE] text-xs font-semibold rounded-md hover:bg-[#782F35] transition-colors inline-flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Nguồn &amp; Ghi nhận quyền</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/tro-ly-gemini')}
              className="px-4 py-2.5 bg-white border border-[#D6CEBE] text-[#35261C] text-xs font-semibold rounded-md hover:border-[#782F35] transition-colors inline-flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              <span>Hỏi trợ lý Gemini</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/kho-tu-lieu?tour=1')}
              className="px-4 py-2.5 bg-white border border-[#D6CEBE] text-[#35261C] text-xs font-semibold rounded-md hover:border-[#782F35] transition-colors inline-flex items-center gap-2"
            >
              <Compass className="w-4 h-4" aria-hidden="true" />
              <span>Tham quan theo trình tự</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
