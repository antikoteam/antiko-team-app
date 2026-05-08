import { auth, db, onAuthStateChanged, collection, getDocs, getDoc, doc, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot, where, writeBatch } from "./firebase-config.js";

// --- GLOBAL ERROR HANDLER ---
window.onerror = function (msg, url, line, col, error) {
    console.error(`GLOBAL ERROR: ${msg} at ${url}:${line}`);
    // Optional: alert(`Error: ${msg}\nLine: ${line}\nPlease check logs.`);
    return false;
};

// --- GLOBAL DASHBOARD STATE ---
let allServices = [];
let currentService = null;
let activeChatUserId = null;
let unsubActiveChat = null;
let unsubTicketsList = null;

// --- CRITICAL HELPERS (Defined early for window. usage) ---
window.showToast = function (msg, type = "success") {
    console.log(`[Toast ${type}]: ${msg}`);
    let toast = document.getElementById('antiko-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'antiko-toast';
        toast.style.cssText = `
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
            padding: 12px 25px; border-radius: 12px; z-index: 100000;
            font-family: 'Alexandria', sans-serif; font-size: 0.95rem; font-weight: 600;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5); transition: opacity 0.3s, bottom 0.3s;
            display: flex; align-items: center; gap: 10px; color: #fff;
        `;
        document.body.appendChild(toast);
    }
    toast.style.background = type === "error" ? "linear-gradient(135deg, #ff003c, #8a0303)" : "linear-gradient(135deg, #00ff88, #008a4a)";
    toast.innerHTML = (type === "error" ? '<i class="ph-fill ph-warning-circle"></i> ' : '<i class="ph-fill ph-check-circle"></i> ') + msg;
    toast.style.opacity = "1";
    toast.style.bottom = "50px";

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.bottom = "30px";
    }, 3000);
};

window.openModal = function (id) {
    console.log("Antiko: Attempting to open modal:", id);
    const m = document.getElementById(id);
    if (m) {
        m.classList.remove('hidden');
        m.style.display = 'flex';
        console.log("Modal opened successfully.");
    } else {
        console.error("Modal element not found:", id);
    }
};

window.closeModal = function (id) {
    const m = document.getElementById(id);
    if (m) {
        m.classList.add('hidden');
        m.style.display = 'none';
    }
};

window.openAdminModal = function () {
    window.openModal('admin-add-modal');
};

console.log("Antiko: Dashboard Script Initializing...");

// --- ADMIN SYSTEM (Top Level) ---
let adminEmails = [
    "karemkoko257koko@gmail.com",
    "omaranter.abdallah@gmail.com",
    "antiko.cb40b@gmail.com",
    "admin257@gmail.com",
    "kareem9989193@gmail.com",
    "zyadwzyry0@gmail.com",
    "b35435573@gmail.com",
    "rsam64833@gmail.com",
    "faresmanee3@gmail.com",
    "ferrohq1@gmail.com"
];

async function loadDynamicAdmins() {
    try {
        console.log("Antiko: Fetching dynamic admins...");
        const snap = await getDocs(collection(db, "admins"));
        const dynamicList = snap.docs.map(doc => doc.data().email.toLowerCase());
        adminEmails = [...new Set([...adminEmails, ...dynamicList])];
        console.log("Admins loaded in Dashboard module:", adminEmails);
    } catch (e) {
        console.error("Error loading dynamic admins in dashboard:", e);
    }
}
loadDynamicAdmins();


