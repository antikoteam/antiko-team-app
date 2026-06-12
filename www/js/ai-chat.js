// ==========================================
// ANTIKO AI ASSISTANT — Full Module
// ==========================================
import { db, collection, getDocs, getDoc, doc, query, orderBy } from "./firebase-config.js";

// --- Configuration ---
// Key Rotation Pool — dynamically loaded from Firestore
let API_KEYS = [];
let currentKeyIndex = 0;

function getCurrentKey() {
    return API_KEYS[currentKeyIndex] || "";
}

// Called when a key fails — moves to next key silently
function rotateToNextKey() {
    currentKeyIndex++;
    if (currentKeyIndex < API_KEYS.length) {
        console.warn(`AI: Key #${currentKeyIndex - 1} exhausted → switching to key #${currentKeyIndex}`);
        return true; // More keys available
    }
    // All keys exhausted — reset for next session
    currentKeyIndex = 0;
    console.error("AI: All API keys exhausted.");
    return false; // No more keys
}

// Returns true if the HTTP status means the key is dead (not a network error)
function isKeyExhaustedError(status, errMsg) {
    if (status === 401 || status === 402 || status === 429) return true;
    if (errMsg && (
        errMsg.includes("credit") ||
        errMsg.includes("quota") ||
        errMsg.includes("billing") ||
        errMsg.includes("insufficient") ||
        errMsg.includes("rate limit") ||
        errMsg.includes("key")
    )) return true;
    return false;
}

const AI_CONFIG = {
    apiUrl: "https://openrouter.ai/api/v1/chat/completions",
    model: "google/gemini-2.5-flash",
    maxTokens: 1024,
    temperature: 0.7
};


// --- State ---
let chatHistory = [];
let isWaitingForResponse = false;
let appContext = null; // Will be loaded from Firestore

// --- DOM Elements ---
const chatBox = document.getElementById("ai-chat-box");
const chatMessages = document.getElementById("ai-chat-messages");
const chatInput = document.getElementById("ai-chat-input");
const sendBtn = document.getElementById("send-ai-msg");
const toggleBtn = document.getElementById("ai-chat-toggle");
const closeBtn = document.getElementById("close-ai-chat");

// ==========================================
// APP CONTEXT LOADER (From Firestore)
// ==========================================
async function loadAppContext() {
    console.log("AI: Loading app context from Firestore...");
    const context = {
        services: [],
        teamMembers: [],
        siteBrand: "أنتيكو تيم",
        siteDescription: ""
    };

    try {
        // 1. Load Services
        const servicesSnap = await getDocs(query(collection(db, "services"), orderBy("sortOrder", "asc")));
        for (const sDoc of servicesSnap.docs) {
            const s = sDoc.data();
            if (!s.active) continue;

            const serviceInfo = {
                name: s.titleAr || s.slug,
                description: s.descriptionAr || "",
                type: s.sectionType || "store",
                slug: s.slug
            };

            // Load items for this service
            const collPath = (s.targetCollection && s.targetCollection.trim()) || s.slug;
            try {
                const itemsSnap = await getDocs(query(collection(db, collPath), orderBy("sortOrder", "asc")));
                serviceInfo.items = [];
                itemsSnap.forEach(iDoc => {
                    const item = iDoc.data();
                    if (!item.active) return;
                    const itemInfo = {
                        name: item.nameAr || item.name || item.titleAr || "",
                        price: item.price || "",
                        currency: item.currency || "ج.م"
                    };
                    if (item.options && item.options.length > 0) {
                        itemInfo.options = item.options.map(o => ({
                            name: o.name,
                            price: o.price
                        }));
                    }
                    serviceInfo.items.push(itemInfo);
                });
            } catch (e) {
                console.warn(`AI: Could not load items for ${collPath}`, e);
            }

            context.services.push(serviceInfo);
        }

        // 2. Load Team Members
        try {
            const teamSnap = await getDocs(query(collection(db, "team_members"), orderBy("sortOrder", "asc")));
            teamSnap.forEach(tDoc => {
                const m = tDoc.data();
                if (!m.active) return;
                context.teamMembers.push({
                    name: m.name,
                    role: m.role,
                    bio: m.bio || ""
                });
            });
        } catch (e) {
            console.warn("AI: Could not load team members", e);
        }

        // 3. Load Site Settings
        try {
            const settingsSnap = await getDoc(doc(db, "site_settings", "main"));
            if (settingsSnap.exists()) {
                const st = settingsSnap.data();
                context.siteBrand = st.siteBrand || context.siteBrand;
            }
        } catch (e) { /* ignore */ }

        // 4. Load App Flags for extra context
        try {
            const flagsSnap = await getDoc(doc(db, "settings", "app_flags"));
            if (flagsSnap.exists()) {
                const fl = flagsSnap.data();
                context.siteDescription = fl.siteBio || "";
                context.adminWhatsApp = fl.adminWa || "";
            }
        } catch (e) { /* ignore */ }

        // 5. Load AI config dynamically from Firestore
        try {
            const aiSnap = await getDoc(doc(db, "settings", "ai_config"));
            if (aiSnap.exists()) {
                const aiData = aiSnap.data();
                if (aiData.api_keys && aiData.api_keys.length > 0) {
                    API_KEYS = aiData.api_keys;
                }
                if (aiData.api_base_url) {
                    AI_CONFIG.apiUrl = aiData.api_base_url.replace(/\/$/, "") + "/chat/completions";
                }
                if (aiData.api_model_name) {
                    AI_CONFIG.model = aiData.api_model_name;
                }
                console.log("AI: Dynamic config loaded successfully. Model:", AI_CONFIG.model);
            }
        } catch (e) {
            console.warn("AI: Could not load dynamic ai_config", e);
        }

        appContext = context;
        console.log("AI: App context loaded successfully.", context);
    } catch (e) {
        console.error("AI: Failed to load app context:", e);
        appContext = context; // Use defaults
    }

    return context;
}

