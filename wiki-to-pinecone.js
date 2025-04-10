// Process Wiki files and store in Pinecone Vector Database
import fs from "fs";
import path from "path";
import { Pinecone } from "@pinecone-database/pinecone";
import { Document } from "@langchain/core/documents";
import { PineconeStore } from "@langchain/pinecone";
import { AzureOpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Constants
const WIKI_DIR = path.join(process.cwd(), "drive-download");
const CHUNK_SIZE = 500; // Characters per chunk
const CHUNK_OVERLAP = 50; // Overlap between chunks
const MAX_TOKENS = 8000; // Max tokens for embedding model (text-embedding-3-small)

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

// Initialize Pinecone client
const initPinecone = () => {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  return pinecone;
};

// Read and process wiki files
const processWikiFiles = async () => {
  try {
    // Get list of all files in wiki directory
    const files = fs.readdirSync(WIKI_DIR);
    console.log(`Found ${files.length} files in the wiki directory`);

    // Initialize text splitter
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
    });

    // Process each file
    const allDocuments = [];

    for (const filename of files) {
      const filePath = path.join(WIKI_DIR, filename);

      // Skip directories
      if (fs.statSync(filePath).isDirectory()) continue;

      try {
        // Read file content
        const content = fs.readFileSync(filePath, "utf8");
        const fileBaseName = path.basename(filename, path.extname(filename));

        console.log(`Processing file: ${filename}`);

        // Split text into chunks
        const textChunks = await textSplitter.splitText(content);

        // Create Document objects from chunks
        const docs = textChunks.map(
          (chunk, i) =>
            new Document({
              pageContent: chunk,
              metadata: {
                source: filename,
                title: fileBaseName,
                chunk: i + 1,
                totalChunks: textChunks.length,
              },
            })
        );

        allDocuments.push(...docs);
        console.log(`Split ${filename} into ${docs.length} chunks`);
      } catch (error) {
        console.error(`Error processing file ${filename}:`, error.message);
      }
    }

    console.log(`Total chunks created: ${allDocuments.length}`);
    return allDocuments;
  } catch (error) {
    console.error("Error processing wiki files:", error);
    throw error;
  }
};

// Main function to process wiki files and store in Pinecone
async function processWikiToPinecone() {
  console.log("Starting Wiki to Pinecone process...");

  try {
    // Process Wiki files
    const documents = await processWikiFiles();

    if (documents.length === 0) {
      console.log("No documents to process. Exiting.");
      return;
    }

    // Initialize embeddings
    const embeddings = createEmbeddings();
    console.log("Embeddings model initialized");

    // Initialize Pinecone client
    const pinecone = initPinecone();
    console.log("Pinecone client initialized");

    // Index name for our documents
    const indexName = process.env.PINECONE_INDEX;

    // Check if index exists
    const indexes = await pinecone.listIndexes();
    console.log("Available Pinecone indexes:", indexes);

    // Get or create the index
    let index;
    try {
      index = pinecone.Index(indexName);
      console.log(`Using existing Pinecone index: ${indexName}`);
    } catch (error) {
      console.log(`Index ${indexName} not found, using existing index...`);
      index = pinecone.Index(indexName);
    }

    // Collection/namespace name within the index
    const namespace = "wiki";

    // Store documents in batches to avoid rate limits
    const BATCH_SIZE = 100;

    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      const batch = documents.slice(i, i + BATCH_SIZE);
      console.log(
        `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(documents.length / BATCH_SIZE)}`
      );

      // Create a Pinecone vector store with our documents
      await PineconeStore.fromDocuments(batch, embeddings, {
        pineconeIndex: index,
        namespace: namespace,
        textKey: "text",
      });

      console.log(`Added batch of ${batch.length} documents to Pinecone`);
    }

    console.log(
      `Successfully added ${documents.length} chunks to Pinecone index '${indexName}'`
    );

    // Perform a sample similarity search
    const query = "What are the company holidays?";
    console.log(`\nPerforming sample similarity search for query: "${query}"`);

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
      namespace: namespace,
      textKey: "text",
    });

    const searchResults = await vectorStore.similaritySearch(query, 3);

    console.log("\nSample Search Results:");
    searchResults.forEach((doc, i) => {
      console.log(`\nResult ${i + 1}:`);
      console.log(`Content: ${doc.pageContent.substring(0, 200)}...`);
      console.log(
        `Source: ${doc.metadata.source}, Title: ${doc.metadata.title}`
      );
      console.log(`Chunk: ${doc.metadata.chunk}/${doc.metadata.totalChunks}`);
    });

    console.log("\nWiki to Pinecone process completed successfully!");
  } catch (error) {
    console.error("Error in Wiki to Pinecone process:", error);
  }
}

// Run the process
processWikiToPinecone();
