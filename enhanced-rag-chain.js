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

// Function to perform hybrid search (combination of semantic and keyword search)
// This is a simplified implementation since actual hybrid search depends on vector store capabilities
async function hybridSearch(vectorStore, query, k = 4) {
  console.log(`Performing hybrid search for: "${query}"`);

  // First, perform semantic search
  const semanticResults = await vectorStore.similaritySearch(query, k);

  // Get document titles for reference
  const documentTitles = semanticResults.map(
    (doc) => doc.metadata.title || doc.metadata.source || "Unknown"
  );

  // Log search findings
  console.log(
    `Found ${semanticResults.length} relevant documents from: ${documentTitles.join(", ")}`
  );

  return {
    documents: semanticResults,
    sources: [...new Set(documentTitles)],
  };
}

// Helper function to format documents as a string with enhanced source attribution
const formatDocumentsWithSourcesAsString = (searchResults) => {
  const { documents } = searchResults;

  return documents
    .map((document) => {
      // Enhance metadata formatting for better source attribution
      const source = document.metadata.source || "Unknown";
      const title = document.metadata.title || source;
      const category = document.metadata.category || "General";

      // Format metadata for context
      const metadataStr = `Source: ${source}, Title: ${title}, Category: ${category}`;

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
  return new AzureOpenAIEmbeddings({
    azureOpenAIApiDeploymentName:
      process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME,
    modelName: process.env.AZURE_EMBEDDING_MODEL,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT.replace(
      "https://",
      ""
    ).replace(".openai.azure.com", ""),
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

    // Create system prompt template with enhanced source attribution
    const SYSTEM_TEMPLATE = `You are a helpful assistant for Amsterdam Standard company.
Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
Keep your answers informative and concise.
At the end of your answer, include a "Sources:" section that lists the source documents used.

Context:
----------------
{context}`;

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", SYSTEM_TEMPLATE],
      ["human", "{question}"],
    ]);

    // Build the enhanced RAG chain with hybrid search
    const chain = async (question) => {
      // Step 1: Perform hybrid search to retrieve relevant documents
      const searchResults = await hybridSearch(vectorStore, question);

      // Step 2: Format documents for context
      const formattedContext =
        formatDocumentsWithSourcesAsString(searchResults);

      // Step 3: Get sources for attribution
      const sources = extractSources(searchResults);

      // Step 4: Generate messages with the prompt template
      const messages = await prompt.invoke({
        question: question,
        context: formattedContext,
      });

      // Step 5: Generate answer using the LLM
      const response = await chatModel.invoke(messages);

      // Step 6: Return the answer and sources
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
async function answerQuestionWithSources(question) {
  try {
    console.log(`Processing question: "${question}"`);

    // Create and invoke the enhanced RAG chain
    const chain = await createEnhancedRagChain();
    const result = await chain(question);

    // Format and display the answer with sources
    console.log("\nAnswer:");
    console.log(result.answer);

    console.log("\nSources:");
    result.sources.forEach((source, index) => {
      console.log(`${index + 1}. ${source}`);
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

  for (const question of sampleQuestions) {
    console.log(`\n----- Question: ${question} -----`);
    await answerQuestionWithSources(question);
    console.log("-".repeat(50));
  }
}

// Create a simple API-like function to answer questions
async function askQuestion(question) {
  console.log(`Received question: "${question}"`);

  try {
    const result = await answerQuestionWithSources(question);

    // Format the response in a user-friendly way
    return {
      status: "success",
      question: question,
      answer: result.answer,
      sources: result.sources,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error processing question:", error);

    return {
      status: "error",
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