// ==========================================
// SYSTEM PROMPT BUILDER
// ==========================================
function buildSystemPrompt() {
    const ctx = appContext || { services: [], teamMembers: [], siteBrand: "أنتيكو تيم" };

    let servicesText = "";
    if (ctx.services.length > 0) {
        servicesText = ctx.services.map(s => {
            let text = `• ${s.name}`;
            if (s.description) text += ` — ${s.description}`;
            if (s.items && s.items.length > 0) {
                text += "\n  العناصر المتوفرة:";
                s.items.forEach(item => {
                    text += `\n    - ${item.name}`;
                    if (item.price) text += ` (${item.price} ${item.currency})`;
                    if (item.options) {
                        item.options.forEach(opt => {
                            text += `\n      ↳ ${opt.name}: ${opt.price} ${item.currency || "ج.م"}`;
                        });
                    }
                });
            }
            return text;
        }).join("\n\n");
    }

    let teamText = "";
    if (ctx.teamMembers.length > 0) {
        teamText = ctx.teamMembers.map(m => {
            let text = `• ${m.name} — ${m.role}`;
            if (m.bio) text += ` (${m.bio})`;
            return text;
        }).join("\n");
    }

    return `أنتِ المساعدة الذكية لتطبيق "${ctx.siteBrand}".
${ctx.siteDescription ? `وصف الموقع: ${ctx.siteDescription}` : ""}

🎯 مهمتك:
- مساعدة المستخدمين في التعرف على الخدمات والمنتجات المتاحة
- الإجابة على أسئلتهم حول الأسعار والتفاصيل
- توجيههم لكيفية الطلب أو التواصل مع الفريق
- كن ودود ومحترف واستخدم الإيموجي بشكل خفيف

📋 الأقسام والخدمات المتاحة حالياً:
${servicesText || "لا توجد خدمات محددة حالياً."}

👥 فريق العمل:
${teamText || "لا توجد بيانات عن الفريق حالياً."}

${ctx.adminWhatsApp ? `📞 رقم التواصل عبر واتساب: ${ctx.adminWhatsApp}` : ""}

📌 قواعد مهمة:
- أجب باللغة العربية دائماً إلا إذا سألك المستخدم بلغة أخرى
- اذكر الأسعار بدقة كما هي في البيانات
- لا تخترع خدمات أو أسعار غير موجودة
- إذا سُئلت عن شيء لا تعرفه، اقترح التواصل مع الفريق
- اجعل ردودك مختصرة ومفيدة (لا تزيد عن 3-4 أسطر إلا لو الموضوع يحتاج تفصيل)
- لا تذكر أبداً أنك نموذج لغوي أو AI من جوجل أو OpenAI، أنت مساعد ${ctx.siteBrand}`;
}

