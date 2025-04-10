// Simple API server to connect the Vue chat app with the enhanced RAG chain
import * as dotenv from "dotenv";
// Load environment variables
dotenv.config();

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { askQuestion } from "../enhanced-rag-chain.js";

const app = express();
const port = process.env.PORT || 3000;

// Keep track of sessions for debugging
const activeSessions = new Set();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Main route to handle chat questions
app.post("/ask", async (req, res) => {
  try {
    // Get session ID from request or generate a new one
    const { question, sessionId = generateSessionId() } = req.body;

    if (!question) {
      return res.status(400).json({
        status: "error",
        error: "Question is required",
      });
    }

    // Track active sessions
    activeSessions.add(sessionId);
    console.log(
      `Received question: "${question}" with session ID: ${sessionId}`
    );
    console.log(`Active sessions: ${activeSessions.size}`);

    // Process the question using the enhanced RAG chain with the session ID for conversation history
    const result = await askQuestion(question, sessionId);

    return res.json(result);
  } catch (error) {
    console.error("Error processing question:", error);

    return res.status(500).json({
      status: "error",
      error: "Failed to process your question",
      message: error.message,
    });
  }
});

// Helper function to generate a random session ID if none is provided
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Get active sessions endpoint
app.get("/sessions", (req, res) => {
  res.json({
    status: "ok",
    activeSessions: Array.from(activeSessions),
    count: activeSessions.size,
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "API is operational",
    activeSessions: activeSessions.size,
  });
});

// Start the server
app.listen(port, () => {
  console.log(`RAG Chat API server listening on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Chat endpoint: http://localhost:${port}/ask (POST)`);
  console.log(`Sessions endpoint: http://localhost:${port}/sessions (GET)`);
  console.log(`Conversation history is enabled!`);
});
