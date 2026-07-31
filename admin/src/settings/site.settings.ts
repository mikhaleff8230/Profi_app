import { adminAndOwnerOnly, adminOwnerAndStaffOnly, adminOnly } from '@/utils/auth-utils';
import { Routes } from '@/config/routes';

export const siteSettings = {
  name: 'SANCAN Seller',
  description: '',
  logo: {
    url: '/logo.svg',
    alt: 'SANCAN',
    href: '/',
    width: 128,
    height: 40,
  },
  defaultLanguage: 'ru',
  author: {
    name: 'RedQ, Inc.',
    websiteUrl: 'https://redq.io',
    address: '',
  },
  headerLinks: [],
  authorizedLinks: [
    {
      href: Routes.profileUpdate,
      labelTransKey: 'authorized-nav-item-profile',
    },
    {
      href: Routes.logout,
      labelTransKey: 'authorized-nav-item-logout',
    },
  ],
  currencyCode: 'RUB',
  defaultFractions: 0,
  sidebarLinks: {
    admin: [
      {
        href: Routes.dashboard,
        label: 'sidebar-nav-item-dashboard',
        icon: 'DashboardIcon',
      },
      {
        href: Routes.proffi.dashboard,
        label: 'Treabo',
        icon: 'DashboardIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.proffi.customers,
        label: 'Treabo заказчики',
        icon: 'UsersIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.proffi.specialists,
        label: 'Treabo специалисты',
        icon: 'UsersIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.proffi.tasks,
        label: 'Treabo заказы',
        icon: 'OrdersIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.proffi.applications,
        label: 'Treabo отклики',
        icon: 'DiaryIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.proffi.reviews,
        label: 'Treabo отзывы',
        icon: 'ReviewIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.proffi.verifications,
        label: 'Treabo верификация',
        icon: 'UsersIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.proffi.chats,
        label: 'Treabo чаты',
        icon: 'ChatIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.proffi.categories,
        label: 'Категории',
        icon: 'CategoriesIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.proffi.works,
        label: 'Работы',
        icon: 'CategoriesIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.proffi.questions,
        label: 'Вопросы',
        icon: 'QuestionIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.proffi.aiOperations,
        label: 'AI качество и обучение',
        icon: 'SettingsIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.proffi.questionFlow,
        label: 'Логика вопросов',
        icon: 'QuestionIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.proffi.responseSettings,
        label: 'Treabo настройки откликов',
        icon: 'DiaryIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.proffi.brandingSettings,
        label: 'Treabo логотип',
        icon: 'SettingsIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.proffi.matchingSettings,
        label: 'Treabo подбор мастеров',
        icon: 'UsersIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.proffi.mobileUpdateSettings,
        label: 'Treabo app update',
        icon: 'DownloadIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.proffi.aiLab,
        label: 'AI Лаборатория',
        icon: 'ImportIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.proffi.aiChat,
        label: 'AI системные инструкции',
        icon: 'QuestionIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.shop.list,
        label: 'sidebar-nav-item-shops',
        icon: 'ShopIcon',
      },
      {
        href: Routes.adminMyShops,
        label: 'sidebar-nav-item-my-shops',
        icon: 'MyShopIcon',
      },
      {
        href: Routes.product.list,
        label: 'sidebar-nav-item-products',
        icon: 'ProductsIcon',
      },
      {
        href: Routes.attribute.list,
        label: 'sidebar-nav-item-attributes',
        icon: 'AttributeIcon',
      },
      {
        href: Routes.type.list,
        label: 'sidebar-nav-item-groups',
        icon: 'TypesIcon',
      },
      {
        href: Routes.manufacturer.list,
        label: 'sidebar-nav-item-manufacturers',
        icon: 'TypesIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.category.list,
        label: 'sidebar-nav-item-categories',
        icon: 'CategoriesIcon',
      },
      {
        href: Routes.tag.list,
        label: 'sidebar-nav-item-tags',
        icon: 'TagIcon',
      },
      {
        href: Routes.order.list,
        label: 'sidebar-nav-item-orders',
        icon: 'OrdersIcon',
      },
      // {
      //   href: Routes.order.create,
      //   label: 'sidebar-nav-item-create-order',
      //   icon: 'CalendarScheduleIcon',
      // },
      {
        href: Routes.user.list,
        label: 'sidebar-nav-item-users',
        icon: 'UsersIcon',
      },
      {
        href: Routes.tax.list,
        label: 'sidebar-nav-item-taxes',
        icon: 'TaxesIcon',
      },
      {
        href: Routes.billing.list,
        label: 'sidebar-nav-item-balance-payments',
        icon: 'TaxesIcon',
      },
      {
        href: Routes.billing.paymentHistory,
        label: 'sidebar-nav-item-payment-history',
        icon: 'TaxesIcon',
        permissions: adminOnly,
      },
      {
        href: Routes.withdraw.list,
        label: 'sidebar-nav-item-withdraws',
        icon: 'WithdrawIcon',
      },
      {
        href: Routes.question.list,
        label: 'sidebar-nav-item-questions',
        icon: 'QuestionIcon',
      },
      {
        href: Routes.reviews.list,
        label: 'sidebar-nav-item-reviews',
        icon: 'ReviewIcon',
      },
      {
        href: Routes.settings,
        label: 'sidebar-nav-item-settings',
        icon: 'SettingsIcon',
      },
      {
        href: '/xml-import',
        label: 'sidebar-nav-item-xml-import',
        icon: 'ImportIcon',
      },
      {
        href: '/place-import',
        label: 'sidebar-nav-item-place-import',
        icon: 'ImportIcon',
      },
    ],
    shop: [
      {
        href: (shop: string) => `${Routes.dashboard}${shop}`,
        label: 'sidebar-nav-item-dashboard',
        icon: 'DashboardIcon',
        permissions: adminOwnerAndStaffOnly,
      },
      {
        href: (shop: string) => `/${shop}${Routes.product.list}`,
        label: 'sidebar-nav-item-products',
        icon: 'ProductsIcon',
        permissions: adminOwnerAndStaffOnly,
      },
      {
        href: (shop: string) => `/${shop}${Routes.order.list}`,
        label: 'sidebar-nav-item-orders',
        icon: 'OrdersIcon',
        permissions: adminOwnerAndStaffOnly,
      },
      {
        href: (shop: string) => `/${shop}${Routes.reviews.list}`,
        label: 'sidebar-nav-item-reviews',
        icon: 'ReviewIcon',
        permissions: adminAndOwnerOnly,
      },
      {
        href: (shop: string) => `/${shop}${Routes.question.list}`,
        label: 'sidebar-nav-item-questions',
        icon: 'QuestionIcon',
        permissions: adminAndOwnerOnly,
      },
      {
        href: (shop: string) => `/${shop}/billing`,
        label: 'sidebar-nav-item-balance-payments',
        icon: 'TaxesIcon',
        permissions: adminAndOwnerOnly,
      },
      {
        href: (shop: string) => `/${shop}${Routes.staff.list}`,
        label: 'sidebar-nav-item-staffs',
        icon: 'UsersIcon',
        permissions: adminAndOwnerOnly,
      },
    ],
  },
  product: {
    placeholder: '/product-placeholder.svg',
  },
  avatar: {
    placeholder: '/avatar-placeholder.svg',
  },
};
