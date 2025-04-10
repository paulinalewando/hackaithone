# Readme

1. Copy .env.example to .env
2. Fill `AZURE_OPENAI_API_KEY` with vault API KEY (Slack technical-ai channel)
3. Open project `js` with DevContainers
4. Go to `https://app.pinecone.io/` and create free account. Create API KEY and Index. Pass them into .env
5. Run snippets and verify everything is working:
   `node snippets/azure-openai-api.js` - check how Azure OpenAI works
   `node snippets/pinecone-vector-store.js` - check how to store data in Vector Database and use similarity search
   `node snippets/fetch-data-from-www.js` - fetch links related with AI from our blog page
6. You are ready to create your Chatbot!
