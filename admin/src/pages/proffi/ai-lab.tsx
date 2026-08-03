import Layout from '@/components/layouts/admin';
import { ProffiError, ProffiPageHeader } from '@/components/proffi-admin/common';
import {
  AiKnowledgeImport,
  AiKnowledgeProposal,
  AiKnowledgeRetrieval,
  AiKnowledgeTerm,
  AiKnowledgeVersion,
  LaravelPaginator,
  getProffiAdmin,
  postProffiAdmin,
} from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

const exampleText = `течет бачок
подтекает унитаз снизу
ремонт слива унитаза
замена арматуры бачка
не набирается вода в бачок`;

const statusLabels: Record<string, string> = {
  uploaded: 'Загружен',
  queued: 'В очереди',
  analyzing: 'Анализируется',
  review: 'Нужна проверка',
  completed: 'Завершён',
  failed: 'Ошибка',
  cancelled: 'Отменён',
};

const proposalLabels: Record<string, string> = {
  add_alias: 'Добавить синоним',
  add_negative_alias: 'Исключающая фраза',
  create_term: 'Создать термин',
  link_term: 'Связать термин',
  create_category: 'Создать категорию',
  create_service: 'Создать работу',
  create_question: 'Создать вопрос',
  create_option: 'Создать вариант',
  create_rule: 'Создать правило',
  merge_entities: 'Объединить',
  mark_irrelevant: 'Нерелевантное',
};

const modeDescriptions: Record<string, string> = {
  catalog: 'Создаёт категории и работы. Синонимы новой работы сохраняются вместе с ней.',
  questions: 'Создаёт вопросы и варианты ответов для уже существующих работ.',
  full_analysis: 'Разбирает материал целиком: работы, формулировки и связанные вопросы одним пакетом.',
};

const payloadLabels: Record<string, string> = {
  title: 'Название',
  aliases: 'Синонимы',
  category_id: 'Категория',
  work_id: 'Работа',
  service_id: 'Работа',
  question: 'Вопрос',
  type: 'Тип',
  options: 'Варианты ответа',
  relation: 'Связь',
  term: 'Термин',
};

function fieldClass() {
  return 'w-full rounded-xl border border-border-200 bg-white px-4 py-3 text-sm text-heading outline-none transition focus:border-accent';
}

function tone(status: string) {
  if (status === 'failed' || status === 'rejected') return 'bg-red-50 text-red-700';
  if (status === 'accepted' || status === 'completed' || status === 'published') return 'bg-green-50 text-green-700';
  if (status === 'analyzing' || status === 'queued' || status === 'testing') return 'bg-blue-50 text-blue-700';
  return 'bg-gray-100 text-gray-700';
}

