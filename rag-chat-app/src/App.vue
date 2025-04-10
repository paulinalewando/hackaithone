<template>
  <div class="container">
    <div class="chat-container">
      <header class="chat-header">
        <div class="header-content">
          <!-- Removed logo image -->
          Amsterdam Standard Wiki Assistant
        </div>
        <div class="settings">
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
    // Call the actual API server
    const response = await axios.post("/api/ask", { question: userMessage });
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

// Auto-scroll to bottom when messages change
watch(messages, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
});

// Initial scroll to bottom on mount
onMounted(() => {
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
}

.message-wrapper {
  display: flex;
  margin-bottom: 1rem;
}
</style>
