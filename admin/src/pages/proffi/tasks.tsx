import Layout from '@/components/layouts/admin';
import YandexAddressSuggest from '@/components/form/yandex-address-suggest';
import RussiaCityInput from '@/components/proffi-admin/RussiaCityInput';
import { formatDate, ProffiError, ProffiPageHeader, StatusBadge } from '@/components/proffi-admin/common';
import {
  deleteProffiAdmin,
  getProffiAdmin,
  postProffiAdmin,
  ProffiTask,
  ProffiUser,
  putProffiAdmin,
  TreaboCategory,
  uploadProffiAdminFile,
} from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type TaskForm = {
  title: string;
  description: string;
  category: string;
  city: string;
  address: string;
  lat: string;
  lng: string;
  budget_type: 'fixed' | 'range';
  budget: string;
  budget_min: string;
  budget_max: string;
  response_price_mdl: string;
  deadline: string;
  customer_id: string;
  status: string;
  photos: string[];
};

const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

const emptyTaskForm: TaskForm = {
  title: '',
  description: '',
  category: '',
  city: 'Москва',
  address: '',
  lat: '',
  lng: '',
  budget_type: 'fixed',
  budget: '',
  budget_min: '',
  budget_max: '',
  response_price_mdl: '15',
  deadline: 'По договоренности',
  customer_id: '',
  status: 'open',
  photos: [],
};

function categoryLabel(category: TreaboCategory) {
  return `${category.parent_id ? '- ' : ''}${category.name_ru || category.id}`;
}

