import { ExternalLink, ShieldCheck } from 'lucide-react';
import type { HeritageRecord, SourceRecord } from '../types.ts';
import { isSafeHttpUrl } from '../utils/catalog.ts';

interface SourcesRightsPageProps {
  sources: SourceRecord[];
  records: HeritageRecord[];
}

export function SourcesRightsPage({
  sources,
  records,
}: SourcesRightsPageProps) {
  const officialCount = sources.filter((s) => s.is_official).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-12">
      <div className="space-y-3 border-b border-[#E2DACB] pb-6">
        <p className="text-xs uppercase tracking-widest text-[#782F35] font-medium">
          Minh bạch trích dẫn &amp; Bản quyền
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#35261C]">
          Nguồn tư liệu và Ghi nhận quyền
        </h1>
        <p className="text-sm text-[#5C534A] max-w-3xl leading-relaxed">
          Hệ thống đang sử dụng {sources.length} nguồn tham chiếu (trong đó có{' '}
          {officialCount} nguồn chính thống từ UNESCO, MOWCAP, Bộ Ngoại giao
          Việt Nam, Văn Miếu – Quốc Tử Giám và DCMI). Riêng N08 chỉ dùng cho cấu
          trúc siêu dữ liệu Dublin Core, không tính là nguồn xác minh hiện vật.
          Không công khai thông tin cá nhân hoặc phần dữ liệu thuộc diện hạn chế.
        </p>
      </div>

      {/* Sources List */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#35261C]">
          Danh mục nguồn đối chiếu (N01 – N09)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sources.map((src) => (
            <article
              key={src.source_id}
              className="bg-white border border-[#E2DACB] rounded-lg p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[#782F35] tabular-nums">
                    {src.source_id}
                  </span>
                  <span className="text-[#5C534A]">
                    {src.is_metadata_standard_only
                      ? 'Chuẩn metadata (không xác minh hiện vật)'
                      : src.is_official
                      ? 'Nguồn chính thống'
                      : 'Nguồn tham khảo'}
                  </span>
                </div>

                <h3 className="font-serif text-lg font-bold text-[#35261C]">
                  {src.title}
                </h3>

                <dl className="text-xs text-[#5C534A] space-y-1.5 pt-1">
                  <div>
                    <dt className="font-semibold text-[#292524] inline">
                      Cơ quan ban hành:{' '}
                    </dt>
                    <dd className="inline">{src.organization}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#292524] inline">
                      Ngày truy cập / đối chiếu:{' '}
                    </dt>
                    <dd className="inline">{src.accessed_at}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#292524] inline">
                      Phạm vi đối chiếu:{' '}
                    </dt>
                    <dd className="inline">{src.scope}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#292524] inline">
                      Quyền ảnh:{' '}
                    </dt>
                    <dd className="inline">{src.image_rights}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#292524] inline">
                      Tình trạng URL:{' '}
                    </dt>
                    <dd className="inline text-[#6D5221]">
                      {src.url_check_status}
                    </dd>
                  </div>
                </dl>
              </div>

              {isSafeHttpUrl(src.url) && (
                <div className="pt-3 border-t border-[#E2DACB] flex items-center justify-between gap-2">
                  <span className="text-xs text-[#5C534A] truncate">
                    {src.url}
                  </span>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#782F35] hover:underline whitespace-nowrap shrink-0"
                  >
                    <span>Mở liên kết</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Permission Credits Ledger */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-[#35261C]">
          <ShieldCheck className="w-5 h-5 text-[#782F35]" aria-hidden="true" />
          <h2 className="font-serif text-2xl font-bold">
            Bảng ghi nhận quyền theo từng hồ sơ (15 bản ghi)
          </h2>
        </div>

        <div className="bg-white border border-[#E2DACB] rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F3EFE6] border-b border-[#E2DACB] text-[#35261C]">
                <th className="py-3 px-4 font-semibold">Mã</th>
                <th className="py-3 px-4 font-semibold">Hồ sơ</th>
                <th className="py-3 px-4 font-semibold">Người / Đơn vị cho phép</th>
                <th className="py-3 px-4 font-semibold">Vai trò</th>
                <th className="py-3 px-4 font-semibold">Ngày đồng ý</th>
                <th className="py-3 px-4 font-semibold">Phạm vi công khai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DACB]">
              {records.map((r) => (
                <tr key={r.Identifier} className="hover:bg-[#F8F5EE]/50">
                  <td className="py-3 px-4 font-semibold text-[#782F35] tabular-nums whitespace-nowrap">
                    {r.Identifier}
                  </td>
                  <td className="py-3 px-4 font-medium text-[#292524]">
                    {r.Title}
                  </td>
                  <td className="py-3 px-4 text-[#5C534A]">
                    {r.permission.granted_by}
                  </td>
                  <td className="py-3 px-4 text-[#5C534A]">
                    {r.permission.role}
                  </td>
                  <td className="py-3 px-4 text-[#5C534A] tabular-nums">
                    {r.permission.agreed_date}
                  </td>
                  <td className="py-3 px-4 text-[#5C534A]">
                    {r.permission.scope}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
