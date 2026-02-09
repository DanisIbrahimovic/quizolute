/**
 * Quizolute - AI E-Learning Study Pal
 * Frontend JavaScript with AI Backend Integration
 */

// ===== Configuration =====
const API_BASE_URL = 'http://localhost:3000/api';

// ===== DOM Elements =====
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const generateSection = document.getElementById('generateSection');
const generateBtn = document.getElementById('generateBtn');
const header = document.getElementById('header');
const modeSelector = document.getElementById('modeSelector');
const resultsContainer = document.getElementById('resultsContainer');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');

// ===== State =====
let uploadedFiles = [];
let currentMode = 'flashcards';
let documentContext = ''; // Store extracted text for chat context
let conversationHistory = []; // Store chat history for context

// ===== File Type Configuration =====
const fileTypeConfig = {
  'application/pdf': { icon: '📄', class: 'pdf', label: 'PDF' },
  'application/msword': { icon: '📝', class: 'doc', label: 'DOC' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: '📝', class: 'doc', label: 'DOCX' },
  'text/plain': { icon: '📋', class: 'txt', label: 'TXT' },
  'application/vnd.ms-powerpoint': { icon: '📊', class: 'ppt', label: 'PPT' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: '📊', class: 'ppt', label: 'PPTX' },
  'image/png': { icon: '🖼️', class: 'img', label: 'PNG' },
  'image/jpeg': { icon: '🖼️', class: 'img', label: 'JPG' },
  'image/gif': { icon: '🖼️', class: 'img', label: 'GIF' },
};

const defaultFileType = { icon: '📄', class: 'txt', label: 'FILE' };

// ===== Utility Functions =====

/**
 * Format file size to human readable string
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file type configuration based on MIME type
 */
function getFileTypeConfig(mimeType) {
  return fileTypeConfig[mimeType] || defaultFileType;
}

/**
 * Generate unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Read file as text
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

/**
 * Read file as base64
 */
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

// ===== File Handling =====

/**
 * Process files and add them to the list
 */
function processFiles(files) {
  const newFiles = Array.from(files).map(file => ({
    id: generateId(),
    file: file,
    name: file.name,
    size: file.size,
    type: file.type,
  }));

  uploadedFiles = [...uploadedFiles, ...newFiles];
  renderFileList();
  updateUIState();
}

/**
 * Remove a file from the list
 */
function removeFile(id) {
  uploadedFiles = uploadedFiles.filter(f => f.id !== id);
  renderFileList();
  updateUIState();
}

/**
 * Render the file list in the DOM
 */
