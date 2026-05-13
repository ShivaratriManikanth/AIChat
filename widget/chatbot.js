// ============================================================
//  AI CHATBOT WIDGET v3.0 — 16 Features Embeddable Widget
//  Voice, Reactions, Sound, Dark Mode, File Upload,
//  Quick Replies, PDF Export, Rating, Typing Animation,
//  Multi-language, Time Greeting, Draggable, Markdown,
//  Fullscreen, Chat Search, Keyboard Shortcuts
//
//  Usage:
//    <script src="http://localhost:4000/widget/chatbot.js"
//            data-server="http://localhost:4000"></script>
// ============================================================

(function () {
  'use strict';

  const WIDGET_VERSION = '3.6.1';
  const scriptTag  = document.currentScript;
  const SERVER_URL = scriptTag?.getAttribute('data-server') || 'http://localhost:4000';
  const BOT_ID     = scriptTag?.getAttribute('data-bot-id') || 'default';
  const API_KEY    = scriptTag?.getAttribute('data-api-key') || '';
  const CLIENT_ID  = scriptTag?.getAttribute('data-client-id') || 'default_client';
  const IS_PREVIEW = scriptTag?.getAttribute('data-preview') === 'true';
  
  let CONFIG = {
    botName: 'AI Assistant',
    companyName: 'My Company',
    welcomeMessage: 'Hi there! How can I help you today?',
    themeColor: '#4F46E5',
    position: 'bottom-right',
    placeholder: 'Type your message...',
    suggestedQuestions: [],
    showBranding: true,
    emailCapture: true
  };

  // ---- Bot-scoped localStorage keys (prevents cross-bot bleed) ----
  const LS_EMAIL   = `chatbot_user_email_${BOT_ID}`;
  const LS_HISTORY = `chatbot_history_${BOT_ID}`;
  const LS_SESSION = `chatbot_session_id_${BOT_ID}`;
  const LS_DARK    = `chatbot_dark_${BOT_ID}`;
  const LS_LANG    = `chatbot_lang_${BOT_ID}`;
  const LS_LEAD    = `chatbot_lead_captured_${BOT_ID}`;
  const LS_INTER   = `chatbot_interactions_${BOT_ID}`;

  let isDarkMode = localStorage.getItem(LS_DARK) === 'true';
  let currentLang = localStorage.getItem(LS_LANG) || 'en';
  const SESSION_ID = getSessionId();
  
  let isRecording = false;
  let messageCount = 0;
  let ratingGiven = false;
  let isFullscreen = false;
  let isSearchOpen = false;
  let chatIsOpen = false;
  let userEmail = localStorage.getItem(LS_EMAIL) || '';
  let emailVerified = !!userEmail || IS_PREVIEW;
  let userInteractions = parseInt(localStorage.getItem(LS_INTER) || '0');
  let leadCaptured = localStorage.getItem(LS_LEAD) === 'true';
  let pageUrl = window.location.href;
  let isOffline = false;

  // ---- Translations -----------------------------------------
  const LANGS = {
    en: { placeholder: 'Type your message...', welcome: 'Hi! How can I help?', send: 'Send', voice: 'Voice input', dark: 'Dark mode', light: 'Light mode', export: 'Export chat', rate: 'Rate this conversation', thankRate: 'Thanks for your feedback!', upload: 'Attach file', langLabel: 'Language', search: 'Search messages...', fullscreen: 'Fullscreen', noResults: 'No messages found' },
    hi: { placeholder: 'अपना संदेश लिखें...', welcome: 'नमस्ते! मैं कैसे मदद कर सकता हूं?', send: 'भेजें', voice: 'आवाज इनपुट', dark: 'डार्क मोड', light: 'लाइट मोड', export: 'चैट निर्यात', rate: 'इस बातचीत को रेट करें', thankRate: 'आपकी प्रतिक्रिया के लिए धन्यवाद!', upload: 'फ़ाइल संलग्न करें', langLabel: 'भाषा', search: 'संदेश खोजें...', fullscreen: 'पूर्ण स्क्रीन', noResults: 'कोई संदेश नहीं मिला' },
    te: { placeholder: 'మీ సందేశాన్ని టైప్ చేయండి...', welcome: 'హాయ్! నేను ఎలా సహాయపడగలను?', send: 'పంపండి', voice: 'వాయిస్ ఇన్‌పుట్', dark: 'డార్క్ మోడ్', light: 'లైట్ మోడ్', export: 'చాట్ ఎగుమతి', rate: 'ఈ సంభాషణకు రేట్ ఇవ్వండి', thankRate: 'మీ అభిప్రాయానికి ధన్యవాదాలు!', upload: 'ఫైల్ జతచేయండి', langLabel: 'భాష', search: 'మీ సందేశాన్ని టైప్ చేయండి...', fullscreen: 'పూర్తి స్క్రీన్', noResults: 'సందేశాలు కనుగొనబడలేదు' }
  };

  function t(key) { return (LANGS[currentLang] || LANGS.en)[key] || LANGS.en[key]; }

  // ---- Session Management -----------------------------------
  function getSessionId() {
    let id = localStorage.getItem(LS_SESSION);
    if (!id) {
      id = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(LS_SESSION, id);
    }
    return id;
  }

  // ---- Load Config ------------------------------------------
  async function loadConfig() {
    try {
      const res = await fetch(`${SERVER_URL}/api/config`, { headers: { 'x-bot-key': API_KEY } });
      if (res.ok) {
        const data = await res.json();
        CONFIG = { ...CONFIG, ...data };
      }
    } catch (e) {
      console.warn('Chatbot: Could not load config, using defaults');
    }
  }

  // ---- FEATURE: Time-Based Greeting (IST) -------------------
  function getTimeGreeting() {
    // Convert current time to IST (UTC+5:30)
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (5.5 * 3600000));
    const hour = ist.getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  }

  // ---- FEATURE: Markdown Support ----------------------------
  function renderMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);
    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(128,128,128,0.15);padding:1px 5px;border-radius:4px;font-size:12px;">$1</code>');
    // Links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:inherit;text-decoration:underline;">$1</a>');
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    // Bullet lists: lines starting with - or *
    html = html.replace(/^[-*]\s+(.+)/gm, '<span style="display:block;padding-left:12px;">&#8226; $1</span>');
    return html;
  }

  // ---- Sound Effects ----------------------------------------
  function playSound(type) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.08;

      if (type === 'send') {
        osc.frequency.value = 880;
        osc.type = 'sine';
      } else if (type === 'receive') {
        osc.frequency.value = 660;
        osc.type = 'sine';
      } else if (type === 'click') {
        osc.frequency.value = 1200;
        osc.type = 'sine';
      }

      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }

  // ---- Inject Styles ----------------------------------------
  function injectStyles() {
    const theme = CONFIG.themeColor;
    const old = document.getElementById('chatbot-widget-styles');
    if (old) old.remove();

    const style = document.createElement('style');
    style.id = 'chatbot-widget-styles';
    style.textContent = `
      #chatbot-widget-container * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      /* ---- Toggle Button ---- */
      #chatbot-toggle {
        position: fixed; bottom: 24px; right: 24px;
        width: 62px; height: 62px; border-radius: 50%;
        background: ${theme}; border: none; cursor: pointer;
        box-shadow: 0 4px 24px rgba(0,0,0,0.28);
        z-index: 99999;
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.3s, box-shadow 0.3s;
      }
      #chatbot-toggle:hover { transform: scale(1.1); box-shadow: 0 6px 30px rgba(0,0,0,0.35); }
      #chatbot-toggle svg { width: 28px; height: 28px; fill: white; }
      #chatbot-toggle .pulse-ring {
        position: absolute; width: 100%; height: 100%; border-radius: 50%;
        border: 3px solid ${theme}; animation: chatbot-pulse 2s infinite;
      }
      @keyframes chatbot-pulse {
        0% { transform: scale(1); opacity: 0.6; }
        100% { transform: scale(1.5); opacity: 0; }
      }

      /* ---- Chat Window ---- */
      #chatbot-window {
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        position: fixed; bottom: 100px; right: 24px;
        width: 400px; height: 560px;
        border-radius: 20px;
        z-index: 99998;
        display: none; flex-direction: column;
        overflow: hidden;
        animation: chatbot-slideUp 0.35s ease;
        transition: all 0.3s ease;
      }
      #chatbot-window.open { display: flex; }
      #chatbot-window.light { background: #fff; color: #333; }
      #chatbot-window.dark { background: #1a1a2e; color: #e0e0e0; }

      /* Fullscreen mode */
      #chatbot-window.fullscreen {
        width: 100vw !important; height: 100vh !important;
        bottom: 0 !important; right: 0 !important;
        left: 0 !important; top: 0 !important;
        border-radius: 0 !important;
        max-width: 100vw !important; max-height: 100vh !important;
      }

      @keyframes chatbot-slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      #chatbot-header.draggable { cursor: move; }

      /* ---- Header ---- */
      #chatbot-header {
        background: ${theme}; color: white;
        padding: 14px 18px;
        display: flex; align-items: center; justify-content: space-between;
        flex-shrink: 0; user-select: none;
      }
      #chatbot-header-info { display: flex; align-items: center; gap: 10px; }
      #chatbot-avatar {
        width: 38px; height: 38px; border-radius: 50%;
        background: rgba(255,255,255,0.2);
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; position: relative;
      }
      #chatbot-avatar .status-dot {
        position: absolute; bottom: 1px; right: 1px;
        width: 10px; height: 10px; border-radius: 50%;
        background: #4ade80; border: 2px solid ${theme};
      }
      #chatbot-header-text h4 { font-size: 15px; font-weight: 600; color: white; }
      #chatbot-header-text span { font-size: 11px; opacity: 0.85; color: white; }
      .header-actions { display: flex; align-items: center; gap: 4px; }
      .header-btn {
        background: rgba(255,255,255,0.15); border: none; color: white;
        width: 32px; height: 32px; border-radius: 50%;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        font-size: 15px; transition: background 0.2s;
      }
      .header-btn:hover { background: rgba(255,255,255,0.3); }

      /* ---- Search Bar ---- */
      #chatbot-search-bar {
        display: none; padding: 8px 14px; gap: 8px;
        align-items: center; flex-shrink: 0;
        border-bottom: 1px solid rgba(128,128,128,0.15);
      }
      #chatbot-search-bar.open { display: flex; }
      .light #chatbot-search-bar { background: #fff; }
      .dark #chatbot-search-bar { background: #16213e; }
      #chatbot-search-input {
        flex: 1; border: 1px solid rgba(128,128,128,0.3);
        border-radius: 8px; padding: 7px 12px;
        font-size: 13px; outline: none;
      }
      .light #chatbot-search-input { background: #f7f8fc; color: #333; }
      .dark #chatbot-search-input { background: #0f0f23; color: #e0e0e0; }
      #chatbot-search-input:focus { border-color: ${theme}; }
      #chatbot-search-close {
        background: none; border: none; font-size: 18px;
        cursor: pointer; color: inherit; opacity: 0.6;
      }
      #chatbot-search-close:hover { opacity: 1; }
      #chatbot-search-count { font-size: 11px; opacity: 0.6; white-space: nowrap; }
      .search-highlight { background: #fde047 !important; color: #333 !important; border-radius: 2px; padding: 0 2px; }

      /* ---- Toolbar ---- */
      #chatbot-toolbar {
        display: flex; align-items: center; justify-content: space-between;
        padding: 6px 14px; flex-shrink: 0;
        border-bottom: 1px solid rgba(128,128,128,0.15);
        font-size: 12px;
      }
      .light #chatbot-toolbar { background: #f0f0f5; }
      .dark #chatbot-toolbar { background: #16213e; }
      #chatbot-toolbar select {
        background: transparent; border: 1px solid rgba(128,128,128,0.3);
        border-radius: 6px; padding: 3px 6px; font-size: 11px;
        color: inherit; cursor: pointer; outline: none;
      }
      .dark #chatbot-toolbar select option { background: #1a1a2e; color: #ccc; }

      /* ---- Messages ---- */
      #chatbot-messages {
        flex: 1; overflow-y: auto;
        padding: 16px; display: flex;
        flex-direction: column; gap: 8px;
      }
      .light #chatbot-messages { background: #f7f8fc; }
      .dark #chatbot-messages { background: #0f0f23; }
      #chatbot-messages::-webkit-scrollbar { width: 5px; }
      #chatbot-messages::-webkit-scrollbar-thumb { background: #bbb; border-radius: 10px; }
      .dark #chatbot-messages::-webkit-scrollbar-thumb { background: #444; }

      .chatbot-msg-wrapper { display: flex; flex-direction: column; margin-bottom: 2px; }
      .chatbot-msg-wrapper.user { align-items: flex-end; }
      .chatbot-msg-wrapper.bot { align-items: flex-start; }

      .chatbot-msg {
        max-width: 82%; padding: 10px 14px;
        border-radius: 8px; font-size: 13.5px;
        line-height: 1.6;
        word-wrap: break-word; word-break: break-word; overflow-wrap: break-word;
        width: fit-content;
      }
      .chatbot-msg .msg-text { display: inline; }
      .light .chatbot-msg.bot { background: white; color: #333; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border-bottom-left-radius: 2px; }
      .dark .chatbot-msg.bot { background: #16213e; color: #e0e0e0; border-bottom-left-radius: 2px; }
      .chatbot-msg.user { background: ${theme}; color: white; border-bottom-right-radius: 2px; }

      .msg-time { font-size: 10px; opacity: 0.5; margin-top: 4px; display: block; text-align: right; }
      .chatbot-msg.bot .msg-time { text-align: left; }

      /* Markdown styles inside messages */
      .chatbot-msg strong { font-weight: 700; }
      .chatbot-msg em { font-style: italic; }
      .chatbot-msg a { text-decoration: underline; }

      /* Reactions */
      .msg-reactions { display: flex; gap: 4px; margin-top: 4px; }
      .msg-reactions button {
        background: none; border: 1px solid rgba(128,128,128,0.25);
        border-radius: 12px; padding: 2px 8px; font-size: 14px;
        cursor: pointer; transition: all 0.2s; opacity: 0.6;
      }
      .msg-reactions button:hover { opacity: 1; transform: scale(1.15); }
      .msg-reactions button.reacted { opacity: 1; border-color: ${theme}; background: rgba(79,70,229,0.1); }

      /* Quick Reply Buttons */
      .quick-replies { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
      .quick-reply-btn {
        background: transparent; border: 1.5px solid ${theme};
        color: ${theme}; border-radius: 20px;
        padding: 6px 14px; font-size: 12px; font-weight: 500;
        cursor: pointer; transition: all 0.2s;
      }
      .quick-reply-btn:hover { background: ${theme}; color: white; }

      /* Typing Indicator */
      .chatbot-typing { display: flex; gap: 5px; padding: 12px 16px; align-self: flex-start; border-radius: 16px; border-bottom-left-radius: 4px; }
      .light .chatbot-typing { background: white; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
      .dark .chatbot-typing { background: #16213e; }
      .chatbot-typing span { width: 8px; height: 8px; border-radius: 50%; background: #aaa; animation: chatbot-bounce 1.4s infinite ease-in-out; }
      .chatbot-typing span:nth-child(2) { animation-delay: 0.16s; }
      .chatbot-typing span:nth-child(3) { animation-delay: 0.32s; }
      @keyframes chatbot-bounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }

      /* ---- Suggestions ---- */
      #chatbot-suggestions { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 14px; flex-shrink: 0; }
      .chatbot-suggestion { border: 1px solid #ddd; border-radius: 20px; padding: 6px 14px; font-size: 12px; cursor: pointer; transition: all 0.2s; }
      .light .chatbot-suggestion { background: white; color: #555; }
      .dark .chatbot-suggestion { background: #16213e; color: #bbb; border-color: #333; }
      .chatbot-suggestion:hover { background: ${theme}; color: white; border-color: ${theme}; }

      /* ---- Input Area ---- */
      #chatbot-input-area { display: flex; align-items: center; padding: 10px 12px; gap: 6px; border-top: 1px solid rgba(128,128,128,0.15); flex-shrink: 0; }
      .light #chatbot-input-area { background: white; }
      .dark #chatbot-input-area { background: #1a1a2e; }

      .input-btn { width: 36px; height: 36px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: all 0.2s; flex-shrink: 0; }
      .input-btn:hover { filter: brightness(0.9); }
      .input-btn.recording { background: #EF4444 !important; color: white !important; animation: chatbot-pulseRec 1s infinite; }
      @keyframes chatbot-pulseRec { 0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); } }

      #chatbot-input { flex: 1; border: 1px solid #ddd; border-radius: 24px; padding: 9px 16px; font-size: 13.5px; outline: none; transition: border-color 0.2s; min-width: 0; }
      .light #chatbot-input { background: #f7f8fc; color: #333; border-color: #ddd; }
      .dark #chatbot-input { background: #0f0f23; color: #e0e0e0; border-color: #333; }
      #chatbot-input:focus { border-color: ${theme}; }

      #chatbot-send { width: 38px; height: 38px; border-radius: 50%; background: ${theme}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
      #chatbot-send:hover { filter: brightness(1.15); transform: scale(1.05); }
      #chatbot-send svg { width: 17px; height: 17px; fill: white; }

      /* ---- Email Capture Modal ---- */
      #chatbot-email-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; padding: 30px 24px; text-align: center; }
      .light #chatbot-email-screen { background: #f7f8fc; }
      .dark #chatbot-email-screen { background: #0f0f23; }
      #chatbot-email-screen .email-icon { font-size: 48px; margin-bottom: 16px; }
      #chatbot-email-screen h3 { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
      #chatbot-email-screen .email-subtitle { font-size: 13px; opacity: 0.65; margin-bottom: 24px; line-height: 1.5; }
      #chatbot-email-screen .email-form { width: 100%; display: flex; flex-direction: column; gap: 10px; }
      #chatbot-email-input { width: 100%; padding: 12px 16px; border: 2px solid #ddd; border-radius: 12px; font-size: 14px; outline: none; transition: border-color 0.2s; text-align: center; }
      .light #chatbot-email-input { background: white; color: #333; }
      .dark #chatbot-email-input { background: #16213e; color: #e0e0e0; border-color: #333; }
      #chatbot-email-input:focus { border-color: ${theme}; }
      #chatbot-email-input.error { border-color: #EF4444; animation: chatbot-shake 0.4s; }
      @keyframes chatbot-shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-6px); } 40%, 80% { transform: translateX(6px); } }
      #chatbot-email-error { font-size: 12px; color: #EF4444; min-height: 18px; }
      #chatbot-email-submit { width: 100%; padding: 12px; background: ${theme}; color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
      #chatbot-email-submit:hover { filter: brightness(1.1); transform: scale(1.02); }

      /* Responsive */
      @media (max-width: 480px) {
        #chatbot-window { width: 100vw !important; height: 100vh !important; bottom: 0 !important; right: 0 !important; border-radius: 0 !important; }
        #chatbot-toggle { bottom: 16px; right: 16px; }
      }
    `;
    document.head.appendChild(style);
  }

  // ---- Build Widget -----------------------------------------
  function buildWidget() {
    const container = document.createElement('div');
    container.id = 'chatbot-widget-container';
    const langOptions = Object.keys(LANGS).map(l =>
      `<option value="${l}" ${l === currentLang ? 'selected' : ''}>${l.toUpperCase()}</option>`
    ).join('');

    container.innerHTML = `
      <button id="chatbot-toggle" aria-label="Open chat">
        <div class="pulse-ring"></div>
        ${CONFIG.logo ? `<img src="${CONFIG.logo}" id="chatbot-icon-chat" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">` : `<svg viewBox="0 0 24 24" id="chatbot-icon-chat"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>`}
        <svg viewBox="0 0 24 24" id="chatbot-icon-close" style="display:none"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>

      <div id="chatbot-window" class="${isDarkMode ? 'dark' : 'light'}">
        <div id="chatbot-header" class="draggable">
          <div id="chatbot-header-info">
            <div id="chatbot-avatar">${CONFIG.logo ? `<img src="${CONFIG.logo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : '🤖'}<span class="status-dot"></span></div>
            <div id="chatbot-header-text"><h4>${CONFIG.botName}</h4><span>Online</span></div>
          </div>
          <div class="header-actions">
            <div id="chatbot-advanced-features" style="display: ${!emailVerified && CONFIG.emailCapture ? 'none' : 'flex'}; align-items: center; gap: 4px;">
              <button class="header-btn" id="btn-clear" title="Clear chat">🗑️</button>
              <button class="header-btn" id="btn-search" title="Search">🔍</button>
              <button class="header-btn" id="btn-fullscreen" title="Fullscreen">⛶</button>
              <button class="header-btn" id="btn-darkmode">${isDarkMode ? '☀️' : '🌙'}</button>
            </div>
            <button class="header-btn" id="chatbot-close">&times;</button>
          </div>
        </div>

        <div id="chatbot-search-bar"><input type="text" id="chatbot-search-input" placeholder="Search..."><span id="chatbot-search-count"></span><button id="chatbot-search-close">&times;</button></div>

        <div id="chatbot-toolbar">
          <div><label>${t('langLabel')}: </label><select id="chatbot-lang">${langOptions}</select></div>
          <div id="chatbot-status-text">Ready to chat</div>
        </div>

        <div id="chatbot-email-screen" style="${emailVerified || CONFIG.emailCapture === false ? 'display:none' : ''}">
          <div class="email-icon">💬</div>
          <h3>Start a Conversation</h3>
          <p class="email-subtitle">Enter your email to begin chatting with us</p>
          <div class="email-form">
            <input type="email" id="chatbot-email-input" placeholder="your@email.com">
            <div id="chatbot-email-error"></div>
            <button id="chatbot-email-submit">Start Chat</button>
          </div>
        </div>

        <div id="chatbot-messages" style="${!emailVerified && CONFIG.emailCapture !== false ? 'display:none' : ''}"></div>
        <div id="chatbot-suggestions" style="${!emailVerified && CONFIG.emailCapture !== false ? 'display:none' : ''}"></div>

        <div id="chatbot-input-area" style="${!emailVerified && CONFIG.emailCapture !== false ? 'display:none' : ''}">
          <button class="input-btn" id="btn-voice">🎤</button>
          <input type="text" id="chatbot-input" placeholder="${t('placeholder')}">
          <button id="chatbot-send"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
        </div>
      </div>
    `;
    document.body.appendChild(container);
  }

  // ---- Core Logic -------------------------------------------
  function addMessage(text, sender, options = {}) {
    const messages = document.getElementById('chatbot-messages');
    if (!messages) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const wrapper = document.createElement('div');
    wrapper.className = `chatbot-msg-wrapper ${sender}`;
    const bubble = document.createElement('div');
    bubble.className = `chatbot-msg ${sender}`;
    const textNode = document.createElement('span');
    textNode.className = 'msg-text';
    textNode.innerHTML = sender === 'bot' ? renderMarkdown(text) : escapeHtml(text);
    bubble.appendChild(textNode);
    const timeSpan = document.createElement('span');
    timeSpan.className = 'msg-time';
    timeSpan.textContent = time;
    bubble.appendChild(timeSpan);
    wrapper.appendChild(bubble);
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
    if (sender === 'user') playSound('send'); else playSound('receive');
    saveToLocal(sender, text);
  }

  async function sendMessage(text) {
    if (!text.trim()) return;
    addMessage(text, 'user');
    document.getElementById('chatbot-input').value = '';
    showTyping();
    try {
      const res = await fetch(`${SERVER_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-bot-key': API_KEY },
        body: JSON.stringify({ message: text, sessionId: SESSION_ID, clientId: CLIENT_ID, botId: BOT_ID })
      });
      hideTyping();
      if (res.ok) {
        const data = await res.json();
        addMessage(data.reply, 'bot');
      }
    } catch (e) { hideTyping(); addMessage("Error connecting to server.", 'bot'); }
  }

  function showTyping() {
    const messages = document.getElementById('chatbot-messages');
    if (!messages) return;
    const div = document.createElement('div');
    div.className = 'chatbot-typing';
    div.id = 'chatbot-typing-indicator';
    div.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('chatbot-typing-indicator');
    if (el) el.remove();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function saveToLocal(role, content) {
    let history = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
    history.push({ role, content, time: Date.now() });
    localStorage.setItem(LS_HISTORY, JSON.stringify(history.slice(-50)));
  }

  function loadFromLocal() {
    const history = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
    history.forEach(h => addMessage(h.content, h.role, { noAnimate: true }));
  }

  function renderSuggestions() {
    const box = document.getElementById('chatbot-suggestions');
    if (!box || !CONFIG.suggestedQuestions.length) return;
    box.innerHTML = CONFIG.suggestedQuestions.map(q => `<button class="chatbot-suggestion">${q}</button>`).join('');
    box.querySelectorAll('.chatbot-suggestion').forEach(btn => {
      btn.addEventListener('click', () => { sendMessage(btn.textContent); box.style.display = 'none'; });
    });
  }

  function attachEvents() {
    const toggle = document.getElementById('chatbot-toggle');
    const win = document.getElementById('chatbot-window');
    const close = document.getElementById('chatbot-close');
    const input = document.getElementById('chatbot-input');
    const send = document.getElementById('chatbot-send');

    toggle.addEventListener('click', () => {
      chatIsOpen = !chatIsOpen;
      win.classList.toggle('open', chatIsOpen);
      document.getElementById('chatbot-icon-chat').style.display = chatIsOpen ? 'none' : 'block';
      document.getElementById('chatbot-icon-close').style.display = chatIsOpen ? 'block' : 'none';
      if (chatIsOpen) input.focus();
    });

    close.addEventListener('click', () => { chatIsOpen = false; win.classList.remove('open'); });
    send.addEventListener('click', () => sendMessage(input.value));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(input.value); });

    document.getElementById('chatbot-email-submit')?.addEventListener('click', () => {
      const email = document.getElementById('chatbot-email-input').value;
      if (email) {
        userEmail = email;
        emailVerified = true;
        localStorage.setItem(LS_EMAIL, email);
        document.getElementById('chatbot-email-screen').style.display = 'none';
        document.getElementById('chatbot-messages').style.display = 'flex';
        document.getElementById('chatbot-input-area').style.display = 'flex';
        document.getElementById('chatbot-advanced-features').style.display = 'flex';
        addMessage(CONFIG.welcomeMessage, 'bot');
      }
    });

    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      isFullscreen = !isFullscreen;
      win.classList.toggle('fullscreen', isFullscreen);
      document.getElementById('btn-fullscreen').innerHTML = isFullscreen ? '⊡' : '⛶';
    });

    document.getElementById('btn-darkmode').addEventListener('click', () => {
      isDarkMode = !isDarkMode;
      win.classList.toggle('dark', isDarkMode);
      win.classList.toggle('light', !isDarkMode);
      document.getElementById('btn-darkmode').innerHTML = isDarkMode ? '☀️' : '🌙';
    });
    
    document.getElementById('btn-clear').addEventListener('click', () => {
        if (confirm('Clear chat?')) {
            localStorage.removeItem(LS_HISTORY);
            document.getElementById('chatbot-messages').innerHTML = '';
        }
    });
  }

  async function init() {
    await loadConfig();
    injectStyles();
    buildWidget();
    renderSuggestions();
    attachEvents();
    if (emailVerified || CONFIG.emailCapture === false) {
      loadFromLocal();
      if (!localStorage.getItem(LS_HISTORY)) addMessage(CONFIG.welcomeMessage, 'bot');
    }

    if (IS_PREVIEW) {
      setTimeout(() => {
        chatIsOpen = true;
        const win = document.getElementById('chatbot-window');
        if (win) {
          win.classList.add('open', 'fullscreen');
          isFullscreen = true;
          document.getElementById('btn-fullscreen').innerHTML = '⊡';
          document.getElementById('chatbot-icon-chat').style.display = 'none';
          document.getElementById('chatbot-icon-close').style.display = 'block';
        }
      }, 500);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
