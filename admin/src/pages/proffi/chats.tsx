import Layout from '@/components/layouts/admin';
import { formatDate, ProffiError, ProffiPageHeader } from '@/components/proffi-admin/common';
import { getProffiAdmin, ProffiChat, ProffiMessage } from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useState } from 'react';

type ChatDetail = {
  chat: ProffiChat;
  messages: ProffiMessage[];
};

export default function ProffiChats() {
  const [rows, setRows] = useState<ProffiChat[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    getProffiAdmin<ProffiChat[]>('/api/admin/chats')
      .then((data) => {
        setRows(data);
        setSelectedId((current) => current || data[0]?.id || null);
      })
      .catch((e) => setError(e.response?.data?.detail || e.message));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailError('');
    getProffiAdmin<ChatDetail>(`/api/admin/chats/${encodeURIComponent(selectedId)}/messages`)
      .then(setDetail)
      .catch((e) => setDetailError(e.response?.data?.detail || e.message));
  }, [selectedId]);

  return (
    <>
      <ProffiPageHeader title="Чаты Treabo" subtitle="Диалоги заказчиков и специалистов, включая переписку." />
      {error ? <ProffiError message={error} /> : null}
      <div className="grid min-h-[70vh] grid-cols-1 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded border border-border-200 bg-light">
          {rows.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => setSelectedId(chat.id)}
              className={`block w-full border-b border-border-100 px-4 py-3 text-left transition ${
                String(selectedId) === String(chat.id) ? 'bg-gray-100' : 'bg-light hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-semibold text-heading">#{chat.id} {chat.task_title || 'Заказ'}</div>
                <div className="text-xs text-body">{chat.messages_count}</div>
              </div>
              <div className="mt-1 text-xs text-body">
                {chat.customer_name || 'Заказчик'} {'->'} {chat.specialist_name || 'Специалист'}
              </div>
              <div className="mt-1 line-clamp-2 text-sm">{chat.last_message || 'Сообщений нет'}</div>
            </button>
          ))}
          {!rows.length ? <div className="p-8 text-center text-sm text-body">Чатов пока нет</div> : null}
        </div>

        <div className="rounded border border-border-200 bg-light p-5">
          {detailError ? <ProffiError message={detailError} /> : null}
          {detail?.chat ? (
            <>
              <div className="mb-5 flex flex-col justify-between gap-3 border-b border-border-100 pb-5 md:flex-row">
                <div>
                  <div className="text-lg font-semibold text-heading">Чат #{detail.chat.id}</div>
                  <div className="text-sm text-body">{detail.chat.task_title || `Заказ #${detail.chat.task_id}`}</div>
                </div>
                <div className="text-sm text-body md:text-right">
                  <div>{detail.chat.customer_name || 'Заказчик'}: {detail.chat.customer_phone || '-'}</div>
                  <div>{detail.chat.specialist_name || 'Специалист'}: {detail.chat.specialist_phone || '-'}</div>
                </div>
              </div>
              <div className="space-y-3">
                {detail.messages.map((message) => (
                  <div key={message.id} className="rounded border border-border-100 bg-gray-50 p-4">
                    <div className="mb-2 flex flex-col justify-between gap-1 text-xs text-body md:flex-row">
                      <span>{message.sender_name || `User #${message.sender_id}`} {message.sender_phone ? `(${message.sender_phone})` : ''}</span>
                      <span>{formatDate(message.created_at)}</span>
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-heading">{message.text}</div>
                  </div>
                ))}
                {!detail.messages.length ? <div className="py-8 text-center text-sm text-body">Сообщений пока нет</div> : null}
              </div>
            </>
          ) : !detailError ? (
            <div className="py-8 text-center text-sm text-body">Выберите чат</div>
          ) : null}
        </div>
      </div>
    </>
  );
}

ProffiChats.authenticate = {
  permissions: adminOnly,
};
ProffiChats.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
