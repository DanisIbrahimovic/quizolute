# 🎓 Quizolute - AI E-Learning Study Pal

An AI-powered study assistant that transforms your documents into flashcards, quizzes, and summaries. Built with Node.js and the Hugging Face Inference API.

---

## 📁 Project Structure

```
Quizolute/
├── index.html      # Main webpage (frontend UI)
├── styles.css      # All styling and design
├── script.js       # Frontend JavaScript logic
├── server.js       # Backend server (Node.js + Express)
├── package.json    # Project dependencies
├── .env            # Your secret API token (not shared!)
└── images/         # Logo and other images
```

---

## 🔧 How It Works

### The Big Picture

```
┌─────────────┐     HTTP      ┌─────────────┐     API      ┌─────────────┐
│   Browser   │ ◄──────────► │   Server    │ ◄──────────► │ Hugging Face│
│ (Frontend)  │   Requests   │  (Backend)  │   Requests   │     AI      │
└─────────────┘              └─────────────┘              └─────────────┘
```

1. **You** interact with the webpage (upload files, type messages)
2. **Frontend** (`script.js`) sends requests to your local server
3. **Backend** (`server.js`) receives requests and calls Hugging Face AI
4. **AI** generates responses (flashcards, summaries, chat replies)
5. **Response** travels back through the server to your browser

---

## 📄 File Explanations

### `index.html` - The Webpage

This is what you see in your browser. Key sections:

```html
<!-- The file upload area -->
<div class="dropzone" id="dropzone">
  <!-- Drag & drop files here -->
</div>

<!-- Mode buttons: Flashcards, Summary, Quiz -->
<div class="mode-selector" id="modeSelector">
  <button data-mode="flashcards">🎴 Flashcards</button>
  <!-- ... more buttons -->
</div>

<!-- AI Chat interface -->
<div class="chat-section" id="chatSection">
  <div class="chat-messages" id="chatMessages"></div>
  <input type="text" id="chatInput" placeholder="Ask a question...">
</div>
```

**Key Concept**: HTML elements have `id` attributes so JavaScript can find and manipulate them.

---

### `styles.css` - The Design

Makes everything look pretty! Uses CSS Variables for consistency:

```css
:root {
  --color-primary: #8ED4F8;    /* Main blue color */
  --color-accent: #3B82F6;     /* Button blue */
  --radius-lg: 0.75rem;        /* Rounded corners */
}

/* Example: Style for buttons */
.btn-primary {
  background: var(--color-gradient);  /* Uses the variable */
  color: white;
  border-radius: var(--radius-lg);
}
```

**Key Concept**: CSS variables (`--name`) let you define values once and reuse them everywhere.

---

### `script.js` - Frontend Logic

Handles user interactions and communicates with the server.

#### Important Variables (State)

```javascript
let uploadedFiles = [];        // Files the user uploaded
let currentMode = 'flashcards'; // Selected mode
let documentContext = '';       // Text extracted from files
let conversationHistory = [];   // Chat messages for AI memory
```

#### Key Functions Explained

**1. File Handling**
```javascript
function processFiles(files) {
  // When user drops files, this creates objects for each file
  // and adds them to the uploadedFiles array
}

function renderFileList() {
  // Loops through uploadedFiles and creates HTML
  // to display each file in the UI
}
```

**2. Sending to AI**
```javascript
async function handleGenerate() {
  // 1. Collect text from uploaded files
  // 2. Create FormData (special way to send files)
  // 3. Send POST request to server
  // 4. Display the results (flashcards/summary/quiz)
}
```

**3. Chat with AI**
```javascript
async function handleChatSend() {
  const message = chatInput.value;
  
  // Add user message to screen
  addChatMessage(message, true);
  
  // Send to server with conversation history
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: message,
      history: conversationHistory  // AI remembers past messages!
    })
  });
  
  // Display AI response
  const data = await response.json();
  addChatMessage(data.response);
}
```

