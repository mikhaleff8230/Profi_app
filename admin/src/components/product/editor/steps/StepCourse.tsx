import { useFormContext, useFieldArray } from 'react-hook-form';
import Input from '@/components/ui/input';
import Label from '@/components/ui/label';
import Button from '@/components/ui/button';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';

export default function StepCourse() {
  const {
    register,
    watch,
    control,
    formState: { errors },
  } = useFormContext<ProductEditorFormData>();

  const digitalProductType = watch('digital_product_type') || 'file';

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'course.lessons',
  });

  if (digitalProductType !== 'subscription') {
    return (
      <div className="space-y-4 max-w-3xl">
        <h2 className="text-xl font-semibold text-heading">Курс и подписка</h2>
        <p className="text-sm text-body">
          Этот шаг доступен для цифровых товаров с типом «Subscription». На шаге «Цена и наличие»
          выберите тип <span className="font-medium">Subscription</span>, затем вернитесь сюда,
          чтобы настроить уроки и период доступа.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-heading mb-2">Курс и подписка</h2>
        <p className="text-sm text-body">
          Покупатель получает доступ к материалам на срок подписки. Уроки открываются по расписанию
          (drip) от начала подписки.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        <div>
          <Label>Модель доступа (billing_access_type)</Label>
          <select
            className="mt-1 flex h-11 w-full rounded-md border border-light-500 bg-transparent px-3 text-sm outline-none focus:ring-1 focus:ring-accent dark:border-dark-500"
            {...register('billing_access_type')}
          >
            <option value="subscription">Подписка (по дням)</option>
            <option value="one_time">Разовая покупка</option>
            <option value="lifetime">Бессрочный доступ</option>
          </select>
          {errors.billing_access_type?.message && (
            <p className="text-xs text-red-500 mt-1">{String(errors.billing_access_type.message)}</p>
          )}
        </div>
        <div>
          <Input
            label="Период доступа, дней (duration_days)"
            type="number"
            min={1}
            {...register('duration_days', { valueAsNumber: true })}
            error={errors.duration_days?.message}
            variant="outline"
            floatingLabel
          />
          <p className="text-xs text-body mt-1">
            Если не указано, используется «Срок подписки, дней» с шага «Цена» (subscription_days).
          </p>
        </div>
      </div>

      <div className="space-y-3 max-w-3xl">
        <Input
          label="Название курса"
          {...register('course.title')}
          error={(errors.course as any)?.title?.message}
          variant="outline"
          floatingLabel
        />
        <div>
          <Label>Описание курса</Label>
          <textarea
            className="mt-1 min-h-[100px] w-full rounded-md border border-light-500 bg-transparent p-3 text-sm dark:border-dark-500"
            {...register('course.description')}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-heading">Уроки</h3>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({
                title: '',
                content_type: 'video',
                content_url: '',
                content_body: '',
                position: fields.length,
                drip_days: 0,
              })
            }
          >
            Добавить урок
          </Button>
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-body">Пока нет уроков — добавьте первый.</p>
        )}

        <div className="space-y-6">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-lg border border-light-400 p-4 space-y-3 dark:border-dark-500"
            >
              <div className="flex justify-between items-center gap-2">
                <span className="text-sm font-medium text-heading">Урок {index + 1}</span>
                <Button type="button" variant="outline" className="text-red-600" onClick={() => remove(index)}>
                  Удалить
                </Button>
              </div>
              <Input
                label="Название"
                {...register(`course.lessons.${index}.title` as const)}
                error={(errors.course as any)?.lessons?.[index]?.title?.message}
                variant="outline"
                floatingLabel
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Тип контента</Label>
                  <select
                    className="mt-1 flex h-11 w-full rounded-md border border-light-500 bg-transparent px-3 text-sm outline-none dark:border-dark-500"
                    {...register(`course.lessons.${index}.content_type` as const)}
                  >
                    <option value="video">Видео (URL)</option>
                    <option value="text">Текст</option>
                    <option value="embed">Встраивание / ссылка</option>
                  </select>
                </div>
                <Input
                  label="Открыть через N дней (drip)"
                  type="number"
                  min={0}
                  {...register(`course.lessons.${index}.drip_days` as const, { valueAsNumber: true })}
                  variant="outline"
                  floatingLabel
                />
              </div>
              <Input
                label="URL видео / материала (content_url)"
                {...register(`course.lessons.${index}.content_url` as const)}
                variant="outline"
                floatingLabel
              />
              <div>
                <Label>Текст урока (content_body)</Label>
                <textarea
                  className="mt-1 min-h-[120px] w-full rounded-md border border-light-500 bg-transparent p-3 text-sm font-mono dark:border-dark-500"
                  {...register(`course.lessons.${index}.content_body` as const)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
