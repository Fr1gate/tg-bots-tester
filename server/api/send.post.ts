export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { token, chatId, text } = body

  if (!token || !chatId || !text?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`

  try {
    const res = await $fetch<{ ok: boolean; description?: string }>(url, {
      method: 'POST',
      body: { chat_id: chatId, text }
    })

    if (!res.ok) {
      return { ok: false, error: res.description ?? 'Telegram error' }
    }

    return { ok: true }
  } catch (e: any) {
    const desc = e?.data?.description ?? e?.message ?? 'Request to Telegram failed'
    return { ok: false, error: desc }
  }
})
