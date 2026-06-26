import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import CreateOrUpdateWithdrawForm from '@/components/withdraw/withdraw-form';
import ShopLayout from '@/components/layouts/shop';
import {
  adminAndOwnerOnly,
  adminOnly,
  getAuthCredentials,
  hasAccess,
} from '@/utils/auth-utils';
import { Routes } from '@/config/routes';
import { useShopQuery } from '@/data/shop';
import { useMeQuery } from '@/data/user';
import { useRouter } from 'next/router';

export default function CreateWithdrawPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    query: { shop },
  } = useRouter();
  const { permissions } = getAuthCredentials();
  const { data: me } = useMeQuery();
  const { data: shopData } = useShopQuery({
    slug: shop as string,
  });
  const shopId = shopData?.id!;
  if (
    !hasAccess(adminOnly, permissions) &&
    !me?.shops?.map((shop) => shop.id).includes(shopId) &&
    me?.managed_shop?.id != shopId
  ) {
    router.replace(Routes.dashboard);
  }
  return (
    <>
      <div className="flex py-5 border-b border-gray-300 border-dashed sm:py-8">
        <h1 className="text-lg font-semibold text-heading">
          {t('form:form-title-create-withdraw')}
        </h1>
      </div>
      <div className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5">
      <div id="intellectmoney-payform" className="h-screen"><iframe width="100%" height="100%" frameBorder="0" src="https://merchant.intellectmoney.ru/v2/ru/prepareForm/?EshopId=467157&ServiceName=%D0%9E%D0%BF%D0%BB%D0%B0%D1%82%D0%B0%20%D0%B7%D0%B0%20%D1%83%D1%81%D0%BB%D1%83%D0%B3%D0%B8%20%D0%BC%D0%B0%D1%80%D0%BA%D0%B5%D1%82%D0%BF%D0%BB%D0%B5%D0%B9%D1%81%D0%B0%20SANCAN&ServiceNameAuthor=0&PaymentAmount=150&PaymentCurrency=RUB&PaymentAmountIsReadonly=true&ButtonName=0&OpenNewWindow=true&UserFullName=true&UserEmail=true&PhoneNumber=true&SuccessUrl=https%3A%2F%2Fseller.treabo.md%2F&MerchantReceipt=&Comment=true&CommentTip=%D0%9D%D0%B0%D0%B7%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5%20%D0%BC%D0%B0%D0%B3%D0%B0%D0%B7%D0%B8%D0%BD%D0%B0%3A&Hash=ee1ce7870d5ccbbcad63f690a0c1cf53&PayerData=&Email=">
      </iframe></div>
      </div>
      <CreateOrUpdateWithdrawForm />
    </>
  );
}


CreateWithdrawPage.authenticate = {
  permissions: adminAndOwnerOnly,
};
CreateWithdrawPage.Layout = ShopLayout;

export const getServerSideProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common'])),
  },
});
