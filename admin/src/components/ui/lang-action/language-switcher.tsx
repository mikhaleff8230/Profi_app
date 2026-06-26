import { useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { languageMenu } from '@/utils/locals';
import { Popover } from '@headlessui/react';
import { ToggleIcon } from '@/components/icons/toggle-icon';
import {
  offset,
  flip,
  autoUpdate,
  useFloating,
  shift,
} from '@floating-ui/react-dom-interactions';
import ActionButtons from '@/components/common/action-buttons';
import LanguageListbox from './lang-list-box';
import { Config } from '@/config';
import PopOver from '@/components/ui/popover';
import { Eye } from '@/components/icons/eye-icon';
import { useCreateProductMutation } from '@/data/product';

export type LanguageSwitcherProps = {
  record: any;
  slug: string;
  deleteModalView?: string | any;
  routes: any;
  className?: string | undefined;
};

const LanguageSwitcher = ({
  record,
  slug,
  deleteModalView,
  routes,
  className = '',
}: LanguageSwitcherProps) => {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { locales, locale } = router;
  const { mutate: createProduct } = useCreateProductMutation();
  
  // Получаем язык из роутера или используем дефолтный
  const currentLanguage = locale || Config.defaultLanguage;

  let filterItem = [...languageMenu]?.filter((element) =>
    locales?.includes(element?.id)
  );

  let options = [...filterItem]?.filter(
    (filter) =>
      !record?.translated_languages?.find(
        (translated: any) => translated === filter?.value
      )
  );

  let filterTranslatedItem = [...languageMenu]
    ?.filter((element) => record?.translated_languages?.includes(element?.id))
    .filter((item: any) => !locale?.includes(item?.id));

  const { x, y, reference, floating, strategy, update, refs } = useFloating({
    strategy: 'fixed',
    placement: 'bottom',
    middleware: [offset(20), flip(), shift()],
  });

  // This one is for recalculating the position of the floating element if no space is left on the given placement
  useEffect(() => {
    if (!refs.reference.current || !refs.floating.current) {
      return;
    }
    return autoUpdate(refs.reference.current, refs.floating.current, update);
  }, [refs.reference, refs.floating, update]);

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
    const shopSlug = router.query.shop || record?.shop?.slug || record?.shop_id;
    if (shopSlug) {
      editUrl = `/${shopSlug}/products/${slug}/edit-wizard`;
    } else {
      // Fallback - используем текущий shop из роутера или формируем без shop
      editUrl = router.query.shop ? `/${router.query.shop}/products/${slug}/edit-wizard` : `/products/${slug}/edit-wizard`;
    }
  } else if (routes?.edit) {
    // Для остальных сущностей используем routes.edit()
    editUrl = routes.edit(slug, currentLanguage, router.query.shop as string);
  } else if (routes?.editWithoutLang) {
    // Если есть editWithoutLang, используем его
    editUrl = routes.editWithoutLang(slug, router.query.shop as string);
  }
  
  return (
    <div className={`flex w-full items-center justify-end gap-5 ${className}`}>
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
            console.log('=== Copying product ===');
            console.log('Original slug:', record?.slug);
            console.log('Base slug (without code):', baseSlug);
            console.log('Product name (original, without "копия"):', payload.name);
            console.log('Payload (slug will be generated by API):', payload);
            createProduct(payload as any);
          } catch (error) {
            console.error('Error copying product:', error);
          }
        }}
      />
      {/* View on storefront */}
      <a
        href={`${process.env.NEXT_PUBLIC_SHOP_URL}/element/${record?.full_slug || record?.canonical_url?.replace(/^https?:\/\/[^\/]+/, '') || slug}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-full transition duration-200 hover:opacity-80 focus:outline-none"
        style={{ backgroundColor: 'var(--toastify-spinner-color, #616161)' }}
        title={t('common:text-view') || 'View on site'}
      >
        <Eye width={16} style={{ color: '#E0F316' }} />
      </a>
      {Config.defaultLanguage === router.locale && (
        // <Popover className="relative inline-block">
        //   <Popover.Button
        //     className="p-2 text-base opacity-80 transition duration-200 hover:text-heading"
        //     ref={reference}
        //   >
        //     <ToggleIcon width={20} />
        //   </Popover.Button>
        //   <div
        //     ref={floating}
        //     style={{
        //       position: strategy,
        //       top: y ?? '',
        //       left: x ?? '',
        //       zIndex: 1,
        //     }}
        //   >
        //     <Popover.Panel className="w-[18rem] max-w-[20rem] overflow-hidden rounded bg-[#F7F8F9] px-4 shadow-translatePanel sm:px-0">
        //       {options?.length ? (
        //         <LanguageListbox
        //           title={t('text-non-translated-title')}
        //           items={options}
        //           translate="false"
        //           slug={slug}
        //           id={record?.id}
        //           routes={routes}
        //         />
        //       ) : (
        //         ''
        //       )}
        //       {filterTranslatedItem?.length ? (
        //         <LanguageListbox
        //           title={t('text-translated-title')}
        //           items={filterTranslatedItem}
        //           translate="true"
        //           slug={slug}
        //           id={record?.id}
        //           routes={routes}
        //         />
        //       ) : (
        //         ''
        //       )}
        //     </Popover.Panel>
        //   </div>
        // </Popover>
        <PopOver>
          {options?.length ? (
            <LanguageListbox
              title={t('text-non-translated-title')}
              items={options}
              translate="false"
              slug={slug}
              id={record?.id}
              routes={routes}
            />
          ) : (
            ''
          )}
          {filterTranslatedItem?.length ? (
            <LanguageListbox
              title={t('text-translated-title')}
              items={filterTranslatedItem}
              translate="true"
              slug={slug}
              id={record?.id}
              routes={routes}
            />
          ) : (
            ''
          )}
        </PopOver>
      )}
    </div>
  );
};

export default LanguageSwitcher;
