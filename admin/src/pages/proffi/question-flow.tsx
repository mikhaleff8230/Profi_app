import Layout from '@/components/layouts/admin';
import { ProffiError, ProffiPageHeader } from '@/components/proffi-admin/common';
import {
  deleteProffiAdmin,
  getProffiAdmin,
  postProffiAdmin,
  ProffiQuestionFlow,
  ProffiQuestionRule,
  ProffiWork,
  putProffiAdmin,
} from '@/data/proffi-admin';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FormEvent, useEffect, useMemo, useState } from 'react';

const fieldClass =
  'w-full rounded border border-border-200 bg-white px-3 py-2 text-sm text-heading outline-none focus:border-accent';

const operators = [
  ['equals', 'равно'],
  ['not_equals', 'не равно'],
  ['contains', 'содержит'],
  ['exists', 'заполнено'],
  ['not_exists', 'не заполнено'],
] as const;

export default function QuestionFlowPage() {
  const [works, setWorks] = useState<ProffiWork[]>([]);
  const [workId, setWorkId] = useState('');
  const [flow, setFlow] = useState<ProffiQuestionFlow | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [conditionQuestion, setConditionQuestion] = useState('');
  const [operator, setOperator] = useState('equals');
  const [conditionValue, setConditionValue] = useState('');
  const [targetQuestion, setTargetQuestion] = useState('');
  const [effect, setEffect] = useState<'show' | 'hide' | 'require' | 'optional'>('show');
  const [ruleName, setRuleName] = useState('');
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, unknown>>({});
  const [previewIds, setPreviewIds] = useState<number[]>([]);
  const [groupTitle, setGroupTitle] = useState('');

  useEffect(() => {
    getProffiAdmin<ProffiWork[]>('/api/admin/works')
      .then((items) => {
        setWorks(items);
        if (items[0]) setWorkId(String(items[0].id));
      })
      .catch((caught) => setError(caught.message));
  }, []);

  function load(selected = workId) {
    if (!selected) return;
    getProffiAdmin<ProffiQuestionFlow>(`/api/admin/question-flow?work_id=${selected}`)
      .then((data) => {
        setFlow(data);
        setPreviewIds(data.questions.filter((question) => question.default_visibility !== 'conditional').map((question) => question.id));
      })
      .catch((caught) => setError(caught.response?.data?.message || caught.message));
  }

  useEffect(() => load(workId), [workId]);

  const sourceQuestion = useMemo(
    () => flow?.questions.find((question) => String(question.id) === conditionQuestion),
    [conditionQuestion, flow],
  );

  async function saveRule(event: FormEvent) {
    event.preventDefault();
    if (!workId || !conditionQuestion || !targetQuestion) return;
    setBusy(true);
    setError('');
    try {
      await postProffiAdmin<ProffiQuestionRule>('/api/admin/question-rules', {
        work_id: Number(workId),
        name: ruleName.trim() || `Если «${sourceQuestion?.question}» — ${effect}`,
        match_type: 'all',
        conditions: [{
          question_id: Number(conditionQuestion),
          operator,
          value: ['exists', 'not_exists'].includes(operator) ? true : conditionValue,
        }],
        actions: [{ question_id: Number(targetQuestion), effect }],
        priority: 100,
        is_active: true,
      });
      setRuleName('');
      setConditionValue('');
      load();
    } catch (caught: any) {
      setError(caught.response?.data?.message || caught.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeRule(id: number) {
    if (!confirm('Удалить условный переход?')) return;
    await deleteProffiAdmin(`/api/admin/question-rules/${id}`);
    load();
  }

  async function addGroup(event: FormEvent) {
    event.preventDefault();
    if (!groupTitle.trim() || !workId) return;
    await postProffiAdmin('/api/admin/question-groups', {
      work_id: Number(workId),
      title: groupTitle.trim(),
      sort_order: (flow?.groups.length || 0) * 10,
      is_active: true,
    });
    setGroupTitle('');
    load();
  }

  async function assignGroup(questionId: number, groupId: string) {
    const question = flow?.questions.find((item) => item.id === questionId);
    if (!question) return;
    await putProffiAdmin(`/api/admin/questions/${questionId}`, {
      work_id: question.work_id,
      question: question.question,
      field_key: question.field_key,
      type: question.type,
      options: question.options,
      placeholder: question.placeholder,
      help_text: question.help_text,
      ai_instruction: question.ai_instruction,
      group_id: groupId ? Number(groupId) : null,
      is_required: question.is_required,
      default_visibility: question.default_visibility,
      is_safety_critical: question.is_safety_critical,
      sort_order: question.sort_order,
      is_active: question.is_active,
    });
    load();
  }

  async function preview(nextAnswers = previewAnswers) {
    if (!workId) return;
    const result = await postProffiAdmin<{ questions: Array<{ id: number }> }>(
      '/api/admin/question-flow/preview',
      { work_id: Number(workId), answers: nextAnswers },
    );
    setPreviewIds(result.questions.map((question) => question.id));
  }

  return (
    <>
      <ProffiPageHeader
        title="Визуальная логика вопросов"
        subtitle="Настройте переходы «если → то» без программирования и сразу проверьте пользовательский сценарий."
      />
      {error ? <ProffiError message={error} /> : null}

      <div className="mb-5 rounded border border-border-200 bg-light p-4">
        <label className="grid max-w-xl gap-1 text-sm font-semibold">
          Работа
          <select className={fieldClass} value={workId} onChange={(event) => setWorkId(event.target.value)}>
            {works.map((work) => <option key={work.id} value={work.id}>{work.title}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <div className="space-y-6">
          <section className="rounded border border-border-200 bg-light p-5">
            <h2 className="text-lg font-semibold text-heading">Группы вопросов</h2>
            <form onSubmit={addGroup} className="mt-3 flex gap-2">
              <input className={fieldClass} value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} placeholder="Например: Протечка и безопасность" />
              <button className="rounded bg-heading px-4 py-2 font-semibold text-light">Добавить</button>
            </form>
            <div className="mt-4 grid gap-2">
              {flow?.questions.map((question) => (
                <label key={question.id} className="grid items-center gap-2 rounded border border-border-100 p-3 text-sm md:grid-cols-[1fr_220px]">
                  <span>{question.question}</span>
                  <select className={fieldClass} value={question.group_id || ''} onChange={(event) => void assignGroup(question.id, event.target.value)}>
                    <option value="">Без группы</option>
                    {flow.groups.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <form onSubmit={saveRule} className="rounded border border-border-200 bg-light p-5">
            <h2 className="text-lg font-semibold text-heading">Новый переход</h2>
            <input
              className={`${fieldClass} mt-4`}
              value={ruleName}
              onChange={(event) => setRuleName(event.target.value)}
              placeholder="Название правила (необязательно)"
            />
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-body">Если</div>
              <div className="grid gap-3 md:grid-cols-3">
                <select className={fieldClass} value={conditionQuestion} onChange={(event) => setConditionQuestion(event.target.value)} required>
                  <option value="">Выберите вопрос</option>
                  {flow?.questions.map((question) => <option key={question.id} value={question.id}>{question.question}</option>)}
                </select>
                <select className={fieldClass} value={operator} onChange={(event) => setOperator(event.target.value)}>
                  {operators.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                {!['exists', 'not_exists'].includes(operator) && (
                  sourceQuestion?.options?.length ? (
                    <select className={fieldClass} value={conditionValue} onChange={(event) => setConditionValue(event.target.value)} required>
                      <option value="">Значение</option>
                      {sourceQuestion.options.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input className={fieldClass} value={conditionValue} onChange={(event) => setConditionValue(event.target.value)} placeholder="Значение" required />
                  )
                )}
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-[#f3f7df] p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[#687325]">То</div>
              <div className="grid gap-3 md:grid-cols-2">
                <select className={fieldClass} value={targetQuestion} onChange={(event) => setTargetQuestion(event.target.value)} required>
                  <option value="">Целевой вопрос</option>
                  {flow?.questions.map((question) => <option key={question.id} value={question.id}>{question.question}</option>)}
                </select>
                <select className={fieldClass} value={effect} onChange={(event) => setEffect(event.target.value as typeof effect)}>
                  <option value="show">показать</option>
                  <option value="hide">скрыть</option>
                  <option value="require">показать и сделать обязательным</option>
                  <option value="optional">сделать необязательным</option>
                </select>
              </div>
            </div>
            <button disabled={busy} className="mt-4 rounded bg-accent px-5 py-2.5 font-semibold text-light">
              {busy ? 'Сохранение…' : 'Добавить переход'}
            </button>
          </form>

          <section className="rounded border border-border-200 bg-light p-5">
            <h2 className="text-lg font-semibold text-heading">Активные правила</h2>
            <div className="mt-4 space-y-3">
              {flow?.rules.map((rule) => {
                const condition = rule.conditions[0];
                const action = rule.actions[0];
                const source = flow.questions.find((item) => item.id === condition?.question_id);
                const target = flow.questions.find((item) => item.id === action?.question_id);
                return (
                  <div key={rule.id} className="rounded-lg border border-border-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-heading">{rule.name}</div>
                        <p className="mt-1 text-sm text-body">
                          Если «{source?.question}» {condition?.operator} «{String(condition?.value ?? '')}» → {action?.effect} «{target?.question}»
                        </p>
                      </div>
                      <button onClick={() => removeRule(rule.id)} className="text-sm font-semibold text-red-600">Удалить</button>
                    </div>
                  </div>
                );
              })}
              {!flow?.rules.length && <p className="py-5 text-sm text-body">Для этой работы переходов пока нет.</p>}
            </div>
          </section>
        </div>

        <section className="h-fit rounded border border-border-200 bg-light p-5 xl:sticky xl:top-4">
          <h2 className="text-lg font-semibold text-heading">Предпросмотр диалога</h2>
          <p className="mt-1 text-sm text-body">Отвечайте как клиент — список следующих вопросов обновится.</p>
          <div className="mt-4 space-y-3">
            {flow?.questions.map((question) => {
              const visible = previewIds.includes(question.id);
              return (
                <div key={question.id} className={`rounded-lg border p-3 ${visible ? 'border-accent bg-[#fbfdec]' : 'border-border-100 bg-gray-50 opacity-45'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{question.question}</span>
                    <span className="text-xs">{visible ? 'показывается' : 'скрыт'}</span>
                  </div>
                  {visible && question.type !== 'photo' && (
                    question.options?.length ? (
                      <select
                        className={`${fieldClass} mt-2`}
                        value={String(previewAnswers[question.id] ?? '')}
                        onChange={(event) => {
                          const answers = { ...previewAnswers, [question.id]: event.target.value };
                          setPreviewAnswers(answers);
                          void preview(answers);
                        }}
                      >
                        <option value="">Без ответа</option>
                        {question.options.map((option) => <option key={option}>{option}</option>)}
                      </select>
                    ) : (
                      <input
                        className={`${fieldClass} mt-2`}
                        value={String(previewAnswers[question.id] ?? '')}
                        onChange={(event) => setPreviewAnswers({ ...previewAnswers, [question.id]: event.target.value })}
                        onBlur={() => void preview()}
                        placeholder="Тестовый ответ"
                      />
                    )
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

QuestionFlowPage.authenticate = { permissions: adminOnly };
QuestionFlowPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
