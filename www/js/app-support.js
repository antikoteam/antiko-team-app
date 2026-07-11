import { db, collection, addDoc, query, where, onSnapshot } from "./firebase-config.js";
import { state } from "./app-state.js";

let unsubSupportChat = null;

export function loadChatMessages(currentUser) {
    const chatBox = document.getElementById('support-chat-box');
    if (!chatBox || !currentUser) return;

    const q = query(collection(db, 'support_tickets'), where('userId', '==', currentUser.uid));

    if (unsubSupportChat) {
        unsubSupportChat();
        unsubSupportChat = null;
    }

    let lastMessageCount = -1;

    unsubSupportChat = onSnapshot(q, (snapshot) => {
        chatBox.innerHTML = '<div style="background: rgba(255,255,255,0.05); padding: 10px 15px; border-radius: 15px; border-bottom-right-radius: 0; align-self: flex-start; max-width: 85%; font-size: 0.9rem; color: #ddd;">أهلاً بك في دعم أنتيكو تيم. كيف يمكننا مساعدتك اليوم؟</div>';

        const msgs = [];
        snapshot.forEach(docSnap => msgs.push(docSnap.data()));
        msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        msgs.forEach(msg => {
            const isAdmin = msg.senderId === 'admin';
            const isMe = msg.senderId === currentUser.uid;
            const msgDiv = document.createElement('div');
            msgDiv.style.cssText = `
                padding: 10px 15px; 
                border-radius: 15px; 
                max-width: 85%; 
                font-size: 0.9rem; 
                position: relative;
                margin-bottom: 5px;
                ${isMe ? 'background: var(--neon-red); color: #fff; align-self: flex-end; border-bottom-left-radius: 0;' : 'background: rgba(255,255,255,0.1); color: #ddd; align-self: flex-start; border-bottom-right-radius: 0;'}
            `;

            let content = '';
            if (isAdmin) {
                content += `<div style="font-size: 0.7rem; color: var(--neon-red); font-weight: 800; margin-bottom: 3px;"><i class="ph ph-shield-check"></i> فريق أنتيكو</div>`;
            }
            content += `<div>${msg.text}</div>`;

            msgDiv.innerHTML = content;
            chatBox.appendChild(msgDiv);
        });
        chatBox.scrollTop = chatBox.scrollHeight;

        if (lastMessageCount !== -1 && msgs.length > lastMessageCount) {
            const newestMsg = msgs[msgs.length - 1];
            if (newestMsg && newestMsg.senderId === 'admin') {
                if (Notification.permission === 'granted') {
                    new Notification("أنتيكو تيم - رد الدعم الفني", {
                        body: newestMsg.text,
                        icon: 'assets/icon.png'
                    });
                }
            }
        }
        lastMessageCount = msgs.length;
    });
}

window.loadChatMessages = loadChatMessages;

function showCustomNotificationDialog() {
    if (document.getElementById('custom-notification-dialog')) return;

    const dialog = document.createElement('div');
    dialog.id = 'custom-notification-dialog';
    dialog.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);
        display: flex; align-items: center; justify-content: center; z-index: 99999;
        direction: rtl; font-family: 'Alexandria', sans-serif;
    `;

    dialog.innerHTML = `
        <div style="background: linear-gradient(145deg, #0f0f15, #07070a); border: 1px solid rgba(255, 0, 60, 0.2); border-radius: 24px; padding: 35px 30px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
            <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #ff003c, #cc0030); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 0 20px rgba(255, 0, 60, 0.4);">
                <i class="ph-fill ph-bell" style="font-size: 2.2rem; color: #fff;"></i>
            </div>
            <h3 style="color: #fff; font-size: 1.3rem; margin-bottom: 12px; font-weight: 800;">تفعيل الإشعارات التنبيهية</h3>
            <p style="color: rgba(255,255,255,0.6); font-size: 0.9rem; line-height: 1.6; margin-bottom: 25px;">يرجى السماح بالإشعارات لتلقي تنبيهات فورية عند وصول ردود الدعم الفني أو تحديثات الطلبات الهامة.</p>
            <div style="display: flex; gap: 12px;">
                <button id="noti-cancel-btn" class="premium-btn secondary" style="flex: 1; padding: 12px; font-size: 0.95rem; border-color: rgba(255,255,255,0.1); color: #bbb;">لاحقاً</button>
                <button id="noti-accept-btn" class="premium-btn" style="flex: 2; padding: 12px; font-size: 0.95rem;">تفعيل الآن</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    document.getElementById('noti-cancel-btn').onclick = () => {
        localStorage.setItem('notificationPromptShown', 'true');
        dialog.remove();
    };

    document.getElementById('noti-accept-btn').onclick = () => {
        localStorage.setItem('notificationPromptShown', 'true');
        dialog.remove();
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    if (window.showToast) window.showToast("تم تفعيل الإشعارات بنجاح! 🎉");
                }
            });
        }
    };
}

const initSupportControls = () => {
    // Request permission once
    if ('Notification' in window && Notification.permission === 'default') {
        if (!localStorage.getItem('notificationPromptShown')) {
            setTimeout(showCustomNotificationDialog, 3000);
        }
    }

    const triggerNotiBtn = document.getElementById('trigger-notifications-btn');
    if (triggerNotiBtn) {
        triggerNotiBtn.onclick = () => {
            if ('Notification' in window) {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        if (window.showToast) window.showToast("تم تفعيل الإشعارات بنجاح! 🎉");
                    } else if (permission === 'denied') {
                        alert("تم رفض إذن الإشعارات سابقاً. يرجى تفعيلها يدوياً من إعدادات المتصفح/الهاتف.");
                    } else {
                        if (window.showToast) window.showToast("لم يتم منح الإذن بعد.", "error");
                    }
                });
            } else {
                alert("جهازك لا يدعم الإشعارات.");
            }
        };
    }

    const supportForm = document.getElementById('support-form');
    const msgInput = document.getElementById('support-msg-input');
    
    if (supportForm && msgInput) {
        supportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!state.currentUser) {
                if (window.showToast) window.showToast('يرجى تسجيل الدخول أولاً للمراسلة', 'error');
                if (window.openPrivacyModal) window.openPrivacyModal();
                return;
            }

            const text = msgInput.value.trim();
            if (!text) return;

            const btn = document.getElementById('support-submit-btn');
            const originalIcon = btn.innerHTML;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
            btn.disabled = true;

            try {
                await addDoc(collection(db, 'support_tickets'), {
                    userId: state.currentUser.uid,
                    userEmail: state.currentUser.email,
                    senderId: state.currentUser.uid,
                    text: text,
                    timestamp: new Date().getTime(),
                    status: 'open'
                });
                msgInput.value = '';
            } catch (err) {
                console.error("Chat error:", err);
                if (window.showToast) window.showToast('فشل في إرسال الرسالة، يرجى المحاولة لاحقاً', 'error');
            } finally {
                btn.innerHTML = originalIcon;
                btn.disabled = false;
            }
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupportControls);
} else {
    initSupportControls();
}

// Watch auth changes to load user tickets
onSnapshot(collection(db, 'support_tickets'), () => {
    if (state.currentUser && window.location.pathname.includes('support.html')) {
        loadChatMessages(state.currentUser);
    }
});
