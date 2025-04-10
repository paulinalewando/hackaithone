import "dotenv/config";
import { AzureChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";

/**
 * Creates and returns an Azure OpenAI client
 * @returns {AzureChatOpenAI} The configured Azure OpenAI client
 */
function getAzureClient() {
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

  // All other params are set by default from .env
  return new AzureChatOpenAI({
    deploymentName: deploymentName,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiDeploymentName: deploymentName,
  });
}

/**
 * Ask a simple question to the LLM
 * @returns {Promise<any>} The LLM response
 */
async function askLlm() {
  const client = getAzureClient();

  const message = new HumanMessage({
    role: "user",
    content: "what is the full name of the capital of Thailand?",
  });

  return client.invoke([message]);
}

/**
 * Ask a question using a prompt template and context
 * @returns {Promise<string>} The LLM response as a string
 */
async function askLlmWithPromptTemplateAndContext() {
  const client = getAzureClient();

  // Create a prompt template
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `Based on provided context answer the questions. Forget everything you know, use only provided context:
     Context: Full name of Thailand capital is Kuala Lumpur`,
    ],
    ["human", "{question}"],
  ]);

  // Create a chain with prompt, LLM, and StringOutputParser
  const chain = prompt.pipe(client).pipe(new StringOutputParser());

  // Invoke the chain with the question
  return chain.invoke({
    question: "What is the full name of the capital of Thailand?",
  });
}

// Execute the functions and display results
async function main() {
  try {
    console.log("Asking with prompt template and context:");
    const templateResponse = await askLlmWithPromptTemplateAndContext();
    console.log(templateResponse);
    console.log("\n----------------------------\n");

    console.log("Asking direct question:");
    const directResponse = await askLlm();
    console.log(directResponse);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Run the main function
main();