// Helper: Safe JSON stringify for onclick attributes
function safeJson(obj) { return JSON.stringify(obj).replace(/'/g, "&apos;"); }

// Debounce helper for performance
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Global Definitions for HTML onclick access
window.openAdminChat = async function (userId, email) {
    activeChatUserId = userId;
    const chatTitle = document.getElementById('chat-user-email');
    if (chatTitle) chatTitle.textContent = email;
    const msgBox = document.getElementById('admin-chat-box');
    if (!msgBox) return;

    if (window.innerWidth < 768) {
        const tList = document.getElementById('admin-ticket-list');
        const cView = document.getElementById('admin-chat-view');
        if (tList) tList.style.display = 'none';
        if (cView) cView.style.display = 'flex';
        const bBtn = document.getElementById('admin-chat-back-btn');
        if (bBtn) bBtn.style.display = 'block';
    }

    if (unsubActiveChat) unsubActiveChat();
    const q = query(collection(db, 'support_tickets'), where('userId', '==', userId));
    unsubActiveChat = onSnapshot(q, (snapshot) => {
        msgBox.innerHTML = '';
        const msgs = [];
        snapshot.forEach(doc => msgs.push(doc.data()));
        msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        msgs.forEach(msg => {
            const isMe = msg.senderId === 'admin';
            const msgDiv = document.createElement('div');
            msgDiv.style.cssText = `padding: 10px 15px; border-radius: 15px; max-width: 85%; font-size: 0.9rem; margin-bottom: 8px;
                ${isMe ? 'background: var(--neon-red); color: #fff; align-self: flex-end;' : 'background: rgba(255,255,255,0.1); color: #ddd; align-self: flex-start;'}
            `;
            msgDiv.textContent = msg.text;
            msgBox.appendChild(msgDiv);
        });
        msgBox.scrollTop = msgBox.scrollHeight;
    });
};

window.loadAdminTickets = async function () {
    const ticketList = document.getElementById('admin-ticket-list');
    if (!ticketList) return;
    ticketList.innerHTML = '<div style="text-align:center; padding:20px;"><i class="ph ph-spinner ph-spin"></i> جاري التحميل...</div>';
    if (unsubTicketsList) unsubTicketsList();
    try {
        const q = query(collection(db, 'support_tickets'));
        unsubTicketsList = onSnapshot(q, (snap) => {
            ticketList.innerHTML = '';
            const groups = {};
            snap.forEach(doc => {
                const data = doc.data();
                if (!groups[data.userId]) {
                    groups[data.userId] = { userId: data.userId, email: data.userEmail || "عميل", lastMsg: data.text, time: data.timestamp };
                } else if ((data.timestamp || 0) > (groups[data.userId].time || 0)) {
                    groups[data.userId].lastMsg = data.text;
                    groups[data.userId].time = data.timestamp;
                }
            });
            const list = Object.values(groups).sort((a, b) => (b.time || 0) - (a.time || 0));
            if (list.length === 0) { ticketList.innerHTML = '<div class="text-center" style="padding:40px; color:#888;">لا توجد تذاكر حالياً.</div>'; return; }
            list.forEach(t => {
                const item = document.createElement('div');
                item.className = 'ticket-item';
                const isActive = activeChatUserId === t.userId;
                item.style.cssText = `padding:15px; background:${isActive ? 'rgba(255,0,60,0.1)' : 'rgba(255,255,255,0.03)'}; border-radius:10px; margin-bottom:10px; cursor:pointer; border-right: 3px solid ${isActive ? 'var(--neon-red)' : 'transparent'};`;
                item.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="flex:1" onclick="window.openAdminChat('${t.userId}', '${t.email}')">
                            <div style="font-weight:700; color:#fff;">${t.email}</div>
                            <div style="font-size:0.8rem; color:#888; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;">${t.lastMsg}</div>
                        </div>
                        <button onclick="event.stopPropagation(); deleteTicket('${t.userId}')" style="background:rgba(255,0,0,0.1); color:#ff4444; border:none; width:32px; height:32px; border-radius:50%; cursor:pointer;">
                          <i class="ph ph-trash"></i>
                        </button>
                    </div>
                `;
                ticketList.appendChild(item);
            });
        }, (err) => {
            console.error(err);
            ticketList.innerHTML = '<div class="text-center" style="padding:20px; color:red;">خطأ: ' + err.message + '</div>';
        });
    } catch (e) { console.error(e); }
};

window.deleteTicket = async function (userId) {
    if (!confirm("هل أنت متأكد من حذف هذه التذكرة؟")) return;
    try {
        const q = query(collection(db, 'support_tickets'), where('userId', '==', userId));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
        showToast("تم حذف التذكرة بنجاح");
    } catch (e) {
        console.error(e);
        showToast("فشل في حذف التذكرة", "error");
    }
}

window.deleteAllTickets = async function () {
    if (!confirm("⚠️ هل أنت متأكد من مسح كافة تذاكر الدعم نهائياً؟")) return;
    try {
        const q = query(collection(db, 'support_tickets'));
        const snap = await getDocs(q);
        if (snap.empty) { showToast("لا توجد تذاكر لمسحها"); return; }
        const batch = writeBatch(db);
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
        showToast("تم مسح كافة التذاكر ✨");
    } catch (e) {
        console.error(e);
        showToast("فشل في مسح التذاكر", "error");
    }
}
window.addTeamMember = () => { if (typeof resetTeamForm === 'function') resetTeamForm(); if (window.openModal) window.openModal('team-modal'); else document.getElementById('team-modal').classList.remove('hidden'); };
window.deleteOrder = async (id) => { if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return; try { await deleteDoc(doc(db, "orders", id)); showToast("تم حذف الطلب بنجاح. 🗑️"); if (typeof loadOrders === 'function') loadOrders(); } catch (e) { console.error(e); showToast("فشل في حذف الطلب.", "error"); } };


// Protection Helper for Event Listeners
function addSafeListener(id, event, handler) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener(event, handler);
    } else {
        console.warn(`Element with ID "${id}" not found. skipping ${event} listener.`);
    }
}

// CRITICAL: Modal helpers were moved to the top of the file
// Modal close moved to top

// Navigation & Logic Initialization
addSafeListener('admin-chat-back-btn', 'click', () => {
    const tList = document.getElementById('admin-ticket-list');
    const cView = document.getElementById('admin-chat-view');
    if (tList) tList.style.display = 'block';
    if (cView) cView.style.display = 'none';
    const bBtn = document.getElementById('admin-chat-back-btn');
    if (bBtn) bBtn.style.display = 'none';
});

addSafeListener('admin-reply-form', 'submit', async (e) => {
    e.preventDefault();
    if (!activeChatUserId) {
        showToast("يرجى اختيار محادثة أولاً", "error");
        return;
    }
    const input = document.getElementById('admin-reply-input');
    const text = input.value.trim();
    if (!text) return;

    try {
        await addDoc(collection(db, 'support_tickets'), {
            userId: activeChatUserId,
            senderId: 'admin',
            text: text,
            timestamp: new Date().getTime(),
            status: 'replied'
        });
        input.value = '';
        showToast("تم إرسال الرد ✅");
    } catch (err) {
        console.error("Reply error:", err);
        showToast("فشل في إرسال الرد", "error");
    }
});

// Only load data when the dashboard is actually opened (dispatched by app.js)
document.addEventListener('dashboardOpened', () => {
    initDashboard();
    // Force hide sidebar on entry (just in case)
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
});

// Cleanup listeners when dashboard is closed
document.addEventListener('dashboardClosed', () => {
    console.log("Antiko Dashboard: Cleanup listeners");
    if (unsubActiveChat) {
        unsubActiveChat();
        unsubActiveChat = null;
    }
    if (unsubTicketsList) {
        unsubTicketsList();
        unsubTicketsList = null;
    }
});

// Global Sidebar Toggle (removed redundant version, using main-init.js version)
// If main-init.js version is not available, we have a fallback
if (typeof window.toggleSidebar !== 'function') {
    window.toggleSidebar = function () {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.toggle('open');
    };
}

// Helper: File to Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Navigation & State Listeners
const sidebarContainer = document.querySelector('.sidebar-menu');

if (sidebarContainer) {
    sidebarContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.menu-item');
        if (!item) return;

        const sectionId = item.getAttribute('data-section');
        if (sectionId) navigateToSection(sectionId);

        // Close sidebar on mobile after clicking
        if (window.innerWidth < 992) {
            if (typeof window.toggleSidebar === 'function') window.toggleSidebar();
        }
    });
}

// Nav Tiles (Grid)
document.addEventListener('click', (e) => {
    const tile = e.target.closest('.nav-tile');
    if (tile) {
        const sectionId = tile.getAttribute('data-goto');
        if (sectionId) navigateToSection(sectionId);
    }
});

// Add AI Connection Test Listener
addSafeListener('test-ai-connection-btn', 'click', async () => {
    const baseUrl = document.getElementById('api-base-url').value;
    const modelName = document.getElementById('api-model-name').value;
    const keyInputs = document.querySelectorAll('.api-key-input');
    const firstKey = keyInputs[0]?.value.trim();

    if (!firstKey) {
        showToast("يرجى إدخال مفتاح واحد على الأقل للتجربة!", 'warn');
        return;
    }

    showToast("جاري تجربة الاتصال... ⏳");
    const testUrl = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

    try {
        const res = await fetch(testUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${firstKey}`
            },
            body: JSON.stringify({
                model: modelName || "gpt-3.5-turbo",
                messages: [{ role: "user", content: "hi" }]
            })
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && (data.choices || data.candidates)) {
            showToast("✅ الاتصال يعمل بنجاح! المفاتيح والروابط صحيحة.", 'success');
        } else {
            const err = data.error?.message || `HTTP ${res.status}`;
            showToast(`❌ فشل الاتصال: ${err}`, 'error', 5000);
        }
    } catch (e) {
        showToast(`❌ خطأ في الشبكة أو الرابط غير صحيح!`, 'error', 5000);
    }
});

// Add AI Settings Listener
addSafeListener('save-ai-settings-btn', 'click', async () => {
    const prompt = document.getElementById('ai-system-prompt').value;
    const baseUrl = document.getElementById('api-base-url').value;
    const modelName = document.getElementById('api-model-name').value;
    const keyInputs = document.querySelectorAll('.api-key-input');
    const keys = Array.from(keyInputs).map(i => i.value.trim()).filter(v => v !== "");

    try {
        await setDoc(doc(db, "settings", "ai_config"), {
            system_prompt: prompt,
            api_base_url: baseUrl,
            api_model_name: modelName,
            api_keys: keys,
            updatedAt: new Date().getTime()
        });
        showToast("تم حفظ إعدادات المساعد والـ APIs بنجاح! 😍🌸");
    } catch (e) {
        console.error(e);
        showToast("فشل في حفظ الإعدادات!", 'error');
    }
});

// Handle AI Section Activation (Refresh data)
window.loadAiSettings = function () {
    const promptEl = document.getElementById('ai-system-prompt');
    const baseUrlEl = document.getElementById('api-base-url');
    const modelNameEl = document.getElementById('api-model-name');
    const keyInputs = document.querySelectorAll('.api-key-input');
    const usageEl = document.getElementById('api-usage-info');

    getDoc(doc(db, "settings", "ai_config")).then(async snap => {
        if (snap.exists()) {
            const data = snap.data();
            promptEl.value = data.system_prompt || "";
            baseUrlEl.value = data.api_base_url || "";
            modelNameEl.value = data.api_model_name || "";
            const keys = data.api_keys || [];
            keyInputs.forEach((el, idx) => {
                el.value = keys[idx] || "";
            });

            // If we have keys, show rotation status
            if (keys.length > 0) {
                usageEl.innerHTML = keys.map((k, i) => `
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <span>Key ${i + 1}: ${k.substring(0, 10)}...</span>
                        <span style="color:var(--success);">جاهز (Ready)</span>
                    </div>
                `).join('');
            } else {
                usageEl.textContent = "لا توجد مفاتيح مضافة حالياً.";
            }
        } else {
            promptEl.value = "أنتِ ميسا، المساعدة الذكية لتطبيق أنتيكو تيم...";
            usageEl.textContent = "لا توجد إعدادات سابقة.";
        }
    });
}

// ==========================================
// COMPREHENSIVE FLAG LIBRARY SYSTEM
// ==========================================
let currentFlagTargetId = null;

const WORLD_FLAGS = [
    // --- الوطن العربي (Arab World) ---
    { e: '🇪🇬', nAr: 'مصر', nEn: 'Egypt' }, { e: '🇸🇦', nAr: 'السعودية', nEn: 'Saudi Arabia' }, { e: '🇦🇪', nAr: 'الإمارات', nEn: 'UAE' },
    { e: '🇰🇼', nAr: 'الكويت', nEn: 'Kuwait' }, { e: '🇶🇦', nAr: 'قطر', nEn: 'Qatar' }, { e: '🇴🇲', nAr: 'عمان', nEn: 'Oman' },
    { e: '🇧🇭', nAr: 'البحرين', nEn: 'Bahrain' }, { e: '🇯🇴', nAr: 'الأردن', nEn: 'Jordan' }, { e: '🇵🇸', nAr: 'فلسطين', nEn: 'Palestine' },
    { e: '🇱🇧', nAr: 'لبنان', nEn: 'Lebanon' }, { e: '🇸🇾', nAr: 'سوريا', nEn: 'Syria' }, { e: '🇮🇶', nAr: 'العراق', nEn: 'Iraq' },
    { e: '🇲🇦', nAr: 'المغرب', nEn: 'Morocco' }, { e: '🇩🇿', nAr: 'الجزائر', nEn: 'Algeria' }, { e: '🇹🇳', nAr: 'تونس', nEn: 'Tunisia' },
    { e: '🇱🇾', nAr: 'ليبيا', nEn: 'Libya' }, { e: '🇸🇩', nAr: 'السودان', nEn: 'Sudan' }, { e: '🇾🇪', nAr: 'اليمن', nEn: 'Yemen' },
    { e: '🇲🇷', nAr: 'موريتانيا', nEn: 'Mauritania' }, { e: '🇸🇴', nAr: 'الصومال', nEn: 'Somalia' }, { e: '🇩🇯', nAr: 'جيبوتي', nEn: 'Djibouti' },
    { e: '🇰🇲', nAr: 'جزر القمر', nEn: 'Comoros' },

    // --- القوى العالمية والجوار (Major Powers & Neighbors) ---
    { e: '🇹🇷', nAr: 'تركيا', nEn: 'Turkey' }, { e: '🇺🇸', nAr: 'أمريكا', nEn: 'USA' }, { e: '🇬🇧', nAr: 'بريطانيا', nEn: 'UK' },
    { e: '🇷🇺', nAr: 'روسيا', nEn: 'Russia' }, { e: '🇨🇳', nAr: 'الصين', nEn: 'China' }, { e: '🇫🇷', nAr: 'فرنسا', nEn: 'France' },
    { e: '🇩🇪', nAr: 'ألمانيا', nEn: 'Germany' }, { e: '🇨🇦', nAr: 'كندا', nEn: 'Canada' }, { e: '🇯🇵', nAr: 'اليابان', nEn: 'Japan' },
    { e: '🇰🇷', nAr: 'كوريا الجنوبية', nEn: 'South Korea' }, { e: '🇮🇳', nAr: 'الهند', nEn: 'India' }, { e: '🇧🇷', nAr: 'البرازيل', nEn: 'Brazil' },
    { e: '🇮🇹', nAr: 'إيطاليا', nEn: 'Italy' }, { e: '🇪🇸', nAr: 'إسبانيا', nEn: 'Spain' },

    // --- آسيا وأوقيانوسيا (Asia & Oceania) ---
    { e: '🇮🇩', nAr: 'إندونيسيا', nEn: 'Indonesia' }, { e: '🇲🇾', nAr: 'ماليزيا', nEn: 'Malaysia' }, { e: '🇵🇰', nAr: 'باكستان', nEn: 'Pakistan' },
    { e: '🇮🇷', nAr: 'إيران', nEn: 'Iran' }, { e: '🇵🇭', nAr: 'الفلبين', nEn: 'Philippines' }, { e: '🇻🇳', nAr: 'فيتنام', nEn: 'Vietnam' },
    { e: '🇹🇭', nAr: 'تايلاند', nEn: 'Thailand' }, { e: '🇸🇬', nAr: 'سنغافورة', nEn: 'Singapore' }, { e: '🇦🇫', nAr: 'أفغانستان', nEn: 'Afghanistan' },
    { e: '🇧🇩', nAr: 'بنجلاديش', nEn: 'Bangladesh' }, { e: '🇦🇺', nAr: 'أستراليا', nEn: 'Australia' }, { e: '🇳🇿', nAr: 'نيوزيلندا', nEn: 'New Zealand' },
    { e: '🇰🇿', nAr: 'كازاخستان', nEn: 'Kazakhstan' }, { e: '🇺🇿', nAr: 'أوزبكستان', nEn: 'Uzbekistan' }, { e: '🇱🇰', nAr: 'سريلانكا', nEn: 'Sri Lanka' },
    { e: '🇳🇵', nAr: 'نيبال', nEn: 'Nepal' }, { e: '🇲🇲', nAr: 'ميانمار', nEn: 'Myanmar' }, { e: '🇰🇭', nAr: 'كمبوديا', nEn: 'Cambodia' },
    { e: '🇦🇿', nAr: 'أذربيجان', nEn: 'Azerbaijan' }, { e: '🇬🇪', nAr: 'جورجيا', nEn: 'Georgia' }, { e: '🇦🇲', nAr: 'أرمينيا', nEn: 'Armenia' },

    // --- أوروبا (Europe) ---
    { e: '🇳🇱', nAr: 'هولندا', nEn: 'Netherlands' }, { e: '🇧🇪', nAr: 'بلجيكا', nEn: 'Belgium' }, { e: '🇨🇭', nAr: 'سويسرا', nEn: 'Switzerland' },
    { e: '🇸🇪', nAr: 'السويد', nEn: 'Sweden' }, { e: '🇳🇴', nAr: 'النرويج', nEn: 'Norway' }, { e: '🇩🇰', nAr: 'الدنمارك', nEn: 'Denmark' },
    { e: '🇫🇮', nAr: 'فنلندا', nEn: 'Finland' }, { e: '🇵🇱', nAr: 'بولندا', nEn: 'Poland' }, { e: '🇺🇦', nAr: 'أوكرانيا', nEn: 'Ukraine' },
    { e: '🇬🇷', nAr: 'اليونان', nEn: 'Greece' }, { e: '🇵🇹', nAr: 'البرتغال', nEn: 'Portugal' }, { e: '🇦🇹', nAr: 'النمسا', nEn: 'Austria' },
    { e: '🇮🇪', nAr: 'أيرلندا', nEn: 'Ireland' }, { e: '🇷🇴', nAr: 'رومانيا', nEn: 'Romania' }, { e: '🇨🇿', nAr: 'التشيك', nEn: 'Czech Republic' },
    { e: '🇭🇺', nAr: 'المجر', nEn: 'Hungary' }, { e: '🇧🇬', nAr: 'بلغاريا', nEn: 'Bulgaria' }, { e: '🇭🇷', nAr: 'كرواتيا', nEn: 'Croatia' },
    { e: '🇸🇮', nAr: 'سلوفينيا', nEn: 'Slovenia' }, { e: '🇸🇰', nAr: 'سلوفاكيا', nEn: 'Slovakia' }, { e: '🇷🇸', nAr: 'صربيا', nEn: 'Serbia' },

    // --- أفريقيا (Africa - Non-Arab) ---
    { e: '🇳🇬', nAr: 'نيجيريا', nEn: 'Nigeria' }, { e: '🇿🇦', nAr: 'جنوب أفريقيا', nEn: 'South Africa' }, { e: '🇰🇪', nAr: 'كينيا', nEn: 'Kenya' },
    { e: '🇬🇭', nAr: 'غانا', nEn: 'Ghana' }, { e: '🇪🇹', nAr: 'إثيوبيا', nEn: 'Ethiopia' }, { e: '🇸🇳', nAr: 'السنغال', nEn: 'Senegal' },
    { e: '🇨🇲', nAr: 'الكاميرون', nEn: 'Cameroon' }, { e: '🇨🇮', nAr: 'ساحل العاج', nEn: 'Ivory Coast' }, { e: '🇺🇬', nAr: 'أوغندا', nEn: 'Uganda' },
    { e: '🇹🇿', nAr: 'تنزانيا', nEn: 'Tanzania' }, { e: '🇦🇴', nAr: 'أنغولا', nEn: 'Angola' }, { e: '🇿🇼', nAr: 'زيمبابوي', nEn: 'Zimbabwe' },

    // --- الأمريكتين (Americas) ---
    { e: '🇲🇽', nAr: 'المكسيك', nEn: 'Mexico' }, { e: '🇦🇷', nAr: 'الأرجنتين', nEn: 'Argentina' }, { e: '🇨🇱', nAr: 'تشيلي', nEn: 'Chile' },
    { e: '🇨🇴', nAr: 'كولومبيا', nEn: 'Colombia' }, { e: '🇵🇪', nAr: 'بيرو', nEn: 'Peru' }, { e: '🇻🇪', nAr: 'فنزويلا', nEn: 'Venezuela' },
    { e: '🇨🇺', nAr: 'كوبا', nEn: 'Cuba' }, { e: '🇪🇨', nAr: 'الإكوادور', nEn: 'Ecuador' }, { e: '🇵🇾', nAr: 'باراغواي', nEn: 'Paraguay' },
    { e: '🇺🇾', nAr: 'أوروغواي', nEn: 'Uruguay' }, { e: '🇧🇴', nAr: 'بوليفيا', nEn: 'Bolivia' }, { e: '🇵🇦', nAr: 'بنما', nEn: 'Panama' },
    { e: '🇨🇷', nAr: 'كوستاريكا', nEn: 'Costa Rica' }, { e: '🇯🇲', nAr: 'جامايكا', nEn: 'Jamaica' },

    // --- دول أخرى (Others) ---
    { e: '🇮🇱', nAr: 'إسرائيل', nEn: 'Israel' }
];
window.openFlagLibrary = function (targetId) {
    console.log("Opening Flag Library for:", targetId);
    currentFlagTargetId = targetId;
    renderFlagLibrary();
    const modal = document.getElementById('flag-library-modal');
    if (modal) modal.classList.remove('hidden');
}

function renderFlagLibrary(filter = '') {
    const grid = document.getElementById('flag-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const lowerFilter = filter.toLowerCase();

    WORLD_FLAGS.forEach(flag => {
        if (flag.nAr.includes(lowerFilter) || flag.nEn.toLowerCase().includes(lowerFilter)) {
            const card = document.createElement('div');
            card.className = 'glass-card flag-item-card';
            card.style = "cursor:pointer; transition: transform 0.3s; padding:2px; min-height:100px;";

            const flagHtml = FlagsHelper.getFlagHtml(flag.e, 50, 32, '2.2rem');

            card.innerHTML = `
                    <div class="card-edge"></div>
                    <div class="card-inner text-center" style="padding: 15px 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 10px;">
                        <div style="width:50px; height:32px; display:flex; align-items:center; justify-content:center;">${flagHtml}</div>
                        <div style="font-size:0.85rem; font-weight:700; color:#fff; line-height:1.2;">${flag.nAr}</div>
                    </div>
                `;

            card.onmouseover = () => { card.style.transform = 'translateY(-5px)'; };
            card.onmouseout = () => { card.style.transform = 'translateY(0)'; };

            card.onclick = () => {
                const target = document.getElementById(currentFlagTargetId);
                if (target) {
                    target.value = flag.e;
                    target.dispatchEvent(new Event('input'));
                }
                const modal = document.getElementById('flag-library-modal');
                if (modal) modal.classList.add('hidden');
            };
            grid.appendChild(card);
        }
    });
}

function updateFlagLabel(inputId) {
    const input = document.getElementById(inputId);
    const nameLabel = document.getElementById(inputId + '-name');
    if (!input || !nameLabel) return;

    const currentVal = input.value.trim();
    const found = WORLD_FLAGS.find(f => f.e === currentVal);
    nameLabel.textContent = found ? found.nAr : '';
}

const fSearch = document.getElementById('flag-search');
if (fSearch) {
    const debouncedRender = debounce((val) => renderFlagLibrary(val), 300);
    fSearch.addEventListener('input', (e) => debouncedRender(e.target.value));
}

function handleAutoFlag(nameId, flagId) {
    const nameInput = document.getElementById(nameId);
    if (!nameInput) return;
    const debouncedAutoFlag = debounce(() => {
        const val = nameInput.value.trim().toLowerCase();
        if (val.length < 2) return;
        const match = WORLD_FLAGS.find(f => val.includes(f.nAr.toLowerCase()) || val.includes(f.nEn.toLowerCase()));
        if (match) {
            const fTarget = document.getElementById(flagId);
            if (fTarget) {
                fTarget.value = match.e;
                updateFlagLabel(flagId);
            }
        }
    }, 400);
    nameInput.addEventListener('input', debouncedAutoFlag);
}

function cycleFlag(targetId, direction) {
    const input = document.getElementById(targetId);
    if (!input) return;

    const currentEmoji = input.value.trim();
    let currentIndex = WORLD_FLAGS.findIndex(f => f.e === currentEmoji);

    if (currentIndex === -1) currentIndex = 0;

    let nextIndex = currentIndex + direction;
    if (nextIndex >= WORLD_FLAGS.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = WORLD_FLAGS.length - 1;

    const nextFlag = WORLD_FLAGS[nextIndex];
    input.value = nextFlag.e;
    input.dispatchEvent(new Event('input'));
    updateFlagLabel(targetId);

    console.log(`Cycled to: ${nextFlag.nAr} ${nextFlag.e}`);
}

// Direct input listeners for manual typing/pasting
['whatsapp-country-flag', 'telegram-country-flag'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => updateFlagLabel(id));
});

handleAutoFlag('whatsapp-country-nameAr', 'whatsapp-country-flag');
handleAutoFlag('whatsapp-country-nameEn', 'whatsapp-country-flag');
handleAutoFlag('telegram-country-nameAr', 'telegram-country-flag');
handleAutoFlag('telegram-country-nameEn', 'telegram-country-flag');

// ==========================================
// STATS / HOME
// ==========================================

// ==========================================
// SETTINGS
// ==========================================
async function loadSettings() {
    try {
        const docRef = doc(db, "site_settings", "main");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();

            const setMap = {
                'set-siteBrand': data.siteBrand,
                'set-heroTop': data.heroTopText,
                'set-heroTitle': data.heroTitle,
                'set-heroSub': data.heroSubtitle,
                'set-teamTitle': data.teamCardTitle,
                'set-teamSub': data.teamCardSub,
                'set-storeTitle': data.storeCardTitle,
                'set-storeSub': data.storeCardSub,
                'set-mainAnnounceText': data.mainAnnounceText,
                'set-adminWa': data.adminWa,
                'set-adminTg': data.adminTg,
                'set-btnSoundBase64': data.customBtnSound
            };

            for (const [id, val] of Object.entries(setMap)) {
                const el = document.getElementById(id);
                if (el) el.value = val || '';
            }

            if (document.getElementById('set-wa-showAnnounce'))
                document.getElementById('set-wa-showAnnounce').checked = data.waShowAnnouncement || false;
            if (document.getElementById('set-tg-showAnnounce'))
                document.getElementById('set-tg-showAnnounce').checked = data.tgShowAnnouncement || false;
            if (document.getElementById('set-showMainAnnounce'))
                document.getElementById('set-showMainAnnounce').checked = data.showMainAnnounce || false;
        }
    } catch (e) {
        console.error(e);
    }
}

addSafeListener('settings-form', 'submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-settings-btn');
    if (!btn) return;

    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> جاري الحفظ...';

    try {
        const data = {
            siteBrand: document.getElementById('set-siteBrand').value,
            heroTopText: document.getElementById('set-heroTop').value,
            heroTitle: document.getElementById('set-heroTitle').value,
            heroSubtitle: document.getElementById('set-heroSub').value,
            teamCardTitle: document.getElementById('set-teamTitle').value,
            teamCardSub: document.getElementById('set-teamSub').value,
            storeCardTitle: document.getElementById('set-storeTitle').value,
            storeCardSub: document.getElementById('set-storeSub').value,
            showMainAnnounce: document.getElementById('set-showMainAnnounce').checked,
            mainAnnounceText: document.getElementById('set-mainAnnounceText').value,
            adminWa: document.getElementById('set-adminWa').value,
            adminTg: document.getElementById('set-adminTg').value,
            customBtnSound: document.getElementById('set-btnSoundBase64').value
        };

        await setDoc(doc(db, "site_settings", "main"), data, { merge: true });
        btn.innerHTML = '<i class="ph ph-check"></i> تم الحفظ بنجاح';
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }, 2000);
    } catch (error) {
        console.error("SETTINGS SAVE EXCEPTION:", error);
        alert("حدث خطأ أثناء حفظ الإعدادات");
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
});

