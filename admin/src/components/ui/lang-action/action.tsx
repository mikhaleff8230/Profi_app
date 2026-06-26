import ActionButtons from '@/components/common/action-buttons';
import { Config } from '@/config';
import LanguageAction from './language-switcher';
import shop from '@/components/layouts/shop';
import { useRouter } from 'next/router';
import { Eye } from '@/components/icons/eye-icon';
import { useCreateProductMutation } from '@/data/product';

export type LanguageSwitcherProps = {
  record: any;
  slug: string;
  deleteModalView?: string | any;
  routes: any;
  className?: string | undefined;
};

export default function LanguageSwitcher({
  record,
  slug,
  deleteModalView,
  routes,
  className,
}: LanguageSwitcherProps) {
  const { enableMultiLang } = Config;
  const router = useRouter();
  const {
    query: { shop },
    locale,
  } = router;
  const { mutate: createProduct } = useCreateProductMutation();
  
  // Получаем язык из роутера или используем дефолтный
  const currentLanguage = locale || Config.defaultLanguage;
  
  // Определяем, является ли это товаром
  // Проверяем routes.list (должен быть '/products' или содержать '/products')
  const isProduct = routes?.list === '/products' || 
                    (typeof routes?.list === 'string' && routes.list.includes('/products')) ||
                    // Дополнительная проверка по структуре record (если routes не передан)
                    (!routes && record?.type_id !== undefined && record?.price !== undefined && record?.shop_id !== undefined);
  
  // Формируем URL редактирования
  let editUrl: string | undefined;
  if (isProduct) {
    // Для товаров используем edit-wizard
    // Если shop не указан в URL, берем shop из товара
    const shopSlug = shop || record?.shop?.slug || record?.shop_id;
    if (shopSlug) {
      editUrl = `/${shopSlug}/products/${slug}/edit-wizard`;
    } else {
      // Если shop все еще не найден, используем shop_id напрямую
      const shopId = record?.shop_id;
      if (shopId) {
        editUrl = `/${shopId}/products/${slug}/edit-wizard`;
      } else {
        // Fallback - используем текущий shop из роутера или формируем без shop
        editUrl = shop ? `/${shop}/products/${slug}/edit-wizard` : `/products/${slug}/edit-wizard`;
      }
    }
  } else if (routes?.edit) {
    // Для остальных сущностей используем routes.edit()
    editUrl = routes.edit(slug, currentLanguage, shop as string);
  } else if (routes?.editWithoutLang) {
    // Если есть editWithoutLang, используем его
    editUrl = routes.editWithoutLang(slug, shop as string);
  }
  
  return (
    <>
      {enableMultiLang ? (
        <LanguageAction
          slug={slug}
          record={record}
          deleteModalView={deleteModalView}
          routes={routes}
          className={className}
        />
      ) : (
        <div className="inline-flex items-center gap-5">
          <ActionButtons
            id={record?.id}
            editUrl={editUrl}
            deleteModalView={deleteModalView}
            onCopy={() => {
              try {
                // Извлекаем базовый slug (убираем 12-значный код, если он есть)
                let baseSlug = record?.slug || '';
                // Убираем 12-значный код в конце (формат: -123456789012)
                baseSlug = baseSlug.replace(/-\d{12}$/, '');
                
                const payload: any = {
                  // Используем оригинальное название БЕЗ "(копия)" - это позволит API сгенерировать slug
                  // похожий на оригинальный, но с новым 12-значным кодом
                  name: record?.name,
                  // Не передаем slug - API сам сгенерирует новый с 12-значным кодом из названия
                  // Это гарантирует уникальность и правильный формат без "-kopia"
                  language: currentLanguage, // Передаем язык, чтобы товар создался с правильным языком
                  type_id: record?.type?.id,
                  shop_id: record?.shop_id,
                  unit: record?.unit || 'pcs',
                  price: record?.price || 0,
                  status: 'draft',
                  description: record?.description || '',
                  categories: (record?.categories || []).map((c: any) => c.id),
                  tags: (record?.tags || []).map((t: any) => t.id),
                  image: record?.image || undefined,
                  gallery: record?.gallery || [],
                  // ВАЖНО: не передаем video при копировании, так как video - это File для загрузки
                  // videos из БД не должны передаваться как video, иначе валидация упадет
                  // video: undefined,
                  is_external: false,
                  product_type: 'simple',
                  is_taxable: !!record?.is_taxable,
                  in_stock: record?.in_stock !== false,
                  quantity: record?.quantity || 0,
                };
                createProduct(payload as any);
              } catch (e) {
                console.error('Error copying product:', e);
              }
            }}
          />
          <a
            href={`${process.env.NEXT_PUBLIC_SHOP_URL}/${(routes?.list || '').startsWith('/categories') ? 'categories' : 'products'}/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-full transition duration-200 hover:opacity-80 focus:outline-none"
            style={{ backgroundColor: 'var(--toastify-spinner-color, #616161)' }}
            title="Посмотреть на сайте"
          >
            <Eye width={16} style={{ color: '#E0F316' }} />
          </a>
        </div>
      )}
    </>
  );
}
