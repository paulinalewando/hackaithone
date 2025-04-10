// Pinecone Vector Store Demo with LangChain
import { AzureChatOpenAI } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import * as dotenv from "dotenv";
import { AzureOpenAIEmbeddings } from "@langchain/openai";

// Load environment variables
dotenv.config();

// Sample documents to store in the vector database
const sampleDocuments = [
  {
    pageContent:
      "Amsterdam Standard is a technology consulting company specializing in web and mobile development.",
    metadata: { source: "company_profile.md", page: 1 },
  },
  {
    pageContent:
      "Our team consists of experienced developers, designers, and project managers dedicated to delivering high-quality solutions.",
    metadata: { source: "company_profile.md", page: 2 },
  },
  {
    pageContent:
      "We offer services in web development, mobile app development, cloud solutions, and AI integration.",
    metadata: { source: "services.md", page: 1 },
  },
  {
    pageContent:
      "Amsterdam Standard follows agile methodologies to ensure efficient project delivery and client satisfaction.",
    metadata: { source: "methodology.md", page: 1 },
  },
];

// Create Document objects from sample data
const documents = sampleDocuments.map((doc) => new Document(doc));

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

// Create Azure OpenAI chat model
const createChatModel = () => {
  return new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    azureOpenAIApiInstanceName: new URL(
      process.env.AZURE_OPENAI_ENDPOINT
    ).hostname.split(".")[0],
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    modelName: process.env.AZURE_OPENAI_CHAT_MODEL,
  });
};

// Initialize Pinecone client
const initPinecone = () => {
  const pinecone = new Pinecone({
    apiKey: process.env.PINCONE_API_KEY,
  });
  return pinecone;
};

// Main function to demonstrate Pinecone usage
async function runPineconeDemo() {
  console.log("Starting Pinecone vector store demo...");

  try {
    // Initialize embeddings
    const embeddings = createEmbeddings();
    console.log("Embeddings model initialized");

    // Initialize Pinecone client
    const pinecone = initPinecone();
    console.log("Pinecone client initialized");

    // Index name for our documents
    const indexName = process.env.PINCONE_INDEX;

    // List available indexes
    const indexes = await pinecone.listIndexes();
    console.log("Available Pinecone indexes:", indexes);

    // Check if our index exists, if not create it
    let index;
    try {
      index = pinecone.Index(indexName);
      console.log(`Using existing Pinecone index: ${indexName}`);
    } catch (error) {
      console.log(`Index ${indexName} not found, creating new index...`);

      // For demo purposes, use an existing index or create one in Pinecone console
      index = pinecone.Index(indexName);
    }

    // Collection name within the index
    const namespace = "docs";

    // Create a Pinecone vector store with our documents
    console.log("Creating Pinecone vector store and adding documents...");
    const vectorStore = await PineconeStore.fromDocuments(
      documents,
      embeddings,
      {
        pineconeIndex: index,
        namespace: namespace,
        textKey: "text",
      }
    );

    console.log(
      `Added ${documents.length} documents to Pinecone index '${indexName}'`
    );

    // Perform a similarity search
    const query = "What services does Amsterdam Standard offer?";
    console.log(`\nPerforming similarity search for query: "${query}"`);

    const searchResults = await vectorStore.similaritySearch(query, 2);

    console.log("\nSearch Results:");
    searchResults.forEach((doc, i) => {
      console.log(`\nResult ${i + 1}:`);
      console.log(`Content: ${doc.pageContent}`);
      console.log(`Source: ${doc.metadata.source}, Page: ${doc.metadata.page}`);
    });

    console.log("\nPinecone vector store demo completed successfully!");
  } catch (error) {
    console.error("Error in Pinecone demo:", error);
  }
}

// Run the demo
runPineconeDemo();
