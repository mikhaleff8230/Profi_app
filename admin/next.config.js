/** @type {import('next').NextConfig} */
const runtimeCaching = require('next-pwa/cache');
const { i18n } = require('./next-i18next.config');
const withPWA = require('next-pwa')({
  disable: process.env.DISABLE_PWA === 'true' || process.env.NODE_ENV === 'development',
  dest: 'public',
  runtimeCaching,
});

module.exports = withPWA({
  reactStrictMode: true,
  i18n,
  images: {
    // Allow displaying images from any external host by disabling optimization
    // This prevents runtime errors when imported products reference remote URLs
    unoptimized: true,
    domains: [
      'via.placeholder.com',
      'res.cloudinary.com',
      's3.amazonaws.com',
      '127.0.0.1',
      'localhost', 
      '91.198.220.110',
      'treabo.md',
      'api.treabo.md',
      'picsum.photos',
      'pixarlaravel.s3.ap-southeast-1.amazonaws.com',
      'pickbazarlaravel.s3.ap-southeast-1.amazonaws.com',
      'lh3.googleusercontent.com',
      's3.twcstorage.ru', // добавлен Timeweb S3 домен
      'svetlanashtefan.com', // временно для импортированных товаров
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.twcstorage.ru',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'svetlanashtefan.com',
        pathname: '/**',
      },
    ],
  },
  ...(process.env.APPLICATION_MODE === 'production' && {
    typescript: {
      ignoreBuildErrors: true, 
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
  }),
});
