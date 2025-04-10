<template>
  <div class="container">
    <div class="chat-container">
      <header class="chat-header">
        <div class="header-content">
          <!-- Removed logo image -->
          Amsterdam Standard Wiki Assistant
        </div>
        <div class="settings">
          <div class="session-info">
            <span
              v-if="historyLength > 0"
              class="history-badge"
              title="Number of messages in conversation history"
            >
              {{ historyLength }}
            </span>
            <button
              @click="resetConversation"
              class="reset-button"
              title="Reset conversation"
            >
              New Chat
            </button>
          </div>
          <label>
            <input
              type="checkbox"
              v-model="showSources"
              class="sources-toggle"
            />
            Show Sources
          </label>
        </div>
      </header>

      <div class="chat-messages" ref="messagesContainer">
        <div
          v-for="(message, index) in messages"
          :key="index"
          class="message-wrapper"
        >
          <div
            :class="[
              'message',
              message.role === 'user' ? 'message-user' : 'message-bot',
            ]"
          >
            {{ message.content }}

            <!-- Sources display -->
            <div
              v-if="
                showSources && message.sources && message.sources.length > 0
              "
              class="sources-container"
            >
              <div class="sources-title">Sources:</div>
              <div
                v-for="(source, sourceIndex) in message.sources"
                :key="sourceIndex"
                class="source-item"
              >
                {{ source }}
              </div>
            </div>
          </div>
        </div>

        <!-- Thinking indicator -->
        <div v-if="isThinking" class="message message-bot thinking">
          Thinking
          <div class="thinking-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        </div>
      </div>

      <div class="chat-input">
        <input
          v-model="userInput"
          type="text"
          placeholder="Ask me anything about the company..."
          @keyup.enter="sendMessage"
          :disabled="isThinking"
        />
        <button
          @click="sendMessage"
          :disabled="isThinking || !userInput.trim()"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from "vue";
import axios from "axios";

// State
const userInput = ref("");
const messages = ref([
  {
    role: "bot",
    content:
      "Hello! I'm your Amsterdam Standard Wiki assistant. How can I help you today?",
    sources: [],
  },
]);
const isThinking = ref(false);
const showSources = ref(true);
const messagesContainer = ref(null);
const sessionId = ref(generateSessionId());
const historyLength = ref(0);

// Generate a unique session ID
function generateSessionId() {
  return `web_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Methods
const sendMessage = async () => {
  if (!userInput.value.trim() || isThinking.value) return;

  // Add user message
  const userMessage = userInput.value.trim();
  messages.value.push({ role: "user", content: userMessage, sources: [] });
  userInput.value = "";

  // Show thinking state
  isThinking.value = true;

  try {
    // Call the actual API server with session ID
    const response = await axios.post("/api/ask", {
      question: userMessage,
      sessionId: sessionId.value,
    });

    // Update history length if provided
    if (response.data.historyLength) {
      historyLength.value = response.data.historyLength;
    }

    messages.value.push({
      role: "bot",
      content: response.data.answer,
      sources: response.data.sources,
    });
  } catch (error) {
    console.error("API call error:", error);
    messages.value.push({
      role: "bot",
      content:
        "Sorry, I encountered an error while processing your question. Please try again.",
      sources: [],
    });
  } finally {
    isThinking.value = false;
  }
};

// Save session ID to localStorage when it changes
watch(sessionId, (newSessionId) => {
  localStorage.setItem("chatSessionId", newSessionId);
  console.log(`Session ID saved: ${newSessionId}`);
});

// Auto-scroll to bottom when messages change
watch(messages, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
});

// Reset conversation
const resetConversation = () => {
  // Generate a new session ID
  sessionId.value = generateSessionId();

  // Clear messages except for the initial greeting
  messages.value = [
    {
      role: "bot",
      content:
        "Hello! I'm your Amsterdam Standard Wiki assistant. How can I help you today?",
      sources: [],
    },
  ];

  historyLength.value = 0;
};

// Initial scroll to bottom on mount
onMounted(() => {
  // Try to restore session ID from localStorage
  const savedSessionId = localStorage.getItem("chatSessionId");
  if (savedSessionId) {
    sessionId.value = savedSessionId;
    console.log(`Restored session ID: ${sessionId.value}`);
  }

  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
});
</script>

<style>
/* Additional component-specific styles could go here, 
   but we're using the global styles from base.css for most styling */

.sources-toggle {
  margin-right: 0.25rem;
}

.header-content {
  display: flex;
  align-items: center;
}

.settings {
  font-size: 0.875rem;
  font-weight: normal;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.session-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.history-badge {
  background-color: #4285f4;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
}

.reset-button {
  background-color: #f1f3f4;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.reset-button:hover {
  background-color: #e0e0e0;
}

.message-wrapper {
  display: flex;
  margin-bottom: 1rem;
}
</style>
