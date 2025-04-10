// Enhanced RAG Question-Answering Chain with Hybrid Search and Source Attribution
import { Pinecone } from "@pinecone-database/pinecone";
import { Document } from "@langchain/core/documents";
import { PineconeStore } from "@langchain/pinecone";
import { AzureOpenAIEmbeddings } from "@langchain/openai";
import { AzureChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create a map to store conversation history for different sessions
const conversationHistories = new Map();

// Function to get or create a conversation history for a session
const getOrCreateConversationHistory = (sessionId = "default") => {
  if (!conversationHistories.has(sessionId)) {
    // Initialize a new conversation history for this session
    conversationHistories.set(sessionId, []);
  }
  return conversationHistories.get(sessionId);
};

// Add a message to the conversation history
const addMessageToHistory = (sessionId, role, content) => {
  const history = getOrCreateConversationHistory(sessionId);
  history.push({ role, content });

  // Limit history to last 10 messages to prevent context overload
  if (history.length > 10) {
    history.shift();
  }

  return history;
};

// Format conversation history for inclusion in the prompt
const formatConversationHistory = (history) => {
  if (!history || history.length === 0) {
    return "No previous conversation.";
  }

  return history
    .map(
      (message) =>
        `${message.role === "human" ? "User" : "Assistant"}: ${message.content}`
    )
    .join("\n\n");
};

// Function to perform hybrid search (combination of semantic and keyword search)
// This is a simplified implementation since actual hybrid search depends on vector store capabilities
async function hybridSearch(vectorStore, query, k = 12) {
  console.log(`Performing hybrid search for: "${query}"`);

  // Using fixed k value of 12 for all queries to ensure comprehensive results
  console.log(`Using fixed retrieval count k=${k} for all queries`);

  // Perform semantic search with scores
  const resultsWithScores = await vectorStore.similaritySearchWithScore(
    query,
    k
  );
  console.log(`Retrieved ${resultsWithScores.length} results with scores`);

  // Process results - each result is a tuple of [document, score]
  const processedDocs = resultsWithScores.map(([doc, score]) => {
    // Add the score to document metadata for later use
    return {
      ...doc,
      metadata: {
        ...doc.metadata,
        score: score,
      },
      pageContent: doc.pageContent,
    };
  });

  // Sort by score (lower is better)
  processedDocs.sort((a, b) => a.metadata.score - b.metadata.score);

  // Get document titles for reference
  const documentSources = processedDocs.map((doc) => {
    const source = doc.metadata.source || doc.metadata.title || "Unknown";
    return `${source} (relevance: ${doc.metadata.score.toFixed(4)})`;
  });

  // Log search findings
  console.log(`Top results:`);
  documentSources.slice(0, 5).forEach((source, i) => {
    console.log(`  ${i + 1}. ${source}`);
  });

  return {
    documents: processedDocs,
    sources: processedDocs.map(
      (doc) => doc.metadata.source || doc.metadata.title || "Unknown"
    ),
  };
}

// Helper function to format documents as a string with enhanced source attribution
const formatDocumentsWithSourcesAsString = (searchResults) => {
  const { documents } = searchResults;

  return documents
    .map((document, index) => {
      // Enhance metadata formatting for better source attribution
      const source = document.metadata.source || "Unknown";
      const title = document.metadata.title || source;
      const category = document.metadata.category || "General";
      const relevance = document.metadata.score
        ? `Relevance: ${document.metadata.score.toFixed(4)}`
        : "";

      // Format metadata for context with document number for reference
      const metadataStr = `Document ${index + 1} | Source: ${source} | Title: ${title} | ${relevance}`;

      // Return formatted document with metadata
      return `[${metadataStr}]\n${document.pageContent}`;
    })
    .join("\n\n");
};

// Helper function to extract sources for attribution
const extractSources = (searchResults) => {
  return searchResults.sources;
};

// Create Azure OpenAI embeddings instance
const createEmbeddings = () => {
  console.log("AZURE_OPENAI_ENDPOINT:", process.env.AZURE_OPENAI_ENDPOINT);

  if (!process.env.AZURE_OPENAI_ENDPOINT) {
    throw new Error(
      "AZURE_OPENAI_ENDPOINT is not defined in environment variables"
    );
  }

  return new AzureOpenAIEmbeddings({
    azureOpenAIApiDeploymentName:
      process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME,
    modelName: process.env.AZURE_EMBEDDING_MODEL,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    azureOpenAIApiInstanceName: new URL(
      process.env.AZURE_OPENAI_ENDPOINT
    ).hostname.split(".")[0],
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  });
};

// Create Azure Chat OpenAI model with gpt-4o
const createChatModel = () => {
  return new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    azureOpenAIApiInstanceName: new URL(
      process.env.AZURE_OPENAI_ENDPOINT
    ).hostname.split(".")[0],
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    modelName: process.env.AZURE_OPENAI_CHAT_MODEL, // Should be set to gpt-4o or gpt-4o-mini in .env
    temperature: 0.1, // Lower temperature for more factual answers
  });
};

// Initialize Pinecone client
const initPinecone = () => {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  return pinecone;
};

