import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Lock,
  LogOut,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  DisplayCopyType,
  HeritageRecord,
  PublicationStatus,
  RecognitionLevel,
  SourceRecord,
  VerificationStatus,
} from '../types.ts';
import {
  buildCsvWithUtf8Bom,
  isSafeHttpUrl,
  validateRecordsDataset,
} from '../utils/catalog.ts';

interface AdminPageProps {
  publicRecords: HeritageRecord[];
  sources: SourceRecord[];
  onRefreshPublic: () => Promise<void>;
  onNavigate: (path: string) => void;
}

function createEmptyRecord(): HeritageRecord {
  return {
    Title: '',
    Creator: 'Chưa xác định',
    Subject: ['Di sản tư liệu'],
    Description: '',
    Publisher: 'Ký Ức Việt – Dự án A01 (phi lợi nhuận)',
    Contributor: 'Trần Mạnh Trường (PH59448 – Nhóm 1)',
    Date: 'Chưa xác định (niên đại tư liệu)',
    Type: 'Hồ sơ mô tả thứ cấp',
    Format: 'Hồ sơ mô tả văn bản (chưa có tệp số)',
    Identifier: '',
    Source: '',
    Language: 'Chữ Hán / Tiếng Việt',
    Relation: 'Di sản tư liệu độc lập',
    Coverage: 'Việt Nam',
    Rights: 'Hồ sơ mô tả thứ cấp; chưa có quyền công bố ảnh hiện vật.',
    current_location: 'Chưa xác định (cần xác minh xã/phường và đơn vị giữ trực tiếp)',
    historical_location: 'Chưa xác định',
    display_copy: 'Chưa có bản hiển thị',
    original_condition: 'Chưa xác định (chưa khảo sát trực tiếp hiện vật)',
    registration_no: 'Chưa xác định',
    permission: {
      granted_by: 'Chưa xác định',
      role: 'Chưa xác định',
      agreed_date: 'Chưa xác định',
      scope: 'Chưa có văn bản cấp phép ảnh/bản số',
    },
    excluded_content: 'Không công khai ảnh chưa có phép hoặc thông tin nhạy cảm.',
    verification: {
      status: 'Chờ bổ sung nguồn thứ hai',
      transcription_level: 'Chưa có phiên âm',
      translation_level: 'Chưa có bản dịch',
      verified_by: 'Chưa xác định',
      source_sufficiency: 'Đang chờ đối chiếu tối thiểu 2 nguồn',
    },
    recognition_year: null,
    recognition_level: 'Khu vực',
    parent_id: null,
    images: [],
    digitized_by: 'Chưa xác định',
    digitized_at: 'Chưa xác định',
    transcription: '',
    translation: '',
    verification_by: 'Chưa xác định',
    verification_date: 'Chưa xác định',
    source_ids: [],
    unknown_notes: 'Cần xác minh đơn vị giữ trực tiếp và nguồn đối chiếu.',
    publication_status: 'Bản nháp',
    updated_at: new Date().toISOString().slice(0, 10),
  };
}

