import Layout from '@/components/layouts/admin';
import { formatDate, ProffiError, ProffiPageHeader, StatusBadge } from '@/components/proffi-admin/common';
import {
  AiChatKnowledge,
  AiChatKnowledgeInput,
  AiKnowledgeType,
  deleteProffiAdmin,
  getProffiAdmin,
  postProffiAdmin,
  putProffiAdmin,
} from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FormEvent, useEffect, useMemo, useState } from 'react';

const types: { value: AiKnowledgeType; label: string }[] = [
  { value: 'category', label: 'Категория' },
  { value: 'work', label: 'Работа' },
  { value: 'parameter', label: 'Параметр' },
  { value: 'question', label: 'Вопрос' },
  { value: 'instruction', label: 'Инструкция' },
];

const emptyForm = {
  type: 'instruction' as AiKnowledgeType,
  category_slug: '',
  work_slug: '',
  title: '',
  slug: '',
  content: '',
  payload: '',
  sort_order: 0,
  is_active: true,
};

type FormState = typeof emptyForm;

function fieldClass() {
  return 'w-full rounded border border-border-200 bg-white px-3 py-2 text-sm text-heading outline-none focus:border-accent';
}

function toForm(row: AiChatKnowledge): FormState {
  return {
    type: row.type,
    category_slug: row.category_slug || '',
    work_slug: row.work_slug || '',
    title: row.title || '',
    slug: row.slug || '',
    content: row.content || '',
    payload: row.payload ? JSON.stringify(row.payload, null, 2) : '',
    sort_order: row.sort_order || 0,
    is_active: Boolean(row.is_active),
  };
}

function toPayload(form: FormState): AiChatKnowledgeInput {
  let payload: Record<string, any> | null = null;

  if (form.payload.trim()) {
    payload = JSON.parse(form.payload);
  }

  return {
    type: form.type,
    category_slug: form.category_slug.trim() || null,
    work_slug: form.work_slug.trim() || null,
    title: form.title.trim(),
    slug: form.slug.trim() || null,
    content: form.content.trim() || null,
    payload,
    sort_order: Number(form.sort_order) || 0,
    is_active: form.is_active,
  };
}

export default function ProffiAiChatPage() {
  const [rows, setRows] = useState<AiChatKnowledge[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState<AiKnowledgeType | 'all'>('instruction');

  const filteredRows = useMemo(() => {
    if (typeFilter === 'all') return rows;
    return rows.filter((row) => row.type === typeFilter);
  }, [rows, typeFilter]);

  function load() {
    setError('');
    getProffiAdmin<AiChatKnowledge[]>('/api/admin/ai-chat/knowledge')
      .then(setRows)
      .catch((e) => setError(e.response?.data?.detail || e.message));
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = toPayload(form);

      if (!payload.title) {
        throw new Error('Заполните название.');
      }

      if (editingId) {
        await putProffiAdmin<AiChatKnowledge>(`/api/admin/ai-chat/knowledge/${editingId}`, payload);
      } else {
        await postProffiAdmin<AiChatKnowledge>('/api/admin/ai-chat/knowledge', payload);
      }

      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить запись.');
    } finally {
      setLoading(false);
    }
  }

  async function remove(row: AiChatKnowledge) {
    if (!window.confirm(`Удалить "${row.title}"?`)) return;

    setError('');

    try {
      await deleteProffiAdmin(`/api/admin/ai-chat/knowledge/${row.id}`);
      load();
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message);
    }
  }

  function edit(row: AiChatKnowledge) {
    setEditingId(row.id);
    setForm(toForm(row));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  return (
    <>
      <ProffiPageHeader
        title="AI инструкции Treabo"
        subtitle="Общие системные инструкции для AI-оформления заявок. Категории, работы и вопросы управляются отдельно."
      />

      {error ? <ProffiError message={error} /> : null}

      <div className="mb-6 rounded border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950">
        <div className="font-semibold">Как эта страница влияет на AI-помощника</div>
        <p className="mt-2">
          Все активные записи типа «Инструкция» добавляются к системным правилам при каждом AI-анализе заявки.
          Изменения начинают действовать сразу, без обновления кода.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Название — понятная метка для администратора, AI его не использует.</li>
          <li>Текст для AI — короткое однозначное правило: что уточнить, как классифицировать или чего не делать.</li>
          <li>Категория — необязательный ID/slug категории. Оставьте пустой, чтобы правило работало для всех заявок.</li>
          <li>Порядок — меньшие значения добавляются раньше. Противоречащие друг другу правила лучше не создавать.</li>
          <li>Категории, работы и вопросы берутся из соответствующих справочников, дублировать их здесь не нужно.</li>
        </ul>
        <div className="mt-3 rounded bg-white/70 px-3 py-2">
          Пример: «Если клиент просит ремонт унитаза, уточни: течёт ли вода и требуется ли замена унитаза целиком. Не придумывай размеры помещения».
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <form onSubmit={submit} className="rounded border border-border-200 bg-light p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-heading">{editingId ? 'Редактировать запись' : 'Добавить запись'}</h2>
            {editingId ? (
              <button type="button" onClick={cancelEdit} className="text-sm font-medium text-body hover:text-heading">
                Отмена
              </button>
            ) : null}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-body">Тип</span>
              <select className={fieldClass()} value={form.type} disabled>
                {types.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-body">Новые записи создаются как инструкции. Остальные типы — старые данные и в AI не передаются.</span>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-body">Название</span>
              <input className={fieldClass()} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Например: Укладка плитки" />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-body">Порядок</span>
                <input className={fieldClass()} type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-body">Категория</span>
                <input className={fieldClass()} value={form.category_slug} onChange={(event) => setForm({ ...form, category_slug: event.target.value })} placeholder="bathroom-renovation" />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-body">Текст для AI</span>
              <textarea className={`${fieldClass()} min-h-[120px]`} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="Что AI должен знать или спросить по этой записи" />
            </label>

            <label className="flex items-center gap-2 text-sm text-heading">
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
              Активно
            </label>

            <button type="submit" disabled={loading} className="w-full rounded bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60">
              {loading ? 'Сохраняю...' : editingId ? 'Сохранить изменения' : 'Добавить в базу AI'}
            </button>
          </div>
        </form>

        <div className="rounded border border-border-200 bg-light p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-heading">Записи базы знаний</h2>
            <select className="rounded border border-border-200 bg-white px-3 py-2 text-sm" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as AiKnowledgeType | 'all')}>
              <option value="all">Все типы</option>
              {types.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-body">
                <tr>
                  <th className="px-4 py-3">Тип</th>
                  <th className="px-4 py-3">Название</th>
                  <th className="px-4 py-3">Категория</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-t border-border-100 align-top">
                    <td className="px-4 py-3 text-body">{types.find((type) => type.value === row.type)?.label || row.type}</td>
                    <td className="min-w-[260px] px-4 py-3">
                      <div className="font-medium text-heading">{row.title}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-body">{row.content || row.slug || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-body">
                      <div>{row.category_slug || '-'}</div>
                      <div className="text-xs">{row.work_slug || ''}</div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge value={row.is_active ? 'active' : 'disabled'} /></td>
                    <td className="px-4 py-3 text-body">{formatDate(row.updated_at || row.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => edit(row)} className="rounded border border-border-200 px-3 py-1.5 text-xs font-semibold text-heading hover:bg-gray-50">Изменить</button>
                        <button onClick={() => remove(row)} className="rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Удалить</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredRows.length ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-body" colSpan={6}>
                      Записей пока нет
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

ProffiAiChatPage.authenticate = {
  permissions: adminOnly,
};
ProffiAiChatPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
