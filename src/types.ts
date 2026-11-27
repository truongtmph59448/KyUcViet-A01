export type RecognitionLevel = 'Thế giới' | 'Khu vực' | 'Bản ghi con';

export type DisplayCopyType =
  | 'Chưa có bản hiển thị'
  | 'Bản gốc'
  | 'Bản sao'
  | 'Bản số của gốc'
  | 'Bản số của sao';

export type PublicationStatus =
  | 'Bản nháp'
  | 'Chờ kiểm chứng'
  | 'Chờ quyền'
  | 'Được công bố';

export type VerificationStatus =
  | 'Đã đối chiếu từ 2 nguồn'
  | 'Chờ bổ sung nguồn thứ hai'
  | 'Cần kiểm chứng trực tiếp'
  | 'Chưa kiểm chứng';

export interface ArchivalImage {
  url: string;
  caption: string;
  source_url: string;
  rights: string;
  credit: string;
}

export interface PermissionInfo {
  granted_by: string;
  role: string;
  agreed_date: string;
  scope: string;
}

export interface VerificationInfo {
  status: VerificationStatus;
  transcription_level: string;
  translation_level: string;
  verified_by: string;
  source_sufficiency: string;
}

export interface HeritageRecord {
  // 15 Dublin Core Elements
  Title: string;
  Creator: string;
  Subject: string[];
  Description: string;
  Publisher: string;
  Contributor: string;
  Date: string;
  Type: string;
  Format: string;
  Identifier: string;
  Source: string;
  Language: string;
  Relation: string;
  Coverage: string;
  Rights: string;

  // Extended Archival Fields
  current_location: string;
  historical_location: string;
  display_copy: DisplayCopyType;
  original_condition: string;
  registration_no: string;
  permission: PermissionInfo;
  excluded_content: string;
  verification: VerificationInfo;

  // Additional Schema Fields
  recognition_year: number | null;
  recognition_level: RecognitionLevel;
  parent_id: string | null;
  images: ArchivalImage[];
  digitized_by: string;
  digitized_at: string;
  transcription: string;
  translation: string;
  verification_by: string;
  verification_date: string;
  source_ids: string[];
  unknown_notes: string;
  publication_status: PublicationStatus;
  updated_at: string;
}

export interface SourceRecord {
  source_id: string;
  title: string;
  organization: string;
  url: string;
  accessed_at: string;
  url_check_status: string;
  scope: string;
  image_rights: string;
  is_official: boolean;
  is_metadata_standard_only: boolean;
  permission_credit: {
    person_or_unit: string;
    role: string;
    agreed_date: string;
    scope: string;
  };
}

export interface CatalogStats {
  unesco_total: number;
  world_count: number;
  regional_count: number;
  child_count: number;
  catalog_total: number;
  records_with_2plus_sources: number;
  records_awaiting_second_source: number;
  records_with_permitted_images: number;
}
