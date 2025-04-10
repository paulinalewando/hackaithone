// RAG Question-Answering Chain using Pinecone Vector Store
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

// Helper function to format documents as a string
const formatDocumentsAsString = (documents) => {
  return documents
    .map((document) => {
      // Include metadata in the context
      const metadataStr = Object.entries(document.metadata)
        .filter(([key]) => ["source", "title", "category"].includes(key))
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");

      return `[${metadataStr}]\n${document.pageContent}`;
    })
    .join("\n\n");
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

// Create Azure Chat OpenAI model
const createChatModel = () => {
  return new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    azureOpenAIApiInstanceName: new URL(
      process.env.AZURE_OPENAI_ENDPOINT
    ).hostname.split(".")[0],
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    modelName: process.env.AZURE_OPENAI_CHAT_MODEL,
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

// Create a RAG chain for question answering
async function createRagChain() {
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

    // Create a retriever from the vector store
    // We can customize k (number of documents to retrieve)
    const retriever = vectorStore.asRetriever({
      k: 4, // Number of documents to retrieve
      filter: null, // Optional metadata filter
      searchType: "similarity", // Can be "similarity" or "mmr"
    });
    console.log("Vector store retriever created");

    // Create system & human prompt template for the chat model
    const SYSTEM_TEMPLATE = `You are a helpful assistant for Amsterdam Standard company.
Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
Keep your answers informative and concise.

Context:
----------------
{context}`;

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", SYSTEM_TEMPLATE],
      ["human", "{question}"],
    ]);

    // Build the RAG chain
    const chain = RunnableSequence.from([
      {
        context: retriever.pipe(formatDocumentsAsString),
        question: new RunnablePassthrough(),
      },
      prompt,
      chatModel,
      new StringOutputParser(),
    ]);

    console.log("RAG question answering chain created successfully");
    return chain;
  } catch (error) {
    console.error("Error creating RAG chain:", error);
    throw error;
  }
}

// Main function to answer questions
async function answerQuestion(question) {
  try {
    console.log(`Processing question: "${question}"`);

    const chain = await createRagChain();
    const answer = await chain.invoke(question);

    console.log("\nAnswer:");
    console.log(answer);

    return answer;
  } catch (error) {
    console.error("Error answering question:", error);
    return "Sorry, I couldn't process your question due to an error.";
  }
}

// Run a demo with some sample questions
async function runDemo() {
  const sampleQuestions = [
    "What are the company holidays?",
    "How does the integration budget work?",
    "What tools does the company use for development?",
    "How do I request massages?",
  ];

  console.log("=== RAG Question Answering Demo ===\n");

  for (const question of sampleQuestions) {
    console.log(`\n----- Question: ${question} -----`);
    await answerQuestion(question);
    console.log("-".repeat(50));
  }
}

// Run the demo
runDemo()
  .then(() => console.log("\nDemo completed successfully!"))
  .catch((error) => console.error("Demo failed:", error));
