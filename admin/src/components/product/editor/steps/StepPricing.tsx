
import { useFormContext } from 'react-hook-form';
import Input from '@/components/ui/input';
import Label from '@/components/ui/label';
import FileInput from '@/components/ui/file-input';
import Checkbox from '@/components/ui/checkbox/checkbox';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';
import { useProductEditorStore } from '@/store/useProductEditorStore';

export default function StepPricing() {
  const { register, watch, control, formState: { errors } } = useFormContext<ProductEditorFormData>();
  const { product } = useProductEditorStore();

  const price = watch('price');
  const salePrice = watch('sale_price');
  const quantity = watch('quantity');
  const isExternal = watch('is_external');
  const digitalFileInput: any = watch('digital_file_input');
  const digitalProductType = watch('digital_product_type') || 'file';
  
  // Получаем системный артикул из продукта (internal_article)
  const systemSku = product?.internal_article || (product as any)?.internal_article || '';

  // Расчет скидки
  const discount = price && salePrice
    ? Math.round(((price - salePrice) / price) * 100)
    : 0;

  const getFileName = (file: any): string => {
    if (!file) return '';
    if (typeof file.file_name === 'string' && file.file_name.trim()) {
      return file.file_name;
    }
    const raw = file.original || file.thumbnail || file.url;
    if (!raw || typeof raw !== 'string') return '';
    try {
      const clean = decodeURIComponent(raw.split('?')[0]);
      return clean.substring(clean.lastIndexOf('/') + 1);
    } catch {
      const clean = raw.split('?')[0];
      return clean.substring(clean.lastIndexOf('/') + 1);
    }
  };

  const selectedArchiveName = getFileName(digitalFileInput);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-heading mb-4">
          Цена и наличие
        </h2>
        <p className="text-sm text-body mb-6">
          Укажите цену товара, количество на складе и артикул (SKU).
        </p>
      </div>

      {/* Цена и наличие - короткие поля в сетке */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
        {/* Цена */}
        <div>
          <Input
            label="Цена"
            type="number"
            step="0.01"
            {...register('price', { valueAsNumber: true })}
            error={errors.price?.message}
            variant="outline"
            floatingLabel
            required
          />
        </div>

        {/* Цена со скидкой */}
        <div>
          <Input
            label="Цена со скидкой"
            type="number"
            step="0.01"
            {...register('sale_price', { valueAsNumber: true })}
            error={errors.sale_price?.message}
            variant="outline"
            floatingLabel
          />
        </div>

        {/* Количество */}
        <div>
          <Input
            label="Количество"
            type="number"
            {...register('quantity', { valueAsNumber: true })}
            error={errors.quantity?.message}
            variant="outline"
            floatingLabel
            required
          />
        </div>

        {/* SKU продавца */}
        <div>
          <Input
            label="Артикул продавца *"
            {...register('sku', {
              pattern: {
                value: /^[a-zA-Z0-9]+$/,
                message: 'Артикул может содержать только латинские буквы и цифры'
              },
              onChange: (e) => {
                // Фильтруем ввод - оставляем только латинские буквы и цифры
                const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                e.target.value = value;
              }
            })}
            error={errors.sku?.message}
            variant="outline"
            floatingLabel
          />
        </div>
      </div>

      {/* Артикул в системе */}
      <div className="max-w-md">
        <Label>Артикул в системе</Label>
        <Input
          value={systemSku || 'Будет сгенерирован при сохранении'}
          variant="outline"
          disabled
          className="bg-gray-50"
        />
        <p className="text-xs text-gray-500 mt-1">
          Автоматически генерируется системой при создании товара
        </p>
      </div>

      {/* Информация о скидке */}
      {discount > 0 && (
        <div className="max-w-3xl">
          <p className="text-sm text-green-600">
            Скидка: {discount}%
          </p>
        </div>
      )}

      {/* Информация о наличии */}
      <div className="max-w-3xl">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            {quantity && quantity > 0
              ? `✓ Товар в наличии (${quantity} шт.)`
              : '⚠ Товар отсутствует на складе'}
          </p>
        </div>
      </div>

      <div className="max-w-3xl">
        <Input
          label="Превью товара"
          {...register('preview_url')}
          error={errors.preview_url?.message}
          variant="outline"
          floatingLabel
        />
      </div>

      {digitalProductType === 'file' && (
      <div className="max-w-3xl space-y-3 rounded-lg border border-light-400 p-4 dark:border-dark-500">
        <Checkbox
          {...register('is_external')}
          id="is_external"
          label="Использовать внешний URL (облако)"
        />
        <p className="text-xs text-body">
          Выберите один способ выдачи: либо ссылка на облако, либо загрузка архива на сервер.
        </p>

        {isExternal ? (
          <Input
            label="Внешний URL цифрового товара"
            {...register('external_product_url')}
            error={errors.external_product_url?.message}
            variant="outline"
            floatingLabel
          />
        ) : (
          <div>
            <Label>Архив цифрового товара</Label>
            <FileInput
              name="digital_file_input"
              control={control}
              multiple={false}
              acceptFile={true}
              defaultValue={{}}
            />
            {selectedArchiveName && (
              <p className="mt-2 text-xs text-body">
                Добавлен файл: <span className="font-medium">{selectedArchiveName}</span>
              </p>
            )}
          </div>
        )}
      </div>
      )}

      <div className="max-w-3xl space-y-4 rounded-lg border border-light-400 p-4 dark:border-dark-500">
        <h3 className="text-sm font-semibold text-heading">Тип цифрового контента</h3>
        <p className="text-xs text-body">
          Один товар — один тип. Поля ниже зависят от выбранного типа.
        </p>
        <div>
          <Label>Digital Product Type</Label>
          <select
            className="mt-1 flex h-11 w-full rounded-md border border-light-500 bg-transparent px-3 text-sm outline-none focus:ring-1 focus:ring-accent dark:border-dark-500"
            {...register('digital_product_type')}
          >
            <option value="file">File</option>
            <option value="prompt">Prompt</option>
            <option value="link">Link</option>
            <option value="account">Account</option>
            <option value="key">Key</option>
            <option value="subscription">Subscription</option>
          </select>
        </div>

        {digitalProductType === 'prompt' && (
          <div>
            <Label>Текст промпта (prompt_text)</Label>
            <textarea
              className="mt-1 min-h-[120px] w-full rounded-md border border-light-500 bg-transparent p-3 text-sm dark:border-dark-500"
              {...register('prompt_text')}
            />
          </div>
        )}

        {digitalProductType === 'link' && (
          <Input
            label="Ссылка для покупателя (external_url)"
            {...register('external_url')}
            variant="outline"
            floatingLabel
          />
        )}

        {digitalProductType === 'account' && (
          <div>
            <Label>Данные аккаунта (JSON)</Label>
            <textarea
              className="mt-1 min-h-[140px] w-full rounded-md border border-light-500 bg-transparent p-3 font-mono text-sm dark:border-dark-500"
              {...register('digital_account_json')}
              placeholder='{"login":"","password":""}'
            />
          </div>
        )}

        {digitalProductType === 'key' && (
          <div>
            <Label>Лицензионные ключи (по одному в строке)</Label>
            <textarea
              className="mt-1 min-h-[160px] w-full rounded-md border border-light-500 bg-transparent p-3 font-mono text-sm dark:border-dark-500"
              placeholder={'XXXX-AAAA\nYYYY-BBBB'}
              {...register('digital_license_keys')}
            />
          </div>
        )}

        {digitalProductType === 'subscription' && (
          <Input
            label="Срок доступа, дней (subscription_days)"
            type="number"
            min={1}
            {...register('subscription_days', { valueAsNumber: true })}
            variant="outline"
            floatingLabel
          />
        )}
      </div>
    </div>
  );
}