**4. Markdown Conversion**
```javascript
function markdownToHtml(text) {
  // AI sometimes returns markdown like **bold** or # Header
  // This converts them to HTML: <strong>bold</strong> or <h2>Header</h2>
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')  // Bold
    .replace(/^# (.*)$/gm, '<h2>$1</h2>')             // Headers
    .replace(/^- (.*)$/gm, '<li>$1</li>');            // Lists
}
```

**Key Concepts**:
- `async/await` - Modern way to handle operations that take time (like API calls)
- `fetch()` - Built-in function to make HTTP requests
- Template literals `` `${variable}` `` - Easy way to build strings with variables

---

### `server.js` - Backend Server

This is your local API server. It receives requests from the frontend and talks to Hugging Face.

#### Setup

```javascript
require('dotenv').config();  // Load .env file (your secret token)
const express = require('express');  // Web framework

const app = express();  // Create the app
const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;  // Get token from .env
```

#### API Endpoints

Think of these as "doors" the frontend can knock on:

```javascript
// POST /api/generate-flashcards
app.post('/api/generate-flashcards', async (req, res) => {
  // 1. Get the text from the request
  const textContent = req.body.text;
  
  // 2. Tell AI what to do (the "system prompt")
  const systemPrompt = `Create flashcards from this text.
    Return as JSON: [{"question": "...", "answer": "..."}]`;
  
  // 3. Call Hugging Face AI
  const response = await hf.chatCompletion({
    model: 'Qwen/Qwen2.5-72B-Instruct',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: textContent }
    ]
  });
  
  // 4. Send flashcards back to frontend
  res.json({ flashcards: response });
});
```

#### Chat with Memory

```javascript
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  
  // Build messages array including past conversation
  const messages = [
    { role: 'system', content: 'You are a helpful study buddy...' },
    ...history,  // All previous messages
    { role: 'user', content: message }  // New message
  ];
  
  // AI now "remembers" the conversation!
  const response = await hf.chatCompletion({ messages });
});
```

**Key Concepts**:
- `app.post()` / `app.get()` - Define what happens when frontend makes requests
- `req.body` - Data sent from the frontend
- `res.json()` - Send JSON response back to frontend
- Environment variables (`process.env`) - Keep secrets safe

---

### `.env` - Secret Configuration

```
HUGGINGFACE_TOKEN=hf_your_token_here
PORT=3000
```

**Never share this file!** It contains your API key.

---

## 🚀 Running the Project

```bash
# 1. Install dependencies (first time only)
npm install

# 2. Start the server
npm start

# 3. Open in browser
# Go to: http://localhost:3000
```

---

## 🧠 Key Programming Concepts

### 1. Client-Server Architecture
- **Client** (Browser): What the user sees and interacts with
- **Server** (Node.js): Runs on your computer, handles business logic and API calls

### 2. REST API
- A way for programs to communicate over HTTP
- Uses methods: `GET` (read), `POST` (create), `PUT` (update), `DELETE` (remove)

### 3. Asynchronous JavaScript
```javascript
// Old way (callbacks - messy)
fetch(url, function(response) {
  response.json(function(data) {
    console.log(data);
  });
});

// Modern way (async/await - clean!)
const response = await fetch(url);
const data = await response.json();
console.log(data);
```

### 4. JSON (JavaScript Object Notation)
```javascript
// How data is sent between frontend and backend
{
  "message": "Hello AI!",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello!" }
  ]
}
```

---

## 💡 Tips for Learning

1. **Use Browser DevTools** (F12):
   - Console tab: See `console.log()` output and errors
   - Network tab: Watch requests going to your server

2. **Add console.log()** to understand code flow:
   ```javascript
   async function handleChatSend() {
     console.log('1. Function started');
     const message = chatInput.value;
     console.log('2. Message:', message);
     // ... etc
   }
   ```

3. **Read errors carefully**: They usually tell you exactly what's wrong!

---

## 📚 Resources to Learn More

- [MDN Web Docs](https://developer.mozilla.org/) - Best JavaScript/HTML/CSS reference
- [Express.js Guide](https://expressjs.com/en/guide/routing.html) - Learn about Node.js servers
- [Hugging Face Docs](https://huggingface.co/docs) - AI API documentation

---

Made with 💙 for learning!
