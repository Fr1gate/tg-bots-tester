interface TgUpdate {
  message?: { chat: TgChat; from?: TgUser }
  channel_post?: { chat: TgChat }
  my_chat_member?: { chat: TgChat }
}

interface TgChat {
  id: number
  type: string
  title?: string
  username?: string
  first_name?: string
  last_name?: string
}

interface TgUser {
  first_name?: string
  last_name?: string
  username?: string
}

export interface ResolvedChat {
  id: number
  type: string
  name: string
  username?: string
}

export default defineEventHandler(async (event) => {
  const { token } = await readBody(event)

  if (!token?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Token is required' })
  }

  try {
    const res = await $fetch<{ ok: boolean; result: TgUpdate[]; description?: string }>(
      `https://api.telegram.org/bot${token}/getUpdates`,
      { query: { limit: 100 } }
    )

    if (!res.ok) {
      return { ok: false, error: res.description ?? 'Telegram error' }
    }

    const seen = new Map<number, ResolvedChat>()

    for (const update of res.result) {
      const chat = update.message?.chat ?? update.channel_post?.chat ?? update.my_chat_member?.chat
      if (!chat || seen.has(chat.id)) continue

      let name = chat.title ?? [chat.first_name, chat.last_name].filter(Boolean).join(' ')
      if (update.message?.from && chat.type === 'private') {
        const f = update.message.from
        name = [f.first_name, f.last_name].filter(Boolean).join(' ') || name
      }

      seen.set(chat.id, {
        id: chat.id,
        type: chat.type,
        name: name || `Chat ${chat.id}`,
        username: chat.username
      })
    }

    return { ok: true, chats: [...seen.values()] }
  } catch (e: any) {
    return { ok: false, error: e?.data?.description ?? e?.message ?? 'Request failed' }
  }
})