// ==========================================
// CHAT UI FUNCTIONS
// ==========================================

function createMessageBubble(text, sender = "ai") {
    const wrapper = document.createElement("div");
    wrapper.className = `chat-msg ${sender}`;
    wrapper.style.cssText = `
        display: flex; 
        justify-content: ${sender === "user" ? "flex-end" : "flex-start"};
        margin-bottom: 12px;
        animation: msgSlideIn 0.3s ease;
    `;

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";
    bubble.style.cssText = `
        max-width: 85%;
        padding: 12px 16px;
        border-radius: ${sender === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px"};
        background: ${sender === "user"
            ? "linear-gradient(135deg, #ff003c, #cc0030)"
            : "rgba(255,255,255,0.08)"};
        color: #fff;
        font-size: 0.92rem;
        line-height: 1.7;
        word-wrap: break-word;
        direction: rtl;
        text-align: right;
        border: ${sender === "ai" ? "1px solid rgba(255,255,255,0.06)" : "none"};
        backdrop-filter: ${sender === "ai" ? "blur(10px)" : "none"};
    `;

    bubble.innerHTML = formatMessage(text);
    wrapper.appendChild(bubble);
    return wrapper;
}

function formatMessage(text) {
    // Simple markdown-like formatting
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-size:0.85em;">$1</code>')
        .replace(/\n/g, '<br>');
}

function showTypingIndicator() {
    const wrapper = document.createElement("div");
    wrapper.className = "chat-msg ai typing-indicator-msg";
    wrapper.id = "typing-indicator";
    wrapper.style.cssText = `
        display: flex; justify-content: flex-start; margin-bottom: 12px;
        animation: msgSlideIn 0.3s ease;
    `;

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";
    bubble.style.cssText = `
        padding: 14px 22px;
        border-radius: 18px 18px 18px 4px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.06);
        display: flex; gap: 6px; align-items: center;
    `;

    for (let i = 0; i < 3; i++) {
        const dot = document.createElement("div");
        dot.style.cssText = `
            width: 8px; height: 8px; border-radius: 50%;
            background: rgba(255,0,60,0.6);
            animation: typingBounce 1.4s infinite;
            animation-delay: ${i * 0.2}s;
        `;
        bubble.appendChild(dot);
    }

    wrapper.appendChild(bubble);
    chatMessages.appendChild(wrapper);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.getElementById("typing-indicator");
    if (indicator) indicator.remove();
}

