<template>
  <div class="page-wrapper">
    <div class="bot-card">
      <div class="bot-card__header">
        <div class="bot-card__avatar">🤖</div>
        <div class="bot-card__meta">
          <div class="bot-card__name">Telegram Bot Tester</div>
          <div class="bot-card__status">ready</div>
        </div>
      </div>

      <div class="bot-card__body">
        <div class="settings-section">
          <div class="settings-section__title">Credentials</div>
          <div class="settings-section__grid">
            <div class="field-group field-group--token">
              <label for="token">Bot Token</label>
              <div class="token-input-wrap">
                <input
                  id="token"
                  v-model="token"
                  type="text"
                  class="tg-input tg-input--mono"
                  placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                  autocomplete="off"
                  @focus="tokenFocused = true"
                  @blur="onTokenBlur"
                />
                <ul
                  v-if="tokenFocused && filteredTokens.length"
                  class="token-suggestions"
                >
                  <li
                    v-for="savedToken in filteredTokens"
                    :key="savedToken"
                    class="token-suggestions__item"
                    @mousedown.prevent="selectToken(savedToken)"
                  >
                    {{ maskToken(savedToken) }}
                  </li>
                </ul>
              </div>
            </div>

            <div class="field-group field-group--chat-id">
              <div class="field-row">
                <label for="chatId">Chat ID</label>
                <button
                  class="resolve-btn"
                  :class="{ 'resolve-btn--loading': resolving }"
                  :disabled="!token.trim() || resolving"
                  @click="resolveChats"
                >
                  <span v-if="resolving" class="spinner spinner--sm" />
                  <span v-else>⟳</span>
                  {{ resolving ? "Loading..." : "Resolve" }}
                </button>
              </div>

              <div class="token-input-wrap">
                <input
                  id="chatId"
                  v-model="chatId"
                  type="text"
                  class="tg-input tg-input--mono"
                  placeholder="-1001234567890"
                  autocomplete="off"
                  @focus="chatIdFocused = true"
                  @blur="onChatIdBlur"
                />
                <ul
                  v-if="chatIdFocused && filteredChatIds.length"
                  class="token-suggestions"
                >
                  <li
                    v-for="savedChatId in filteredChatIds"
                    :key="savedChatId"
                    class="token-suggestions__item"
                    @mousedown.prevent="selectChatId(savedChatId)"
                  >
                    {{ savedChatId }}
                  </li>
                </ul>
              </div>

              <transition name="slide">
                <div v-if="resolveError" class="resolve-error">
                  {{ resolveError }}
                </div>
              </transition>

              <transition name="slide">
                <div v-if="chats.length" class="chat-list">
                  <div class="chat-list__hint">
                    Найдено {{ chats.length }} {{ chatWord(chats.length) }} —
                    выберите нужный:
                  </div>
                  <button
                    v-for="chat in chats"
                    :key="chat.id"
                    class="chat-item"
                    :class="{ 'chat-item--active': chatId === String(chat.id) }"
                    @click="pickChat(chat)"
                  >
                    <span class="chat-item__icon">{{
                      chatIcon(chat.type)
                    }}</span>
                    <span class="chat-item__info">
                      <span class="chat-item__name">{{ chat.name }}</span>
                      <span class="chat-item__meta">
                        {{ chat.username ? `@${chat.username} · ` : ""
                        }}{{ chat.type }}
                      </span>
                    </span>
                    <span class="chat-item__id">{{ chat.id }}</span>
                  </button>
                </div>
              </transition>

              <transition name="slide">
                <div v-if="noChats" class="resolve-empty">
                  Нет обновлений. Напишите боту любое сообщение и нажмите
                  Resolve снова.
                </div>
              </transition>
            </div>
          </div>
        </div>

        <div class="divider" />

        <div class="message-area">
          <div class="message-area__label">Message</div>
          <textarea
            v-model="message"
            class="tg-input"
            placeholder="Введите сообщение..."
            :maxlength="4096"
            @keydown.ctrl.enter="send"
          />
          <span
            class="message-area__counter"
            :class="{
              'message-area__counter--warn': message.length > 3500,
              'message-area__counter--over': message.length >= 4096,
            }"
          >
            {{ message.length }} / 4096
          </span>
        </div>
      </div>

      <div class="bot-card__footer">
        <transition name="fade">
          <div
            v-if="status"
            class="toast"
            :class="status.ok ? 'toast--success' : 'toast--error'"
          >
            <span>{{ status.ok ? "✓" : "✗" }}</span>
            {{ status.text }}
          </div>
        </transition>

        <button
          class="send-btn"
          :class="{ 'send-btn--loading': loading }"
          :disabled="!canSend"
          @click="send"
        >
          <span v-if="loading" class="spinner" />
          <span v-else>➤</span>
          {{ loading ? "Sending..." : "Send" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ResolvedChat {
  id: number;
  type: string;
  name: string;
  username?: string;
}

const {
  savedTokens,
  getLastCredentials,
  getChatIdForToken,
  getChatIdsForToken,
  recordSuccess,
} = useCredentialsStorage();

const token = ref("");
const chatId = ref("");
const message = ref("");
const loading = ref(false);
const status = ref<{ ok: boolean; text: string } | null>(null);

const resolving = ref(false);
const chats = ref<ResolvedChat[]>([]);
const resolveError = ref("");
const noChats = ref(false);
const tokenFocused = ref(false);
const chatIdFocused = ref(false);
const savedChatIds = ref<string[]>([]);

function refreshSavedChatIds() {
  savedChatIds.value = token.value.trim()
    ? getChatIdsForToken(token.value)
    : [];
}

const filteredTokens = computed(() => {
  const query = token.value.trim().toLowerCase();
  if (!query) return savedTokens.value;

  return savedTokens.value.filter(
    (t) =>
      t.toLowerCase().includes(query) ||
      maskToken(t).toLowerCase().includes(query),
  );
});

const filteredChatIds = computed(() => {
  const query = chatId.value.trim();
  if (!query) return savedChatIds.value;

  return savedChatIds.value.filter((id) => id.includes(query));
});

function maskToken(value: string) {
  const colon = value.indexOf(":");
  if (colon === -1) return "••••••••";
  return `${value.slice(0, colon + 1)}••••••••`;
}

function selectToken(value: string) {
  token.value = value;
  tokenFocused.value = false;
}

function onTokenBlur() {
  setTimeout(() => {
    tokenFocused.value = false;
  }, 120);
}

function selectChatId(value: string) {
  chatId.value = value;
  chatIdFocused.value = false;
}

function onChatIdBlur() {
  setTimeout(() => {
    chatIdFocused.value = false;
  }, 120);
}

let statusTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  const last = getLastCredentials();
  if (!last) return;

  token.value = last.token;
  refreshSavedChatIds();
  if (last.chatId) chatId.value = last.chatId;
});

