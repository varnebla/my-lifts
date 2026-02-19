// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      link: [
        {
          rel: 'icon',
          type: 'image/png',
          href: '/favicon-96x96.png',
          sizes: '96x96'
        },
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: '/favicon.svg'
        },
        {
          rel: 'shortcut icon',
          href: '/favicon.ico'
        },
        {
          rel: 'apple-touch-icon',
          sizes: '180x180',
          href: '/apple-touch-icon.png'
        },
        {
          rel: 'manifest',
          href: '/site.webmanifest'
        }
      ],
      meta: [
        {
          name: 'apple-mobile-web-app-title',
          content: 'MyLifts'
        }
      ],
      script: process.env.NODE_ENV === 'production'
        ? [
            {
              defer: true,
              src: 'https://analytics.varnebla.dev/script.js',
              'data-website-id': '03902885-4c97-4fb7-b7f5-bcb6646d7cfa'
            }
          ]
        : []
    }
  },

  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxt/fonts'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'dark'
  },

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
    }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  fonts: {
    families: [
      { name: 'Inter', provider: 'google' },
      { name: 'Bebas Neue', provider: 'google' }
    ]
  },

  nitro: {
    preset: 'bun'
  }
})