// Create an enhanced RAG chain for question answering with hybrid search
async function createEnhancedRagChain() {
  try {
    // Initialize embeddings
    const embeddings = createEmbeddings();
    console.log("Embeddings model initialized");

    // Initialize chat model
    const chatModel = createChatModel();
    console.log("Chat model initialized");

    // Initialize Pinecone client
    const pinecone = initPinecone();
    console.log("Pinecone client initialized");

    // Index name for our documents
    const indexName = process.env.PINECONE_INDEX;

    // Get the index
    const index = pinecone.Index(indexName);
    console.log(`Using Pinecone index: ${indexName}`);

    // Create a vector store from the existing index
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
      namespace: "wiki", // Use the namespace where your wiki documents are stored
      textKey: "text",
    });
    console.log("Vector store initialized");

    // Create system prompt template with enhanced source attribution and conversation history
    const SYSTEM_TEMPLATE = `You are a helpful assistant for Amsterdam Standard company.
Use the following pieces of context and conversation history to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
Keep your answers informative and concise.

IMPORTANT ABOUT RELEVANCE:
- Each document includes a relevance score - lower scores indicate higher relevance
- Documents are already sorted by relevance (most relevant first)
- When answering, prioritize information from documents with lower relevance scores
- For comprehensive questions (like those about all offices or locations), be sure to include ALL relevant information

ABOUT MULTILINGUAL SUPPORT:
- Users may ask questions in different languages, particularly in Polish, but the database is in English
- If a question is asked in Polish, respond in Polish, but think in English
- If a question is asked in English, respond in English
- Always maintain the same level of helpfulness regardless of the language used

CONVERSATION HISTORY:
{conversationHistory}

When synthesizing information, ensure you're providing complete and accurate answers by considering ALL the relevant documents in the context.

At the end of your answer, include a "Sources:" section that lists the document sources used.

Context:
----------------
{context}`;

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", SYSTEM_TEMPLATE],
      ["human", "{question}"],
    ]);

    // Build the enhanced RAG chain with hybrid search
    const chain = async (question, sessionId = "default") => {
      console.log(
        `Processing question for session ${sessionId}: "${question}"`
      );
      const conversationHistory = getOrCreateConversationHistory(sessionId);

      // For all queries, proceed with normal processing
      // Step 1: Perform hybrid search to retrieve relevant documents
      const searchResults = await hybridSearch(vectorStore, question);

      // Step 2: Format documents for context
      const formattedContext =
        formatDocumentsWithSourcesAsString(searchResults);

      // Step 3: Get sources for attribution
      const sources = extractSources(searchResults);

      // Step 4: Format the conversation history
      const formattedHistory = formatConversationHistory(conversationHistory);

      // Step 5: Generate messages with the prompt template
      const messages = await prompt.invoke({
        question: question,
        context: formattedContext,
        conversationHistory: formattedHistory,
      });

      // Step 6: Generate answer using the LLM
      const response = await chatModel.invoke(messages);

      // Step 7: Add to conversation history
      addMessageToHistory(sessionId, "human", question);
      addMessageToHistory(sessionId, "assistant", response.content);

      // Step 8: Return the answer and sources
      return {
        answer: response.content,
        sources: sources,
      };
    };

    console.log("Enhanced RAG question answering chain created successfully");
    return chain;
  } catch (error) {
    console.error("Error creating enhanced RAG chain:", error);
    throw error;
  }
}

// Main function to answer questions with the enhanced RAG chain
async function answerQuestionWithSources(question, sessionId = "default") {
  try {
    console.log(`Processing question: "${question}" for session: ${sessionId}`);

    // Create and invoke the enhanced RAG chain
    const chain = await createEnhancedRagChain();
    const result = await chain(question, sessionId);

    // Format and display the answer with sources
    console.log("\nAnswer:");
    console.log(result.answer);

    console.log("\nSources:");
    result.sources.forEach((source, index) => {
      console.log(`${index + 1}. ${source}`);
    });

    console.log("\nConversation History:");
    const history = getOrCreateConversationHistory(sessionId);
    history.forEach((message, index) => {
      console.log(
        `${index + 1}. ${message.role}: ${message.content.substring(0, 50)}...`
      );
    });

    return result;
  } catch (error) {
    console.error("Error answering question:", error);
    return {
      answer: "Sorry, I couldn't process your question due to an error.",
      sources: [],
    };
  }
}

// Function to demonstrate the enhanced RAG pipeline
async function demonstrateRagPipeline() {
  const sampleQuestions = [
    "What are the company holidays?",
    "How does the integration budget work?",
    "What tools does the company use for development?",
    "How do I request massages?",
  ];

  console.log("=== Enhanced RAG Question Answering Pipeline Demo ===\n");

  // Use a single session ID for all demo questions to simulate a conversation
  const demoSessionId = "demo-session";

  for (const question of sampleQuestions) {
    console.log(`\n----- Question: ${question} -----`);
    await answerQuestionWithSources(question, demoSessionId);
    console.log("-".repeat(50));
  }
}

// Create a simple API-like function to answer questions
async function askQuestion(question, sessionId = "default") {
  console.log(`Received question: "${question}" for session: ${sessionId}`);

  try {
    const result = await answerQuestionWithSources(question, sessionId);
    const conversationHistory = getOrCreateConversationHistory(sessionId);

    // Format the response in a user-friendly way
    return {
      status: "success",
      sessionId: sessionId,
      question: question,
      answer: result.answer,
      sources: result.sources,
      historyLength: conversationHistory.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error processing question:", error);

    return {
      status: "error",
      sessionId: sessionId,
      question: question,
      error: "Failed to process your question. Please try again later.",
      timestamp: new Date().toISOString(),
    };
  }
}

// Execute the demo
demonstrateRagPipeline()
  .then(() =>
    console.log("\nEnhanced RAG Pipeline Demo completed successfully!")
  )
  .catch((error) => console.error("Demo failed:", error));

// Export the askQuestion function for potential API use
export { askQuestion };
