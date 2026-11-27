import { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  Compass,
  Grid2x2,
  HelpCircle,
  List,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import type { HeritageRecord, SourceRecord } from '../types.ts';
import { removeVietnameseAccents } from '../utils/catalog.ts';
import { ArchivalPlate } from '../components/ArchivalPlate.tsx';
import { VerificationBadge } from '../components/VerificationBadge.tsx';

interface CatalogPageProps {
  records: HeritageRecord[];
  sources: SourceRecord[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onNavigate: (path: string) => void;
  initialQuery?: string;
  initialTour?: boolean;
}

export function CatalogPage({
  records,
  sources,
  favorites,
  onToggleFavorite,
  onNavigate,
  initialQuery = '',
  initialTour = false,
}: CatalogPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [levelFilter, setLevelFilter] = useState('Tất cả');
  const [yearFilter, setYearFilter] = useState('Tất cả');
  const [typeFilter, setTypeFilter] = useState('Tất cả');
  const [locationFilter, setLocationFilter] = useState('Tất cả');
  const [copyFilter, setCopyFilter] = useState('Tất cả');
  const [conditionFilter, setConditionFilter] = useState('Tất cả');
  const [verificationFilter, setVerificationFilter] = useState('Tất cả');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'id' | 'year-asc' | 'year-desc' | 'title'>('id');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Optional advanced features: Guided Tour & Source-based Quiz
  const [tourActive, setTourActive] = useState(initialTour);
  const [tourIndex, setTourIndex] = useState(0);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const years = useMemo(() => {
    const yrs = Array.from(
      new Set(
        records
          .map((r) => r.recognition_year)
          .filter((y): y is number => y !== null)
      )
    ).sort((a, b) => a - b);
    return yrs;
  }, [records]);

  const locationOptions = useMemo(() => {
    const provinces = [
      'Hà Nội',
      'Huế',
      'Hà Tĩnh',
      'Lâm Đồng',
      'Bắc Ninh',
      'Đà Nẵng',
      'Hưng Yên',
      'Ninh Bình',
    ];
    return provinces;
  }, []);

  const filtered = useMemo(() => {
    const normQ = removeVietnameseAccents(query.trim());

    const list = records.filter((r) => {
      if (onlyFavorites && !favorites.includes(r.Identifier)) return false;

      if (levelFilter !== 'Tất cả' && r.recognition_level !== levelFilter) {
        return false;
      }

      if (yearFilter !== 'Tất cả') {
        if (yearFilter === 'Chưa ghi danh riêng') {
          if (r.recognition_year !== null) return false;
        } else if (String(r.recognition_year) !== yearFilter) {
          return false;
        }
      }

      if (typeFilter !== 'Tất cả') {
        const typeLower = r.Type.toLowerCase();
        if (typeFilter === 'Mộc bản' && !typeLower.includes('mộc bản')) return false;
        if (
          typeFilter === 'Văn bia / Ma nhai' &&
          !typeLower.includes('bia') &&
          !typeLower.includes('ma nhai')
        ) {
          return false;
        }
        if (
          typeFilter === 'Tài liệu giấy / Hành chính' &&
          !typeLower.includes('hành chính') &&
          !typeLower.includes('giấy') &&
          !typeLower.includes('bản đồ') &&
          !typeLower.includes('cá nhân')
        ) {
          return false;
        }
        if (
          typeFilter === 'Kiến trúc / Đúc đồng' &&
          !typeLower.includes('kiến trúc') &&
          !typeLower.includes('đồng')
        ) {
          return false;
        }
      }

      if (locationFilter !== 'Tất cả') {
        if (
          !removeVietnameseAccents(r.current_location).includes(
            removeVietnameseAccents(locationFilter)
          )
        ) {
          return false;
        }
      }

      if (copyFilter !== 'Tất cả' && r.display_copy !== copyFilter) {
        return false;
      }

      if (conditionFilter !== 'Tất cả') {
        if (
          conditionFilter === 'Chưa xác định' &&
          !r.original_condition.toLowerCase().includes('chưa xác định')
        ) {
          return false;
        }
        if (
          conditionFilter === 'Đã khảo sát' &&
          r.original_condition.toLowerCase().includes('chưa xác định')
        ) {
          return false;
        }
      }

      if (
        verificationFilter !== 'Tất cả' &&
        r.verification.status !== verificationFilter
      ) {
        return false;
      }

      if (normQ) {
        const haystack = removeVietnameseAccents(
          [
            r.Identifier,
            r.Title,
            r.Description,
            r.Creator,
            r.current_location,
            r.Type,
            r.Language,
            ...r.Subject,
          ].join(' ')
        );
        if (!haystack.includes(normQ)) return false;
      }

      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'title') return a.Title.localeCompare(b.Title, 'vi');
      if (sortBy === 'year-asc') {
        return (a.recognition_year ?? 9999) - (b.recognition_year ?? 9999);
      }
      if (sortBy === 'year-desc') {
        return (b.recognition_year ?? 0) - (a.recognition_year ?? 0);
      }
      return a.Identifier.localeCompare(b.Identifier);
    });
  }, [
    records,
    query,
    levelFilter,
    yearFilter,
    typeFilter,
    locationFilter,
    copyFilter,
    conditionFilter,
    verificationFilter,
    onlyFavorites,
    favorites,
    sortBy,
  ]);

  const unescoMatchCount = filtered.filter(
    (r) => r.parent_id === null && r.recognition_level !== 'Bản ghi con'
  ).length;
  const childMatchCount = filtered.length - unescoMatchCount;

  const tourRecords = useMemo(
    () =>
      records
        .filter((r) => r.parent_id === null && r.recognition_year !== null)
        .sort((a, b) => (a.recognition_year ?? 0) - (b.recognition_year ?? 0)),
    [records]
  );

  // Source-grounded quiz items derived from actual published records
  const quizItems = useMemo(() => {
    const findRec = (id: string) => records.find((r) => r.Identifier === id);
    const r01 = findRec('A01-00001');
    const r02 = findRec('A01-00002');
    const r06 = findRec('A01-00006');
    const r11 = findRec('A01-00011');
    const r14 = findRec('A01-00014');

    const questions = [];
    if (r01) {
      questions.push({
        code: r01.Identifier,
        source: r01.Source,
        question: `Di sản tư liệu Việt Nam đầu tiên được UNESCO ghi danh cấp Thế giới năm ${r01.recognition_year} là hồ sơ nào?`,
        options: [
          'Mộc bản triều Nguyễn',
          'Châu bản triều Nguyễn',
          'Bia Tiến sĩ tại Văn Miếu – Quốc Tử Giám',
          'Mộc bản chùa Vĩnh Nghiêm',
        ],
        answer: r01.Title,
      });
    }
    if (r02 && r14) {
      questions.push({
        code: `${r02.Identifier}, ${r14.Identifier}`,
        source: r14.Source,
        question:
          'Con số 1442 trong hồ sơ con A01-00014 (Bia Tiến sĩ khoa Nhâm Tuất 1442) thể hiện thông tin nào?',
        options: [
          'Năm diễn ra khoa thi (niên đại tư liệu), không phải năm UNESCO ghi danh',
          'Năm UNESCO ghi danh di sản tư liệu khu vực',
          'Số lượng tấm bia tại Văn Miếu – Quốc Tử Giám',
          'Năm số hóa bản gốc tại Hà Nội',
        ],
        answer:
          'Năm diễn ra khoa thi (niên đại tư liệu), không phải năm UNESCO ghi danh',
      });
    }
    if (r06) {
      questions.push({
        code: r06.Identifier,
        source: r06.Source,
        question: `Theo hồ sơ ${r06.Identifier}, Châu bản triều Nguyễn được ghi danh cấp Thế giới vào năm nào?`,
        options: ['2009', '2011', '2017', '2025'],
        answer: String(r06.recognition_year),
      });
    }
    if (r11) {
      questions.push({
        code: r11.Identifier,
        source: r11.Source,
        question: `Hồ sơ nào được UNESCO ghi danh Ký ức Thế giới năm ${r11.recognition_year}?`,
        options: [
          'Bộ sưu tập tài liệu của nhạc sĩ Hoàng Vân',
          'Văn bia Phố Hiến',
          'Hoàng Hoa sứ trình đồ',
          'Ma nhai trên núi Non Nước',
        ],
        answer: r11.Title,
      });
    }
    return questions;
  }, [records]);

  const clearAllFilters = () => {
    setQuery('');
    setLevelFilter('Tất cả');
    setYearFilter('Tất cả');
    setTypeFilter('Tất cả');
    setLocationFilter('Tất cả');
    setCopyFilter('Tất cả');
    setConditionFilter('Tất cả');
    setVerificationFilter('Tất cả');
    setOnlyFavorites(false);
    setSortBy('id');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header & Utility Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2DACB] pb-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-[#782F35] font-medium">
            Tra cứu danh mục chuẩn Dublin Core
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#35261C]">
            Kho tư liệu di sản Việt Nam
          </h1>
          <p className="text-sm text-[#5C534A] max-w-2xl">
            Gồm 13 hồ sơ di sản tư liệu UNESCO (4 Thế giới, 9 Khu vực) tách riêng
            với 2 hồ sơ con chuyên đề bia Tiến sĩ. Hỗ trợ tìm kiếm tiếng Việt có
            hoặc không dấu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setTourIndex(0);
              setTourActive((v) => !v);
            }}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md border inline-flex items-center gap-1.5 whitespace-nowrap ${
              tourActive
                ? 'bg-[#782F35] text-[#F8F5EE] border-[#782F35]'
                : 'bg-white text-[#35261C] border-[#D6CEBE] hover:border-[#782F35]'
            }`}
          >
            <Compass className="w-4 h-4" aria-hidden="true" />
            <span>Tham quan theo trình tự</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuizIndex(0);
              setSelectedAnswer(null);
              setQuizOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold rounded-md border bg-white text-[#35261C] border-[#D6CEBE] hover:border-[#782F35] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <HelpCircle className="w-4 h-4" aria-hidden="true" />
            <span>Trắc nghiệm tư liệu</span>
          </button>
        </div>
      </div>

      {/* Guided Tour Panel */}
      {tourActive && tourRecords[tourIndex] && (
        <section
          aria-label="Tham quan theo trình tự niên đại ghi danh UNESCO"
          className="bg-[#F3EFE6] border border-[#B39359] rounded-lg p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#782F35]">
              Tham quan theo trình tự ({tourIndex + 1} / {tourRecords.length}) ·
              UNESCO {tourRecords[tourIndex].recognition_year}
            </p>
            <button
              type="button"
              onClick={() => setTourActive(false)}
              className="p-1 text-[#5C534A] hover:text-[#35261C]"
              aria-label="Đóng chế độ tham quan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-serif text-xl font-bold text-[#35261C]">
                {tourRecords[tourIndex].Identifier} — {tourRecords[tourIndex].Title}
              </h2>
              <p className="text-sm text-[#5C534A] max-w-3xl">
                {tourRecords[tourIndex].Description}
              </p>
              <p className="text-xs text-[#5C534A]">
                Nơi lưu giữ tham chiếu: {tourRecords[tourIndex].current_location}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={tourIndex === 0}
                onClick={() => setTourIndex((i) => Math.max(0, i - 1))}
                className="px-3 py-2 text-xs font-medium bg-white border border-[#D6CEBE] rounded-md disabled:opacity-40 inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Trước</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onNavigate(`/tu-lieu/${tourRecords[tourIndex].Identifier}`)
                }
                className="px-3.5 py-2 text-xs font-semibold bg-[#35261C] text-[#F8F5EE] rounded-md hover:bg-[#782F35]"
              >
                Mở hồ sơ
              </button>
              <button
                type="button"
                disabled={tourIndex >= tourRecords.length - 1}
                onClick={() =>
                  setTourIndex((i) => Math.min(tourRecords.length - 1, i + 1))
                }
                className="px-3 py-2 text-xs font-medium bg-white border border-[#D6CEBE] rounded-md disabled:opacity-40 inline-flex items-center gap-1"
              >
                <span>Tiếp</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Search & Multi-Facet Filter Bar */}
      <section
        aria-label="Bộ lọc và tìm kiếm kho tư liệu"
        className="bg-white border border-[#E2DACB] rounded-lg p-5 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search
              className="w-4 h-4 text-[#5C534A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên, mã A01, chủ đề, địa điểm (có hoặc không dấu)..."
              aria-label="Tìm kiếm tư liệu"
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8F5EE] border border-[#D6CEBE] rounded-md text-sm"
            />
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Lọc theo cấp ghi danh"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#F8F5EE] border border-[#D6CEBE] rounded-md text-sm"
            >
              <option value="Tất cả">Cấp: Tất cả (15 bản ghi)</option>
              <option value="Thế giới">Thế giới (4)</option>
              <option value="Khu vực">Khu vực (9)</option>
              <option value="Bản ghi con">Bản ghi con (2)</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Sắp xếp kết quả"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'id' | 'year-asc' | 'year-desc' | 'title')
              }
              className="w-full px-3 py-2.5 bg-[#F8F5EE] border border-[#D6CEBE] rounded-md text-sm"
            >
              <option value="id">Sắp xếp: Mã hồ sơ (A01-00001...)</option>
              <option value="year-asc">Năm ghi danh tăng dần</option>
              <option value="year-desc">Năm ghi danh giảm dần</option>
              <option value="title">Nhan đề A–Z</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <select
            aria-label="Lọc theo năm ghi danh UNESCO"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F5EE] border border-[#D6CEBE] rounded-md text-xs"
          >
            <option value="Tất cả">Năm ghi danh: Tất cả</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                Năm {y}
              </option>
            ))}
            <option value="Chưa ghi danh riêng">Hồ sơ con (không tính năm riêng)</option>
          </select>

          <select
            aria-label="Lọc theo loại tư liệu"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F5EE] border border-[#D6CEBE] rounded-md text-xs"
          >
            <option value="Tất cả">Loại tư liệu: Tất cả</option>
            <option value="Mộc bản">Mộc bản</option>
            <option value="Văn bia / Ma nhai">Văn bia / Ma nhai</option>
            <option value="Tài liệu giấy / Hành chính">Tài liệu giấy / Hành chính</option>
            <option value="Kiến trúc / Đúc đồng">Kiến trúc / Đúc đồng</option>
          </select>

          <select
            aria-label="Lọc theo địa điểm lưu giữ"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F5EE] border border-[#D6CEBE] rounded-md text-xs"
          >
            <option value="Tất cả">Địa điểm: Tất cả</option>
            {locationOptions.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <select
            aria-label="Lọc theo loại bản hiển thị"
            value={copyFilter}
            onChange={(e) => setCopyFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F5EE] border border-[#D6CEBE] rounded-md text-xs"
          >
            <option value="Tất cả">Loại bản: Tất cả</option>
            <option value="Chưa có bản hiển thị">Chưa có bản hiển thị</option>
            <option value="Bản gốc">Bản gốc</option>
            <option value="Bản sao">Bản sao</option>
            <option value="Bản số của gốc">Bản số của gốc</option>
            <option value="Bản số của sao">Bản số của sao</option>
          </select>

          <select
            aria-label="Lọc theo tình trạng bản gốc"
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F5EE] border border-[#D6CEBE] rounded-md text-xs"
          >
            <option value="Tất cả">Tình trạng gốc: Tất cả</option>
            <option value="Chưa xác định">Chưa xác định (chưa khảo sát)</option>
            <option value="Đã khảo sát">Đã khảo sát</option>
          </select>

          <select
            aria-label="Lọc theo mức kiểm chứng"
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F5EE] border border-[#D6CEBE] rounded-md text-xs"
          >
            <option value="Tất cả">Kiểm chứng: Tất cả</option>
            <option value="Đã đối chiếu từ 2 nguồn">Đã đối chiếu từ 2 nguồn</option>
            <option value="Chờ bổ sung nguồn thứ hai">Chờ bổ sung nguồn thứ hai</option>
            <option value="Cần kiểm chứng trực tiếp">Cần kiểm chứng trực tiếp</option>
          </select>
        </div>

        {/* Status & Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E2DACB]">
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#5C534A]">
            <span className="font-semibold text-[#35261C] tabular-nums">
              Kết quả: {filtered.length} bản ghi
            </span>
            <span>
              ({unescoMatchCount} di sản UNESCO · {childMatchCount} bản ghi con)
            </span>

            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-[#35261C]">
              <input
                type="checkbox"
                checked={onlyFavorites}
                onChange={(e) => setOnlyFavorites(e.target.checked)}
                className="accent-[#782F35]"
              />
              <span>Đã lưu ({favorites.length})</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-3 py-1.5 text-xs font-medium text-[#782F35] hover:bg-[#782F35]/10 rounded-md inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Xóa bộ lọc</span>
            </button>

            <div
              className="inline-flex rounded-md border border-[#D6CEBE] p-0.5 bg-[#F8F5EE]"
              role="group"
              aria-label="Chế độ hiển thị"
            >
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                className={`p-1.5 rounded ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#35261C] shadow-xs'
                    : 'text-[#5C534A]'
                }`}
                aria-label="Hiển thị dạng lưới"
              >
                <Grid2x2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                className={`p-1.5 rounded ${
                  viewMode === 'list'
                    ? 'bg-white text-[#35261C] shadow-xs'
                    : 'text-[#5C534A]'
                }`}
                aria-label="Hiển thị dạng danh sách"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Results Area */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E2DACB] rounded-lg p-12 text-center space-y-3">
          <p className="font-serif text-lg font-semibold text-[#35261C]">
            Không tìm thấy hồ sơ tư liệu phù hợp
          </p>
          <p className="text-sm text-[#5C534A]">
            Thử rút gọn từ khóa hoặc nhấn Xóa bộ lọc để xem lại toàn bộ 15 bản ghi.
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="px-4 py-2 bg-[#35261C] text-[#F8F5EE] text-xs font-semibold rounded-md"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((record) => {
            const isFav = favorites.includes(record.Identifier);
            return (
              <article
                key={record.Identifier}
                className="bg-white border border-[#E2DACB] rounded-lg p-5 flex flex-col justify-between gap-4 hover:border-[#B39359] transition-colors"
              >
                <div className="space-y-3">
                  <ArchivalPlate record={record} compact />

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2 text-xs text-[#5C534A] min-w-0">
                      <span className="font-semibold text-[#35261C] tabular-nums">
                        {record.Identifier}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{record.recognition_level}</span>
                      {record.recognition_year && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {record.recognition_year}
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleFavorite(record.Identifier)}
                      aria-label={
                        isFav
                          ? `Bỏ lưu ${record.Title}`
                          : `Lưu ${record.Title} vào thiết bị`
                      }
                      aria-pressed={isFav}
                      className={`p-1.5 rounded hover:bg-[#F3EFE6] ${
                        isFav ? 'text-[#782F35]' : 'text-[#8C8275]'
                      }`}
                    >
                      <Bookmark
                        className="w-4 h-4"
                        fill={isFav ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>

                  <h2 className="font-serif text-lg font-bold text-[#35261C] leading-snug">
                    <a
                      href={`/tu-lieu/${record.Identifier}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate(`/tu-lieu/${record.Identifier}`);
                      }}
                      className="hover:text-[#782F35]"
                    >
                      {record.Title}
                    </a>
                  </h2>

                  <p className="text-xs text-[#5C534A] leading-relaxed">
                    Lưu giữ tham chiếu: {record.current_location}
                  </p>
                  <p className="text-sm text-[#292524] line-clamp-2 leading-relaxed">
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
                    Xem hồ sơ
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-[#E2DACB] rounded-lg divide-y divide-[#E2DACB]">
          {filtered.map((record) => {
            const isFav = favorites.includes(record.Identifier);
            return (
              <article
                key={record.Identifier}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F8F5EE]/50 transition-colors"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C534A]">
                    <span className="font-semibold text-[#35261C] tabular-nums">
                      {record.Identifier}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{record.recognition_level}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {record.recognition_year
                        ? `Ghi danh ${record.recognition_year}`
                        : `Thuộc ${record.parent_id}`}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{record.display_copy}</span>
                  </div>
                  <h2 className="font-serif text-lg font-bold text-[#35261C]">
                    <a
                      href={`/tu-lieu/${record.Identifier}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate(`/tu-lieu/${record.Identifier}`);
                      }}
                      className="hover:text-[#782F35]"
                    >
                      {record.Title}
                    </a>
                  </h2>
                  <p className="text-xs text-[#5C534A]">{record.current_location}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <VerificationBadge record={record} sources={sources} />
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(record.Identifier)}
                    aria-pressed={isFav}
                    aria-label="Lưu mục yêu thích"
                    className={`p-2 rounded-md border border-[#E2DACB] ${
                      isFav ? 'text-[#782F35] bg-[#782F35]/5' : 'text-[#5C534A]'
                    }`}
                  >
                    <Bookmark
                      className="w-4 h-4"
                      fill={isFav ? 'currentColor' : 'none'}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate(`/tu-lieu/${record.Identifier}`)}
                    className="px-3.5 py-2 bg-[#35261C] text-[#F8F5EE] text-xs font-semibold rounded-md hover:bg-[#782F35] whitespace-nowrap"
                  >
                    Chi tiết
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Source-Grounded Quiz Modal */}
      {quizOpen && quizItems[quizIndex] && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Trắc nghiệm tư liệu có dẫn nguồn"
        >
          <div className="bg-[#F8F5EE] border border-[#D6CEBE] rounded-lg max-w-xl w-full p-6 space-y-5">
            <div className="flex items-center justify-between gap-4 border-b border-[#E2DACB] pb-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#782F35] font-semibold">
                  Câu đố học tập ({quizIndex + 1}/{quizItems.length})
                </p>
                <p className="text-xs text-[#5C534A]">
                  Căn cứ mã bản ghi: {quizItems[quizIndex].code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuizOpen(false)}
                className="p-1.5 text-[#5C534A] hover:text-[#35261C]"
                aria-label="Đóng trắc nghiệm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="font-serif text-lg font-bold text-[#35261C]">
              {quizItems[quizIndex].question}
            </h3>

            <div className="space-y-2">
              {quizItems[quizIndex].options.map((opt) => {
                const isSelected = selectedAnswer === opt;
                const isCorrect = opt === quizItems[quizIndex].answer;
                let btnStyle =
                  'bg-white border-[#D6CEBE] text-[#292524] hover:border-[#782F35]';
                if (selectedAnswer) {
                  if (isCorrect) {
                    btnStyle =
                      'bg-[#14532D]/10 border-[#14532D] text-[#14532D] font-semibold';
                  } else if (isSelected) {
                    btnStyle =
                      'bg-[#782F35]/10 border-[#782F35] text-[#782F35]';
                  }
                }
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSelectedAnswer(opt)}
                    className={`w-full text-left px-4 py-3 rounded-md border text-sm transition-colors ${btnStyle}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {selectedAnswer && (
              <div className="p-3 bg-white border border-[#E2DACB] rounded-md text-xs text-[#5C534A] space-y-1">
                <p className="font-semibold text-[#35261C]">
                  {selectedAnswer === quizItems[quizIndex].answer
                    ? 'Chính xác theo hồ sơ.'
                    : `Đáp án đúng theo hồ sơ: ${quizItems[quizIndex].answer}`}
                </p>
                <p>Nguồn tham chiếu: {quizItems[quizIndex].source}</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                disabled={quizIndex === 0}
                onClick={() => {
                  setQuizIndex((i) => Math.max(0, i - 1));
                  setSelectedAnswer(null);
                }}
                className="px-3 py-2 text-xs font-medium bg-white border border-[#D6CEBE] rounded-md disabled:opacity-40"
              >
                Câu trước
              </button>
              <button
                type="button"
                onClick={() => {
                  if (quizIndex < quizItems.length - 1) {
                    setQuizIndex((i) => i + 1);
                    setSelectedAnswer(null);
                  } else {
                    setQuizOpen(false);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold bg-[#35261C] text-[#F8F5EE] rounded-md hover:bg-[#782F35]"
              >
                {quizIndex < quizItems.length - 1 ? 'Câu tiếp theo' : 'Hoàn thành'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
