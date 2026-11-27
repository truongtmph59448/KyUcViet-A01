import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import type { HeritageRecord, SourceRecord } from '../types.ts';
import { getVerificationBadgeInfo } from '../utils/catalog.ts';

interface VerificationBadgeProps {
  record: HeritageRecord;
  sources: SourceRecord[];
  showDetail?: boolean;
}

export function VerificationBadge({
  record,
  sources,
  showDetail = false,
}: VerificationBadgeProps) {
  const info = getVerificationBadgeInfo(record, sources);

  const toneClasses =
    info.tone === 'green'
      ? 'bg-[#14532D]/10 text-[#14532D] border-[#14532D]/25'
      : info.tone === 'amber'
      ? 'bg-[#B39359]/15 text-[#6D5221] border-[#B39359]/40'
      : 'bg-[#292524]/8 text-[#5C534A] border-[#292524]/20';

  const Icon =
    info.tone === 'green'
      ? CheckCircle2
      : info.tone === 'amber'
      ? Clock
      : AlertCircle;

  return (
    <div className="inline-flex flex-col gap-1">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-md w-fit whitespace-nowrap ${toneClasses}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{info.label}</span>
      </span>
      {showDetail && info.detail && (
        <span className="text-xs text-[#5C534A] leading-snug">{info.detail}</span>
      )}
    </div>
  );
}