export default function ProffiTasks() {
  const [rows, setRows] = useState<ProffiTask[]>([]);
  const [customers, setCustomers] = useState<ProffiUser[]>([]);
  const [categories, setCategories] = useState<TreaboCategory[]>([]);
  const [form, setForm] = useState(emptyTaskForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        const parentCompare = String(a.parent_id || '').localeCompare(String(b.parent_id || ''));
        if (parentCompare) return parentCompare;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name_ru.localeCompare(b.name_ru);
      }),
    [categories],
  );

  function loadTasks() {
    getProffiAdmin<ProffiTask[]>('/api/admin/tasks')
      .then(setRows)
      .catch((e) => setError(e.response?.data?.detail || e.message));
  }

  function loadDictionaries() {
    getProffiAdmin<ProffiUser[]>('/api/admin/customers').then((data) => {
      setCustomers(data);
      setForm((current) => ({ ...current, customer_id: current.customer_id || data[0]?.id || '' }));
    });
    getProffiAdmin<TreaboCategory[]>('/api/admin/categories').then((data) => {
      setCategories(data);
      setForm((current) => ({ ...current, category: current.category || data[0]?.id || '' }));
    });
  }

  useEffect(() => {
    loadTasks();
    loadDictionaries();
  }, []);

  function edit(task: ProffiTask) {
    setEditingId(task.id);
    setForm({
      title: task.title || '',
      description: task.description || '',
      category: task.category_id || task.category || '',
      city: task.city || 'Москва',
      address: task.address || '',
      lat: task.lat != null ? String(task.lat) : '',
      lng: task.lng != null ? String(task.lng) : '',
      budget_type: task.budget_type === 'range' ? 'range' : 'fixed',
      budget: task.budget ? String(task.budget) : '',
      budget_min: task.budget_min != null ? String(task.budget_min) : '',
      budget_max: task.budget_max != null ? String(task.budget_max) : '',
      response_price_mdl: task.response_price_mdl ? String(task.response_price_mdl) : '15',
      deadline: task.deadline || 'По договоренности',
      customer_id: task.customer_id || '',
      status: task.status || 'open',
      photos: task.photos || [],
    });
  }

  function reset() {
    setEditingId(null);
    setForm({
      ...emptyTaskForm,
      customer_id: customers[0]?.id || '',
      category: sortedCategories[0]?.id || '',
      city: form.city || emptyTaskForm.city,
      photos: [],
    });
    setError('');
  }

  async function uploadPhotos(files: FileList | null) {
    const selected = Array.from(files || []).slice(0, Math.max(0, 10 - form.photos.length));
    if (!selected.length) return;

    const tooLarge = selected.find((file) => file.size > MAX_PHOTO_BYTES);
    if (tooLarge) {
      setError(`Файл «${tooLarge.name}» слишком большой. Максимум 20 МБ на фото.`);
      return;
    }

    setUploading(true);
    setError('');

    try {
      const uploads = await Promise.all(selected.map((file) => uploadProffiAdminFile(file, 'tasks')));
      setForm((current) => ({
        ...current,
        photos: [...current.photos, ...uploads.map((upload) => upload.url)].slice(0, 10),
      }));
    } catch (e: any) {
      const status = e.response?.status;
      const message = e.response?.data?.message || e.response?.data?.detail || e.message;
      if (status === 413 || /too large|max:|размер/i.test(String(message))) {
        setError('Файл слишком большой. Максимум 20 МБ на фото.');
      } else {
        setError(message);
      }
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(url: string) {
    setForm((current) => ({
      ...current,
      photos: current.photos.filter((photo) => photo !== url),
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (form.address.trim() && (!form.lat || !form.lng)) {
      setError('Укажите адрес через подсказку Яндекса или выберите точку на карте, чтобы сохранить координаты lat/lng.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      customer_id: Number(form.customer_id),
      budget_type: form.budget_type,
      budget: form.budget_type === 'fixed' && form.budget ? Number(form.budget) : null,
      budget_min: form.budget_type === 'range' && form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_type === 'range' && form.budget_max ? Number(form.budget_max) : null,
      response_price_mdl: form.response_price_mdl ? Number(form.response_price_mdl) : 15,
      lat: form.lat ? Number(form.lat) : null,
      lng: form.lng ? Number(form.lng) : null,
      photos: form.photos,
    };

    try {
      if (editingId) {
        await putProffiAdmin<ProffiTask>(`/api/admin/tasks/${encodeURIComponent(editingId)}`, payload);
      } else {
        await postProffiAdmin<ProffiTask>('/api/admin/tasks', payload);
      }
      reset();
      loadTasks();
    } catch (e: any) {
      setError(e.response?.data?.message || e.response?.data?.detail || e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Удалить заявку?')) return;
    await deleteProffiAdmin(`/api/admin/tasks/${encodeURIComponent(id)}`);
    if (editingId === id) reset();
    loadTasks();
  }

  return (
    <>
      <ProffiPageHeader
        title="Заказы Treabo"
        subtitle="Заявки клиентов. Каждая заявка привязана к категории или виду работ из дерева Treabo."
      />
      {error ? <ProffiError message={error} /> : null}

      <form onSubmit={submit} className="mb-6 grid gap-3 rounded border border-border-200 bg-light p-5 md:grid-cols-4">
        <input
          className="rounded border border-border-200 px-3 py-2"
          placeholder="Название заявки"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <select
          className="rounded border border-border-200 px-3 py-2"
          value={form.customer_id}
          onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
          required
        >
          <option value="">Заказчик</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} {customer.phone ? `(${customer.phone})` : ''}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-border-200 px-3 py-2"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          required
        >
          <option value="">Категория / вид работ</option>
          {sortedCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {categoryLabel(category)}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-border-200 px-3 py-2"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option value="open">Открыт</option>
          <option value="in_progress">В работе</option>
          <option value="done">Готово</option>
          <option value="cancelled">Отменен</option>
        </select>
        <RussiaCityInput value={form.city} onChange={(city) => setForm({ ...form, city })} required />
        <div className="md:col-span-2">
          <YandexAddressSuggest
            value={form.address}
            onAddressChange={(address) => setForm((current) => ({ ...current, address }))}
            onCoordinates={(lat, lng) =>
              setForm((current) => ({
                ...current,
                lat: String(lat),
                lng: String(lng),
              }))
            }
          />
          {form.lat && form.lng ? (
            <div className="mt-2 text-xs text-body">
              Координаты: {form.lat}, {form.lng}
            </div>
          ) : null}
        </div>
        <select
          className="rounded border border-border-200 px-3 py-2"
          value={form.budget_type}
          onChange={(e) => setForm({ ...form, budget_type: e.target.value as TaskForm['budget_type'] })}
        >
          <option value="fixed">Бюджет: точная сумма</option>
          <option value="range">Бюджет: интервал</option>
        </select>
        {form.budget_type === 'fixed' ? (
          <input
            className="rounded border border-border-200 px-3 py-2"
            placeholder="Бюджет, ₽"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
          />
        ) : (
          <>
            <input
              className="rounded border border-border-200 px-3 py-2"
              placeholder="Бюджет от, ₽"
              value={form.budget_min}
              onChange={(e) => setForm({ ...form, budget_min: e.target.value })}
            />
            <input
              className="rounded border border-border-200 px-3 py-2"
              placeholder="Бюджет до, ₽"
              value={form.budget_max}
              onChange={(e) => setForm({ ...form, budget_max: e.target.value })}
            />
          </>
        )}
        <input
          className="rounded border border-border-200 px-3 py-2"
          placeholder="Цена отклика, ₽"
          value={form.response_price_mdl}
          onChange={(e) => setForm({ ...form, response_price_mdl: e.target.value })}
        />
        <input
          className="rounded border border-border-200 px-3 py-2"
          placeholder="Срок"
          value={form.deadline}
          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
        />
        <textarea
          className="rounded border border-border-200 px-3 py-2 md:col-span-2"
          placeholder="Описание"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
        <div className="md:col-span-4">
          <label className="mb-2 block text-sm font-semibold text-heading">Фото задания</label>
          <input
            type="file"
            accept="image/*"
            multiple
            className="w-full rounded border border-border-200 px-3 py-2"
            disabled={uploading || form.photos.length >= 10}
            onChange={(event) => uploadPhotos(event.target.files)}
          />
          <div className="mt-2 text-xs text-body">
            {uploading ? 'Загрузка фото...' : `Загружено ${form.photos.length}/10. Максимум 20 МБ на файл.`}
          </div>
          {form.photos.length ? (
            <div className="mt-3 flex flex-wrap gap-3">
              {form.photos.map((photo) => (
                <div key={photo} className="relative h-20 w-20 overflow-hidden rounded border border-border-200">
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo)}
                    className="absolute right-1 top-1 rounded bg-red-600 px-1.5 py-0.5 text-xs text-light"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex gap-3">
          <button
            className="flex-1 rounded bg-accent px-4 py-2 font-semibold text-light"
            disabled={saving}
          >
            {saving ? 'Сохранение...' : editingId ? 'Сохранить' : 'Создать заявку'}
          </button>
          {editingId ? (
            <button type="button" onClick={reset} className="rounded bg-gray-100 px-4 py-2 font-semibold">
              Отмена
            </button>
          ) : null}
        </div>
      </form>

      <div className="overflow-hidden rounded border border-border-200 bg-light">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-body">
              <tr>
                <th className="px-4 py-3">id</th>
                <th className="px-4 py-3">Заказ</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Заказчик</th>
                <th className="px-4 py-3">Категория</th>
                <th className="px-4 py-3">Город</th>
                <th className="px-4 py-3">Бюджет</th>
                <th className="px-4 py-3">Отклик</th>
                <th className="px-4 py-3">Создан</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((task) => (
                <tr key={task.id} className="border-t border-border-100 align-top">
                  <td className="px-4 py-3 text-body">{task.id}</td>
                  <td className="min-w-[260px] px-4 py-3">
                    <div className="font-medium text-heading">{task.title || '-'}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-body">{task.address || task.description || ''}</div>
                    {task.photos?.length ? (
                      <div className="mt-2 flex gap-1.5">
                        {task.photos.slice(0, 3).map((photo) => (
                          <img key={photo} src={photo} alt="" className="h-10 w-10 rounded object-cover" />
                        ))}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={task.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div>{task.customer_name || '-'}</div>
                    <div className="text-xs text-body">{task.customer_phone || ''}</div>
                  </td>
                  <td className="px-4 py-3">{task.category_id || task.category || '-'}</td>
                  <td className="px-4 py-3">{task.city || '-'}</td>
                  <td className="px-4 py-3">{task.budget ? `${task.budget} ₽` : '-'}</td>
                  <td className="px-4 py-3">{task.response_price_mdl ? `${task.response_price_mdl} ₽` : '-'}</td>
                  <td className="px-4 py-3 text-body">{formatDate(task.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => edit(task)} className="me-4 text-accent">
                      Редактировать
                    </button>
                    <button type="button" onClick={() => remove(task.id)} className="text-red-600">
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-body" colSpan={10}>
                    Заказов пока нет
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

ProffiTasks.authenticate = {
  permissions: adminOnly,
};
ProffiTasks.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
