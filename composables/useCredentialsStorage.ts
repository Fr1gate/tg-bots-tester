const STORAGE_KEY = 'telegram-bot-tester:credentials'
const MAX_BOTS = 15
const MAX_CHAT_IDS_PER_BOT = 20

export interface BotEntry {
  token: string
  chatIds: string[]
}

interface CredentialsData {
  bots: BotEntry[]
}

function readStorage(): CredentialsData {
  if (import.meta.server) return { bots: [] }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { bots: [] }

    const parsed = JSON.parse(raw) as CredentialsData
    if (!Array.isArray(parsed.bots)) return { bots: [] }

    return parsed
  } catch {
    return { bots: [] }
  }
}

function writeStorage(data: CredentialsData) {
  if (import.meta.server) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function useCredentialsStorage() {
  const savedTokens = ref<string[]>([])

  function refresh() {
    savedTokens.value = readStorage().bots.map(b => b.token)
  }

  function getLastCredentials(): { token: string; chatId: string } | null {
    const { bots } = readStorage()
    const bot = bots[0]
    if (!bot) return null

    return { token: bot.token, chatId: bot.chatIds[0] ?? '' }
  }

  function getChatIdForToken(token: string): string {
    return getChatIdsForToken(token)[0] ?? ''
  }

  function getChatIdsForToken(token: string): string[] {
    const entry = readStorage().bots.find(b => b.token === token.trim())
    return entry?.chatIds ?? []
  }

  function recordSuccess(token: string, chatId: string) {
    const trimmedToken = token.trim()
    const trimmedChatId = chatId.trim()
    if (!trimmedToken || !trimmedChatId) return

    const data = readStorage()
    const existing = data.bots.find(b => b.token === trimmedToken)

    const entry: BotEntry = existing
      ? {
          token: trimmedToken,
          chatIds: [
            trimmedChatId,
            ...existing.chatIds.filter(id => id !== trimmedChatId)
          ].slice(0, MAX_CHAT_IDS_PER_BOT)
        }
      : { token: trimmedToken, chatIds: [trimmedChatId] }

    data.bots = [entry, ...data.bots.filter(b => b.token !== trimmedToken)].slice(0, MAX_BOTS)
    writeStorage(data)
    refresh()
  }

  refresh()

  return {
    savedTokens,
    getLastCredentials,
    getChatIdForToken,
    getChatIdsForToken,
    recordSuccess
  }
}
