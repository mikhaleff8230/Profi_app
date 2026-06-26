import Card from '@/components/common/card';

export function ProffiPageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <Card className="mb-8">
      <h1 className="text-lg font-semibold text-heading">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-body">{subtitle}</p> : null}
    </Card>
  );
}

export function ProffiError({ message }: { message: string }) {
  return (
    <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function StatusBadge({ value }: { value?: string | null }) {
  const isGood = value === 'open' || value === 'accepted' || value === 'in_progress';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isGood ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
      }`}
    >
      {value || '-'}
    </span>
  );
}

export function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ru-RU');
}