export function AdminPage({
  publicRecords,
  sources,
  onRefreshPublic,
  onNavigate,
}: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'local' | 'server'>('export');

  // Local draft workspace state (never touches server or public bundle)
  const [localDrafts, setLocalDrafts] = useState<HeritageRecord[]>(publicRecords);
  const [localMsg, setLocalMsg] = useState<string | null>(null);

  // Server Admin Auth state (token kept strictly in React memory)
  const [authStatus, setAuthStatus] = useState<{
    configured: boolean;
    needsSetup: boolean;
    mode: string;
  } | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmSetupPassword, setConfirmSetupPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Server Admin CRUD state
  const [serverRecords, setServerRecords] = useState<HeritageRecord[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverNotice, setServerNotice] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<HeritageRecord | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HeritageRecord | null>(null);

  // Optional permitted image form fields inside Editor
  const [newImgUrl, setNewImgUrl] = useState('');
  const [newImgCaption, setNewImgCaption] = useState('');
  const [newImgSourceUrl, setNewImgSourceUrl] = useState('');
  const [newImgRights, setNewImgRights] = useState('');
  const [newImgCredit, setNewImgCredit] = useState('');

  useEffect(() => {
    setLocalDrafts(publicRecords);
  }, [publicRecords]);

  useEffect(() => {
    fetch('/api/admin/status')
      .then((r) => r.json())
      .then((data) => setAuthStatus(data))
      .catch(() => setAuthStatus(null));
  }, []);

  const publicValidation = useMemo(
    () => validateRecordsDataset(publicRecords),
    [publicRecords]
  );

  const localValidation = useMemo(
    () => validateRecordsDataset(localDrafts),
    [localDrafts]
  );

  const fetchAdminRecords = async (token: string) => {
    setServerError(null);
    const res = await fetch('/api/admin/records', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as {
      records?: HeritageRecord[];
      error?: string;
    };
    if (!res.ok) {
      setServerError(data.error || 'Không thể tải dữ liệu quản trị.');
      return;
    }
    setServerRecords(data.records || []);
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (passwordInput.length < 8) {
      setAuthError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (passwordInput !== confirmSetupPassword) {
      setAuthError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setAuthError(data.error || 'Không thể thiết lập mật khẩu.');
        return;
      }
      setAuthToken(data.token);
      setPasswordInput('');
      setConfirmSetupPassword('');
      setAuthStatus({ configured: true, needsSetup: false, mode: 'claimed' });
      await fetchAdminRecords(data.token);
    } catch {
      setAuthError('Lỗi kết nối khi thiết lập mật khẩu.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setAuthError(data.error || 'Đăng nhập thất bại.');
        return;
      }
      setAuthToken(data.token);
      setPasswordInput('');
      await fetchAdminRecords(data.token);
    } catch {
      setAuthError('Lỗi kết nối tới máy chủ xác thực.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLocalImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalMsg(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        setLocalMsg('Tệp JSON phải là một mảng danh sách hồ sơ.');
        return;
      }
      const check = validateRecordsDataset(parsed as HeritageRecord[]);
      setLocalDrafts(parsed as HeritageRecord[]);
      setLocalMsg(
        `Đã nạp ${parsed.length} bản ghi vào vùng nháp cục bộ (${check.duplicateIds.length} mã trùng, ${check.missingFields.length} lỗi thiếu trường).`
      );
    } catch {
      setLocalMsg('Không thể phân tích tệp JSON. Vui lòng kiểm tra định dạng.');
    } finally {
      e.target.value = '';
    }
  };

  const downloadLocalDrafts = (format: 'json' | 'csv') => {
    const content =
      format === 'csv'
        ? buildCsvWithUtf8Bom(localDrafts)
        : JSON.stringify(localDrafts, null, 2);
    const blob = new Blob([content], {
      type:
        format === 'csv'
          ? 'text/csv;charset=utf-8'
          : 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ky-uc-viet-ban-nhap-cuc-bo.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !editingRecord) return;
    setServerError(null);
    setServerNotice(null);

    const endpoint = isNewRecord
      ? '/api/admin/records'
      : `/api/admin/records/${encodeURIComponent(editingRecord.Identifier)}`;
    const method = isNewRecord ? 'POST' : 'PUT';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ record: editingRecord }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setServerError(data.error || 'Không thể lưu hồ sơ.');
        return;
      }
      setEditingRecord(null);
      setServerNotice('Đã lưu thay đổi vào data/tulieu.json trên máy chủ.');
      await fetchAdminRecords(authToken);
      await onRefreshPublic();
    } catch {
      setServerError('Lỗi kết nối khi lưu hồ sơ.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!authToken || !deleteTarget) return;
    setServerError(null);
    try {
      const res = await fetch(
        `/api/admin/records/${encodeURIComponent(deleteTarget.Identifier)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setServerError(data.error || 'Không thể xóa hồ sơ.');
        return;
      }
      setDeleteTarget(null);
      setServerNotice(`Đã xóa hồ sơ ${deleteTarget.Identifier}.`);
      await fetchAdminRecords(authToken);
      await onRefreshPublic();
    } catch {
      setServerError('Lỗi kết nối khi xóa hồ sơ.');
    }
  };

  const handleAttachPermittedImage = () => {
    if (!editingRecord) return;
    if (
      !isSafeHttpUrl(newImgUrl) ||
      !isSafeHttpUrl(newImgSourceUrl) ||
      !newImgCaption.trim() ||
      !newImgRights.trim() ||
      !newImgCredit.trim()
    ) {
      setServerError(
        'Ảnh đính kèm bắt buộc có URL hợp lệ (http/https), chú thích, URL nguồn, thông tin quyền và ghi công.'
      );
      return;
    }
    setServerError(null);
    setEditingRecord({
      ...editingRecord,
      images: [
        ...(editingRecord.images || []),
        {
          url: newImgUrl.trim(),
          caption: newImgCaption.trim(),
          source_url: newImgSourceUrl.trim(),
          rights: newImgRights.trim(),
          credit: newImgCredit.trim(),
        },
      ],
    });
    setNewImgUrl('');
    setNewImgCaption('');
    setNewImgSourceUrl('');
    setNewImgRights('');
    setNewImgCredit('');
  };

  const recordsWith2Sources = publicRecords.filter(
    (r) => r.source_ids.filter((id) => id !== 'N08').length >= 2
  ).length;
  const recordsWithImages = publicRecords.filter(
    (r) => r.images && r.images.length > 0
  ).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="space-y-2 border-b border-[#E2DACB] pb-6">
        <p className="text-xs uppercase tracking-widest text-[#782F35] font-medium">
          Kiểm kê, Xuất dữ liệu &amp; Quản trị nội bộ
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#35261C]">
          Quản lý hồ sơ &amp; Kiểm tra chất lượng dữ liệu
        </h1>
        <p className="text-sm text-[#5C534A] max-w-3xl">
          Khách truy cập công khai chỉ có thể xuất dữ liệu đã duyệt (không chứa
          thông tin hạn chế). Thao tác ghi vào kho dữ liệu yêu cầu xác thực quản
          trị viên trên máy chủ.
        </p>
      </div>

      {/* Mode Tabs */}
      <div
        className="flex flex-wrap gap-2 border-b border-[#E2DACB] pb-3"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'export'}
          onClick={() => setActiveTab('export')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'export'
              ? 'bg-[#35261C] text-[#F8F5EE]'
              : 'bg-white border border-[#D6CEBE] text-[#35261C]'
          }`}
        >
          1. Xuất công khai &amp; Checklist kiểm kê
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'local'}
          onClick={() => setActiveTab('local')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'local'
              ? 'bg-[#35261C] text-[#F8F5EE]'
              : 'bg-white border border-[#D6CEBE] text-[#35261C]'
          }`}
        >
          2. Công cụ nhập liệu cục bộ (nháp)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'server'}
          onClick={() => setActiveTab('server')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'server'
              ? 'bg-[#782F35] text-[#F8F5EE]'
              : 'bg-white border border-[#D6CEBE] text-[#35261C]'
          }`}
        >
          3. Quản trị máy chủ (yêu cầu đăng nhập)
        </button>
      </div>

      {/* Tab 1: Public Export & Quality Checklist */}
      {activeTab === 'export' && (
        <div className="space-y-8">
          <section className="bg-white border border-[#E2DACB] rounded-lg p-6 space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#35261C]">
              Xuất dữ liệu công khai đã duyệt ({publicRecords.length} bản ghi)
            </h2>
            <p className="text-xs text-[#5C534A]">
              Chỉ xuất các bản ghi có trạng thái <strong>Được công bố</strong>;
              đã loại bỏ thông tin hạn chế và hỗ trợ chuẩn CSV UTF-8 BOM mở
              trực tiếp bằng Excel không lỗi phông tiếng Việt.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/api/public/export?format=json"
                download="ky-uc-viet-tu-lieu-cong-khai.json"
                className="px-4 py-2.5 bg-[#35261C] text-[#F8F5EE] text-xs font-semibold rounded-md hover:bg-[#782F35] inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Tải xuống JSON công khai</span>
              </a>
              <a
                href="/api/public/export?format=csv"
                download="ky-uc-viet-tu-lieu-cong-khai.csv"
                className="px-4 py-2.5 bg-white border border-[#D6CEBE] text-[#35261C] text-xs font-semibold rounded-md hover:border-[#782F35] inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Tải xuống CSV (UTF-8 BOM)</span>
              </a>
            </div>
          </section>

          <section className="bg-white border border-[#E2DACB] rounded-lg p-6 space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#35261C]">
              Checklist kiểm kê &amp; Trạng thái nghiệm thu thực tế
            </h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#14532D] mt-0.5 shrink-0" />
                <span>
                  <strong>Cấu trúc 15 bản ghi &amp; tách cha–con:</strong> Đã
                  tách 13 di sản UNESCO (4 Thế giới, 9 Khu vực) khỏi 2 bản ghi
                  con (A01-00014, A01-00015). Trùng mã:{' '}
                  {publicValidation.duplicateIds.length}, thiếu trường bắt buộc:{' '}
                  {publicValidation.missingFields.length}.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#14532D] mt-0.5 shrink-0" />
                <span>
                  <strong>Nguồn tham chiếu:</strong> Có {sources.length} nguồn
                  (vượt mức tối thiểu 7 nguồn; tách riêng N08 là chuẩn DCMI).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#B39359] mt-0.5 shrink-0" />
                <span>
                  <strong>Tiêu chí chưa đạt — Đối chiếu &ge; 2 nguồn/hồ sơ:</strong>{' '}
                  Hiện mới có {recordsWith2Sources}/{publicRecords.length} hồ sơ
                  có từ 2 nguồn đối chiếu trở lên (còn thiếu ở 12 hồ sơ). Chưa
                  gán trạng thái đủ điều kiện nghiệm thu cuối cùng.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#B39359] mt-0.5 shrink-0" />
                <span>
                  <strong>Tiêu chí chưa đạt — Quyền ảnh &amp; Khảo sát thực địa:</strong>{' '}
                  Hiện có {recordsWithImages}/{publicRecords.length} hồ sơ có ảnh
                  được cấp phép; số đăng ký, tình trạng bản gốc và địa chỉ
                  xã/phường đang chờ xác minh trực tiếp.
                </span>
              </li>
            </ul>
          </section>
        </div>
      )}

      {/* Tab 2: Local-Only Draft Workspace */}
      {activeTab === 'local' && (
        <section className="bg-white border border-[#E2DACB] rounded-lg p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-bold text-[#35261C]">
              Công cụ kiểm tra &amp; biên tập nháp cục bộ (trình duyệt)
            </h2>
            <p className="text-xs text-[#5C534A]">
              Chế độ này chỉ chạy cục bộ trên trình duyệt của bạn, không chứa dữ
              liệu riêng tư và không ghi lên dữ liệu công khai của máy chủ.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="px-4 py-2 bg-[#F8F5EE] border border-[#D6CEBE] rounded-md text-xs font-semibold text-[#35261C] cursor-pointer hover:border-[#782F35] inline-flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span>Nhập tệp JSON để kiểm tra</span>
              <input
                type="file"
                accept="application/json,.json"
                onChange={handleLocalImportJson}
                className="sr-only"
              />
            </label>

            <button
              type="button"
              onClick={() => downloadLocalDrafts('json')}
              className="px-4 py-2 bg-white border border-[#D6CEBE] rounded-md text-xs font-semibold text-[#35261C] hover:border-[#782F35] inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Xuất bản nháp JSON</span>
            </button>

            <button
              type="button"
              onClick={() => downloadLocalDrafts('csv')}
              className="px-4 py-2 bg-white border border-[#D6CEBE] rounded-md text-xs font-semibold text-[#35261C] hover:border-[#782F35] inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Xuất bản nháp CSV BOM</span>
            </button>
          </div>

          {localMsg && (
            <p className="text-xs font-medium text-[#35261C] bg-[#F3EFE6] px-3 py-2 rounded">
              {localMsg}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-[#F8F5EE] border border-[#E2DACB] rounded">
              <span className="text-[#5C534A] block">Tổng bản ghi nháp</span>
              <strong className="text-lg font-serif text-[#35261C] tabular-nums">
                {localDrafts.length}
              </strong>
            </div>
            <div className="p-3 bg-[#F8F5EE] border border-[#E2DACB] rounded">
              <span className="text-[#5C534A] block">Mã định danh trùng</span>
              <strong className="text-lg font-serif text-[#782F35] tabular-nums">
                {localValidation.duplicateIds.length}
              </strong>
            </div>
            <div className="p-3 bg-[#F8F5EE] border border-[#E2DACB] rounded">
              <span className="text-[#5C534A] block">Lỗi thiếu trường bắt buộc</span>
              <strong className="text-lg font-serif text-[#782F35] tabular-nums">
                {localValidation.missingFields.length}
              </strong>
            </div>
          </div>

          {localValidation.missingFields.length > 0 && (
            <div className="p-4 bg-[#782F35]/5 border border-[#782F35]/30 rounded text-xs text-[#782F35] space-y-1">
              {localValidation.missingFields.slice(0, 10).map((issue, idx) => (
                <p key={idx}>
                  {issue.identifier}: {issue.message}
                </p>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab 3: Server-Authenticated Admin CRUD */}
      {activeTab === 'server' && (
        <section className="space-y-6">
          {!authToken ? (
            <div className="max-w-md bg-white border border-[#E2DACB] rounded-lg p-6 space-y-5">
              <div className="flex items-center gap-2 text-[#782F35]">
                <Lock className="w-5 h-5" />
                <h2 className="font-serif text-xl font-bold text-[#35261C]">
                  {authStatus?.needsSetup
                    ? 'Thiết lập mật khẩu quản trị lần đầu'
                    : 'Đăng nhập quản trị nội bộ'}
                </h2>
              </div>

              {authStatus?.needsSetup ? (
                <form onSubmit={handleBootstrap} className="space-y-4 text-sm">
                  <p className="text-xs text-[#5C534A] leading-relaxed">
                    Máy chủ chưa có biến môi trường <code>ADMIN_PASSWORD</code>.
                    Hãy tạo mật khẩu quản trị (tối thiểu 8 ký tự) để bảo vệ
                    thao tác thêm, sửa, xóa và duyệt công bố.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Mật khẩu quản trị mới
                    </label>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      minLength={8}
                      required
                      className="w-full px-3 py-2 border border-[#D6CEBE] rounded-md bg-[#F8F5EE]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Nhập lại mật khẩu
                    </label>
                    <input
                      type="password"
                      value={confirmSetupPassword}
                      onChange={(e) => setConfirmSetupPassword(e.target.value)}
                      minLength={8}
                      required
                      className="w-full px-3 py-2 border border-[#D6CEBE] rounded-md bg-[#F8F5EE]"
                    />
                  </div>
                  {authError && (
                    <p className="text-xs text-[#782F35] font-medium">
                      {authError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2.5 bg-[#35261C] text-[#F8F5EE] text-xs font-semibold rounded-md hover:bg-[#782F35]"
                  >
                    {authLoading ? 'Đang thiết lập...' : 'Tạo mật khẩu & Đăng nhập'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4 text-sm">
                  <p className="text-xs text-[#5C534A]">
                    Nhập mật khẩu quản trị viên đã cấu hình trên máy chủ. Phiên
                    làm việc được giữ an toàn trong bộ nhớ ứng dụng.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Mật khẩu quản trị
                    </label>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-[#D6CEBE] rounded-md bg-[#F8F5EE]"
                    />
                  </div>
                  {authError && (
                    <p className="text-xs text-[#782F35] font-medium">
                      {authError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2.5 bg-[#35261C] text-[#F8F5EE] text-xs font-semibold rounded-md hover:bg-[#782F35]"
                  >
                    {authLoading ? 'Đang xác thực...' : 'Đăng nhập'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F3EFE6] border border-[#E2DACB] rounded-lg p-4">
                <div className="text-xs text-[#35261C]">
                  <strong>Vai trò: Quản trị viên</strong> · Tổng số bản ghi trên
                  máy chủ: <strong className="tabular-nums">{serverRecords.length}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewRecord(true);
                      setEditingRecord(createEmptyRecord());
                      setServerError(null);
                    }}
                    className="px-3.5 py-2 bg-[#782F35] text-[#F8F5EE] text-xs font-semibold rounded-md inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm hồ sơ mới</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthToken(null);
                      setServerRecords([]);
                      setEditingRecord(null);
                    }}
                    className="px-3 py-2 bg-white border border-[#D6CEBE] text-[#35261C] text-xs font-medium rounded-md inline-flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>

              {serverError && (
                <div className="p-3 bg-[#782F35]/10 border border-[#782F35]/40 rounded text-xs text-[#782F35] font-medium">
                  {serverError}
                </div>
              )}
              {serverNotice && (
                <div className="p-3 bg-[#14532D]/10 border border-[#14532D]/30 rounded text-xs text-[#14532D] font-medium">
                  {serverNotice}
                </div>
              )}

              {/* Server Records Table */}
              <div className="bg-white border border-[#E2DACB] rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F3EFE6] border-b border-[#E2DACB] text-[#35261C]">
                      <th className="py-3 px-4 font-semibold">Mã</th>
                      <th className="py-3 px-4 font-semibold">Nhan đề</th>
                      <th className="py-3 px-4 font-semibold">Cấp</th>
                      <th className="py-3 px-4 font-semibold">Trạng thái công bố</th>
                      <th className="py-3 px-4 font-semibold">Kiểm chứng</th>
                      <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DACB]">
                    {serverRecords.map((r) => (
                      <tr key={r.Identifier} className="hover:bg-[#F8F5EE]/50">
                        <td className="py-3 px-4 font-semibold text-[#782F35] tabular-nums">
                          {r.Identifier}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#292524]">
                          <button
                            type="button"
                            onClick={() => onNavigate(`/tu-lieu/${r.Identifier}`)}
                            className="hover:underline text-left"
                          >
                            {r.Title}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-[#5C534A]">
                          {r.recognition_level}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#35261C]">
                          {r.publication_status}
                        </td>
                        <td className="py-3 px-4 text-[#5C534A]">
                          {r.verification.status}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setIsNewRecord(false);
                              setEditingRecord(structuredClone(r));
                              setServerError(null);
                            }}
                            className="text-[#782F35] font-semibold hover:underline"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(r)}
                            className="text-[#5C534A] hover:text-[#782F35] inline-flex items-center gap-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Editor Form */}
              {editingRecord && (
                <form
                  onSubmit={handleSaveRecord}
                  className="bg-white border border-[#B39359] rounded-lg p-6 space-y-5"
                >
                  <div className="flex items-center justify-between border-b border-[#E2DACB] pb-3">
                    <h3 className="font-serif text-lg font-bold text-[#35261C]">
                      {isNewRecord
                        ? 'Thêm hồ sơ tư liệu mới'
                        : `Chỉnh sửa hồ sơ ${editingRecord.Identifier}`}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingRecord(null)}
                      className="text-xs text-[#5C534A] hover:text-[#35261C]"
                    >
                      Hủy
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold mb-1">
                        Identifier (Mã định danh) *
                      </label>
                      <input
                        type="text"
                        required
                        disabled={!isNewRecord}
                        value={editingRecord.Identifier}
                        onChange={(e) =>
                          setEditingRecord({
                            ...editingRecord,
                            Identifier: e.target.value,
                          })
                        }
                        placeholder="Ví dụ: A01-00016"
                        className="w-full px-3 py-2 border border-[#D6CEBE] rounded bg-[#F8F5EE] disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">
                        Title (Nhan đề) *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingRecord.Title}
                        onChange={(e) =>
                          setEditingRecord({
                            ...editingRecord,
                            Title: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-[#D6CEBE] rounded bg-[#F8F5EE]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">
                        Trạng thái công bố
                      </label>
                      <select
                        value={editingRecord.publication_status}
                        onChange={(e) =>
                          setEditingRecord({
                            ...editingRecord,
                            publication_status: e.target.value as PublicationStatus,
                          })
                        }
                        className="w-full px-3 py-2 border border-[#D6CEBE] rounded bg-[#F8F5EE]"
                      >
                        <option value="Bản nháp">Bản nháp</option>
                        <option value="Chờ kiểm chứng">Chờ kiểm chứng</option>
                        <option value="Chờ quyền">Chờ quyền</option>
                        <option value="Được công bố">Được công bố</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">
                        Cấp ghi danh
                      </label>
                      <select
                        value={editingRecord.recognition_level}
                        onChange={(e) =>
                          setEditingRecord({
                            ...editingRecord,
                            recognition_level: e.target.value as RecognitionLevel,
                          })
                        }
                        className="w-full px-3 py-2 border border-[#D6CEBE] rounded bg-[#F8F5EE]"
                      >
                        <option value="Thế giới">Thế giới</option>
                        <option value="Khu vực">Khu vực</option>
                        <option value="Bản ghi con">Bản ghi con</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">
                        Năm ghi danh UNESCO (để trống nếu là bản ghi con)
                      </label>
                      <input
                        type="number"
                        value={editingRecord.recognition_year ?? ''}
                        onChange={(e) =>
                          setEditingRecord({
                            ...editingRecord,
                            recognition_year: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                        className="w-full px-3 py-2 border border-[#D6CEBE] rounded bg-[#F8F5EE]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">
                        Date (Niên đại tư liệu) *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingRecord.Date}
                        onChange={(e) =>
                          setEditingRecord({
                            ...editingRecord,
                            Date: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-[#D6CEBE] rounded bg-[#F8F5EE]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">
                        Loại bản hiển thị (display_copy)
                      </label>
                      <select
                        value={editingRecord.display_copy}
                        onChange={(e) =>
                          setEditingRecord({
                            ...editingRecord,
                            display_copy: e.target.value as DisplayCopyType,
                          })
                        }
                        className="w-full px-3 py-2 border border-[#D6CEBE] rounded bg-[#F8F5EE]"
                      >
                        <option value="Chưa có bản hiển thị">
                          Chưa có bản hiển thị
                        </option>
                        <option value="Bản gốc">Bản gốc</option>
                        <option value="Bản sao">Bản sao</option>
                        <option value="Bản số của gốc">Bản số của gốc</option>
                        <option value="Bản số của sao">Bản số của sao</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">
                        Mức kiểm chứng nội dung
                      </label>
                      <select
                        value={editingRecord.verification.status}
                        onChange={(e) =>
                          setEditingRecord({
                            ...editingRecord,
                            verification: {
                              ...editingRecord.verification,
                              status: e.target.value as VerificationStatus,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-[#D6CEBE] rounded bg-[#F8F5EE]"
                      >
                        <option value="Đã đối chiếu từ 2 nguồn">
                          Đã đối chiếu từ 2 nguồn
                        </option>
                        <option value="Chờ bổ sung nguồn thứ hai">
                          Chờ bổ sung nguồn thứ hai
                        </option>
                        <option value="Cần kiểm chứng trực tiếp">
                          Cần kiểm chứng trực tiếp
                        </option>
                        <option value="Chưa kiểm chứng">Chưa kiểm chứng</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block font-semibold mb-1">
                        Nơi lưu giữ hiện nay (current_location) *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingRecord.current_location}
                        onChange={(e) =>
                          setEditingRecord({
                            ...editingRecord,
                            current_location: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-[#D6CEBE] rounded bg-[#F8F5EE]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block font-semibold mb-1">
                        Source (Nguồn gốc, mã nguồn &amp; URL) *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingRecord.Source}
                        onChange={(e) =>
                          setEditingRecord({
                            ...editingRecord,
                            Source: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-[#D6CEBE] rounded bg-[#F8F5EE]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block font-semibold mb-1">
                        Description (Mô tả có căn cứ) *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={editingRecord.Description}
                        onChange={(e) =>
                          setEditingRecord({
                            ...editingRecord,
                            Description: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-[#D6CEBE] rounded bg-[#F8F5EE]"
                      />
                    </div>
                  </div>

                  {/* Attach Permitted Image Box */}
                  <div className="p-4 bg-[#F8F5EE] border border-[#E2DACB] rounded space-y-3 text-xs">
                    <p className="font-semibold text-[#35261C]">
                      Đính kèm ảnh có quyền xác nhận (hiện có:{' '}
                      {editingRecord.images?.length || 0} ảnh)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="url"
                        value={newImgUrl}
                        onChange={(e) => setNewImgUrl(e.target.value)}
                        placeholder="URL ảnh (https://...)"
                        className="px-2.5 py-1.5 border border-[#D6CEBE] rounded bg-white"
                      />
                      <input
                        type="text"
                        value={newImgCaption}
                        onChange={(e) => setNewImgCaption(e.target.value)}
                        placeholder="Chú thích ảnh"
                        className="px-2.5 py-1.5 border border-[#D6CEBE] rounded bg-white"
                      />
                      <input
                        type="url"
                        value={newImgSourceUrl}
                        onChange={(e) => setNewImgSourceUrl(e.target.value)}
                        placeholder="URL nguồn gốc"
                        className="px-2.5 py-1.5 border border-[#D6CEBE] rounded bg-white"
                      />
                      <input
                        type="text"
                        value={newImgRights}
                        onChange={(e) => setNewImgRights(e.target.value)}
                        placeholder="Giấy phép / Văn bản quyền"
                        className="px-2.5 py-1.5 border border-[#D6CEBE] rounded bg-white"
                      />
                      <input
                        type="text"
                        value={newImgCredit}
                        onChange={(e) => setNewImgCredit(e.target.value)}
                        placeholder="Ghi công đơn vị/tác giả"
                        className="px-2.5 py-1.5 border border-[#D6CEBE] rounded bg-white sm:col-span-2"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAttachPermittedImage}
                      className="px-3 py-1.5 bg-white border border-[#D6CEBE] rounded font-semibold text-[#35261C] hover:border-[#782F35]"
                    >
                      + Thêm ảnh vào hồ sơ
                    </button>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingRecord(null)}
                      className="px-4 py-2 bg-white border border-[#D6CEBE] text-xs font-medium rounded-md"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#782F35] text-[#F8F5EE] text-xs font-semibold rounded-md"
                    >
                      Lưu vào máy chủ
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Xác nhận xóa hồ sơ"
        >
          <div className="bg-[#F8F5EE] border border-[#D6CEBE] rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#35261C]">
              Xác nhận xóa hồ sơ {deleteTarget.Identifier}
            </h3>
            <p className="text-sm text-[#5C534A]">
              Bạn có chắc chắn muốn xóa hồ sơ{' '}
              <strong>{deleteTarget.Title}</strong> khỏi dữ liệu máy chủ không?
              Thao tác này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-medium bg-white border border-[#D6CEBE] rounded-md"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold bg-[#782F35] text-[#F8F5EE] rounded-md"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