// ==========================================
// WHATSAPP COUNTRIES
// ==========================================
async function loadWhatsappCountries() {
    const tbody = document.getElementById('whatsapp-countries-tbody');
    if (!tbody) return;
    try {
        const q = query(collection(db, "whatsapp_countries"), orderBy("sortOrder", "asc"));
        const querySnapshot = await getDocs(q);
        tbody.innerHTML = '';

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">لا توجد أرقام واتساب مضافة.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const c = docSnap.data();
            const id = docSnap.id;
            const statusBadge = c.active
                ? `<span class="badge success">نشط</span>`
                : `<span class="badge danger">معطل</span>`;

            let flagHtml = c.flagUrl || c.flag || c.icon;
            flagHtml = FlagsHelper.getFlagHtml(flagHtml, 40, 28, '1.2rem');

            const tr = document.createElement('tr');
            const countryData = safeJson({ id, ...c });
            const nameAr = c.nameAr || c.name || 'بدون اسم';
            const nameEn = c.nameEn || '';

            tr.innerHTML = `
                    <td data-label="العلم" style="font-size: 1.5rem;">${flagHtml || '🏳️'}</td>
                    <td data-label="الدولة">
                        <div style="font-weight: 600;">${nameAr}</div>
                        <div style="font-size: 0.8rem; opacity: 0.7;">${nameEn}</div>
                    </td>
                    <td data-label="السعر">${c.price || '0'} ج.م</td>
                    <td data-label="الحالة">${statusBadge}</td>
                    <td data-label="الترتيب">${c.sortOrder || 0}</td>
                    <td data-label="التحكم">
                        <div style="display: flex; gap: 8px; justify-content: center;">
                            <button class="action-btn edit" onclick='editWhatsappCountry(${countryData})' title="تعديل"><i class="ph ph-pencil-simple"></i></button>
                            <button class="action-btn delete" onclick="deleteWhatsappCountry('${id}')" title="حذف"><i class="ph ph-trash"></i></button>
                        </div>
                    </td>
                `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color:var(--neon-red);">حدث خطأ أثناء جلب البيانات</td></tr>';
    }
}

// Flag logic is now handled by FlagsHelper in js/flags.js
function emojiToUrl(input) { return input; }


addSafeListener('whatsapp-country-form', 'submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-whatsapp-country-btn');
    if (btn) btn.textContent = 'جاري الحفظ...';

    const id = document.getElementById('whatsapp-country-id').value;
    const rawFlag = document.getElementById('whatsapp-country-flag').value;
    const finalFlagUrl = emojiToUrl(rawFlag);

    const data = {
        nameAr: document.getElementById('whatsapp-country-nameAr').value,
        nameEn: document.getElementById('whatsapp-country-nameEn').value,
        price: document.getElementById('whatsapp-country-price').value,
        currency: document.getElementById('whatsapp-country-currency').value,
        flagUrl: finalFlagUrl,
        sortOrder: Number(document.getElementById('whatsapp-country-sort').value),
        active: document.getElementById('whatsapp-country-active').checked
    };

    try {
        if (id) {
            await updateDoc(doc(db, "whatsapp_countries", id), data);
        } else {
            await addDoc(collection(db, "whatsapp_countries"), data);
        }
        const modal = document.getElementById('whatsapp-country-modal');
        if (modal) modal.classList.add('hidden');
        loadWhatsappCountries();
        document.getElementById('whatsapp-country-form').reset();
        document.getElementById('whatsapp-country-id').value = '';
        const flagLabel = document.getElementById('whatsapp-country-flag-name');
        if (flagLabel) flagLabel.textContent = '';
    } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء الحفظ");
    } finally {
        if (btn) btn.textContent = 'حفظ الرقم';
    }
});