watch(token, (newToken, oldToken) => {
  if (newToken.trim() === oldToken.trim()) return;

  refreshSavedChatIds();
  chatId.value = getChatIdForToken(newToken);
});

const canSend = computed(
  () =>
    token.value.trim() &&
    chatId.value.trim() &&
    message.value.trim() &&
    !loading.value,
);

function chatIcon(type: string) {
  if (type === "private") return "👤";
  if (type === "channel") return "📢";
  return "👥";
}

function chatWord(n: number) {
  if (n === 1) return "чат";
  if (n < 5) return "чата";
  return "чатов";
}

function pickChat(chat: ResolvedChat) {
  chatId.value = String(chat.id);
}

async function resolveChats() {
  resolving.value = true;
  chats.value = [];
  resolveError.value = "";
  noChats.value = false;

  try {
    const res = await $fetch<{
      ok: boolean;
      chats?: ResolvedChat[];
      error?: string;
    }>("/api/resolve", {
      method: "POST",
      body: { token: token.value.trim() },
    });

    if (!res.ok) {
      resolveError.value = res.error ?? "Ошибка";
      return;
    }

    if (!res.chats?.length) {
      noChats.value = true;
      return;
    }

    chats.value = res.chats;
  } catch (e: any) {
    resolveError.value = e?.data?.error ?? "Request failed";
  } finally {
    resolving.value = false;
  }
}

async function send() {
  if (!canSend.value) return;

  loading.value = true;
  status.value = null;
  if (statusTimer) clearTimeout(statusTimer);

  try {
    const { ok, error } = await $fetch<{ ok: boolean; error?: string }>(
      "/api/send",
      {
        method: "POST",
        body: {
          token: token.value.trim(),
          chatId: chatId.value.trim(),
          text: message.value,
        },
      },
    );

    if (ok) {
      recordSuccess(token.value, chatId.value);
      refreshSavedChatIds();
      status.value = { ok: true, text: "Message sent!" };
      message.value = "";
    } else {
      status.value = { ok: false, text: error ?? "Unknown error" };
    }
  } catch (e: any) {
    status.value = { ok: false, text: e?.data?.error ?? "Request failed" };
  } finally {
    loading.value = false;
    statusTimer = setTimeout(() => {
      status.value = null;
    }, 4000);
  }
}
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}

.slide-enter-active,
.slide-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
