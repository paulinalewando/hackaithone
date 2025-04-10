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

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Main route to handle chat questions
app.post("/ask", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        status: "error",
        error: "Question is required",
      });
    }

    console.log(`Received question: "${question}"`);

    // Process the question using the real enhanced RAG chain
    const result = await askQuestion(question);

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

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "API is operational" });
});

// Start the server
app.listen(port, () => {
  console.log(`RAG Chat API server listening on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Chat endpoint: http://localhost:${port}/ask (POST)`);
});
