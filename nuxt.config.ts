export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  css: ['~/assets/scss/main.scss'],

  runtimeConfig: {
    botToken: process.env.BOT_TOKEN || '',
    chatId: process.env.CHAT_ID || ''
  },

  devtools: { enabled: false }
})
