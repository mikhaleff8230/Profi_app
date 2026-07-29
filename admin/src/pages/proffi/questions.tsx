import Layout from '@/components/layouts/admin';
import { ProffiError, ProffiPageHeader } from '@/components/proffi-admin/common';
import {
  deleteProffiAdmin,
  getProffiAdmin,
  postProffiAdmin,
  ProffiWork,
  ProffiWorkQuestion,
  ProffiWorkQuestionInput,
  ProffiWorkQuestionType,
  putProffiAdmin,
  TreaboCategory,
} from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FormEvent, useEffect, useMemo, useState } from 'react';

const questionTypes: { value: ProffiWorkQuestionType; label: string }[] = [
  { value: 'text', label: 'Текст' },
  { value: 'textarea', label: 'Многострочный текст' },
  { value: 'number', label: 'Число' },
  { value: 'yesno', label: 'Да/Нет' },
  { value: 'select', label: 'Выбор' },
  { value: 'multiselect', label: 'Множественный выбор' },
  { value: 'photo', label: 'Фото' },
];

const emptyForm = {
  work_id: '',
  question: '',
  field_key: '',
  type: 'text' as ProffiWorkQuestionType,
  options: '',
  placeholder: '',
  help_text: '',
  is_required: false,
  sort_order: '0',
  is_active: true,
};

function fieldClass() {
  return 'w-full rounded border border-border-200 bg-white px-3 py-2 text-sm text-heading outline-none focus:border-accent';
}

function parseOptions(value: string, type: ProffiWorkQuestionType): string[] | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (type === 'select' || type === 'multiselect') {
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.map(String) : null;
      } catch {
        return trimmed.split('\n').map((line) => line.trim()).filter(Boolean);
      }
    }
    return trimmed.split('\n').map((line) => line.trim()).filter(Boolean);
  }

  return null;
}

function optionsToText(options?: string[] | null) {
  return (options || []).join('\n');
}

