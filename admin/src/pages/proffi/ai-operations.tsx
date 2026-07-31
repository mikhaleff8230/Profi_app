import Layout from '@/components/layouts/admin';
import { ProffiError, ProffiPageHeader, formatDate } from '@/components/proffi-admin/common';
import { getProffiAdmin, postProffiAdmin, putProffiAdmin } from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useState } from 'react';

type Analytics = {
  drafts_total: number;
  drafts_published: number;
  completion_rate: number;
  manual_fallback_rate: number;
  correction_rate: number;
  average_questions: number;
  average_ai_calls: number;
  average_cost_usd: number;
  total_cost_usd: number;
  projected_cost_1000_usd: number;
  average_latency_ms: number;
  unrecognized_count: number;
  multi_intent_count: number;
  learning_queue: number;
  training_examples: number;
};

type LearningEvent = {
  id: number;
  event_type: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  redacted_evidence?: string | null;
  weight: number;
  status: string;
  created_at: string;
};

const labels: Record<string, string> = {
  classification_confirmed: 'Классификация подтверждена',
  classification_corrected: 'Классификация исправлена',
  manual_fallback: 'Ручной режим',
  unrecognized_text: 'Не распознано',
  multi_intent_split: 'Несколько услуг',
  question_skipped: 'Вопрос пропущен',
};

function Metric({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded border border-border-200 bg-light p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-body">{title}</div>
      <div className="mt-2 text-2xl font-bold text-heading">{value}</div>
      {hint && <div className="mt-1 text-xs text-body">{hint}</div>}
    </div>
  );
}

export default function AiOperationsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [events, setEvents] = useState<LearningEvent[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  function load() {
    Promise.all([
      getProffiAdmin<Analytics>('/api/admin/ai-operations/analytics?days=30'),
      getProffiAdmin<{ data: LearningEvent[] }>('/api/admin/ai-operations/learning-events?status=new&limit=50'),
    ])
      .then(([metrics, queue]) => {
        setAnalytics(metrics);
        setEvents(queue.data);
      })
      .catch((caught) => setError(caught.response?.data?.message || caught.message));
  }

  useEffect(load, []);

  async function promote(id: number) {
    setBusyId(id);
    setError('');
    try {
      await postProffiAdmin(`/api/admin/ai-operations/learning-events/${id}/promote`, {});
      load();
    } catch (caught: any) {
      setError(caught.response?.data?.message || caught.message);
    } finally {
      setBusyId(null);
    }
  }

  async function ignore(id: number) {
    setBusyId(id);
    await putProffiAdmin(`/api/admin/ai-operations/learning-events/${id}`, { status: 'ignored' });
    setBusyId(null);
    load();
  }

  return (
    <>
      <ProffiPageHeader
        title="AI: качество, стоимость и обучение"
        subtitle="Заявки создают сигналы обучения, но ничего не меняют автоматически: примеры попадают в датасет только после проверки."
      />
      {error ? <ProffiError message={error} /> : null}

      {analytics && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric title="Завершение" value={`${(analytics.completion_rate * 100).toFixed(1)}%`} hint={`${analytics.drafts_published} из ${analytics.drafts_total} черновиков`} />
          <Metric title="Средняя стоимость" value={`$${analytics.average_cost_usd.toFixed(4)}`} hint={`Прогноз на 1 000: $${analytics.projected_cost_1000_usd.toFixed(2)}`} />
          <Metric title="Уточнений" value={analytics.average_questions.toFixed(1)} hint={`${analytics.average_ai_calls.toFixed(1)} AI-вызова на заявку`} />
          <Metric title="Исправления AI" value={`${(analytics.correction_rate * 100).toFixed(1)}%`} hint={`Ручной fallback: ${(analytics.manual_fallback_rate * 100).toFixed(1)}%`} />
          <Metric title="Стоимость за 30 дней" value={`$${analytics.total_cost_usd.toFixed(4)}`} />
          <Metric title="Средняя задержка" value={`${analytics.average_latency_ms} мс`} />
          <Metric title="Не распознано" value={String(analytics.unrecognized_count)} hint={`Несколько услуг: ${analytics.multi_intent_count}`} />
          <Metric title="Очередь обучения" value={String(analytics.learning_queue)} hint={`Примеров в датасете: ${analytics.training_examples}`} />
        </div>
      )}

      <section className="mt-7 overflow-hidden rounded border border-border-200 bg-light">
        <div className="border-b border-border-100 p-5">
          <h2 className="text-lg font-semibold text-heading">Новые сигналы обучения</h2>
          <p className="mt-1 text-sm text-body">Проверяйте исправления и подтверждения. «В датасет» создаёт версионируемый обезличенный пример.</p>
        </div>
        <div className="divide-y divide-border-100">
          {events.map((event) => (
            <article key={event.id} className="grid gap-4 p-5 lg:grid-cols-[180px_minmax(0,1fr)_220px]">
              <div>
                <div className="font-semibold text-heading">{labels[event.event_type] || event.event_type}</div>
                <div className="mt-1 text-xs text-body">{formatDate(event.created_at)}</div>
                <div className="mt-1 text-xs text-body">Вес: {event.weight}</div>
              </div>
              <div>
                <p className="text-sm text-heading">{event.redacted_evidence || 'Текст не сохранён'}</p>
                <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-body">
                  {JSON.stringify({ before: event.before, after: event.after }, null, 2)}
                </pre>
              </div>
              <div className="flex items-start gap-2 lg:justify-end">
                <button
                  disabled={busyId === event.id || !event.redacted_evidence || !event.after}
                  onClick={() => promote(event.id)}
                  className="rounded bg-accent px-3 py-2 text-sm font-semibold text-light disabled:opacity-40"
                >
                  В датасет
                </button>
                <button disabled={busyId === event.id} onClick={() => ignore(event.id)} className="rounded bg-gray-100 px-3 py-2 text-sm font-semibold">
                  Игнорировать
                </button>
              </div>
            </article>
          ))}
          {!events.length && <p className="p-8 text-center text-sm text-body">Очередь разобрана.</p>}
        </div>
      </section>
    </>
  );
}

AiOperationsPage.authenticate = { permissions: adminOnly };
AiOperationsPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