function scrollToBottom() {
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function addMessage(text, sender = "ai") {
    const msg = createMessageBubble(text, sender);
    chatMessages.appendChild(msg);
    scrollToBottom();
    return msg;
}

// ==========================================
// SUGGESTIONS
// ==========================================
function showSuggestions() {
    const suggestions = [
        "إيه الخدمات المتاحة؟ 🛒",
        "عايز أعرف الأسعار 💰",
        "مين فريق أنتيكو؟ 👥",
        "ازاي أطلب؟ 📦"
    ];

    const wrapper = document.createElement("div");
    wrapper.className = "suggestions-wrapper";
    wrapper.style.cssText = `
        display: flex; flex-wrap: wrap; gap: 8px;
        justify-content: flex-start; margin-bottom: 12px;
        direction: rtl;
    `;

    suggestions.forEach(text => {
        const chip = document.createElement("button");
        chip.textContent = text;
        chip.style.cssText = `
            background: rgba(255,0,60,0.1);
            border: 1px solid rgba(255,0,60,0.3);
            color: #ff6b8a;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.82rem;
            font-family: 'Alexandria', sans-serif;
            cursor: pointer;
            transition: all 0.3s ease;
            white-space: nowrap;
        `;
        chip.onmouseenter = () => {
            chip.style.background = "rgba(255,0,60,0.25)";
            chip.style.transform = "translateY(-2px)";
        };
        chip.onmouseleave = () => {
            chip.style.background = "rgba(255,0,60,0.1)";
            chip.style.transform = "translateY(0)";
        };
        chip.onclick = () => {
            wrapper.remove();
            handleSend(text);
        };
        wrapper.appendChild(chip);
    });

    chatMessages.appendChild(wrapper);
    scrollToBottom();
}

// ==========================================
// AI API CALL (OpenRouter with Streaming + Key Rotation)
// ==========================================
async function getAIResponse(userMessage, retryCount = 0) {
    // Build messages array
    const systemPrompt = buildSystemPrompt();

    // Keep last 10 messages for context (to avoid token overflow)
    const recentHistory = chatHistory.slice(-10);

    const messages = [
        { role: "system", content: systemPrompt },
        ...recentHistory,
        { role: "user", content: userMessage }
    ];

    try {
        const response = await fetch(AI_CONFIG.apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getCurrentKey()}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "Antiko Team App"
            },
            body: JSON.stringify({
                model: AI_CONFIG.model,
                messages: messages,
                max_tokens: AI_CONFIG.maxTokens,
                temperature: AI_CONFIG.temperature,
                stream: true
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData.error?.message || "";
            console.error(`AI API Error (key #${currentKeyIndex}):`, response.status, errMsg);

            // If key is dead, rotate and retry automatically
            if (isKeyExhaustedError(response.status, errMsg)) {
                const hasMore = rotateToNextKey();
                if (hasMore && retryCount < API_KEYS.length) {
                    return await getAIResponse(userMessage, retryCount + 1);
                }
            }

            throw new Error(errMsg || `خطأ ${response.status}`);
        }

        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        // Create the AI bubble early for streaming
        removeTypingIndicator();
        const msgElement = addMessage("", "ai");
        const bubbleEl = msgElement.querySelector(".msg-bubble");

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter(line => line.trim() !== "");

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const data = line.slice(6).trim();
                    if (data === "[DONE]") continue;

                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) {
                            fullText += delta;
                            bubbleEl.innerHTML = formatMessage(fullText);
                            scrollToBottom();
                        }
                    } catch (e) {
                        // Skip unparseable chunks
                    }
                }
            }
        }

        // If streaming didn't work (empty response), try non-streaming
        if (!fullText) {
            console.warn("AI: Streaming returned empty, retrying non-stream...");
            msgElement.remove();
            return await getAIResponseFallback(userMessage);
        }

        return fullText;

    } catch (error) {
        console.error("AI Response Error:", error);
        removeTypingIndicator();
        throw error;
    }
}

// Fallback non-streaming request (also supports key rotation)
async function getAIResponseFallback(userMessage, retryCount = 0) {
    const systemPrompt = buildSystemPrompt();
    const recentHistory = chatHistory.slice(-10);

    const messages = [
        { role: "system", content: systemPrompt },
        ...recentHistory,
        { role: "user", content: userMessage }
    ];

    const response = await fetch(AI_CONFIG.apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getCurrentKey()}`,
            "HTTP-Referer": window.location.origin,
            "X-Title": "Antiko Team App"
        },
        body: JSON.stringify({
            model: AI_CONFIG.model,
            messages: messages,
            max_tokens: AI_CONFIG.maxTokens,
            temperature: AI_CONFIG.temperature,
            stream: false
        })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || "";
        if (isKeyExhaustedError(response.status, errMsg)) {
            const hasMore = rotateToNextKey();
            if (hasMore && retryCount < API_KEYS.length) {
                return await getAIResponseFallback(userMessage, retryCount + 1);
            }
        }
        throw new Error(errMsg || `خطأ ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "عذراً، لم أتمكن من الرد. حاول مرة أخرى.";
    return text;
}

// ==========================================
// SEND MESSAGE HANDLER
// ==========================================
async function handleSend(overrideText) {
    const text = (overrideText || chatInput.value).trim();
    if (!text || isWaitingForResponse) return;

    // Clear input
    if (!overrideText) chatInput.value = "";

    // Add user message
    addMessage(text, "user");
    chatHistory.push({ role: "user", content: text });

    // Show typing
    isWaitingForResponse = true;
    updateSendButton(true);
    showTypingIndicator();

    try {
        if (API_KEYS.length === 0) {
            await loadAppContext();
        }
        if (API_KEYS.length === 0) {
            removeTypingIndicator();
            addMessage("⚠️ لم يتم تهيئة مفاتيح الـ API للمساعد الذكي بعد. يرجى تهيئتها من لوحة التحكم الخاصة بالمدير.", "ai");
            return;
        }

        const reply = await getAIResponse(text);

        // If streaming handled it, reply is already shown
        // If fallback was used, we need to add the message
        if (reply && !document.querySelector(".chat-msg.ai:last-child .msg-bubble")?.textContent) {
            removeTypingIndicator();
            addMessage(reply, "ai");
        }

        chatHistory.push({ role: "assistant", content: reply });
    } catch (error) {
        removeTypingIndicator();
        addMessage("⚠️ حصل مشكلة في الاتصال. جرب تاني كمان شوية أو تواصل مع الفريق مباشرة.", "ai");
    } finally {
        isWaitingForResponse = false;
        updateSendButton(false);
        // Re-focus input to keep chat active
        if (chatInput) chatInput.focus();
    }
}