function renderFileList() {
  if (uploadedFiles.length === 0) {
    fileList.innerHTML = '';
    return;
  }

  fileList.innerHTML = uploadedFiles.map(file => {
    const config = getFileTypeConfig(file.type);
    return `
      <div class="file-item" data-id="${file.id}">
        <div class="file-icon ${config.class}">${config.icon}</div>
        <div class="file-info">
          <div class="file-name" title="${file.name}">${file.name}</div>
          <div class="file-size">${formatFileSize(file.size)} • ${config.label}</div>
        </div>
        <button class="file-remove" onclick="removeFile('${file.id}')" aria-label="Remove file">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
  }).join('');
}

/**
 * Update UI state based on uploaded files
 */
function updateUIState() {
  const hasFiles = uploadedFiles.length > 0;

  if (hasFiles) {
    generateSection.classList.add('visible');
    modeSelector.classList.add('visible');
  } else {
    generateSection.classList.remove('visible');
    modeSelector.classList.remove('visible');
  }
}

// ===== Mode Selection =====

/**
 * Handle mode button click
 */
function handleModeChange(e) {
  const btn = e.target.closest('.mode-btn');
  if (!btn) return;

  // Update active state
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  currentMode = btn.dataset.mode;

  // Update button text
  const modeLabels = {
    flashcards: 'Generate Flashcards',
    summary: 'Generate Summary',
    quiz: 'Generate Quiz'
  };
  generateBtn.innerHTML = `
    <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 2a1 1 0 011 1v1a1 1 0 01-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 01-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
    </svg>
    ${modeLabels[currentMode]}
  `;
}

// ===== Drag and Drop Handlers =====

function handleDragEnter(e) {
  e.preventDefault();
  e.stopPropagation();
  dropzone.classList.add('drag-over');
}

function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  dropzone.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  const rect = dropzone.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right ||
    e.clientY < rect.top || e.clientY > rect.bottom) {
    dropzone.classList.remove('drag-over');
  }
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  dropzone.classList.remove('drag-over');
  if (e.dataTransfer.files.length > 0) {
    processFiles(e.dataTransfer.files);
  }
}

function handleDropzoneClick() {
  fileInput.click();
}

function handleFileInputChange(e) {
  if (e.target.files.length > 0) {
    processFiles(e.target.files);
    fileInput.value = '';
  }
}

// ===== Generate Study Materials =====

/**
 * Show loading state in results
 */
function showLoading(message = 'Processing...') {
  resultsContainer.innerHTML = `
    <div class="results-loading">
      <div class="loading-spinner"></div>
      <p class="loading-text">${message}</p>
    </div>
  `;
}

/**
 * Show error state in results
 */
function showError(message) {
  resultsContainer.innerHTML = `
    <div class="results-error">
      <p>❌ ${message}</p>
    </div>
  `;
}

/**
 * Handle generate button click
 */
async function handleGenerate() {
  if (uploadedFiles.length === 0) return;

  generateBtn.disabled = true;

  try {
    // Collect text from all files
    let allText = '';
    const formData = new FormData();

    for (const fileItem of uploadedFiles) {
      const file = fileItem.file;

      if (file.type === 'text/plain') {
        const text = await readFileAsText(file);
        allText += text + '\n\n';
      } else if (file.type.startsWith('image/')) {
        // For images, we'll send to server
        formData.append('file', file);
      }
    }

    // If we have text, add it to formData
    if (allText.trim()) {
      formData.append('text', allText);
      documentContext = allText; // Store for chat
    }

    // Determine API endpoint based on mode
    let endpoint;
    let loadingMessage;

    switch (currentMode) {
      case 'flashcards':
        endpoint = '/generate-flashcards';
        loadingMessage = 'Creating flashcards...';
        break;
      case 'summary':
        endpoint = '/summarize';
        loadingMessage = 'Generating summary...';
        break;
      case 'quiz':
        endpoint = '/generate-quiz';
        loadingMessage = 'Building quiz questions...';
        break;
    }

    showLoading(loadingMessage);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate content');
    }

    // Render results based on mode
    switch (currentMode) {
      case 'flashcards':
        renderFlashcards(data.flashcards);
        break;
      case 'summary':
        renderSummary(data.summary);
        break;
      case 'quiz':
        renderQuiz(data.quiz);
        break;
    }

  } catch (error) {
    console.error('Generation error:', error);
    showError(error.message || 'Failed to generate content. Make sure the server is running.');
  } finally {
    generateBtn.disabled = false;
  }
}

/**
 * Render flashcards
 */
function renderFlashcards(flashcards) {
  if (!flashcards || flashcards.length === 0) {
    showError('No flashcards generated');
    return;
  }

  resultsContainer.innerHTML = `
    <div class="flashcards-grid">
      ${flashcards.map((card, index) => `
        <div class="flashcard" onclick="this.classList.toggle('flipped')">
          <div class="flashcard-inner">
            <div class="flashcard-front">
              <div class="flashcard-label">Question ${index + 1}</div>
              <div class="flashcard-content">${card.question}</div>
              <div class="flashcard-hint">Click to flip</div>
            </div>
            <div class="flashcard-back">
              <div class="flashcard-label">Answer</div>
              <div class="flashcard-content">${card.answer}</div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Render summary
 */
function renderSummary(summary) {
  if (!summary) {
    showError('No summary generated');
    return;
  }

  // Convert markdown-style formatting to HTML
  let html = summary
    .replace(/## (.*)/g, '<h2>$1</h2>')
    .replace(/- (.*)/g, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap lists
  html = html.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');

  resultsContainer.innerHTML = `
    <div class="summary-container">
      <p>${html}</p>
    </div>
  `;
}

/**
 * Render quiz
 */
function renderQuiz(quiz) {
  if (!quiz || quiz.length === 0) {
    showError('No quiz generated');
    return;
  }

  resultsContainer.innerHTML = `
    <div class="quiz-container">
      ${quiz.map((q, qIndex) => `
        <div class="quiz-question" data-correct="${q.correct}">
          <div class="quiz-question-number">Question ${qIndex + 1}</div>
          <div class="quiz-question-text">${q.question}</div>
          <div class="quiz-options">
            ${q.options.map((option, oIndex) => `
              <button class="quiz-option" onclick="handleQuizAnswer(this, '${q.correct}')">${option}</button>
            `).join('')}
          </div>
          <div class="quiz-explanation">${q.explanation || ''}</div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Handle quiz answer selection
 */
function handleQuizAnswer(button, correctAnswer) {
  const questionDiv = button.closest('.quiz-question');
  const options = questionDiv.querySelectorAll('.quiz-option');
  const explanation = questionDiv.querySelector('.quiz-explanation');

  // Disable all options
  options.forEach(opt => {
    opt.disabled = true;
    // Check if this is the correct answer
    if (opt.textContent.startsWith(correctAnswer + ')') || opt.textContent.startsWith(correctAnswer + ' ')) {
      opt.classList.add('correct');
    }
  });

  // Mark selected answer
  if (!button.classList.contains('correct')) {
    button.classList.add('incorrect');
  }
  button.classList.add('selected');

  // Show explanation
  if (explanation && explanation.textContent.trim()) {
    explanation.classList.add('visible');
  }
}

// ===== Chat Functionality =====

/**
 * Convert markdown to HTML for chat messages
 */
function markdownToHtml(text) {
  if (!text) return '';

  let html = text
    // Escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers (do before bold to avoid conflicts)
    .replace(/^### (.*)$/gm, '<h4>$1</h4>')
    .replace(/^## (.*)$/gm, '<h3>$1</h3>')
    .replace(/^# (.*)$/gm, '<h2>$1</h2>')
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Code blocks: ```code```
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code: `code`
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Unordered lists: - item or * item
    .replace(/^[\-\*] (.*)$/gm, '<li>$1</li>')
    // Numbered lists: 1. item
    .replace(/^\d+\. (.*)$/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<pre')) {
    html = '<p>' + html + '</p>';
  }

  return html;
}

/**
 * Add message to chat
 */
function addChatMessage(content, isUser = false, addToHistory = true) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${isUser ? 'user' : 'assistant'}`;

  // Convert markdown to HTML for assistant messages
  const displayContent = isUser ? content : markdownToHtml(content);

  messageDiv.innerHTML = `
    <div class="message-avatar">${isUser ? '👤' : '🤖'}</div>
    <div class="message-content">${displayContent}</div>
  `;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Add to conversation history if flagged
  if (addToHistory) {
    conversationHistory.push({
      role: isUser ? 'user' : 'assistant',
      content: content
    });

    // Keep only last 10 messages to avoid token limits
    if (conversationHistory.length > 10) {
      conversationHistory = conversationHistory.slice(-10);
    }
  }
}

/**
 * Handle chat send
 */
async function handleChatSend() {
  const message = chatInput.value.trim();
  if (!message) return;

  // Add user message
  addChatMessage(message, true);
  chatInput.value = '';

  // Show typing indicator
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-message assistant';
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content">Thinking...</div>
  `;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        context: documentContext,
        history: conversationHistory.slice(0, -1) // Exclude the message we just added
      })
    });

    const data = await response.json();

    // Remove typing indicator
    typingDiv.remove();

    if (data.success) {
      addChatMessage(data.response);
    } else {
      addChatMessage('Sorry, I encountered an error. Please try again.');
    }
  } catch (error) {
    typingDiv.remove();
    addChatMessage('Unable to connect to AI. Make sure the server is running.');
  }
}

/**
 * Handle chat input enter key
 */
function handleChatKeypress(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleChatSend();
  }
}

// ===== Web Search =====

/**
 * Handle web search
 */
async function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  searchResults.innerHTML = `
    <div class="results-loading" style="padding: 1rem;">
      <div class="loading-spinner" style="width: 24px; height: 24px;"></div>
      <p class="loading-text" style="margin-top: 0.5rem; font-size: 0.875rem;">Searching and analyzing...</p>
    </div>
  `;

  try {
    const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (data.success && data.result) {
      const result = data.result;
      let html = '';

      // Show AI Summary first (if available)
      if (result.aiSummary) {
        html += `
          <div class="search-result-item" style="background: linear-gradient(135deg, #E0F2FE 0%, #F0F9FF 100%); border: 1px solid #7DD3FC;">
            <div class="search-result-title" style="display: flex; align-items: center; gap: 0.5rem;">
              <span>🤖</span> AI Summary
            </div>
            <div class="search-result-text">${result.aiSummary.replace(/\n/g, '<br>')}</div>
          </div>
        `;
      }

      if (result.abstract) {
        html += `
          <div class="search-result-item">
            <div class="search-result-title">📚 ${result.abstractSource || result.query}</div>
            <div class="search-result-text">${result.abstract}</div>
            ${result.abstractUrl ? `<a href="${result.abstractUrl}" target="_blank" class="search-result-link">Read more →</a>` : ''}
          </div>
        `;
      }

      if (result.definition) {
        html += `
          <div class="search-result-item">
            <div class="search-result-title">📖 Definition</div>
            <div class="search-result-text">${result.definition}</div>
          </div>
        `;
      }

      if (result.answer) {
        html += `
          <div class="search-result-item">
            <div class="search-result-title">💡 Quick Answer</div>
            <div class="search-result-text">${result.answer}</div>
          </div>
        `;
      }

      if (result.relatedTopics && result.relatedTopics.length > 0) {
        html += `
          <div class="search-result-item">
            <div class="search-result-title">🔗 Related Topics</div>
            ${result.relatedTopics.map(topic => `
              <div class="search-result-text" style="margin-bottom: 0.5rem;">${topic.text}</div>
              ${topic.url ? `<a href="${topic.url}" target="_blank" class="search-result-link">Learn more →</a>` : ''}
            `).join('')}
          </div>
        `;
      }

      if (!html) {
        html = `
          <div class="search-result-item">
            <div class="search-result-text">No results found for "${query}". Try a different search term or ask the AI chatbot above!</div>
          </div>
        `;
      }

      searchResults.innerHTML = html;
    } else {
      searchResults.innerHTML = '<div class="search-result-item"><div class="search-result-text">No results found. Try asking the AI chatbot instead!</div></div>';
    }
  } catch (error) {
    searchResults.innerHTML = '<div class="results-error">Search failed. Make sure the server is running.</div>';
  }
}

/**
 * Handle search input enter key
 */
function handleSearchKeypress(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleSearch();
  }
}

// ===== Header Scroll Effect =====

function handleScroll() {
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}

// ===== Smooth Scroll =====

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ===== Initialize =====

function init() {
  // Dropzone events
  dropzone.addEventListener('dragenter', handleDragEnter);
  dropzone.addEventListener('dragover', handleDragOver);
  dropzone.addEventListener('dragleave', handleDragLeave);
  dropzone.addEventListener('drop', handleDrop);
  dropzone.addEventListener('click', handleDropzoneClick);

  // File input
  fileInput.addEventListener('change', handleFileInputChange);

  // Mode selector
  modeSelector.addEventListener('click', handleModeChange);

  // Generate button
  generateBtn.addEventListener('click', handleGenerate);

  // Chat
  chatSendBtn.addEventListener('click', handleChatSend);
  chatInput.addEventListener('keypress', handleChatKeypress);

  // Search
  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', handleSearchKeypress);

  // Scroll events
  window.addEventListener('scroll', handleScroll);

  // Initialize
  initSmoothScroll();
  handleScroll();

  console.log('🚀 Quizolute initialized with AI integration');
}

// Start the app
document.addEventListener('DOMContentLoaded', init);

// Expose functions for inline handlers
window.removeFile = removeFile;
window.handleQuizAnswer = handleQuizAnswer;