function editWhatsappCountry(c) {
    const modal = document.getElementById('whatsapp-country-modal');
    if (!modal) return;
    document.getElementById('whatsapp-country-id').value = c.id || '';
    document.getElementById('whatsapp-country-nameAr').value = c.nameAr || '';
    document.getElementById('whatsapp-country-nameEn').value = c.nameEn || '';
    document.getElementById('whatsapp-country-price').value = c.price || 0;
    document.getElementById('whatsapp-country-currency').value = c.currency || 'ج.م';
    document.getElementById('whatsapp-country-flag').value = c.flagUrl || '';
    document.getElementById('whatsapp-country-sort').value = c.sortOrder || 0;
    document.getElementById('whatsapp-country-active').checked = c.active !== false;
    updateFlagLabel('whatsapp-country-flag');

    const title = document.getElementById('whatsapp-country-modal-title');
    if (title) title.textContent = 'تعديل الرقم';
    modal.classList.remove('hidden');
}

async function deleteWhatsappCountry(id) {
    if (confirm("هل أنت متأكد من حذف هذا الرقم؟")) {
        try {
            await deleteDoc(doc(db, "whatsapp_countries", id));
            loadWhatsappCountries();
        } catch (e) {
            console.error(e);
            alert("خطأ أثناء الحذف");
        }
    }
}

// ==========================================
// TELEGRAM COUNTRIES
// ==========================================
async function loadTelegramCountries() {
    const tbody = document.getElementById('telegram-countries-tbody');
    if (!tbody) return;
    try {
        const q = query(collection(db, "telegram_countries"), orderBy("sortOrder", "asc"));
        const querySnapshot = await getDocs(q);
        tbody.innerHTML = '';

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">لا توجد أرقام تيليجرام مضافة.</td></tr>';
            return;
        }
        querySnapshot.forEach((docSnap) => {
            const c = docSnap.data();
            const id = docSnap.id;
            const statusBadge = c.active
                ? `<span class="badge success">نشط</span>`
                : `<span class="badge danger">معطل</span>`;

            const flagVal = c.flagUrl || c.flag || c.icon;
            const flagHtml = FlagsHelper.getFlagHtml(flagVal, 40, 28, '1.2rem');

            const tr = document.createElement('tr');
            const countryData = safeJson({ id, ...c });
            tr.innerHTML = `
                    <td data-label="العلم" style="font-size: 1.5rem;">${flagHtml || '🏳️'}</td>
                    <td data-label="الدولة">
                        <div style="font-weight: 600;">${c.nameAr}</div>
                        <div style="font-size: 0.8rem; opacity: 0.7;">${c.nameEn}</div>
                    </td>
                    <td data-label="السعر">${c.price} ج.م</td>
                    <td data-label="الحالة">${statusBadge}</td>
                    <td data-label="الترتيب">${c.sortOrder || 0}</td>
                    <td data-label="التحكم">
                        <div style="display: flex; gap: 8px; justify-content: center;">
                            <button class="action-btn edit" onclick='editTelegramCountry(${countryData})' title="تعديل"><i class="ph ph-pencil-simple"></i></button>
                            <button class="action-btn delete" onclick="deleteTelegramCountry('${id}')" title="حذف"><i class="ph ph-trash"></i></button>
                        </div>
                    </td>
                `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color:var(--neon-red);">حدث خطأ أثناء جلب البيانات</td></tr>';
    }
}

addSafeListener('telegram-country-form', 'submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-telegram-country-btn');
    if (btn) btn.textContent = 'جاري الحفظ...';

    const id = document.getElementById('telegram-country-id').value;
    const rawFlag = document.getElementById('telegram-country-flag').value;
    const finalFlagUrl = emojiToUrl(rawFlag);

    const data = {
        nameAr: document.getElementById('telegram-country-nameAr').value,
        nameEn: document.getElementById('telegram-country-nameEn').value,
        price: document.getElementById('telegram-country-price').value,
        currency: document.getElementById('telegram-country-currency').value,
        flagUrl: finalFlagUrl,
        sortOrder: Number(document.getElementById('telegram-country-sort').value),
        active: document.getElementById('telegram-country-active').checked
    };

    try {
        if (id) {
            await updateDoc(doc(db, "telegram_countries", id), data);
        } else {
            await addDoc(collection(db, "telegram_countries"), data);
        }
        const modal = document.getElementById('telegram-country-modal');
        if (modal) modal.classList.add('hidden');
        loadTelegramCountries();
        document.getElementById('telegram-country-form').reset();
        document.getElementById('telegram-country-id').value = '';
        const flagLabel = document.getElementById('telegram-country-flag-name');
        if (flagLabel) flagLabel.textContent = '';
    } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء الحفظ");
    } finally {
        if (btn) btn.textContent = 'حفظ الرقم';
    }
});

function editTelegramCountry(c) {
    const modal = document.getElementById('telegram-country-modal');
    if (!modal) return;
    document.getElementById('telegram-country-id').value = c.id || '';
    document.getElementById('telegram-country-nameAr').value = c.nameAr || '';
    document.getElementById('telegram-country-nameEn').value = c.nameEn || '';
    document.getElementById('telegram-country-price').value = c.price || 0;
    document.getElementById('telegram-country-currency').value = c.currency || 'ج.م';
    document.getElementById('telegram-country-flag').value = c.flagUrl || c.icon || '';
    document.getElementById('telegram-country-sort').value = c.sortOrder || 0;
    document.getElementById('telegram-country-active').checked = c.active !== false;
    updateFlagLabel('telegram-country-flag');

    const title = document.getElementById('telegram-country-modal-title');
    if (title) title.textContent = 'تعديل الرقم';
    modal.classList.remove('hidden');
}

async function deleteTelegramCountry(id) {
    if (confirm("هل أنت متأكد من حذف هذا الرقم؟")) {
        try {
            await deleteDoc(doc(db, "telegram_countries", id));
            loadTelegramCountries();
        } catch (e) {
            console.error(e);
            alert("خطأ أثناء الحذف");
        }
    }
}

// ==========================================
// DYNAMIC SERVICE ITEMS MANAGEMENT
// ==========================================
async function loadDynamicItems() {
    if (!currentService) return;
    const tbody = document.getElementById('dynamic-items-tbody');
    if (!tbody) return;

    const title = document.getElementById('dynamic-service-title');
    title.textContent = `إدارة ${currentService.titleAr}`;

    const collPath = (currentService.targetCollection && currentService.targetCollection.trim() !== "")
        ? currentService.targetCollection.trim()
        : currentService.slug;
    const type = currentService.sectionType || 'numbers';

    // Update Table Headers based on Type
    const theadRow = document.getElementById('dynamic-table-head');
    if (theadRow) {
        if (type === 'numbers') {
            theadRow.innerHTML = `
                    <th>العلم</th>
                    <th>الدولة</th>
                    <th>السعر</th>
                    <th>الحالة</th>
                    <th>الترتيب</th>
                    <th>التحكم</th>
                `;
        } else if (type === 'options') {
            theadRow.innerHTML = `
                    <th>اللوجو</th>
                    <th>الاسم</th>
                    <th>الخيارات</th>
                    <th>الحالة</th>
                    <th>الترتيب</th>
                    <th>التحكم</th>
                `;
        } else { // store
            theadRow.innerHTML = `
                    <th>الصورة</th>
                    <th>الاسم</th>
                    <th>السعر</th>
                    <th>الحالة</th>
                    <th>الترتيب</th>
                    <th>التحكم</th>
                `;
        }
    }

    try {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="ph ph-spinner ph-spin"></i> جاري التحميل...</td></tr>';
        const q = query(collection(db, collPath), orderBy("sortOrder", "asc"));
        const snap = await getDocs(q);
        tbody.innerHTML = '';

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">لا توجد عناصر مضافة بعد لهذا القسم.</td></tr>';
            return;
        }

        snap.forEach(docSnap => {
            const d = docSnap.data();
            const id = docSnap.id;
            const statusBadge = d.active
                ? `<span class="badge success">نشط</span>`
                : `<span class="badge danger">معطل</span>`;

            const tr = document.createElement('tr');
            const itemData = safeJson({ id, ...d });

            // Handle icon/flag display
            // Support multiple image field names (legacy and current)
            let visual = d.logoBase64 || d.coverBase64 || d.imageBase64 || d.flag || d.icon || '❓';
            if (visual.startsWith('data:image') || visual.startsWith('http')) {
                visual = `<img src="${visual}" width="30" height="30" style="border-radius:4px; object-fit: cover;">`;
            }
            if (visual.startsWith('http') || visual.startsWith('data:image')) {
                const isBook = (currentService.slug || "").includes('book');
                const width = isBook ? 35 : 30;
                const height = isBook ? 50 : 30;
                visual = `<img src="${visual}" width="${width}" height="${height}" style="border-radius:4px; object-fit:cover; border:1px solid var(--border-light);">`;
            }

            // Dynamic labels based on type
            let typeLabels = { icon: 'أيقونة', name: 'الاسم', price: 'السعر' };
            if (type === 'numbers') typeLabels = { icon: 'العلم', name: 'الدولة', price: 'السعر' };
            if (type === 'options') typeLabels = { icon: 'اللوجو', name: 'الاسم', price: 'الخيارات' };

            let priceContent = `${d.price || 0} ج.م`;
            if (type === 'options' && d.options) {
                priceContent = `<span class="badge" style="background:rgba(255,184,0,0.1); color:#ffb800; border:1px solid rgba(255,184,0,0.2);">${d.options.length} خيار</span>`;
            }

            tr.innerHTML = `
                    <td data-label="${typeLabels.icon}" style="font-size: 1.2rem;">${visual}</td>
                    <td data-label="${typeLabels.name}" style="font-weight: 600;" 
                        contenteditable="true" 
                        data-original="${d.nameAr || d.name || d.titleAr || ''}" 
                        onblur="handleInlineEdit(this, '${collPath}', '${id}', '${d.nameAr ? 'nameAr' : (d.name ? 'name' : 'titleAr')}')"
                        onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">${d.nameAr || d.name || d.titleAr || '-'}</td>
                    <td data-label="${typeLabels.price}" 
                        ${type !== 'options' ? `contenteditable="true" onblur="handleInlineEdit(this, '${collPath}', '${id}', 'price')"` : ''}
                        data-original="${d.price || 0}" 
                        onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">${priceContent}</td>
                    <td data-label="الحالة">${statusBadge}</td>
                    <td data-label="الترتيب" contenteditable="true" 
                        data-original="${d.sortOrder || 0}" 
                        onblur="handleInlineEdit(this, '${collPath}', '${id}', 'sortOrder')"
                        onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">${d.sortOrder || 0}</td>
                    <td data-label="التحكم">
                        <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
                            <button class="action-btn edit" onclick='editItem(${itemData})' title="تعديل"><i class="ph ph-pencil-simple"></i></button>
                            <button class="action-btn delete" onclick="deleteItem('${id}')" title="حذف"><i class="ph ph-trash"></i></button>
                        </div>
                    </td>
                `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("LOAD DYNAMIC ITEMS ERROR:", e);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--neon-red);">حدث خطأ أثناء جلب البيانات</td></tr>';
    }
}