export default function TreaboQuestions() {
  const [rows, setRows] = useState<ProffiWorkQuestion[]>([]);
  const [works, setWorks] = useState<ProffiWork[]>([]);
  const [categories, setCategories] = useState<TreaboCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [workFilter, setWorkFilter] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredWorks = useMemo(() => {
    if (!categoryFilter) return works;
    return works.filter((w) => w.category_id === categoryFilter);
  }, [works, categoryFilter]);

  const filteredRows = useMemo(() => {
    let result = rows;
    if (categoryFilter) {
      result = result.filter((row) => row.category_id === categoryFilter);
    }
    if (workFilter) {
      result = result.filter((row) => String(row.work_id) === workFilter);
    }
    return result;
  }, [rows, categoryFilter, workFilter]);

  const sortedRows = useMemo(
    () =>
      [...filteredRows].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.question.localeCompare(b.question),
      ),
    [filteredRows],
  );

  function load() {
    const params = new URLSearchParams();
    if (categoryFilter) params.set('category_id', categoryFilter);
    if (workFilter) params.set('work_id', workFilter);
    const query = params.toString();
    const questionsPath = query ? `/api/admin/questions?${query}` : '/api/admin/questions';

    Promise.all([
      getProffiAdmin<ProffiWorkQuestion[]>(questionsPath),
      getProffiAdmin<ProffiWork[]>('/api/admin/works'),
      getProffiAdmin<TreaboCategory[]>('/api/admin/categories'),
    ])
      .then(([questions, worksList, cats]) => {
        setRows(questions);
        setWorks(worksList);
        setCategories(cats);
      })
      .catch((e) => setError(e.response?.data?.detail || e.message));
  }

  useEffect(load, [categoryFilter, workFilter]);

  function edit(row: ProffiWorkQuestion) {
    setEditingId(row.id);
    setForm({
      work_id: String(row.work_id),
      question: row.question || '',
      field_key: row.field_key || '',
      type: row.type || 'text',
      options: optionsToText(row.options),
      placeholder: row.placeholder || '',
      help_text: row.help_text || '',
      is_required: row.is_required ?? false,
      sort_order: String(row.sort_order ?? 0),
      is_active: row.is_active ?? true,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  function toPayload(): ProffiWorkQuestionInput {
    return {
      work_id: Number(form.work_id),
      question: form.question.trim(),
      field_key: form.field_key.trim() || null,
      type: form.type,
      options: parseOptions(form.options, form.type),
      placeholder: form.placeholder.trim() || null,
      help_text: form.help_text.trim() || null,
      is_required: form.is_required,
      sort_order: Number(form.sort_order || 0),
      is_active: form.is_active,
    };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = toPayload();
      if (editingId) {
        await putProffiAdmin<ProffiWorkQuestion>(`/api/admin/questions/${editingId}`, payload);
      } else {
        await postProffiAdmin<ProffiWorkQuestion>('/api/admin/questions', payload);
      }
      reset();
      load();
    } catch (e: any) {
      setError(e.response?.data?.message || e.response?.data?.detail || e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Удалить вопрос?')) return;
    await deleteProffiAdmin(`/api/admin/questions/${id}`);
    if (editingId === id) reset();
    load();
  }

  function workTitle(workId: number) {
    const work = works.find((w) => w.id === workId);
    return work?.title || String(workId);
  }

  function categoryName(categoryId?: string | null) {
    if (!categoryId) return '-';
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name_ru || categoryId;
  }

  const showOptions = form.type === 'select' || form.type === 'multiselect';

  return (
    <>
      <ProffiPageHeader
        title="Вопросы Treabo"
        subtitle="Уточняющие вопросы для AI-заявок. Каждый вопрос привязан к работе из /proffi/works."
      />
      {error ? <ProffiError message={error} /> : null}

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          className="rounded border border-border-200 px-3 py-2 text-sm"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setWorkFilter('');
          }}
        >
          <option value="">Все категории</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name_ru}
            </option>
          ))}
        </select>

        <select
          className="rounded border border-border-200 px-3 py-2 text-sm"
          value={workFilter}
          onChange={(e) => setWorkFilter(e.target.value)}
        >
          <option value="">Все работы</option>
          {filteredWorks.map((work) => (
            <option key={work.id} value={String(work.id)}>
              {work.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={submit} className="grid gap-3 rounded border border-border-200 bg-light p-5">
          <h3 className="text-lg font-semibold text-heading">
            {editingId ? 'Редактирование вопроса' : 'Новый вопрос'}
          </h3>

          <label className="grid gap-1 text-sm">
            <span>Работа</span>
            <select
              className={fieldClass()}
              value={form.work_id}
              onChange={(e) => setForm({ ...form, work_id: e.target.value })}
              required
            >
              <option value="">Выберите работу</option>
              {filteredWorks.map((work) => (
                <option key={work.id} value={String(work.id)}>
                  {work.title}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span>Текст вопроса</span>
            <textarea
              className={fieldClass()}
              rows={2}
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              required
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span>ID поля (field_key)</span>
              <input
                className={fieldClass()}
                value={form.field_key}
                onChange={(e) => setForm({ ...form, field_key: e.target.value })}
                placeholder="Создастся автоматически из вопроса"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Тип</span>
              <select
                className={fieldClass()}
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as ProffiWorkQuestionType })
                }
              >
                {questionTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {showOptions ? (
            <label className="grid gap-1 text-sm">
              <span>Options (по одному на строку или JSON)</span>
              <textarea
                className={fieldClass()}
                rows={3}
                value={form.options}
                onChange={(e) => setForm({ ...form, options: e.target.value })}
              />
            </label>
          ) : null}

          <label className="grid gap-1 text-sm">
            <span>Placeholder</span>
            <input
              className={fieldClass()}
              value={form.placeholder}
              onChange={(e) => setForm({ ...form, placeholder: e.target.value })}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Help text</span>
            <textarea
              className={fieldClass()}
              rows={2}
              value={form.help_text}
              onChange={(e) => setForm({ ...form, help_text: e.target.value })}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span>Сортировка</span>
              <input
                className={fieldClass()}
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              />
            </label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 rounded border border-border-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_required}
                  onChange={(e) => setForm({ ...form, is_required: e.target.checked })}
                />
                Обязательный
              </label>
              <label className="flex items-center gap-2 rounded border border-border-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Активен
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="rounded bg-accent px-4 py-2 font-semibold text-light" disabled={saving}>
              {saving ? 'Сохранение...' : editingId ? 'Сохранить' : 'Добавить'}
            </button>
            {editingId ? (
              <button type="button" onClick={reset} className="rounded bg-gray-100 px-4 py-2 font-semibold">
                Отмена
              </button>
            ) : null}
          </div>
        </form>

        <div className="overflow-hidden rounded border border-border-200 bg-light">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-body">
              <tr>
                <th className="px-4 py-3">Работа</th>
                <th className="px-4 py-3">Категория</th>
                <th className="px-4 py-3">Вопрос</th>
                <th className="px-4 py-3">Тип</th>
                <th className="px-4 py-3">Обяз.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.id} className="border-t border-border-100">
                  <td className="px-4 py-3">{workTitle(row.work_id)}</td>
                  <td className="px-4 py-3">{categoryName(row.category_id)}</td>
                  <td className="px-4 py-3">{row.question}</td>
                  <td className="px-4 py-3">{row.type}</td>
                  <td className="px-4 py-3">{row.is_required ? 'Да' : 'Нет'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => edit(row)} className="me-4 text-accent">
                      Редактировать
                    </button>
                    <button onClick={() => remove(row.id)} className="text-red-600">
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
              {!sortedRows.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-body" colSpan={6}>
                    Вопросов пока нет
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

TreaboQuestions.authenticate = {
  permissions: adminOnly,
};
TreaboQuestions.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
