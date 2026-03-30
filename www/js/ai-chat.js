
// Antiko AI Chat System - Antiko 💖
// DeepSeek Powered Dynamic Engine with Site Knowledge
import { db, getDoc, doc, collection, getDocs } from "./firebase-config.js";

(function () {
    const initChat = () => {
        const chatToggle = document.getElementById('ai-chat-toggle');
        const chatBox = document.getElementById('ai-chat-box');
        const closeBtn = document.getElementById('close-ai-chat');
        const chatInput = document.getElementById('ai-chat-input');
        const sendBtn = document.getElementById('send-ai-msg');
        const messagesContainer = document.getElementById('ai-chat-messages');

        if (!chatToggle || !chatBox) {
            console.warn("AI Chat Elements not found");
            return false;
        }
        // --- 1. Robust Environment Detection ---
        const isNative = (window.Capacitor && window.Capacitor.isNativePlatform()) ||
            window.location.protocol === 'capacitor:' ||
            window.location.protocol === 'file:' ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '' ||
            /Capacitor|iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        const isProductionWeb = !isNative && (window.location.hostname.includes('web.app') || window.location.hostname.includes('firebaseapp.com'));

        console.log("Antiko AI Init -> Native:", isNative, " | Prot:", window.location.protocol, " | Host:", window.location.hostname);

        let showWelcomeMessage = () => {
            appendMessage('ai', 'أهلاً بك يا فندم! أنا المساعد الذكي "أنتيكو".. أنا هنا عشان أرد على كل استفساراتك عن خدمات وأخبار فريق أنتيكو تيم. تحب تسأل عن إيه؟ ✨🌸');
        };

        if (isProductionWeb) {
            console.log("Antiko AI: Production Web Mode.");
        }

        // Antiko's Brain 🧠 - Dynamic DeepSeek Engine with Site Consciousness
        let conversationHistory = JSON.parse(localStorage.getItem('Antiko_history') || "[]");
        let dynamicSystemPrompt = localStorage.getItem('Antiko_persona') || `أنت "أنتيكو"، المساعد الذكي لشركة وفريق عمل "أنتيكو تيم". كن ودوداً جداً واستخدم اللهجة المصرية الودودة.`;

        // --- API Config State ---
        let apiKeys = JSON.parse(localStorage.getItem('Antiko_keys') || "[]");
        let apiBaseUrl = localStorage.getItem('Antiko_base_url') || "https://api.azy.ai/v1";
        let apiModelName = localStorage.getItem('Antiko_model') || "gpt-3.5-turbo";
        let currentKeyIndex = 0;

        let siteKnowledge = "";
        let isConfigSynced = false;

        // Fetch Dynamic Persona & Site Information from Firestore
        async function syncAiConfig() {
            try {
                // 1. Sync Persona & API Config
                const snap = await getDoc(doc(db, "settings", "ai_config"));
                if (snap.exists()) {
                    const data = snap.data();

                    if (data.system_prompt) {
                        dynamicSystemPrompt = data.system_prompt;
                        localStorage.setItem('Antiko_persona', dynamicSystemPrompt);
                    }

                    if (data.api_keys && Array.isArray(data.api_keys)) {
                        apiKeys = data.api_keys;
                        localStorage.setItem('Antiko_keys', JSON.stringify(apiKeys));
                    }

                    if (data.api_base_url) {
                        apiBaseUrl = data.api_base_url;
                        localStorage.setItem('Antiko_base_url', apiBaseUrl);
                    }

                    if (data.api_model_name) {
                        apiModelName = data.api_model_name;
                        localStorage.setItem('Antiko_model', apiModelName);
                    }
                }

                // 2. Sync Site Knowledge (Services & Team)
                try {
                    const servicesSnap = await getDocs(collection(db, "services"));
                    const teamSnap = await getDocs(collection(db, "team_members"));

                    let knowledge = "\nمعلومات الموقع حالياً:\n";
                    if (!servicesSnap.empty) {
                        // Limit strongly to avoid too long prompt in GET url
                        const servicesList = servicesSnap.docs.slice(0, 10).map(d => d.data().titleAr || d.data().name);
                        knowledge += "الخدمات: " + servicesList.join('، ') + "\n";
                    }
                    if (!teamSnap.empty) {
                        const teamList = teamSnap.docs.slice(0, 5).map(d => d.data().name);
                        knowledge += "الفريق: " + teamList.join('، ') + "\n";
                    }
                    siteKnowledge = knowledge;
                } catch (innerErr) {
                    console.warn("Antiko Knowledge Sync Failed", innerErr);
                }

                console.log("Antiko: Personality & Site Knowledge Synced 🤖👁️✨");
                isConfigSynced = true;
            } catch (e) {
                console.error("Antiko Primary Sync Error:", e);
                isConfigSynced = true;
            }
        }

        const configPromise = syncAiConfig();

        // Toggle Chat
        chatToggle.onclick = (e) => {
            e.preventDefault();
            chatBox.classList.toggle('hidden');
            if (!chatBox.classList.contains('hidden')) {
                chatInput.focus();
                if (messagesContainer.children.length === 0) {
                    if (conversationHistory.length > 0) {
                        renderHistory();
                    } else {
                        showWelcomeMessage();
                    }
                }
            }
        };

        function renderHistory() {
            messagesContainer.innerHTML = "";
            conversationHistory.forEach(msg => {
                appendMessage(msg.role === 'user' ? 'user' : 'ai', msg.parts[0].text, false);
            });
            scrollToBottom();
        }

        if (closeBtn) {
            closeBtn.onclick = () => {
                chatBox.classList.add('hidden');
            };
        }

        // Send Message
        const sendMessage = async () => {
            const text = chatInput.value.trim();
            if (!text) return;

            appendMessage('user', text);
            chatInput.value = '';

            const aiMsgDiv = appendMessage('ai', '<div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>');

            try {
                if (!isConfigSynced) await configPromise;

                const finalPrompt = (dynamicSystemPrompt + siteKnowledge).substring(0, 1500);
                const response = await getAntikoResponse(text, finalPrompt);
                aiMsgDiv.querySelector('.msg-content').innerHTML = response;
            } catch (err) {
                console.error("Antiko AI Error:", err);
                aiMsgDiv.querySelector('.msg-content').textContent = `⚠️ عذراً، حصل خطأ في الاتصال: ${err.message}`;
            }

            scrollToBottom();
        };

        if (sendBtn) sendBtn.onclick = sendMessage;
        if (chatInput) {
            chatInput.onkeypress = (e) => {
                if (e.key === 'Enter') sendMessage();
            };
        }

        function appendMessage(type, content, save = true) {
            const msgDiv = document.createElement('div');
            msgDiv.className = `message ${type}`;

            const now = new Date();
            const timeStr = now.getHours() + ':' + now.getMinutes().toString().padStart(2, '0');

            msgDiv.innerHTML = `
                <div class="msg-content">${content}</div>
                <div class="msg-time">${type === 'ai' ? 'أنتيكو' : 'أنت'} • ${timeStr}</div>
            `;

            messagesContainer.appendChild(msgDiv);
            scrollToBottom();
            return msgDiv;
        }

        function scrollToBottom() {
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }

        async function getAntikoResponse(userText, fullPrompt) {
            try {
                return await fetchGemini(userText, fullPrompt);
            } catch (fatalError) {
                console.error("Antiko AI Response Error:", fatalError);
                throw fatalError;
            }
        }

        // --- 🧠 Antiko Internal Mini-Brain (Offline Fallback) ---
        class LocalBrain {
            constructor() {
                this.knowledge = {
                    "سلام": "وعليكم السلام يا فندم! نورت أنتيكو. أقدر أساعدك في إيه؟",
                    "أهلاً": "أهلاً بك! أنا المساعد الذكي، إزاي أقدر أخدمك النهاردة؟",
                    "خدمة": "إحنا في فريق أنتيكو بنقدم خدمات تطوير المواقع، تطبيقات الموبايل، والحلول الذكية. حابب تعرف أكتر؟",
                    "سعر": "الأسعار بتختلف حسب المشروع، بس ممكن تتواصل مع الدعم الفني عشان يديك عرض سعر مناسب.",
                    "فريق": "فريق أنتيكو مكون من مهندسين ومطورين شطار جداً، هدفنا ديماً نطلع شغل احترافي.",
                    "باي": "مع السلامة! نورتنا في أي وقت.",
                    "شكرا": "العفو! ده واجبي. لو احتجت أي حاجة تانية أنا هنا."
                };
            }
            think(text) {
                const input = (text || "").toLowerCase();
                for (let key in this.knowledge) {
                    if (input.includes(key)) return this.knowledge[key];
                }
                return "عذراً يا فندم، أنا حالياً شغال بـ 'المخ الداخلي' المحدود لأن فيه مشكلة في الاتصال بالسيرفر. جرب تسألني عن (الخدمات أو الفريق) أو فعل الـ VPN!";
            }
        }
        const localBrain = new LocalBrain();

        async function fetchGemini(userText, prompt) {
            // Priority: Firestore Config -> Aggressive Fallbacks -> Gemini Direct
            let apiKey = "AIzaSyDYHJtZiA753kY0CBj5Dsd1EUrfVKStG_I";
            let url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            let isProxy = false;
            let isOpenRouter = false;

            const PROXY_LIST = [
                "https://openrouter.ai/api/v1",
                "https://api.aizone.ai/v1",
                "https://api.aizone.cc/v1",
                "https://azy.rest/v1",
                "https://api.acy.ae/v1"
            ];

            // Normalize Base URL
            let cleanBaseUrl = (apiBaseUrl || PROXY_LIST[0]).trim().replace(/\/+$/, "");

            // Integrate User-provided OpenRouter Key if current keys are empty
            const currentKeys = (apiKeys && apiKeys.length > 0) ? apiKeys : ["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"];

            // If we have keys, use the proxy
            if (currentKeys.length > 0) {
                apiKey = currentKeys[currentKeyIndex];
                isProxy = true;

                // Auto-Detect OpenRouter Key
                if (apiKey.startsWith("sk-or-v1-")) {
                    cleanBaseUrl = "https://openrouter.ai/api/v1";
                    isOpenRouter = true;
                }

                url = `${cleanBaseUrl}/chat/completions`;
            }

            console.log(`[Antiko AI] Attempting: ${isProxy ? cleanBaseUrl : 'Gemini Direct'} (Key #${currentKeyIndex + 1})`);

            let payload;
            if (isProxy) {
                // Determine model name: default to a reliable free model on OpenRouter
                let finalModel = apiModelName || (isOpenRouter ? "google/gemini-2.0-flash-lite-preview-02-05:free" : "gpt-3.5-turbo");

                payload = {
                    model: finalModel,
                    messages: [
                        { role: "system", content: prompt },
                        { role: "user", content: userText }
                    ],
                    temperature: 0.7
                };
            } else {
                payload = {
                    contents: [{
                        role: "user",
                        parts: [{ text: `${prompt}\n\nسؤال المستخدم: ${userText}` }]
                    }]
                };
            }

            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        ...(isOpenRouter ? {
                            'HTTP-Referer': 'https://antiko.web.app',
                            'X-Title': 'Antiko Assistant'
                        } : {})
                    },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const errorJson = await res.json().catch(() => ({}));
                    const reason = errorJson?.error?.message || `HTTP ${res.status}`;

                    // Auto-Rotate Key on Auth/Limit errors
                    if (isProxy && (res.status === 429 || res.status === 401) && currentKeyIndex < currentKeys.length - 1) {
                        currentKeyIndex++;
                        console.warn(`Key #${currentKeyIndex} failed (Status ${res.status}). Rotating...`);
                        return fetchGemini(userText, prompt);
                    }

                    // Specific check for OpenRouter 401/402
                    if (isOpenRouter && (res.status === 401 || res.status === 403)) {
                        throw new Error("مفتاح OpenRouter غير صالح أو يحتاج شحن.");
                    }

                    throw new Error(reason);
                }

                const data = await res.json();
                let replyText = isProxy ? data?.choices?.[0]?.message?.content : data?.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!replyText) throw new Error("API Returned Empty Result.");

                updateHistory("user", userText, "model", replyText);
                return formatText(replyText);

            } catch (err) {
                console.error("Antiko AI Network/API Error:", err);

                // --- Aggressive Network Error Recovery ---
                if (isProxy && !isOpenRouter) {
                    const myIdx = PROXY_LIST.indexOf(cleanBaseUrl);
                    const nextProxy = (myIdx !== -1 && myIdx < PROXY_LIST.length - 1) ? PROXY_LIST[myIdx + 1] : null;
                    if (nextProxy) {
                        console.warn(`Network error on ${cleanBaseUrl}. Trying fallback: ${nextProxy}`);
                        apiBaseUrl = nextProxy;
                        return fetchGemini(userText, prompt);
                    }
                }

                // If ALL APIs fail, use the Mini-Brain Fallback!
                console.warn("All remotes failed. Falling back to Antiko Mini-Brain...");
                const localResponse = localBrain.think(userText);
                updateHistory("user", userText, "model", localResponse);
                return formatText(localResponse + "\n\n(تم الرد بواسطة الذكاء الداخلي لعدم وجود إنترنت 📡)");
            }
        }

        function updateHistory(uRole, uText, mRole, mText) {
            conversationHistory.push({ role: uRole, parts: [{ text: uText }] });
            conversationHistory.push({ role: mRole, parts: [{ text: mText }] });
            if (conversationHistory.length > 20) conversationHistory = conversationHistory.slice(-20);

            localStorage.setItem('Antiko_history', JSON.stringify(conversationHistory));
        }

        function formatText(t) {
            if (typeof t !== 'string') return "خطأ في النص";
            return t.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/### (.*?)/g, '<h3>$1</h3>');
        }

    };

    window.initAiChat = initChat;
    document.addEventListener('DOMContentLoaded', initChat);
})();