function updateSendButton(loading) {
    if (!sendBtn) return;
    if (loading) {
        sendBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
        sendBtn.disabled = true;
        sendBtn.style.opacity = "0.5";
    } else {
        sendBtn.innerHTML = '<i class="ph-fill ph-paper-plane-right"></i>';
        sendBtn.disabled = false;
        sendBtn.style.opacity = "1";
    }
}

// ==========================================
// CHAT TOGGLE (OPEN/CLOSE)
// ==========================================
let chatInitialized = false;

function openChat() {
    if (!chatBox) return;
    chatBox.classList.remove("hidden");

    if (!chatInitialized) {
        chatInitialized = true;
        chatMessages.innerHTML = "";

        // Welcome message
        addMessage("أهلاً بيك! 👋 أنا المساعد الذكي بتاع أنتيكو تيم.\nازاي أقدر أساعدك النهاردة؟ ✨", "ai");

        // Show suggestions after a short delay
        setTimeout(() => showSuggestions(), 500);

        // Load context in background
        loadAppContext().then(() => {
            console.log("AI: Context ready for queries.");
        });
    }

    // Focus input
    setTimeout(() => {
        if (chatInput) chatInput.focus();
    }, 300);
}

function closeChat() {
    if (!chatBox) return;
    chatBox.classList.add("hidden");
}

// ==========================================
// EVENT LISTENERS
// ==========================================
if (toggleBtn) {
    toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent document click from immediately closing
        if (chatBox && chatBox.classList.contains("hidden")) {
            openChat();
        } else {
            closeChat();
        }
        if (typeof window.playSound === "function") window.playSound("menu");
    });
}

if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeChat();
        if (typeof window.playSound === "function") window.playSound("back");
    });
}

if (sendBtn) {
    sendBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent document click handler from closing chat
        handleSend();
    });
}

if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            handleSend();
        }
    });
}

// Prevent any click inside the chat box from closing it
if (chatBox) {
    chatBox.addEventListener("click", (e) => {
        e.stopPropagation();
    });
}

// Close chat when clicking outside (with guard)
document.addEventListener("click", (e) => {
    if (!chatBox || chatBox.classList.contains("hidden")) return;
    // Never close while waiting for AI response
    if (isWaitingForResponse) return;
    if (chatBox.contains(e.target)) return; // Click inside chat
    if (toggleBtn && toggleBtn.contains(e.target)) return; // Click on toggle btn
    const mobileAiBtn = document.getElementById("btn-nav-ai");
    if (mobileAiBtn && mobileAiBtn.contains(e.target)) return; // Click on mobile nav btn
    closeChat();
});

// NOTE: btn-nav-ai is handled by app.js via window.openAiChat / window.closeAiChat

// ==========================================
// INJECT CSS ANIMATIONS
// ==========================================
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes msgSlideIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes typingBounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-8px); opacity: 1; }
    }
    .chat-msg.ai .msg-bubble code {
        background: rgba(255,255,255,0.1);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.85em;
    }
    .chat-msg.ai .msg-bubble strong {
        color: #ff6b8a;
    }
    #ai-chat-input:focus {
        outline: none;
        border-color: rgba(255,0,60,0.5) !important;
        box-shadow: 0 0 0 3px rgba(255,0,60,0.1);
    }
`;
document.head.appendChild(styleSheet);

// ==========================================
// EXPOSE GLOBALS
// ==========================================
window.openAiChat = openChat;
window.closeAiChat = closeChat;

// ==========================================
// INIT
// ==========================================
console.log("Antiko AI Chat: Module loaded successfully ✅");
