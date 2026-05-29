export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  css: ['~/assets/scss/main.scss'],

  devServer: {
    port: 47891
  },

  runtimeConfig: {
    botToken: process.env.BOT_TOKEN || '',
    chatId: process.env.CHAT_ID || ''
  },

  devtools: { enabled: false }
})
