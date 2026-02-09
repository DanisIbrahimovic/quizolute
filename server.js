/**
 * Quizolute - AI E-Learning Study Pal
 * Backend Server with Hugging Face Integration
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { InferenceClient } = require('@huggingface/inference');

// ===== Configuration =====
const PORT = process.env.PORT || 3000;
const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;

// Validate token
if (!HF_TOKEN || HF_TOKEN === 'hf_your_token_here') {
  console.error('⚠️  Warning: HUGGINGFACE_TOKEN not set in .env file');
  console.error('   Get your free token at: https://huggingface.co/settings/tokens');
}

// Initialize Hugging Face client
const hf = new InferenceClient(HF_TOKEN);

// AI Model configuration - Using models that work with free tier
// These models are available on Hugging Face's serverless inference
const TEXT_MODEL = 'Qwen/Qwen2.5-72B-Instruct'; // Great free model
const VISION_MODEL = 'Qwen/Qwen2.5-VL-7B-Instruct';

// Fallback models if primary fails
const FALLBACK_MODELS = [
  'meta-llama/Llama-3.1-8B-Instruct',
  'microsoft/Phi-3-mini-4k-instruct',
  'HuggingFaceH4/zephyr-7b-beta'
];

// ===== Express App Setup =====
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from current directory
app.use(express.static(path.join(__dirname)));

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ===== AI Helper Functions =====

/**
 * Generate chat completion with automatic fallback
 */
