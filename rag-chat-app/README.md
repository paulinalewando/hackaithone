# Amsterdam Standard RAG Chat Application

A lightweight Vue 3 chat interface for interacting with the RAG (Retrieval Augmented Generation) system that allows users to ask questions about Amsterdam Standard company information stored in Pinecone vector database.

## Features

- Clean, modern chat interface built with Vue 3 Composition API
- Real-time conversation with the RAG-powered assistant
- Source attribution toggle to see where information comes from
- Animated "thinking" indicator
- Responsive design

## Project Structure

```
rag-chat-app/
├── src/                # Source files
│   ├── assets/         # CSS and other assets
│   ├── App.vue         # Main Vue component
│   └── main.js         # Entry point
├── public/             # Static assets
├── api-server.js       # Express API server connecting to RAG system
├── index.html          # HTML template
└── vite.config.js      # Vite configuration
```

## Setup and Installation

### Prerequisites

- Node.js 14+ and npm
- The RAG system (enhanced-rag-chain.js) should be set up and working

### Frontend Setup

1. Install dependencies:

```bash
cd rag-chat-app
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. The application will be available at http://localhost:5173

### API Server Setup

1. Install additional dependencies:

```bash
npm install express cors body-parser
```

2. Start the API server:

```bash
node api-server.js
```

3. The API will be available at http://localhost:3000

## Usage

1. Type your question in the input field at the bottom of the chat interface
2. Press Enter or click the Send button
3. The system will retrieve relevant information from the Pinecone vector store
4. The AI-generated answer will appear in the chat, optionally with source attribution

## Connecting to the RAG System

The API server connects to your enhanced RAG system by importing the `askQuestion` function from `enhanced-rag-chain.js`. This function processes user questions, retrieves relevant documents from Pinecone, and generates answers using the Azure OpenAI service.

## Production Deployment

For production deployment:

1. Build the frontend:

```bash
npm run build
```

2. Serve the static files from the `dist` directory using your preferred web server

3. Deploy the API server to your production environment

## Configuration

You can modify the following:

- API endpoint in `App.vue` if your server runs on a different port/URL
- Styling in `src/assets/base.css` to match your branding
- Prompt templates in the enhanced RAG chain for different response styles

## License

This project is for internal use at Amsterdam Standard only.
