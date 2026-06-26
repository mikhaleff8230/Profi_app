
import { useFormContext } from 'react-hook-form';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';
import { useProductEditorStore } from '@/store/useProductEditorStore';
import { useEffect, useState } from 'react';
import { productClient } from '@/data/client/product';
import { useRouter } from 'next/router';

export default function StepPreview() {
  const { watch } = useFormContext<ProductEditorFormData>();
  const { setPreviewData } = useProductEditorStore();
  const router = useRouter();
  const slug = watch('slug');

  const [previewProduct, setPreviewProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Загрузка предпросмотра товара
  useEffect(() => {
    if (slug) {
      setLoading(true);
      productClient.get({
        slug,
        language: router.locale || 'ru',
      })
        .then((response: any) => {
          setPreviewProduct(response);
          setPreviewData(response);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error loading preview:', error);
          setLoading(false);
        });
    }
  }, [slug, router.locale, setPreviewData]);

  const formData = watch();
  const gallery = Array.isArray(formData.gallery) ? formData.gallery : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка предпросмотра...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-heading mb-4">
          Предпросмотр товара
        </h2>
        <p className="text-sm text-body mb-6">
          Проверьте, как товар будет выглядеть на витрине магазина.
        </p>
      </div>

      {/* Карточка товара */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {/* Главное фото */}
        {formData.image && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Главное фото</h3>
            <div className="flex gap-2">
              <img
                src={formData.image.thumbnail || formData.image.url}
                alt={formData.name}
                className="w-24 h-24 object-cover rounded-lg border border-gray-200"
              />
            </div>
          </div>
        )}

        {/* Галерея */}
        {gallery.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Галерея ({gallery.length})</h3>
            <div className="flex flex-wrap gap-2">
              {gallery.map((img: any, index: number) => (
                <img
                  key={index}
                  src={img.thumbnail || img.url}
                  alt={`Gallery ${index + 1}`}
                  className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Название */}
        <h1 className="text-2xl font-bold text-heading mb-4">
          {formData.name || 'Название товара'}
        </h1>

        {/* Цена */}
        <div className="mb-4">
          {formData.sale_price ? (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-heading">
                {formData.sale_price.toLocaleString('ru-RU')} ₽
              </span>
              <span className="text-xl text-gray-400 line-through">
                {formData.price.toLocaleString('ru-RU')} ₽
              </span>
              <span className="text-sm text-green-600 font-semibold">
                -{Math.round(((formData.price - formData.sale_price) / formData.price) * 100)}%
              </span>
            </div>
          ) : (
            <span className="text-3xl font-bold text-heading">
              {formData.price?.toLocaleString('ru-RU')} ₽
            </span>
          )}
        </div>

        {/* Описание */}
        {formData.description && (
          <div
            className="prose max-w-none mb-6"
            dangerouslySetInnerHTML={{ __html: formData.description }}
          />
        )}

        {/* Характеристики */}
        {formData.attribute_values && Object.keys(formData.attribute_values).length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Характеристики</h3>
            <dl className="grid grid-cols-2 gap-4">
              {Object.entries(formData.attribute_values).map(([key, value]) => (
                <div key={key} className="border-b border-gray-200 pb-2">
                  <dt className="text-sm font-medium text-gray-600">{key}</dt>
                  <dd className="text-sm text-heading">
                    {Array.isArray(value) ? value.join(', ') : value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Наличие */}
        <div className="mb-6">
          <p className={`text-sm font-semibold ${formData.quantity && formData.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formData.quantity && formData.quantity > 0
              ? `✓ В наличии (${formData.quantity} шт.)`
              : '✗ Нет в наличии'}
          </p>
        </div>

        {/* Габариты */}
        {(formData.weight || formData.length || formData.width || formData.height) && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Габариты</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              {formData.weight && <li>Вес: {formData.weight} кг</li>}
              {formData.length && <li>Длина: {formData.length} см</li>}
              {formData.width && <li>Ширина: {formData.width} см</li>}
              {formData.height && <li>Высота: {formData.height} см</li>}
            </ul>
          </div>
        )}

        {/* Категории */}
        {formData.category_ids && Array.isArray(formData.category_ids) && formData.category_ids.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Категории</h3>
            <div className="flex flex-wrap gap-2">
              {formData.category_ids.map((catId) => (
                <span
                  key={catId}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  Категория #{catId}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