async function generateChatCompletion(systemPrompt, userMessage, retryCount = 0) {
  const models = [TEXT_MODEL, ...FALLBACK_MODELS];
  const model = models[Math.min(retryCount, models.length - 1)];

  try {
    console.log(`Using model: ${model}`);

    const response = await hf.chatCompletion({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 2048,
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error(`Model ${model} failed:`, error.message);

    // Try fallback model
    if (retryCount < models.length - 1) {
      console.log(`Trying fallback model...`);
      return generateChatCompletion(systemPrompt, userMessage, retryCount + 1);
    }

    throw new Error(`AI generation failed: ${error.message}`);
  }
}

/**
 * Generate chat completion with conversation history
 */
async function generateChatCompletionWithHistory(messages, retryCount = 0) {
  const models = [TEXT_MODEL, ...FALLBACK_MODELS];
  const model = models[Math.min(retryCount, models.length - 1)];

  try {
    console.log(`Using model: ${model} with ${messages.length} messages`);

    const response = await hf.chatCompletion({
      model: model,
      messages: messages,
      max_tokens: 2048,
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error(`Model ${model} failed:`, error.message);

    // Try fallback model
    if (retryCount < models.length - 1) {
      console.log(`Trying fallback model...`);
      return generateChatCompletionWithHistory(messages, retryCount + 1);
    }

    throw new Error(`AI generation failed: ${error.message}`);
  }
}

/**
 * Process image with vision model
 */
async function processImageWithVision(imageBuffer, prompt) {
  try {
    const base64Image = imageBuffer.toString('base64');
    const mimeType = 'image/png';

    const response = await hf.chatCompletion({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
          ]
        }
      ],
      max_tokens: 2048,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Vision API error:', error);
    throw new Error(`Vision processing failed: ${error.message}`);
  }
}

// ===== API Routes =====

/**
 * POST /api/generate-flashcards
 */
app.post('/api/generate-flashcards', upload.single('file'), async (req, res) => {
  try {
    let textContent = req.body.text || '';

    if (req.file) {
      const isImage = req.file.mimetype.startsWith('image/');
      if (isImage) {
        textContent = await processImageWithVision(
          req.file.buffer,
          'Extract all text from this image. Return only the text content.'
        );
      } else if (req.file.mimetype === 'text/plain') {
        textContent = req.file.buffer.toString('utf-8');
      }
    }

    if (!textContent.trim()) {
      return res.status(400).json({ error: 'No text content provided' });
    }

    const systemPrompt = `You are an expert educational content creator. Generate flashcards from the provided text.

Rules:
1. Create 5-10 flashcards based on the key concepts
2. Each flashcard should have a clear question and concise answer
3. Focus on the most important information

Output format (JSON array):
[
  {"question": "What is...?", "answer": "..."},
  {"question": "How does...?", "answer": "..."}
]

Return ONLY the JSON array, no other text.`;

    const response = await generateChatCompletion(systemPrompt, textContent);

    let flashcards;
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      flashcards = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);
    } catch {
      flashcards = [{ question: "Generated content", answer: response.substring(0, 500) }];
    }

    res.json({ success: true, flashcards });
  } catch (error) {
    console.error('Flashcard generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/summarize
 */
app.post('/api/summarize', upload.single('file'), async (req, res) => {
  try {
    let textContent = req.body.text || '';

    if (req.file) {
      const isImage = req.file.mimetype.startsWith('image/');
      if (isImage) {
        textContent = await processImageWithVision(req.file.buffer, 'Extract all text from this image.');
      } else if (req.file.mimetype === 'text/plain') {
        textContent = req.file.buffer.toString('utf-8');
      }
    }

    if (!textContent.trim()) {
      return res.status(400).json({ error: 'No text content provided' });
    }

    const systemPrompt = `You are an expert summarizer. Create a clear, concise summary.

Rules:
1. Capture the main ideas and key points
2. Keep the summary to 3-5 paragraphs
3. Use bullet points for key takeaways

Format:
## Summary
[Your summary]

## Key Takeaways
- Point 1
- Point 2
- Point 3`;

    const summary = await generateChatCompletion(systemPrompt, textContent);
    res.json({ success: true, summary });
  } catch (error) {
    console.error('Summarization error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/chat
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'No message provided' });
    }

    const systemPrompt = `You are Quizolute, a helpful AI study buddy. You help students learn and understand their study materials.

${context ? `Context from uploaded documents:\n${context}\n\n` : ''}

Be friendly, encouraging, and educational. Keep responses concise but helpful. Use plain text without markdown formatting - avoid using asterisks (*), hashtags (#), or other markdown symbols.`;

    // Build messages array with history for context
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8), // Include last 8 messages from history
      { role: 'user', content: message }
    ];

    const response = await generateChatCompletionWithHistory(messages);
    res.json({ success: true, response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/generate-quiz
 */
app.post('/api/generate-quiz', upload.single('file'), async (req, res) => {
  try {
    let textContent = req.body.text || '';

    if (req.file) {
      const isImage = req.file.mimetype.startsWith('image/');
      if (isImage) {
        textContent = await processImageWithVision(req.file.buffer, 'Extract all text from this image.');
      } else if (req.file.mimetype === 'text/plain') {
        textContent = req.file.buffer.toString('utf-8');
      }
    }

    if (!textContent.trim()) {
      return res.status(400).json({ error: 'No text content provided' });
    }

    const systemPrompt = `You are an expert quiz creator. Generate a quiz from the provided text.

Rules:
1. Create 5 multiple choice questions
2. Each question should have 4 options (A, B, C, D)
3. Include the correct answer

Output format (JSON array):
[
  {
    "question": "What is...?",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correct": "A",
    "explanation": "Brief explanation"
  }
]

Return ONLY the JSON array.`;

    const response = await generateChatCompletion(systemPrompt, textContent);

    let quiz;
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      quiz = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);
    } catch {
      quiz = [{ question: "Generated content", options: ["A) See details"], correct: "A", explanation: response.substring(0, 200) }];
    }

    res.json({ success: true, quiz });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/search
 * AI-enhanced search using DuckDuckGo + AI summarization
 */
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'No search query provided' });
    }

    // Get data from DuckDuckGo Instant Answer API
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
    const ddgResponse = await fetch(searchUrl);
    const ddgData = await ddgResponse.json();

    // Collect all available information
    let searchContext = '';

    if (ddgData.Abstract) {
      searchContext += `Main Info: ${ddgData.Abstract}\n`;
    }
    if (ddgData.Definition) {
      searchContext += `Definition: ${ddgData.Definition}\n`;
    }
    if (ddgData.Answer) {
      searchContext += `Answer: ${ddgData.Answer}\n`;
    }
    if (ddgData.RelatedTopics && ddgData.RelatedTopics.length > 0) {
      const topics = ddgData.RelatedTopics.slice(0, 5)
        .filter(t => t.Text)
        .map(t => t.Text)
        .join('\n');
      if (topics) {
        searchContext += `Related Information:\n${topics}\n`;
      }
    }

    let aiSummary = null;

    // If we have search context, enhance it with AI
    if (searchContext.trim()) {
      try {
        const systemPrompt = `You are a helpful research assistant. Based on the search results provided, give a clear, educational answer to the user's question. Be concise but informative. If the information is incomplete, say so.`;

        const userPrompt = `User searched for: "${q}"

Search results:
${searchContext}

Provide a helpful, well-organized answer based on this information.`;

        aiSummary = await generateChatCompletion(systemPrompt, userPrompt);
      } catch (aiError) {
        console.error('AI enhancement failed:', aiError);
        // Continue without AI enhancement
      }
    }

    // Format response
    const result = {
      query: q,
      aiSummary: aiSummary,
      abstract: ddgData.Abstract || null,
      abstractSource: ddgData.AbstractSource || null,
      abstractUrl: ddgData.AbstractURL || null,
      definition: ddgData.Definition || null,
      answer: ddgData.Answer || null,
      relatedTopics: (ddgData.RelatedTopics || []).slice(0, 5).map(topic => ({
        text: topic.Text,
        url: topic.FirstURL
      })).filter(t => t.text),
    };

    res.json({ success: true, result });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    tokenConfigured: !!(HF_TOKEN && HF_TOKEN !== 'hf_your_token_here'),
    models: { text: TEXT_MODEL, vision: VISION_MODEL },
    timestamp: new Date().toISOString()
  });
});

// ===== Error Handling =====
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`
🚀 Quizolute Server Running!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Local:    http://localhost:${PORT}
🔑 HF Token: ${HF_TOKEN && HF_TOKEN !== 'hf_your_token_here' ? '✓ Configured' : '✗ Not configured'}
🤖 Model:    ${TEXT_MODEL}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

API Endpoints:
  POST /api/generate-flashcards  - Generate flashcards from text
  POST /api/summarize            - Summarize text content
  POST /api/chat                 - Chat with AI
  POST /api/generate-quiz        - Generate quiz questions
  GET  /api/search?q=query       - AI-enhanced web search
  GET  /api/health               - Health check
  `);
});
