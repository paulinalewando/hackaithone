# 🧠 Hackathon: Build a RAG Chatbot for the Amsterdam Standard Wiki
Mission: Create an intelligent chatbot that can answer company-specific questions by using a Retrieval-Augmented Generation (RAG) approach on internal Wiki documentation.

Whether you're a backend wizard, a frontend designer, or an AI enthusiast—this is your chance to build something truly useful that your entire organization can benefit from.

# 🛠️ Project Goal
Build a chatbot that understands and responds to user queries by pulling relevant information from the company’s internal Wiki docs, powered by LLMs + semantic or hybrid search.

# ⚙️ Requirements
1. Implement backend + simple UI
2. RAG system must return not only answer to user question, but also link to document(s) with response
3. When answer can not be found in wiki, your model should tell it doesn't know an answer and return no link.

# Useful tips
You can find snippets in this project and use them in your implementation. But you can also do it by yourself.

# 🧩 Step-by-Step Plan

### 0. Check your data
See what's inside your data.


### 1. Load Wiki Docs
Collect and load all relevant documentation (Markdown) from the internal Wiki G-Drive
You can find them here: https://drive.google.com/drive/folders/1p0v3KOZPxdqv9etHirJfuwHxWY_7aa-n?usp=sharing

**Doc**: https://js.langchain.com/docs/integrations/document_loaders/


### 2. Split Docs into Chunks
Embedding models has maximum size of input tokens, which they can handle (for example, maximum input size for text-embedding-3-small model is 8,191 tokens). Moreover, storing long texts in database might not be enficient.
Choose text splitting technique to divide long documents into manageable, coherent chunks.

**Doc:** https://js.langchain.com/docs/concepts/text_splitters/


### 3. Choose Embedding Model
Select an embedding model (OpenAI's text-embedding-3-small) or open-source alternatives such as SentenceTransformers (all-mpnet-base-v2).
This model will convert text chunks into dense vectors.

**Docs:**
- https://js.langchain.com/docs/how_to/embed_text/
- https://js.langchain.com/docs/integrations/text_embedding/azure_openai/
- https://js.langchain.com/docs/integrations/text_embedding/hugging_face_inference/


### 4. Set Up Vector Storage
Choose a vector database (e.g., local Qdrant, Weaviate or Pinecone).
This will store the document chunks in a way that enables fast similarity searches.

**Note: dimension size and metric must be the same as embedding model!**

**Note 2:** Some vectorstores use similarity metrics and some distance metrics. If you notice that your top k reponses have low score, while you colleauge has high score, check if your databases use "similarity" or "distance" term.

**Docs:** https://js.langchain.com/docs/how_to/vectorstore_retriever/
- local storage : Qdrant
- serverless storage: Qdrant, Pinecone or Weaviate


### 5. Embed & Save Chunks
Generate vector embeddings for each document chunk.
Save them to your selected vector store as a collection.


### 6. Retrieve relevant documents from collection
Implement semantic or hybrid (semantic + keyword) search to find chunks relevant to a user query.


### 7. Connect with OpenAI API
Use the OpenAI GPT model (e.g., gpt-4o or gpt-4o mini) to interpret questions and formulate answers based on retrieved content.

**Doc:** https://js.langchain.com/docs/integrations/chat/azure/

### 8. Create Pipeline Chain: Retrieval + Generation
Build a full RAG pipeline:
- User asks a question
- System retrieves relevant document chunks
- The retrieved context is sent to the LLM for answer generation
- The user receives the answer to the question and the name of the file as link

**Doc:** https://js.langchain.com/docs/tutorials/rag/#preview


### 9. Create a Simple UI Chat
Design a lightweight web app with a chat interface.
Display both the answer and optionally the retrieved sources for transparency.


### 10. Run & Optimize
Test your pipeline for accuracy, relevance, and speed.
Tune chunk size, top-k retrievals, and prompt engineering.
Add logging or feedback to refine performance.


### 11. Present Your Approach
Prepare a short demo to showcase your solution.
Include your design choices, pipeline architecture, UI, and any insights gained.


# BONUS:
 - Keep in memory current chat conversation
 - Stream LLM response
 - Tricky questions test
 - Limit retrieval to solely impotrant chunks (re-rank, similarity threshold)
 - Fetch data from our Blog page and feed Vector Storage
 - Langsmith integration: https://docs.smith.langchain.com/


# 🏆 Judging Criteria
1. Functionality: How well does your chatbot understand and respond to questions?
2. UX: Is the UI intuitive and user-friendly?
3. Innovation: Any creative additions or improvements?
4. Presentation: Clarity and quality of your final demo.