export default function AiKnowledgeLabPage() {
  const [text, setText] = useState(exampleText);
  const [sourceName, setSourceName] = useState('Ключевые фразы');
  const [sourceType, setSourceType] = useState('manual_text');
  const [region, setRegion] = useState('Москва');
  const [categoryHint, setCategoryHint] = useState('');
  const [mode, setMode] = useState('catalog');
  const [costLimit, setCostLimit] = useState('2');
  const [imports, setImports] = useState<AiKnowledgeImport[]>([]);
  const [proposals, setProposals] = useState<AiKnowledgeProposal[]>([]);
  const [terms, setTerms] = useState<AiKnowledgeTerm[]>([]);
  const [termsTotal, setTermsTotal] = useState(0);
  const [termsPage, setTermsPage] = useState(1);
  const [termsLastPage, setTermsLastPage] = useState(1);
  const [termSearch, setTermSearch] = useState('');
  const [showDictionary, setShowDictionary] = useState(false);
  const [showProposalArchive, setShowProposalArchive] = useState(false);
  const [versions, setVersions] = useState<AiKnowledgeVersion[]>([]);
  const [retrievalText, setRetrievalText] = useState('течет бачок');
  const [retrieval, setRetrieval] = useState<AiKnowledgeRetrieval | null>(null);
  const [versionAction, setVersionAction] = useState<number | null>(null);
  const [selectedImport, setSelectedImport] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const proposalStatus = showProposalArchive ? '' : '&exclude_statuses=rejected,superseded,published';
      const [importsPage, proposalsPage, termsResult, versionsList] = await Promise.all([
        getProffiAdmin<LaravelPaginator<AiKnowledgeImport>>('/api/admin/ai-lab/imports?limit=50'),
        getProffiAdmin<LaravelPaginator<AiKnowledgeProposal>>(
          `/api/admin/ai-lab/proposals?limit=100${selectedImport ? `&import_id=${selectedImport}` : ''}${proposalStatus}`,
        ),
        getProffiAdmin<LaravelPaginator<AiKnowledgeTerm>>(
          `/api/admin/ai-lab/terms?limit=25&page=${termsPage}${termSearch.trim() ? `&search=${encodeURIComponent(termSearch.trim())}` : ''}`,
        ),
        getProffiAdmin<AiKnowledgeVersion[]>('/api/admin/ai-lab/versions'),
      ]);
      setImports(importsPage.data || []);
      setProposals(proposalsPage.data || []);
      setTerms(termsResult.data || []);
      setTermsTotal(termsResult.total || 0);
      setTermsLastPage(termsResult.last_page || 1);
      setVersions(versionsList || []);
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Не удалось загрузить лабораторию.');
    }
  }, [selectedImport, showProposalArchive, termSearch, termsPage]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasActiveImports = useMemo(
    () => imports.some((item) => item.status === 'queued' || item.status === 'analyzing'),
    [imports],
  );

  useEffect(() => {
    if (!hasActiveImports) return undefined;
    const timer = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(timer);
  }, [hasActiveImports, load]);

  async function createImport(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const created = await postProffiAdmin<AiKnowledgeImport>('/api/admin/ai-lab/imports', {
        source_name: sourceName,
        source_type: sourceType,
        text,
        mode,
        region: region || null,
        category_hint: categoryHint || null,
        cost_limit_usd: Number(costLimit) || 2,
        auto_analyze: false,
      });
      setSelectedImport(created.id);
      await postProffiAdmin(`/api/admin/ai-lab/imports/${created.id}/analyze`, {});
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Не удалось создать импорт.');
    } finally {
      setLoading(false);
    }
  }

  async function analyze(id: number) {
    setError('');
    try {
      await postProffiAdmin(`/api/admin/ai-lab/imports/${id}/analyze`, {});
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message || e.message);
    }
  }

  async function review(proposal: AiKnowledgeProposal, action: 'accept' | 'reject') {
    const note =
      action === 'reject'
        ? window.prompt('Почему предложение отклонено? Эти данные улучшат следующие запуски.')
        : null;
    if (action === 'reject' && !note?.trim()) return;

    setError('');
    try {
      await postProffiAdmin(`/api/admin/ai-lab/proposals/${proposal.id}/${action}`, {
        review_note: note || null,
      });
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message || e.message);
    }
  }

  async function acceptAllVisible() {
    const proposalIds = proposals
      .filter((proposal) => proposal.status === 'generated' || proposal.status === 'needs_clarification')
      .map((proposal) => proposal.id);
    if (!proposalIds.length || !window.confirm(`Принять ${proposalIds.length} предложений в черновик?`)) return;

    setError('');
    setBulkLoading(true);
    try {
      await postProffiAdmin('/api/admin/ai-lab/proposals/bulk-review', {
        proposal_ids: proposalIds,
        action: 'accept',
      });
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Не удалось принять предложения.');
    } finally {
      setBulkLoading(false);
    }
  }

  async function runRetrieval(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const result = await postProffiAdmin<AiKnowledgeRetrieval>('/api/admin/ai-lab/retrieve', {
        text: retrievalText,
        include_draft: true,
        limit: 10,
      });
      setRetrieval(result);
    } catch (e: any) {
      setError(e.response?.data?.message || e.message);
    }
  }

  async function versionCommand(version: AiKnowledgeVersion, action: 'evaluate' | 'publish' | 'rollback') {
    setVersionAction(version.id);
    setError('');
    try {
      await postProffiAdmin(`/api/admin/ai-lab/versions/${version.id}/${action}`, {});
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setVersionAction(null);
    }
  }

  const reviewableCount = useMemo(
    () => proposals.filter((proposal) => proposal.status === 'generated' || proposal.status === 'needs_clarification').length,
    [proposals],
  );

  const proposalGroups = useMemo(() => {
    const groups = new Map<string, { title: string; items: AiKnowledgeProposal[] }>();
    proposals.forEach((proposal) => {
      const workId = proposal.target_type === 'service'
        ? proposal.target_id
        : proposal.payload?.work_id || proposal.payload?.service_id;
      const key = workId ? `work-${workId}` : `proposal-${proposal.id}`;
      const title = workId ? `Работа #${workId}` : proposal.title;
      const group = groups.get(key) || { title, items: [] };
      group.items.push(proposal);
      groups.set(key, group);
    });
    return Array.from(groups.values());
  }, [proposals]);

  return (
    <>
      <ProffiPageHeader
        title="AI Лаборатория знаний"
        subtitle="Загружайте ключевые фразы и экспертные заметки. AI создаёт предложения, но ничего не публикует без вашей проверки."
      />

      {error ? <ProffiError message={error} /> : null}

      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)]">
        <form onSubmit={createImport} className="rounded-2xl border border-border-200 bg-light p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-heading">Добавить знания</h2>
            <p className="mt-1 text-sm leading-6 text-body">
              Одна фраза на строку. Также поддерживаются строки Wordstat: фраза;частотность;регион;период.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-semibold uppercase text-body">Название источника</span>
              <input className={fieldClass()} value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold uppercase text-body">Источник</span>
              <select className={fieldClass()} value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                <option value="manual_text">Текст</option>
                <option value="wordstat">Wordstat</option>
                <option value="operator">Эксперт/оператор</option>
                <option value="external">Другой источник</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold uppercase text-body">Что нужно сделать</span>
              <select className={fieldClass()} value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="catalog">Добавить работы</option>
                <option value="questions">Добавить вопросы к работам</option>
                <option value="full_analysis">Разобрать список целиком</option>
              </select>
              <span className="mt-2 block text-xs leading-5 text-body">{modeDescriptions[mode]}</span>
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold uppercase text-body">Категория-подсказка</span>
              <input className={fieldClass()} value={categoryHint} onChange={(e) => setCategoryHint(e.target.value)} placeholder="Необязательно" />
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold uppercase text-body">Регион</span>
              <input className={fieldClass()} value={region} onChange={(e) => setRegion(e.target.value)} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold uppercase text-body">Лимит стоимости, $</span>
              <input className={fieldClass()} type="number" min="0.01" step="0.01" value={costLimit} onChange={(e) => setCostLimit(e.target.value)} />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-semibold uppercase text-body">Материал для обучения</span>
            <textarea
              className={`${fieldClass()} min-h-[280px] font-mono leading-6`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
          </label>

          <div className="mt-5 rounded-xl bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
            Результат попадёт в очередь предложений. Каталог и активный AI-диалог не изменятся автоматически.
          </div>

          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="mt-5 w-full rounded-xl bg-accent px-5 py-3 font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? 'Создаю и запускаю…' : 'Проанализировать'}
          </button>
        </form>

        <section className="rounded-2xl border border-border-200 bg-light p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-heading">Импорты</h2>
              <p className="mt-1 text-sm text-body">Нажмите на импорт, чтобы отфильтровать предложения.</p>
            </div>
            {selectedImport ? (
              <button className="text-sm font-semibold text-accent" onClick={() => setSelectedImport(null)}>
                Показать все
              </button>
            ) : null}
          </div>

          <div className="space-y-3">
            {imports.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedImport(item.id)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selectedImport === item.id ? 'border-accent bg-accent/5' : 'border-border-200 hover:border-gray-400'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-heading">{item.source?.name || `Импорт #${item.id}`}</div>
                    <div className="mt-1 text-xs text-body">
                      {item.rows_unique} уникальных из {item.rows_total} · {item.proposals_count ?? item.proposals_total} предложений
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>
                    {statusLabels[item.status] || item.status}
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${item.progress || 0}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-body">
                  <span>{item.progress || 0}%</span>
                  <span>${Number(item.actual_cost_usd || 0).toFixed(4)} / ${Number(item.cost_limit_usd || 0).toFixed(2)}</span>
                </div>

                {(item.status === 'uploaded' || item.status === 'failed') ? (
                  <span
                    role="button"
                    tabIndex={0}
                    className="mt-3 inline-flex rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white"
                    onClick={(event) => {
                      event.stopPropagation();
                      void analyze(item.id);
                    }}
                  >
                    {item.status === 'failed' ? 'Повторить' : 'Запустить'}
                  </span>
                ) : null}
                {item.error?.message ? <div className="mt-2 text-xs text-red-600">{item.error.message}</div> : null}
              </button>
            ))}

            {!imports.length ? <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-body">Импортов пока нет.</div> : null}
          </div>
        </section>
      </div>

      <section className="min-w-0 rounded-2xl border border-border-200 bg-light p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-lg font-semibold text-heading">Пакет предложений</h2>
            <p className="mt-1 text-sm text-body">
              Предложения собраны по связанным работам. Принятые изменения сначала попадут в черновик.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowProposalArchive((value) => !value)}
              className="rounded-lg border border-border-200 px-4 py-2 text-xs font-semibold text-heading"
            >
              {showProposalArchive ? 'Скрыть архив' : 'Показать архив'}
            </button>
            {reviewableCount ? (
              <button
                type="button"
                disabled={bulkLoading}
                onClick={() => void acceptAllVisible()}
                className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {bulkLoading ? 'Принимаю…' : `Принять всё (${reviewableCount})`}
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          {proposalGroups.map((group) => (
            <article key={`${group.title}-${group.items[0]?.id}`} className="min-w-0 rounded-xl border border-border-200 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-semibold text-heading">{group.title}</h3>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-body">
                  {group.items.length} {group.items.length === 1 ? 'изменение' : 'изменения'}
                </span>
              </div>
              <div className="divide-y divide-border-200">
                {group.items.map((proposal) => (
                  <div key={proposal.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold">
                        {proposalLabels[proposal.proposal_type] || proposal.proposal_type}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone(proposal.status)}`}>
                        {proposal.status}
                      </span>
                      <span className="ml-auto text-xs font-semibold text-body">
                        уверенность {Math.round(Number(proposal.confidence || 0) * 100)}%
                      </span>
                    </div>
                    <div className="mt-3 font-semibold text-heading">{proposal.title}</div>
                    {Object.keys(proposal.payload || {}).length ? (
                      <dl className="mt-3 grid gap-2 rounded-lg bg-gray-50 p-3 text-xs leading-5 sm:grid-cols-2">
                        {Object.entries(proposal.payload).slice(0, 8).map(([key, value]) => (
                          <div key={key} className="min-w-0">
                            <dt className="font-semibold text-body">{payloadLabels[key] || key.split('_').join(' ')}</dt>
                            <dd className="break-words text-heading">
                              {Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    {proposal.evidence?.length ? (
                      <div className="mt-3 text-xs leading-5 text-body">
                        Основание: {proposal.evidence.slice(0, 3).map((item) => item.text).filter(Boolean).join(' · ')}
                      </div>
                    ) : null}
                    {proposal.status === 'generated' || proposal.status === 'needs_clarification' ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={() => void review(proposal, 'accept')} className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white">
                          Принять
                        </button>
                        <button onClick={() => void review(proposal, 'reject')} className="rounded-lg bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
                          Отклонить
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
        {!proposals.length ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-body">
            После анализа здесь появятся предложения по терминам, работам и вопросам.
          </div>
        ) : null}
      </section>

      <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-border-200 bg-light p-4 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-heading">Версии знаний</h2>
            <p className="mt-1 text-sm leading-6 text-body">
              Принятые предложения находятся в черновике. Перед публикацией backend проверяет ссылки и критические риски.
            </p>
          </div>
          <div className="space-y-3">
            {versions.map((version) => (
              <article key={version.id} className="rounded-xl border border-border-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-heading">{version.version}</div>
                    <div className="mt-1 text-xs text-body">
                      {version.terms_count || 0} терминов · {version.documents_count || 0} документов ·{' '}
                      {version.proposals_count || 0} предложений
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone(version.status)}`}>
                    {version.status}
                  </span>
                </div>
                {version.metrics ? (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs leading-5 text-body">
                    Ссылок: {version.metrics.links || 0} · Некорректных ссылок:{' '}
                    {version.metrics.invalid_references || 0}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {version.status === 'draft' ? (
                    <button
                      type="button"
                      disabled={versionAction === version.id}
                      onClick={() => void versionCommand(version, 'evaluate')}
                      className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Проверить
                    </button>
                  ) : null}
                  {version.status === 'draft' || version.status === 'testing' ? (
                    <button
                      type="button"
                      disabled={versionAction === version.id}
                      onClick={() => void versionCommand(version, 'publish')}
                      className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Опубликовать
                    </button>
                  ) : null}
                  {version.status === 'published' && version.based_on_version_id ? (
                    <button
                      type="button"
                      disabled={versionAction === version.id}
                      onClick={() => void versionCommand(version, 'rollback')}
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
                    >
                      Откатить
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
            {!versions.length ? <div className="rounded-xl bg-gray-50 p-5 text-sm text-body">Версий пока нет.</div> : null}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-border-200 bg-light p-4 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-heading">Проверка retrieval</h2>
            <p className="mt-1 text-sm leading-6 text-body">
              Показывает, какой короткий пакет каталога получит AI-помощник для конкретной фразы клиента.
            </p>
          </div>
          <form onSubmit={runRetrieval} className="flex flex-col gap-3 sm:flex-row">
            <input
              className={fieldClass()}
              value={retrievalText}
              onChange={(event) => setRetrievalText(event.target.value)}
              placeholder="Например: течет бачок"
              required
            />
            <button className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white">Найти</button>
          </form>
          {retrieval ? (
            <div className="mt-5 space-y-3">
              <div className="text-xs text-body">
                Версия: {retrieval.knowledge_version || 'черновик'} · запрос: {retrieval.query_normalized}
              </div>
              {retrieval.works.map((work) => (
                <article key={work.work_id} className="rounded-xl border border-border-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-heading">{work.title}</div>
                    <div className="text-sm font-bold text-accent">{Math.round(work.score * 100)}%</div>
                  </div>
                  <div className="mt-2 text-xs leading-5 text-body">
                    {work.evidence.map((item) => `${item.source}: ${item.text}`).join(' · ')}
                  </div>
                </article>
              ))}
              {!retrieval.works.length ? (
                <div className="rounded-xl bg-gray-50 p-5 text-sm text-body">
                  Совпадений нет — помощник должен уточнить задачу или показать ручной каталог.
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <section className="mt-6 min-w-0 rounded-2xl border border-border-200 bg-light p-4 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-heading">Словарь AI</h2>
            <p className="mt-1 text-sm leading-6 text-body">
              {termsTotal} терминов помогают AI понимать бытовые формулировки и связывать их с каталогом.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDictionary((value) => !value)}
            className="rounded-lg border border-border-200 px-4 py-2 text-sm font-semibold text-heading"
          >
            {showDictionary ? 'Свернуть словарь' : 'Открыть словарь'}
          </button>
        </div>

        {showDictionary ? (
          <div className="mt-5 border-t border-border-200 pt-5">
            <input
              className={fieldClass()}
              value={termSearch}
              onChange={(event) => {
                setTermSearch(event.target.value);
                setTermsPage(1);
              }}
              placeholder="Найти термин или синоним"
            />
            <div className="mt-4 overflow-hidden rounded-xl border border-border-200">
              {terms.map((term) => (
                <div key={term.id} className="flex flex-col gap-2 border-b border-border-200 p-4 last:border-b-0 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="break-words font-semibold text-heading">{term.display_text}</div>
                    <div className="mt-1 text-xs text-body">
                      {term.links?.length
                        ? term.links.map((link) => `${link.relation} ${link.target_type} #${link.target_id}`).join(', ')
                        : 'Связей с каталогом пока нет'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-gray-100 px-2 py-1 font-semibold">{term.term_type}</span>
                    <span className="text-body">частотность {term.frequency || 0}</span>
                  </div>
                </div>
              ))}
              {!terms.length ? <div className="p-6 text-center text-sm text-body">Ничего не найдено.</div> : null}
            </div>
            {termsLastPage > 1 ? (
              <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  disabled={termsPage <= 1}
                  onClick={() => setTermsPage((page) => Math.max(1, page - 1))}
                  className="rounded-lg border border-border-200 px-4 py-2 font-semibold disabled:opacity-40"
                >
                  Назад
                </button>
                <span className="text-body">Страница {termsPage} из {termsLastPage}</span>
                <button
                  type="button"
                  disabled={termsPage >= termsLastPage}
                  onClick={() => setTermsPage((page) => Math.min(termsLastPage, page + 1))}
                  className="rounded-lg border border-border-200 px-4 py-2 font-semibold disabled:opacity-40"
                >
                  Далее
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </>
  );
}

AiKnowledgeLabPage.authenticate = {
  permissions: adminOnly,
};

AiKnowledgeLabPage.Layout = Layout;

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'form', 'table'])),
  },
});