window.openItemModal = function () {
    if (!currentService) { alert('الرجاء اختيار قسم أولاً'); return; }



    document.getElementById('item-modal-title').textContent = `إضافة عنصر لـ ${currentService.titleAr}`;
    document.getElementById('item-form').reset();
    document.getElementById('item-id').value = '';
    document.getElementById('item-image-base64').value = '';
    document.getElementById('item-image-preview').innerHTML = '';

    const flagGroup = document.getElementById('item-flag-group');
    const imageGroup = document.getElementById('item-image-group');

    const slug = currentService.slug || "";
    const optionsGroup = document.getElementById('options-manager-group');
    const optionsList = document.getElementById('options-list');
    if (optionsList) optionsList.innerHTML = '';

    const type = currentService.sectionType || (slug.includes('book') || slug.includes('project') ? 'store' : (slug.includes('recharge') || slug.includes('game') ? 'options' : 'numbers'));

    if (type === 'store') {
        if (flagGroup) flagGroup.style.display = 'none';
        if (imageGroup) imageGroup.style.display = 'block';
        if (optionsGroup) optionsGroup.style.display = 'none';
    } else if (type === 'options') {
        if (flagGroup) flagGroup.style.display = 'none';
        if (imageGroup) imageGroup.style.display = 'block';
        if (optionsGroup) optionsGroup.style.display = 'block';
    } else { // numbers
        if (flagGroup) flagGroup.style.display = 'block';
        if (imageGroup) imageGroup.style.display = 'none';
        if (optionsGroup) optionsGroup.style.display = 'none';
    }

    document.getElementById('item-modal').classList.remove('hidden');
};

window.addNewOptionRow = function (data = {}) {
    const list = document.getElementById('options-list');
    if (!list) return;

    const row = document.createElement('div');
    row.className = 'option-row';
    row.style = "display: flex; gap: 10px; align-items: center; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 12px; border: 1px solid var(--border-light); position: relative; margin-bottom: 5px;";

    const timestamp = Date.now() + Math.floor(Math.random() * 1000);

    row.innerHTML = `
            <div style="flex: 2;">
                <label style="font-size: 0.75rem; color: var(--text-secondary); display:block; margin-bottom:4px;">اسم الخيار</label>
                <input type="text" class="form-control opt-name" placeholder="60 UC" value="${data.name || ''}" style="padding: 10px; font-size: 0.9rem;">
            </div>
            <div style="flex: 1;">
                <label style="font-size: 0.75rem; color: var(--text-secondary); display:block; margin-bottom:4px;">السعر</label>
                <input type="text" class="form-control opt-price" placeholder="50" value="${data.price || ''}" style="padding: 10px; font-size: 0.9rem;">
            </div>
            <div style="flex: 1.5;">
                <label style="font-size: 0.75rem; color: var(--text-secondary); display:block; margin-bottom:4px;">الصورة</label>
                <input type="file" id="opt-file-${timestamp}" class="form-control opt-file" accept="image/*" style="padding: 5px; font-size: 0.7rem;">
                <input type="hidden" class="opt-image-base64" value="${data.image || ''}">
            </div>
            <div class="opt-preview" style="width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-light); border-radius: 6px; overflow: hidden; background: #000; flex-shrink:0;">
                ${data.image ? `<img src="${data.image}" style="width: 100%; height: 100%; object-fit: cover;">` : '<i class="ph ph-image" style="opacity: 0.3; font-size: 1.2rem;"></i>'}
            </div>
            <button type="button" class="action-btn delete" onclick="this.closest('.option-row').remove()" style="background: rgba(255,0,60,0.1); border-color: var(--neon-red); color: var(--neon-red); width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink:0; margin-top: 15px;">
                <i class="ph ph-trash"></i>
            </button>
        `;

    const fileInput = row.querySelector(`#opt-file-${timestamp}`);
    const hiddenInput = row.querySelector('.opt-image-base64');
    const preview = row.querySelector('.opt-preview');

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 1024 * 800) { // 800KB Limit
                alert("⚠️ حجم صورة الخيار كبير جداً. يرجى اختيار صورة أقل من 800 كيلوبايت لضمان استقرار الداتا بيز.");
                fileInput.value = '';
                return;
            }
            const base64 = await fileToBase64(file);
            hiddenInput.value = base64;
            preview.innerHTML = `<img src="${base64}" style="width: 100%; height: 100%; object-fit: cover;">`;
        }
    });

    list.appendChild(row);
};

// (Sound file preview and Base64 conversion removed)

const itemImageFileInput = document.getElementById('item-image-file');
if (itemImageFileInput) {
    itemImageFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 1024 * 850) { // 850KB Limit
                alert("⚠️ حجم الصورة كبير جداً. Firestore لا يسمح بملفات ضخمة داخل المستندات. يرجى اختيار صورة أقل من 850 كيلوبايت.");
                itemImageFileInput.value = '';
                return;
            }
            const base64 = await fileToBase64(file);
            document.getElementById('item-image-base64').value = base64;
            const preview = document.getElementById('item-image-preview');
            if (preview) preview.innerHTML = `<img src="${base64}" width="100" height="auto" style="border-radius:8px; object-fit: cover; border:1px solid var(--border-light); margin-top:10px;">`;
        }
    });
}

window.editItem = function (data) {
    const slug = (currentService && currentService.slug) || "";
    const modal = document.getElementById('item-modal');
    if (!modal) return;

    document.getElementById('item-modal-title').textContent = 'تعديل العنصر';
    document.getElementById('item-id').value = data.id;
    document.getElementById('item-nameAr').value = data.nameAr || data.name || data.titleAr || '';
    document.getElementById('item-nameEn').value = data.nameEn || '';
    document.getElementById('item-price').value = data.price || 0;
    document.getElementById('item-currency').value = data.currency || 'ج.م';
    document.getElementById('item-flag').value = data.flag || data.icon || '';
    document.getElementById('item-image-base64').value = data.logoBase64 || data.coverBase64 || data.imageBase64 || '';
    document.getElementById('item-sort').value = data.sortOrder || 0;
    document.getElementById('item-active').checked = data.active !== false;

    const flagGroup = document.getElementById('item-flag-group');
    const imageGroup = document.getElementById('item-image-group');
    const preview = document.getElementById('item-image-preview');

    const optionsGroup = document.getElementById('options-manager-group');
    const optionsList = document.getElementById('options-list');
    if (optionsList) optionsList.innerHTML = '';

    const type = currentService.sectionType || (slug.includes('book') || slug.includes('project') ? 'store' : (slug.includes('recharge') || slug.includes('game') ? 'options' : 'numbers'));

    if (type === 'store') {
        if (flagGroup) flagGroup.style.display = 'none';
        if (imageGroup) imageGroup.style.display = 'block';
        if (optionsGroup) optionsGroup.style.display = 'none';
        const imgUrl1 = data.logoBase64 || data.coverBase64 || data.imageBase64;
        if (preview && imgUrl1) {
            preview.innerHTML = `
                    <div style="margin-bottom: 10px;">
                        <span class="badge success" style="background: rgba(0,255,136,0.1); color: #00ff88; padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; border: 1px solid rgba(0,255,136,0.3);">
                            ✅ الصورة محفوظة حالياً
                        </span>
                    </div>
                    <img src="${imgUrl1}" width="100" height="auto" style="border-radius:8px; object-fit: cover; border:1px solid var(--border-light); margin-top:10px;">
                `;
        } else if (preview) {
            preview.innerHTML = '';
        }
    } else if (type === 'options') {
        if (flagGroup) flagGroup.style.display = 'none';
        if (imageGroup) imageGroup.style.display = 'block';
        if (optionsGroup) optionsGroup.style.display = 'block';
        const imgUrl2 = data.logoBase64 || data.coverBase64 || data.imageBase64;
        if (preview && imgUrl2) {
            preview.innerHTML = `
                    <div style="margin-bottom: 10px;">
                        <span class="badge success" style="background: rgba(0,255,136,0.1); color: #00ff88; padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; border: 1px solid rgba(0,255,136,0.3);">
                            ✅ اللوجو موجود
                        </span>
                    </div>
                    <img src="${imgUrl2}" width="100" height="auto" style="border-radius:8px; object-fit: cover; border:1px solid var(--border-light); margin-top:10px;">
                `;
        } else if (preview) {
            preview.innerHTML = '';
        }
        if (data.options && data.options.length > 0) {
            data.options.forEach(opt => addNewOptionRow(opt));
        }
    } else { // numbers
        if (flagGroup) flagGroup.style.display = 'block';
        if (imageGroup) imageGroup.style.display = 'none';
        if (optionsGroup) optionsGroup.style.display = 'none';
    }

    document.getElementById('item-modal').classList.remove('hidden');
};

window.deleteItem = async function (id) {
    if (!confirm('هل أنت متأكد من حذف هذا العنصر؟')) return;
    try {
        const coll = (currentService.targetCollection && currentService.targetCollection.trim() !== "")
            ? currentService.targetCollection.trim()
            : currentService.slug;
        await deleteDoc(doc(db, coll, id));
        loadDynamicItems();
    } catch (e) {
        console.error(e);
        alert("فشل الحذف");
    }
};

addSafeListener('item-form', 'submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-item-btn');
    btn.textContent = 'جاري الحفظ...';
    btn.disabled = true;

    const id = document.getElementById('item-id').value;
    const fileInput = document.getElementById('item-image-file');
    let logoBase64 = document.getElementById('item-image-base64').value || '';

    if (fileInput && fileInput.files && fileInput.files[0]) {
        try {
            logoBase64 = await fileToBase64(fileInput.files[0]);
        } catch (err) { console.error("Base64 error", err); }
    }

    const data = {
        nameAr: document.getElementById('item-nameAr').value,
        nameEn: document.getElementById('item-nameEn').value,
        price: document.getElementById('item-price').value,
        currency: document.getElementById('item-currency').value,
        flag: document.getElementById('item-flag').value,
        logoBase64: logoBase64,
        coverBase64: "", // Clear legacy field to avoid precedence issues
        imageBase64: "", // Clear legacy field to avoid precedence issues
        sortOrder: Number(document.getElementById('item-sort').value),
        active: document.getElementById('item-active').checked,
        options: [] // To be filled below
    };

    const rows = document.querySelectorAll('.option-row');
    rows.forEach(r => {
        const oName = r.querySelector('.opt-name').value;
        const oPrice = r.querySelector('.opt-price').value;
        const oImage = r.querySelector('.opt-image-base64').value;
        if (oName) {
            data.options.push({ name: oName, price: oPrice, image: oImage });
        }
    });

    try {
        if (!currentService) {
            alert("خطأ: القسم الحالي غير محدد. يرجى إعادة اختيار القسم من القائمة.");
            return;
        }
        const coll = (currentService.targetCollection && currentService.targetCollection.trim() !== "")
            ? currentService.targetCollection.trim()
            : currentService.slug;
        if (id) {
            await updateDoc(doc(db, coll, id), data);
        } else {
            await addDoc(collection(db, coll), data);
        }
        document.getElementById('item-modal').classList.add('hidden');
        loadDynamicItems();
    } catch (e) {
        console.error("ITEM SAVE ERROR:", e);
        if (e.code === 'permission-denied') {
            alert("فشل الحفظ: لا تملك صلاحية التعديل.");
        } else if (e.message && e.message.includes('too large')) {
            alert("فشل الحفظ: حجم البيانات كبير جداً (أصلح حجم الصور المستخدمة).");
        } else {
            alert("حدث خطأ أثناء الحفظ: " + (e.message || "خطأ غير معروف"));
        }
    } finally {
        btn.textContent = 'حفظ العنصر';
        btn.disabled = false;
    }
});


