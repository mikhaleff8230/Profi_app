function routesFactory(endpoint: string) {
  return {
    list: `${endpoint}`,
    create: `${endpoint}/create`,
    editWithoutLang: (slug: string, shop?: string) => {
      return shop
        ? `/${shop}${endpoint}/${slug}/edit`
        : `${endpoint}/${slug}/edit`;
    },
    edit: (slug: string, language: string, shop?: string) => {
      return shop
        ? `/${language}/${shop}${endpoint}/${slug}/edit`
        : `${language}${endpoint}/${slug}/edit`;
    },
    translate: (slug: string, language: string, shop?: string) => {
      return shop
        ? `/${language}/${shop}${endpoint}/${slug}/translate`
        : `${language}${endpoint}/${slug}/translate`;
    },
    details: (slug: string) => `${endpoint}/${slug}`,
  };
}

export const Routes = {
  dashboard: '/',
  login: '/login',
  logout: '/logout',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  adminMyShops: '/my-shops',
  profile: '/profile',
  verifyCoupons: '/coupons/verify',
  settings: '/settings',
  storeSettings: '/vendor/settings',
  storeKeepers: '/vendor/store_keepers',
  profileUpdate: '/profile-update',
  checkout: '/orders/checkout',
  verifyEmail: '/verify-email',
  user: {
    ...routesFactory('/users'),
  },
  type: {
    ...routesFactory('/groups'),
  },
  category: {
    ...routesFactory('/categories'),
  },
  attribute: {
    ...routesFactory('/attributes'),
  },
  attributeValue: {
    ...routesFactory('/attribute-values'),
  },
  tag: {
    ...routesFactory('/tags'),
  },
  reviews: {
    ...routesFactory('/reviews'),
  },
  abuseReviews: {
    ...routesFactory('/abusive_reports'),
  },
  abuseReviewsReport: {
    ...routesFactory('/abusive_reports/reject'),
  },
  author: {
    ...routesFactory('/authors'),
  },
  coupon: {
    ...routesFactory('/coupons'),
  },
  manufacturer: {
    ...routesFactory('/manufacturers'),
  },
  order: {
    ...routesFactory('/orders'),
  },
  orderStatus: {
    ...routesFactory('/order-status'),
  },
  orderCreate: {
    ...routesFactory('/orders/create'),
  },
  product: {
    ...routesFactory('/products'),
  },
  productGroup: {
    ...routesFactory('/product-groups'),
    manageSkus: (groupSlug: string, shop?: string) => {
      return shop
        ? `/${shop}/product-groups/${groupSlug}/skus`
        : `/product-groups/${groupSlug}/skus`;
    },
    generateSkus: (groupSlug: string, shop?: string) => {
      return shop
        ? `/${shop}/product-groups/${groupSlug}/generate-skus`
        : `/product-groups/${groupSlug}/generate-skus`;
    },
  },
  shop: {
    ...routesFactory('/shops'),
  },
  tax: {
    ...routesFactory('/taxes'),
  },
  shipping: {
    ...routesFactory('/shippings'),
  },
  withdraw: {
    ...routesFactory('/withdraws'),
  },
  staff: {
    ...routesFactory('/staffs'),
  },
  refund: {
    ...routesFactory('/refunds'),
  },
  question: {
    ...routesFactory('/questions'),
  },
  message: {
    ...routesFactory('/message'),
  },
  shopMessage: {
    ...routesFactory('/shop-message'),
  },
  conversations: {
    ...routesFactory('/message/conversations'),
  },
  xmlImport: {
    ...routesFactory('/xml-import'),
  },
  placeImport: {
    ...routesFactory('/place-import'),
  },
  billing: {
    list: '/billing',
    settings: '/billing/settings',
    paymentHistory: '/billing/payment-history',
  },
  proffi: {
    dashboard: '/proffi',
    customers: '/proffi/customers',
    specialists: '/proffi/specialists',
    tasks: '/proffi/tasks',
    applications: '/proffi/applications',
    chats: '/proffi/chats',
    categories: '/proffi/categories',
    works: '/proffi/works',
    questions: '/proffi/questions',
    responseSettings: '/proffi/response-settings',
    matchingSettings: '/proffi/matching-settings',
    brandingSettings: '/proffi/branding-settings',
    mobileUpdateSettings: '/proffi/mobile-update-settings',
    aiChat: '/proffi/ai-chat',
    reviews: '/proffi/reviews',
    verifications: '/proffi/verifications',
  },
};
