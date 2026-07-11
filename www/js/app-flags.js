import { db, auth, doc, collection, onSnapshot } from "./firebase-config.js";
import { state } from "./app-state.js";

async function initAppFlags() {
    applyAppFlags();

    try {
        onSnapshot(doc(db, "settings", "app_flags"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                state.appFlags = { ...state.appFlags, ...data };
                applyAppFlags();
            }
        });
    } catch (e) {
        console.error("Flags init error:", e);
    }
}

export function applyAppFlags() {
    let mOverlay = document.getElementById('maintenance-overlay');
    const currentUserEmail = (auth.currentUser && auth.currentUser.email) ? auth.currentUser.email.toLowerCase() : '';
    const isCurrentUserAdmin = currentUserEmail && state.adminEmails.includes(currentUserEmail);

    if (state.appFlags.maintenanceMode && !isCurrentUserAdmin) {
        if (!mOverlay) {
            mOverlay = document.createElement('div');
            mOverlay.id = 'maintenance-overlay';
            mOverlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: #000; z-index: 100000; display: flex; flex-direction: column;
                align-items: center; justify-content: center; text-align: center; color: #fff;
                padding: 20px; font-family: 'Alexandria', sans-serif;
            `;
            mOverlay.innerHTML = `
                <i class="ph-fill ph-gear-six ph-spin" style="font-size: 5rem; color: var(--neon-red); margin-bottom: 20px;"></i>
                <h1 style="font-size: 2rem; margin-bottom: 10px;">الموقع في وضع الصيانة</h1>
                <p style="color: #aaa; max-width: 400px; line-height: 1.6;">${state.appFlags.maintenanceMsg || "نحن نقوم ببعض التحديثات، سنعود قريباً جداً."}</p>
            `;
            document.body.appendChild(mOverlay);
        }
    } else if (mOverlay) {
        mOverlay.remove();
    }

    // Show admin maintenance banner
    let adminBanner = document.getElementById('admin-maintenance-banner');
    if (state.appFlags.maintenanceMode && isCurrentUserAdmin) {
        if (!adminBanner) {
            adminBanner = document.createElement('div');
            adminBanner.id = 'admin-maintenance-banner';
            adminBanner.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; z-index: 99999;
                background: linear-gradient(135deg, #ff003c, #8a0303); color: #fff;
                padding: 10px 20px; text-align: center; font-family: 'Alexandria', sans-serif;
                font-size: 0.9rem; font-weight: 700; display: flex; align-items: center;
                justify-content: center; gap: 15px;
            `;
            adminBanner.innerHTML = `
                <span>⚠️ وضع الصيانة مفعّل حالياً — الزوار لا يمكنهم رؤية الموقع</span>
                <button onclick="document.getElementById('nav-dashboard-btn')?.click()" style="background:#fff; color:#ff003c; border:none; padding:5px 15px; border-radius:8px; font-weight:700; cursor:pointer; font-family:inherit;">فتح لوحة التحكم</button>
            `;
            document.body.appendChild(adminBanner);
        }
    } else if (adminBanner) {
        adminBanner.remove();
    }

    // Protection System
    if (state.appFlags.protectionEnabled) {
        document.oncontextmenu = (e) => { e.preventDefault(); return false; };
        if (!window._antikoProtectionActive) {
            window._antikoProtectionActive = true;
            document.addEventListener('keydown', (e) => {
                if (!state.appFlags.protectionEnabled) return;
                const activeTag = document.activeElement?.tagName;
                if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
                
                if (e.key === 'F12') { e.preventDefault(); return; }
                if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) { e.preventDefault(); return; }
                if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) { e.preventDefault(); return; }
            }, { capture: true });
        }
    } else {
        document.oncontextmenu = null;
    }

    // AI Visibility
    const aiElements = ['btn-nav-ai', 'ai-chat-toggle'];
    aiElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = state.appFlags.aiVisible !== false ? '' : 'none';
        }
    });

    if (state.appFlags.adminWa) {
        state.adminWhatsApp = state.appFlags.adminWa;
    }
}

// --- Order Notifications (For Admins) ---
let lastOrderCount = -1;
export function setupOrderListener(isAdmin) {
    if (!isAdmin) return;
    onSnapshot(collection(db, "orders"), (snap) => {
        if (lastOrderCount === -1) {
            lastOrderCount = snap.size;
            return;
        }
        if (snap.size > lastOrderCount) {
            if (state.appFlags.orderSound !== false) {
                if (typeof window.playSound === 'function') window.playSound('order');
                if (window.showToast) window.showToast("وصل طلب جديد! 🔔", "success");
            }
        }
        lastOrderCount = snap.size;
    });
}

window.setupOrderListener = setupOrderListener;

// Initialize app-flags listeners
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initAppFlags();
    });
} else {
    initAppFlags();
}