// ==========================================
// TEAM MEMBERS
// ==========================================
async function loadTeamMembers() {
    console.log("Loading Team Members...");
    const tbody = document.getElementById('team-tbody');
    if (!tbody) return;

    try {
        const q = query(collection(db, "team_members"), orderBy("sortOrder", "asc"));
        const querySnapshot = await getDocs(q);
        tbody.innerHTML = '';

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">لا يوجد أعضاء مضافين.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const m = docSnap.data();
            const id = docSnap.id;
            const statusBadge = m.active
                ? `<span class="badge success">نشط</span>`
                : `<span class="badge danger">معطل</span>`;

            const imgUrl = m.imageBase64 || 'https://via.placeholder.com/80?text=Avatar';
            const imgHtml = `<img src="${imgUrl}" width="40" height="40" style="border-radius:50%; object-fit: cover; border: 1px solid var(--border-light);">`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                    <td>${imgHtml}</td>
                    <td style="font-weight: 600;">${m.name}</td>
                    <td>${m.role}</td>
                    <td>${statusBadge}</td>
                    <td>${m.sortOrder || 0}</td>
                    <td>
                        <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
                            <button class="action-btn edit" title="تعديل"><i class="ph ph-pencil-simple"></i></button>
                            <button class="action-btn delete" title="حذف"><i class="ph ph-trash"></i></button>
                        </div>
                    </td>
                `;

            tr.querySelector('.edit').addEventListener('click', () => editTeamMember({ id, ...m }));
            tr.querySelector('.delete').addEventListener('click', () => deleteTeamMember(id));

            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Error loading team members", e);
    }
}

function editTeamMember(m) {
    document.getElementById('team-modal-title').textContent = "تعديل بيانات العضو";
    document.getElementById('team-id').value = m.id || '';
    document.getElementById('team-name').value = m.name || '';
    document.getElementById('team-role').value = m.role || '';
    document.getElementById('team-bio').value = m.bio || '';
    document.getElementById('team-image-base64').value = m.imageBase64 || '';
    document.getElementById('team-sort').value = m.sortOrder || 0;
    document.getElementById('team-active').checked = m.active !== false;

    const preview = document.getElementById('team-image-preview');
    if (preview) {
        if (m.imageBase64) {
            preview.innerHTML = `<img src="${m.imageBase64}" width="80" height="80" style="border-radius:50%; border:2px solid var(--neon-red); object-fit: cover;">`;
        } else {
            preview.innerHTML = '';
        }
    }

    if (window.openModal) window.openModal('team-modal');
    else document.getElementById('team-modal').classList.remove('hidden');
}

async function deleteTeamMember(id) {
    if (confirm("هل أنت متأكد من حذف هذا العضو؟")) {
        try {
            await deleteDoc(doc(db, "team_members", id));
            loadTeamMembers();
        } catch (e) {
            console.error(e);
            alert("خطأ أثناء الحذف");
        }
    }
}

function resetTeamForm() {
    const form = document.getElementById('team-form');
    if (form) form.reset();
    document.getElementById('team-id').value = '';
    document.getElementById('team-image-base64').value = '';
    document.getElementById('team-image-preview').innerHTML = '';
    document.getElementById('team-modal-title').textContent = 'إضافة عضو للفريق';
}

function addTeamMember() {
    resetTeamForm();
    if (window.openModal) window.openModal('team-modal');
    else document.getElementById('team-modal').classList.remove('hidden');
}

// Handle Team Form Submit
addSafeListener('team-form', 'submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-team-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'جاري الحفظ...';
    }

    const id = document.getElementById('team-id').value;
    const fileInput = document.getElementById('team-image-file');
    let imageBase64 = document.getElementById('team-image-base64').value;

    try {
        if (fileInput && fileInput.files && fileInput.files[0]) {
            imageBase64 = await fileToBase64(fileInput.files[0]);
        }

        const data = {
            name: document.getElementById('team-name').value,
            role: document.getElementById('team-role').value,
            bio: document.getElementById('team-bio').value,
            imageBase64: imageBase64,
            sortOrder: Number(document.getElementById('team-sort').value),
            active: document.getElementById('team-active').checked
        };

        if (id) {
            await updateDoc(doc(db, "team_members", id), data);
        } else {
            await addDoc(collection(db, "team_members"), data);
        }

        const modal = document.getElementById('team-modal');
        if (modal) modal.classList.add('hidden');
        loadTeamMembers();
        resetTeamForm();
    } catch (error) {
        console.error("TEAM SAVE ERROR:", error);
        alert("حدث خطأ أثناء حفظ بيانات العضو: " + (error.message || ""));
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'حفظ العضو';
        }
    }
});

// Handle Team Image Preview
const teamImageFile = document.getElementById('team-image-file');
if (teamImageFile) {
    teamImageFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 512 * 1024) { // 512KB for avatars
                alert("⚠️ حجم صورة العضو كبير. يرجى اختيار صورة أصغر من 500 كيلوبايت.");
                teamImageFile.value = '';
                return;
            }
            const base64 = await fileToBase64(file);
            const preview = document.getElementById('team-image-preview');
            if (preview) {
                preview.innerHTML = `<img src="${base64}" width="80" height="80" style="border-radius:50%; border:2px solid var(--neon-red); object-fit: cover;">`;
            }
        }
    });
}

// ==========================================
// UNIFIED ORDERS (BOOKINGS)
// ==========================================
let currentOrderFilter = 'all';

// Filter Buttons Listener
const filterBtns = document.querySelectorAll('.filter-btn');
if (filterBtns) {
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentOrderFilter = btn.getAttribute('data-filter');
            loadOrders();
        });
    });
}

async function loadOrders() {
    console.log("Loading Unified Orders...", currentOrderFilter);
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    try {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="ph ph-spinner ph-spin"></i> جاري التحميل...</td></tr>';

        // Unified collection 'orders'
        const ordersColl = collection(db, "orders");
        const q = query(ordersColl, orderBy("timestamp", "desc"));
        // Dynamic Filters based on Services
        const servicesSnap = await getDocs(collection(db, "services"));
        const filterContainer = document.getElementById('dynamic-order-filters');
        if (filterContainer) {
            const activeFilter = currentOrderFilter || 'all';
            filterContainer.innerHTML = `<button class="filter-btn ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">الكل</button>`;
            servicesSnap.forEach(sDoc => {
                const s = sDoc.data();
                filterContainer.innerHTML += `<button class="filter-btn ${activeFilter === s.slug ? 'active' : ''}" data-filter="${s.slug}">${s.titleAr}</button>`;
            });

            filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
                btn.onclick = () => {
                    currentOrderFilter = btn.getAttribute('data-filter');
                    loadOrders();
                };
            });
        }

        const querySnapshot = await getDocs(q);
        tbody.innerHTML = '';

        let filteredDocs = [];
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;

            // Flexible type matching (support full slug or short type)
            const isMatch = (currentOrderFilter === 'all' ||
                data.type === currentOrderFilter ||
                (data.serviceSlug && data.serviceSlug === currentOrderFilter));

            if (isMatch) {
                filteredDocs.push({ id, ...data });
            }
        });

        if (filteredDocs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">لا توجد طلبات في هذا القسم حالياً.</td></tr>';
            return;
        }

        filteredDocs.forEach((order) => {
            const date = order.timestamp ? new Date(order.timestamp).toLocaleString('ar-EG') : '-';

            // Map type to Arabic Badge
            let typeBadge = '';
            if (order.type === 'game') typeBadge = '<span class="badge" style="background:rgba(0,123,255,0.1); color:#007bff;">شحن</span>';
            else if (order.type === 'whatsapp') typeBadge = '<span class="badge" style="background:rgba(40,167,69,0.1); color:#28a745;">واتساب</span>';
            else if (order.type === 'telegram') typeBadge = '<span class="badge" style="background:rgba(23,162,184,0.1); color:#17a2b8;">تيليجرام</span>';
            else if (order.type === 'books') typeBadge = '<span class="badge" style="background:rgba(255,193,7,0.1); color:#ffc107;">كتب</span>';
            else typeBadge = `<span class="badge" style="background:rgba(255,0,60,0.1); color:var(--neon-red);">${order.serviceName || 'طلب'}</span>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                    <td data-label="القسم">${typeBadge}</td>
                    <td data-label="الخدمة" style="font-weight: 600;">${order.serviceName || order.gameName || 'غير معروف'}</td>
                    <td data-label="التفاصيل" style="font-size: 0.9rem;">${order.optionName || order.details || '-'}</td>
                    <td data-label="الهاتف" dir="ltr" style="color: var(--neon-blue); font-weight: 700;">${order.phone}</td>
                    <td data-label="التاريخ" style="font-size: 0.85rem; color: var(--text-secondary);">${date}</td>
                    <td data-label="التحكم">
                        <button class="action-btn delete" onclick="deleteOrder('${order.id}')" title="حذف"><i class="ph ph-trash"></i></button>
                    </td>
                `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Error loading orders:", e);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--neon-red);">حدث خطأ أثناء تحميل الطلبات.</td></tr>';
    }
}

// ==========================================
// SERVICES MANAGEMENT
// ==========================================
async function loadServicesManagement() {
    const tbody = document.getElementById('services-management-tbody');
    if (!tbody) return;
    try {
        const q = query(collection(db, "services"), orderBy("sortOrder", "asc"));
        const querySnapshot = await getDocs(q);
        tbody.innerHTML = '';

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">لا توجد أقسام مضافة حالياً.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const s = docSnap.data();
            const id = docSnap.id;
            const statusBadge = s.active
                ? `<span class="badge success">نشط</span>`
                : `<span class="badge danger">معطل</span>`;

            const imgLogo = s.logoBase64 ? `<img src="${s.logoBase64}" width="40" height="40" style="border-radius:8px; object-fit: cover;">` : `<i class="ph ph-${s.icon || 'star'}"></i>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                    <td data-label="أيقونة" style="font-size: 1.5rem; color: ${s.color || 'var(--neon-red)'};">${imgLogo}</td>
                    <td data-label="العنوان" style="font-weight: 600;">${s.titleAr}</td>
                    <td data-label="الرابط"><code>${s.slug}</code></td>
                    <td data-label="الحالة">${statusBadge}</td>
                    <td data-label="الترتيب">${s.sortOrder || 0}</td>
                    <td data-label="التحكم">
                        <button class="action-btn edit" title="تعديل"><i class="ph ph-pencil-simple"></i></button>
                        <button class="action-btn delete" title="حذف"><i class="ph ph-trash"></i></button>
                    </td>
                `;

            tr.querySelector('.edit').addEventListener('click', () => editService({ id, ...s }));
            tr.querySelector('.delete').addEventListener('click', () => deleteService(id));

            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">حدث خطأ أثناء تحميل الأقسام.</td></tr>';
    }
}

window.openServiceModal = function () {
    document.getElementById('service-modal-title').textContent = 'إضافة قسم جديد';
    document.getElementById('service-form').reset();
    document.getElementById('service-id').value = '';
    document.getElementById('service-logo-base64').value = '';
    const preview = document.getElementById('service-logo-preview');
    if (preview) preview.innerHTML = '';
    const modal = document.getElementById('service-modal');
    if (modal) modal.classList.remove('hidden');
};

window.editService = function (data) {
    document.getElementById('service-modal-title').textContent = 'تعديل القسم';
    document.getElementById('service-id').value = data.id;
    document.getElementById('service-titleAr').value = data.titleAr || '';
    document.getElementById('service-slug').value = data.slug || '';
    document.getElementById('service-icon').value = data.icon || '';
    document.getElementById('service-color').value = data.color || '#ff003c';
    document.getElementById('service-descAr').value = data.descriptionAr || '';
    document.getElementById('service-type').value = data.sectionType || 'store';
    document.getElementById('service-targetColl').value = data.targetCollection || '';
    document.getElementById('service-sort').value = data.sortOrder || 0;
    document.getElementById('service-active').checked = data.active !== false;
    document.getElementById('service-showBanner').checked = data.showBanner === true;
    document.getElementById('service-bannerText').value = data.bannerText || '';
    document.getElementById('service-logo-base64').value = data.logoBase64 || '';

    const preview = document.getElementById('service-logo-preview');
    if (preview) {
        if (data.logoBase64) preview.innerHTML = `<img src="${data.logoBase64}" width="60" height="60" style="border-radius:8px; object-fit: cover; border:1px solid var(--border-light);">`;
        else preview.innerHTML = '';
    }

    const modal = document.getElementById('service-modal');
    if (modal) modal.classList.remove('hidden');
};

window.removeServiceLogo = function () {
    document.getElementById('service-logo-file').value = '';
    document.getElementById('service-logo-base64').value = '';
    const preview = document.getElementById('service-logo-preview');
    if (preview) preview.innerHTML = '';
};

window.deleteService = async function (id) {
    if (confirm("هل تريد حذف هذا القسم نهائياً؟ سيختفي من واجهة الموقع.")) {
        try {
            await deleteDoc(doc(db, "services", id));
            loadServicesManagement();
            renderSidebarServices();
        } catch (e) {
            console.error(e);
            alert("خطأ أثناء الحذف");
        }
    }
};

addSafeListener('service-form', 'submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-service-btn');
    if (btn) btn.textContent = 'جاري الحفظ...';

    const id = document.getElementById('service-id').value;
    const slug = document.getElementById('service-slug').value.trim();

    const logoFile = document.getElementById('service-logo-file');
    let logoBase64 = document.getElementById('service-logo-base64').value;

    if (logoFile && logoFile.files && logoFile.files[0]) {
        try {
            logoBase64 = await fileToBase64(logoFile.files[0]);
        } catch (e) {
            console.error("Error reading logo file", e);
        }
    }

    const data = {
        titleAr: document.getElementById('service-titleAr').value,
        slug: slug,
        icon: document.getElementById('service-icon').value,
        logoBase64: logoBase64,
        color: document.getElementById('service-color').value,
        sectionType: document.getElementById('service-type').value,
        targetCollection: document.getElementById('service-targetColl').value.trim(),
        descriptionAr: document.getElementById('service-descAr').value,
        sortOrder: Number(document.getElementById('service-sort').value),
        active: document.getElementById('service-active').checked,
        showBanner: document.getElementById('service-showBanner').checked,
        bannerText: document.getElementById('service-bannerText').value
    };

    try {
        // Use slug as document ID for internal references
        await setDoc(doc(db, "services", slug), data);

        // If the slug changed and we are editing, delete the old one
        if (id && id !== slug) {
            await deleteDoc(doc(db, "services", id));
        }

        if (btn) {
            btn.innerHTML = '<i class="ph ph-check"></i> تم الحفظ بنجاح';
            btn.style.background = 'var(--neon-green)';
        }

        setTimeout(() => {
            if (btn) {
                btn.innerHTML = 'حفظ القسم';
                btn.style.background = '';
            }
        }, 2000);

        showToast("تم الحفظ بنجاح! ✅");
        const modal = document.getElementById('service-modal');
        if (modal) modal.classList.add('hidden');
        loadServicesManagement();
        renderSidebarServices();
    } catch (e) {
        console.error("SERVICE SAVE ERROR:", e);
        alert("حدث خطأ أثناء حفظ القسم: " + (e.message || ""));
        if (btn) btn.textContent = 'حفظ القسم';
    }
});



// Service Logo Preview
const serviceLogoFileInput = document.getElementById('service-logo-file');
if (serviceLogoFileInput) {
    serviceLogoFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 300 * 1024) { // 300KB for logos
                alert("⚠️ حجم اللوجو كبير جداً. يرجى ضغط الصورة أو اختيار لوجو أقل من 300 كيلوبايت.");
                serviceLogoFileInput.value = '';
                return;
            }
            const base64 = await fileToBase64(file);
            const preview = document.getElementById('service-logo-preview');
            if (preview) preview.innerHTML = `<img src="${base64}" width="60" height="60" style="border-radius:8px; object-fit: cover; border:1px solid var(--border-light);">`;
            document.getElementById('service-logo-base64').value = base64;
        }
    });
}
const gameLogoFileInput = document.getElementById('game-logo-file');
if (gameLogoFileInput) {
    gameLogoFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            const base64 = await fileToBase64(file);
            const preview = document.getElementById('game-logo-preview');
            if (preview) preview.innerHTML = `<img src="${base64}" width="60" height="60" style="border-radius:8px; object-fit: cover; border:1px solid var(--border-light);">`;
        }
    });
}

// ==========================================
// BOOKS & NOVELS
// ==========================================
async function loadBooksManagement() {
    const tbody = document.getElementById('books-management-tbody');
    if (!tbody) return;
    try {
        const q = query(collection(db, "books_novels"), orderBy("sortOrder", "asc"));
        const querySnapshot = await getDocs(q);
        tbody.innerHTML = '';

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد كتب مضافة حالياً.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const b = docSnap.data();
            const id = docSnap.id;
            const statusBadge = b.active
                ? `<span class="badge success">مفعل</span>`
                : `<span class="badge danger">معطل</span>`;

            const coverUrl = b.coverBase64 || 'https://via.placeholder.com/40';
            const imgHtml = `<img src="${coverUrl}" width="30" height="40" style="border-radius:2px; object-fit: cover;">`;

            const tr = document.createElement('tr');
            const bookData = safeJson({ id, ...b });
            tr.innerHTML = `
                    <td data-label="الغلاف">${imgHtml}</td>
                    <td data-label="الاسم" style="font-weight: 600;">${b.nameAr}</td>
                    <td data-label="الحالة">${statusBadge}</td>
                    <td data-label="الترتيب">${b.sortOrder || 0}</td>
                    <td data-label="التحكم">
                        <button class="action-btn edit" onclick='editBook(${bookData})' title="تعديل"><i class="ph ph-pencil-simple"></i></button>
                        <button class="action-btn delete" onclick="deleteBook('${id}')" title="حذف"><i class="ph ph-trash"></i></button>
                    </td>
                `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
    }
}

window.editBook = function (b) {
    const title = document.getElementById('book-modal-title');
    if (title) title.textContent = "تعديل بيانات الكتاب";
    document.getElementById('book-id').value = b.id || '';
    document.getElementById('book-nameAr').value = b.nameAr || '';
    document.getElementById('book-nameEn').value = b.nameEn || '';
    document.getElementById('book-price').value = b.price || 0;
    document.getElementById('book-currency').value = b.currency || 'ج.م';
    document.getElementById('book-cover-base64').value = b.coverBase64 || '';
    document.getElementById('book-sort').value = b.sortOrder || 0;
    document.getElementById('book-active').checked = b.active !== false;

    const preview = document.getElementById('book-cover-preview');
    if (preview) {
        if (b.coverBase64) preview.innerHTML = `<img src="${b.coverBase64}" width="60" height="90" style="border-radius:4px; object-fit: cover; border:1px solid var(--border-light);">`;
        else preview.innerHTML = '';
    }

    const modal = document.getElementById('book-modal');
    if (modal) modal.classList.remove('hidden');
};

window.deleteBook = async function (id) {
    if (confirm("هل أنت متأكد من حذف هذا الكتاب؟")) {
        try {
            await deleteDoc(doc(db, "books_novels", id));
            loadBooksManagement();
        } catch (e) {
            console.error(e);
            alert("خطأ أثناء الحذف");
        }
    }
};

function resetBookForm() {
    const form = document.getElementById('book-form');
    if (form) form.reset();
    document.getElementById('book-id').value = '';
    document.getElementById('book-cover-base64').value = '';
    const preview = document.getElementById('book-cover-preview');
    if (preview) preview.innerHTML = '';
    const title = document.getElementById('book-modal-title');
    if (title) title.textContent = 'إضافة كتاب جديد';
}

addSafeListener('book-form', 'submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-book-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'جاري الحفظ...';
    }

    const id = document.getElementById('book-id').value;
    const fileInput = document.getElementById('book-cover-file');
    let coverBase64 = document.getElementById('book-cover-base64').value;

    try {
        if (fileInput && fileInput.files && fileInput.files[0]) {
            coverBase64 = await fileToBase64(fileInput.files[0]);
        }

        const data = {
            nameAr: document.getElementById('book-nameAr').value,
            nameEn: document.getElementById('book-nameEn').value,
            price: document.getElementById('book-price').value,
            currency: document.getElementById('book-currency').value,
            coverBase64: coverBase64,
            sortOrder: Number(document.getElementById('book-sort').value),
            active: document.getElementById('book-active').checked
        };

        if (id) {
            await updateDoc(doc(db, "books_novels", id), data);
        } else {
            await addDoc(collection(db, "books_novels"), data);
        }

        const modal = document.getElementById('book-modal');
        if (modal) modal.classList.add('hidden');
        loadBooksManagement();
        resetBookForm();
    } catch (error) {
        console.error("BOOK SAVE ERROR:", error);
        alert("حدث خطأ أثناء حفظ الكتاب: " + (error.message || ""));
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'حفظ الكتاب';
        }
    }
});

const bookCoverFileInput = document.getElementById('book-cover-file');
if (bookCoverFileInput) {
    bookCoverFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 800 * 1024) { // 800KB for covers
                alert("⚠️ غلاف الكتاب كبير جداً. يرجى اختيار صورة أقل من 800 كيلوبايت.");
                bookCoverFileInput.value = '';
                return;
            }
            const base64 = await fileToBase64(file);
            const preview = document.getElementById('book-cover-preview');
            if (preview) preview.innerHTML = `<img src="${base64}" width="60" height="90" style="border-radius:4px; object-fit: cover; border:1px solid var(--border-light);">`;
        }
    });
}

async function deleteOrder(id) {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;
    try {
        await deleteDoc(doc(db, "orders", id));
        showToast("تم حذف الطلب بنجاح. 🗑️");
        loadOrders();
    } catch (e) {
        console.error(e);
        showToast("فشل في حذف الطلب.", "error");
    }
}

// Expose Globals
window.editWhatsappCountry = editWhatsappCountry;
window.deleteWhatsappCountry = deleteWhatsappCountry;
window.editTelegramCountry = editTelegramCountry;
window.deleteTelegramCountry = deleteTelegramCountry;
window.editBook = editBook;
window.deleteBook = deleteBook;
// editGame / deleteGame / resetGameForm removed — functions don't exist in this module
window.deleteOrder = deleteOrder;
window.loadServicesManagement = loadServicesManagement;
window.loadStats = loadStats;
window.editService = editService;
window.deleteService = deleteService;
window.cycleFlag = cycleFlag;
window.updateFlagLabel = updateFlagLabel;
window.editTeamMember = editTeamMember;
window.deleteTeamMember = deleteTeamMember;
window.addTeamMember = addTeamMember;
window.resetTeamForm = resetTeamForm;

// --- Inline Editing Logic ---
function showSaving(show) {
    let indicator = document.getElementById('saving-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'saving-indicator';
        indicator.className = 'saving-indicator';
        indicator.innerHTML = '<i class="ph ph-spinner ph-spin"></i> جاري حفظ التعديلات...';
        document.body.appendChild(indicator);
    }
    if (show) indicator.classList.add('show');
    else setTimeout(() => indicator.classList.remove('show'), 1000);
}

window.handleInlineEdit = async function (el, collectionName, docId, field) {
    const newValue = el.innerText.trim();
    const originalValue = el.dataset.original;

    if (newValue === originalValue) return;

    showSaving(true);
    try {
        let finalValue = newValue;
        // Handle numeric fields
        if (field === 'sortOrder') {
            finalValue = Number(newValue.replace(/[^0-9.]/g, ''));
        }

        await updateDoc(doc(db, collectionName, docId), {
            [field]: finalValue
        });
        el.dataset.original = newValue;
        console.log(`Updated ${collectionName}/${docId} field ${field} to ${finalValue}`);
    } catch (error) {
        console.error("Inline Edit Error:", error);
        alert("حدث خطأ أثناء حفظ التعديل");
        el.innerText = originalValue;
    } finally {
        showSaving(false);
    }
};


async function initDashboard() {
    console.log("Antiko: Initializing Dashboard Home...");
    const allSections = document.querySelectorAll('.dashboard-section');
    allSections.forEach(s => s.classList.add('hidden'));

    const homeSec = document.getElementById('section-home');
    if (homeSec) {
        homeSec.classList.remove('hidden');
        console.log("Antiko: Section Home is now visible.");
    }

    // Super Admin Check
    const initBtn = document.getElementById('init-db-btn');
    if (initBtn && auth.currentUser) {
        const adminEmail = (auth.currentUser.email || "").toLowerCase();
        if (adminEmails.includes(adminEmail)) {
            initBtn.classList.remove('hidden');
        } else {
            initBtn.classList.add('hidden');
        }
    }

    try {
        await renderSidebarServices();
    } catch (e) {
        console.error("Sidebar render error during init:", e);
    }

    try {
        await loadStats();
        // تحميل التذاكر فوراً عند فتح الداشبورد
        if (typeof loadAdminTickets === 'function') {
            loadAdminTickets();
        }
    } catch (e) {
        console.error("Stats/Tickets loading error:", e);
    }

    showToast("تم فتح لوحة التحكم بنجاح! 🚀");
    console.log("Antiko: Dashboard Initialization Complete.");
}

async function renderSidebarServices() {
    const container = document.getElementById('dynamic-sidebar-services');
    if (!container) return;

    try {
        const q = query(collection(db, "services"));
        const snap = await getDocs(q);

        const newServices = [];
        snap.forEach(docSnap => {
            const s = docSnap.data();
            newServices.push({ id: docSnap.id, ...s });
        });
        allServices = newServices;

        container.innerHTML = '';
        allServices.forEach(s => {
            const a = document.createElement('a');
            a.className = 'menu-item';
            a.setAttribute('data-section', `service-${s.slug}`);
            a.onclick = () => navigateToSection(`service-${s.slug}`);

            const sidebarIcon = s.logoBase64
                ? `<img src="${s.logoBase64}" width="20" height="20" style="object-fit: contain; margin-left: 10px;">`
                : `<i class="ph ph-${s.icon || 'star'}"></i>`;

            a.innerHTML = `${sidebarIcon} ${s.titleAr}`;
            container.appendChild(a);
        });
    } catch (e) {
        console.error("Error rendering sidebar services:", e);
        container.innerHTML = `
            <div style="padding:15px; text-align:center;">
                <p style="color:var(--neon-red); font-size:0.85rem; margin-bottom:8px;">فشل الاتصال بـ Firestore</p>
                <button onclick="renderSidebarServices()" class="premium-btn secondary" style="font-size:0.7rem; padding:4px 10px; width:100%;">إعادة محاولة</button>
                <p style="font-size:0.6rem; color:#555; margin-top:5px; direction:ltr;">${e.message || 'Handshake Error'}</p>
            </div>
        `;
    }
}

async function loadStats() {
    try {
        const collections = ["whatsapp_countries", "telegram_countries", "books_novels", "recharge_subscriptions"];
        const promises = collections.map(c => getDocs(collection(db, c)));
        promises.push(getDocs(collection(db, "orders")));
        promises.push(getDocs(collection(db, "services")));

        const results = await Promise.all(promises);

        const countResults = results.slice(0, collections.length);
        const ordersSnap = results[results.length - 2];
        const servicesSnap = results[results.length - 1];

        const statCountries = document.getElementById('stat-countries');
        if (statCountries) {
            let total = 0;
            countResults.forEach(s => total += s.size);
            statCountries.textContent = total;
        }

        const statServices = document.getElementById('stat-services');
        if (statServices) statServices.textContent = servicesSnap.size;

        const statOrders = document.getElementById('stat-orders');
        if (statOrders) statOrders.textContent = ordersSnap.size;

        let activeCount = 0;
        results.forEach(snap => {
            snap.forEach(docSnap => {
                if (docSnap.data().active) activeCount++;
            });
        });

        const statActive = document.getElementById('stat-active');
        if (statActive) statActive.textContent = activeCount;
    } catch (e) {
        console.error("Error loading stats", e);
    }
}

function navigateToSection(sectionId) {
    console.log("Antiko Navigation: Target =", sectionId);
    if (sectionId === 'ai-settings' && typeof loadAiSettings === 'function') loadAiSettings();

    const allMenuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    const allSections = document.querySelectorAll('.dashboard-section');

    allMenuItems.forEach(mi => mi.classList.remove('active'));
    allSections.forEach(sec => sec.classList.add('hidden'));

    // Force scroll to top when changing sections
    window.scrollTo({ top: 0, behavior: 'instant' });
    const adminMain = document.querySelector('.admin-main');
    if (adminMain) adminMain.scrollTo({ top: 0, behavior: 'instant' });

    const sidebarMatch = document.querySelector(`.sidebar-menu .menu-item[data-section="${sectionId}"]`);
    if (sidebarMatch) sidebarMatch.classList.add('active');

    if (sectionId && sectionId.startsWith('service-')) {
        const slug = sectionId.replace('service-', '');
        currentService = allServices.find(s => s.slug === slug);

        if (!currentService) {
            renderSidebarServices().then(() => {
                currentService = allServices.find(s => s.slug === slug);
                if (currentService) {
                    const dSec = document.getElementById('section-dynamic-service-items');
                    if (dSec) dSec.classList.remove('hidden');
                    if (typeof loadDynamicItems === 'function') loadDynamicItems();
                }
            });
            return;
        }

        const dSec = document.getElementById('section-dynamic-service-items');
        if (dSec) dSec.classList.remove('hidden');
        if (typeof loadDynamicItems === 'function') loadDynamicItems();
    } else {
        currentService = null;
        const targetSec = document.getElementById(`section-${sectionId}`);
        if (targetSec) targetSec.classList.remove('hidden');

        if (sectionId === 'services-management' && typeof loadServicesManagement === 'function') loadServicesManagement();
        if (sectionId === 'orders' && typeof loadOrders === 'function') loadOrders();
        if (sectionId === 'team-members' && typeof loadTeamMembers === 'function') loadTeamMembers();
        if (sectionId === 'settings' && typeof loadSettings === 'function') loadSettings();
        if (sectionId === 'home') loadStats();
        if (sectionId === 'support-tickets' && typeof loadAdminTickets === 'function') loadAdminTickets();
        if (sectionId === 'admins-management') loadAdmins();
        if (sectionId === 'app-flags') loadAppFlags();
    }
}


// ADMINS MANAGEMENT OPEN MODAL moved to top

const baseAdmins = [
    "karemkoko257koko@gmail.com",
    "omaranter.abdallah@gmail.com",
    "antiko.cb40b@gmail.com",
    "admin257@gmail.com",
    "kareem9989193@gmail.com",
    "zyadwzyry0@gmail.com",
    "b35435573@gmail.com",
    "rsam64833@gmail.com",
    "faresmanee3@gmail.com",
    "ferrohq1@gmail.com"
];

async function loadAdmins() {
    console.log("Antiko: Loading Admins List...");
    const tbody = document.getElementById('admins-tbody');
    if (!tbody) return;
    
    // 1. Render base admins first immediately
    tbody.innerHTML = '';
    baseAdmins.forEach(email => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="البريد الإلكتروني" dir="ltr" style="text-align: right;">${email}</td>
            <td data-label="تاريخ الإضافة"><span class="badge success">أساسي (Hardcoded)</span></td>
            <td data-label="التحكم">
                <button class="action-btn" style="opacity:0.5; cursor:not-allowed;" title="لا يمكن حذفه"><i class="ph ph-lock"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    try {
        // 2. Try fetching dynamic admins from Firebase
        const q = query(collection(db, "admins"));
        const snap = await getDocs(q);
        
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            // Skip visual duplicate if already in baseAdmins
            if (data.email && baseAdmins.includes(data.email.toLowerCase())) return; 
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="البريد الإلكتروني" dir="ltr" style="text-align: right;">${data.email}</td>
                <td data-label="تاريخ الإضافة">${data.createdAt ? new Date(data.createdAt).toLocaleDateString('ar-EG') : 'إضافي'}</td>
                <td data-label="التحكم">
                    <button class="action-btn delete" onclick="deleteAdmin('${id}', '${data.email}')" title="حذف">
                        <i class="ph ph-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("LOAD ADMINS ERROR:", e);
        // Only show a small note instead of destroying the whole table
        const errorTr = document.createElement('tr');
        errorTr.innerHTML = '<td colspan="3" class="text-center" style="color:var(--neon-red); font-size:0.8rem;">يجب رفع قوانين (Rules) الفايربيس لرؤية الإضافات لتجنب Permission Denied. المشرفون الأساسيون يعملون بنجاح.</td>';
        tbody.appendChild(errorTr);
    }
}
window.loadAdmins = loadAdmins;

window.submitAdminForm = async function(e) {
    if (e) e.preventDefault();
    const emailInput = document.getElementById('new-admin-email');
    if (!emailInput) return;
    const email = emailInput.value.trim().toLowerCase();
    if (!email) return;
    const btn = document.getElementById('save-admin-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'جاري الإضافة...';
    }
    try {
        await addDoc(collection(db, "admins"), {
            email: email,
            createdAt: new Date().getTime()
        });
        showToast("تم إضافة المشرف بنجاح ✅");
        closeModal('admin-add-modal');
        const form = document.getElementById('admin-add-form');
        if (form) form.reset();
        loadAdmins();
    } catch (err) {
        console.error(err);
        showToast("فشل: يجب تحديث قواعد الفايربيس (Rules) أولاً!", "error");
        alert("لن تتم الإضافة بسبب أن سيرفر الفايربيس رفض العملية! يجب عليك الذهاب للـ Firebase Console وتعديل الـ Rules لتسمح بالكتابة في الـ admins كما أشرت لك سابقاً.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'إضافة الآن';
        }
    }
};

document.addEventListener('submit', function(e) {
    if (e.target && e.target.id === 'admin-add-form') {
        e.preventDefault();
        window.submitAdminForm(e);
    }
});

async function deleteAdmin(id, email) {
    if (!confirm(`هل أنت متأكد من حذف المشرف ${email}؟`)) return;
    try {
        await deleteDoc(doc(db, "admins", id));
        showToast("تم حذف المشرف بنجاح 🗑️");
        loadAdmins();
    } catch (e) {
        console.error(e);
        showToast("فشل في حذف المشرف", "error");
    }
}
window.deleteAdmin = deleteAdmin;

// ==========================================
// APP FLAGS / SYSTEM VARIABLES LOGIC
// ==========================================
async function loadAppFlags() {
    console.log("Antiko: Loading App Flags...");
    try {
        const docSnap = await getDoc(doc(db, "settings", "app_flags"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

            setCheck('flag-maintenanceMode', data.maintenanceMode || false);
            setVal('flag-maintenanceMsg', data.maintenanceMsg || '');
            setCheck('flag-protectionEnabled', data.protectionEnabled !== false);
            setCheck('flag-aiVisible', data.aiVisible !== false);
            setCheck('flag-orderSound', data.orderSound !== false);
            setVal('flag-siteUrl', data.siteUrl || '');
            setVal('flag-siteBio', data.siteBio || '');
            setVal('flag-adminWa', data.adminWa || '');
        } else {
            console.log("Antiko: No app flags found in DB.");
        }
    } catch (e) {
        console.error("LOAD APP FLAGS ERROR:", e);
    }
}
window.loadAppFlags = loadAppFlags;

async function saveAppFlags() {
    console.log("Antiko: Saving App Flags...");
    const btn = document.querySelector('#section-app-flags .dashboard-header .premium-btn');
    const originalHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> جاري الحفظ...';
    }

    const data = {
        maintenanceMode: document.getElementById('flag-maintenanceMode')?.checked || false,
        maintenanceMsg: document.getElementById('flag-maintenanceMsg')?.value || '',
        protectionEnabled: document.getElementById('flag-protectionEnabled')?.checked || false,
        aiVisible: document.getElementById('flag-aiVisible')?.checked || false,
        orderSound: document.getElementById('flag-orderSound')?.checked || false,
        siteUrl: document.getElementById('flag-siteUrl')?.value || '',
        siteBio: document.getElementById('flag-siteBio')?.value || '',
        adminWa: document.getElementById('flag-adminWa')?.value || '',
        updatedAt: new Date().getTime()
    };

    try {
        await setDoc(doc(db, "settings", "app_flags"), data, { merge: true });
        showToast("تم حفظ متغيرات النظام بنجاح! ✨");
        if (btn) {
            btn.innerHTML = '<i class="ph ph-check"></i> تم الحفظ';
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }, 2000);
        }
    } catch (e) {
        console.error("SAVE APP FLAGS ERROR:", e);
        showToast("فشل في حفظ البيانات", "error");
        if (btn) {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    }
}
window.saveAppFlags = saveAppFlags;

// --- Dashboard Initialization (Post-Load) ---
window.loadAdminTickets();

// --- Failsafe Initialization ---
setTimeout(() => {
    const dv = document.getElementById('dashboard-view');
    if (dv && !dv.classList.contains('hidden')) {
        console.log("Antiko: Failsafe init triggered.");
        if (typeof initDashboard === 'function') initDashboard();
    }
}, 3000);
