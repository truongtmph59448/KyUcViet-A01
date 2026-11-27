import type { CatalogStats, HeritageRecord, SourceRecord } from '../types.ts';

export function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function isSafeHttpUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function computeCatalogStats(records: HeritageRecord[]): CatalogStats {
  const published = records.filter((r) => r.publication_status === 'Được công bố');
  const unescoRecords = published.filter(
    (r) => r.parent_id === null && r.recognition_level !== 'Bản ghi con'
  );
  const childRecords = published.filter(
    (r) => r.parent_id !== null || r.recognition_level === 'Bản ghi con'
  );
  const worldCount = unescoRecords.filter(
    (r) => r.recognition_level === 'Thế giới'
  ).length;
  const regionalCount = unescoRecords.filter(
    (r) => r.recognition_level === 'Khu vực'
  ).length;

  const recordsWith2PlusSources = published.filter((r) => {
    const verificationSources = r.source_ids.filter((id) => id !== 'N08');
    return verificationSources.length >= 2;
  }).length;

  const recordsWithPermittedImages = published.filter(
    (r) => Array.isArray(r.images) && r.images.length > 0
  ).length;

  return {
    unesco_total: unescoRecords.length,
    world_count: worldCount,
    regional_count: regionalCount,
    child_count: childRecords.length,
    catalog_total: published.length,
    records_with_2plus_sources: recordsWith2PlusSources,
    records_awaiting_second_source: published.length - recordsWith2PlusSources,
    records_with_permitted_images: recordsWithPermittedImages,
  };
}

export function getVerificationBadgeInfo(
  record: HeritageRecord,
  sources: SourceRecord[]
): {
  tone: 'green' | 'amber' | 'gray';
  label: string;
  detail: string;
} {
  const artifactSources = record.source_ids.filter((id) => {
    const src = sources.find((s) => s.source_id === id);
    return src ? !src.is_metadata_standard_only : id !== 'N08';
  });

  if (
    record.verification.status === 'Đã đối chiếu từ 2 nguồn' &&
    artifactSources.length >= 2
  ) {
    return {
      tone: 'green',
      label: 'Đã đối chiếu >= 2 nguồn',
      detail: record.verification.source_sufficiency,
    };
  }

  if (
    record.verification.status === 'Chờ bổ sung nguồn thứ hai' ||
    artifactSources.length < 2
  ) {
    return {
      tone: 'amber',
      label: 'Chờ bổ sung nguồn thứ hai',
      detail: record.verification.source_sufficiency,
    };
  }

  return {
    tone: 'gray',
    label: record.verification.status || 'Chưa kiểm chứng',
    detail: record.verification.source_sufficiency,
  };
}

export interface ValidationIssue {
  identifier: string;
  field: string;
  message: string;
}

const REQUIRED_DUBLIN_CORE_KEYS: Array<keyof HeritageRecord> = [
  'Title',
  'Creator',
  'Subject',
  'Description',
  'Publisher',
  'Contributor',
  'Date',
  'Type',
  'Format',
  'Identifier',
  'Source',
  'Language',
  'Relation',
  'Coverage',
  'Rights',
  'current_location',
  'historical_location',
  'display_copy',
  'original_condition',
  'registration_no',
  'excluded_content',
];

export function validateRecordsDataset(records: HeritageRecord[]): {
  duplicateIds: string[];
  missingFields: ValidationIssue[];
} {
  const seen = new Set<string>();
  const duplicateIds: string[] = [];
  const missingFields: ValidationIssue[] = [];

  for (const record of records) {
    const id = (record.Identifier || '').trim();
    if (!id) {
      missingFields.push({
        identifier: '(Thiếu mã)',
        field: 'Identifier',
        message: 'Thiếu mã định danh duy nhất (Identifier)',
      });
    } else if (seen.has(id)) {
      if (!duplicateIds.includes(id)) duplicateIds.push(id);
    } else {
      seen.add(id);
    }

    for (const key of REQUIRED_DUBLIN_CORE_KEYS) {
      const value = record[key];
      const isEmpty =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0);
      if (isEmpty) {
        missingFields.push({
          identifier: id || '(Không mã)',
          field: String(key),
          message: `Thiếu trường bắt buộc: ${String(key)}`,
        });
      }
    }

    if (record.images && record.images.length > 0) {
      for (const img of record.images) {
        if (!img.rights || !img.caption || !img.source_url) {
          missingFields.push({
            identifier: id || '(Không mã)',
            field: 'images',
            message: 'Ảnh đính kèm thiếu chú thích, nguồn hoặc thông tin quyền sử dụng',
          });
        }
      }
    }
  }

  return { duplicateIds, missingFields };
}

export function sanitizePublicRecord(record: HeritageRecord): HeritageRecord {
  return {
    ...record,
    excluded_content:
      'Thông tin chi tiết thuộc diện hạn chế đã được ẩn khỏi bản công khai.',
  };
}

export function buildCsvWithUtf8Bom(records: HeritageRecord[]): string {
  const headers = [
    'Identifier',
    'Title',
    'recognition_level',
    'recognition_year',
    'parent_id',
    'Date',
    'Creator',
    'Subject',
    'Type',
    'Format',
    'Language',
    'current_location',
    'historical_location',
    'display_copy',
    'original_condition',
    'registration_no',
    'source_ids',
    'Source',
    'verification_status',
    'publication_status',
    'Rights',
    'updated_at',
  ];

  const escapeCell = (val: unknown): string => {
    const str = Array.isArray(val) ? val.join('; ') : String(val ?? '');
    const neutralized = /^[=+\-@]/.test(str) ? `'${str}` : str;
    return `"${neutralized.replace(/"/g, '""')}"`;
  };

  const rows = records.map((r) => [
    r.Identifier,
    r.Title,
    r.recognition_level,
    r.recognition_year ?? '—',
    r.parent_id ?? '',
    r.Date,
    r.Creator,
    r.Subject,
    r.Type,
    r.Format,
    r.Language,
    r.current_location,
    r.historical_location,
    r.display_copy,
    r.original_condition,
    r.registration_no,
    r.source_ids,
    r.Source,
    r.verification?.status ?? '',
    r.publication_status,
    r.Rights,
    r.updated_at,
  ]);

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];

  return '\uFEFF' + lines.join('\r\n');
}
