import { db, collection, addDoc, query, where, getDocs } from "./firebase-config.js";
import { state } from "./app-state.js";

// --- Global Notifications (Toasts) ---
export const showToast = function (msg, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: ${type === 'success' ? 'var(--neon-green)' : 'var(--neon-red)'};
            color: #fff; padding: 12px 25px; border-radius: 30px; z-index: 10000;
            font-weight: 700; box-shadow: 0 5px 15px rgba(0,0,0,0.5);
            animation: slideInDown 0.3s forwards; pointer-events: none;
        `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

window.showToast = showToast;

export async function loadUserOrders() {
    if (!state.currentUser) {
        showToast("يجب تسجيل الدخول لمشاهدة طلباتك", "error");
        return;
    }

    const list = document.getElementById('user-orders-list');
    if (!list) return;

    list.innerHTML = '<div class="text-center" style="padding:20px; color:#555;"><i class="ph ph-spinner ph-spin"></i> جاري جلب طلباتك...</div>';

    try {
        const q = query(
            collection(db, "orders"),
            where("userId", "==", state.currentUser.uid),
        );

        const snap = await getDocs(q);
        if (snap.empty) {
            list.innerHTML = `
                <div style="text-align:center; padding: 40px 20px;">
                    <i class="ph ph-shopping-cart" style="font-size: 3rem; color: #222; margin-bottom: 15px; display: block;"></i>
                    <p style="color: #888;">لم تقم بأي طلبات بعد.</p>
                    <button onclick="closeModal('user-orders-modal')" class="premium-btn secondary" style="margin-top:20px;">ابدأ التسوق الآن</button>
                </div>
            `;
            return;
        }

        const orders = [];
        snap.forEach(docSnap => orders.push({ id: docSnap.id, ...docSnap.data() }));
        orders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        list.innerHTML = '';
        orders.forEach(order => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: rgba(255,255,255,0.03); 
                border: 1px solid rgba(255,255,255,0.07); 
                border-radius: 12px; 
                padding: 15px; 
                position: relative;
                animation: fadeIn 0.4s ease;
            `;

            let statusColor = '#888';
            let statusText = 'قيد الانتظار';
            if (order.status === 'completed' || order.status === 'done' || order.status === 'تم') {
                statusColor = '#00ff88'; statusText = 'تم التنفيذ ✅';
            } else if (order.status === 'canceled' || order.status === 'ملغي') {
                statusColor = '#ff4444'; statusText = 'ملغي ❌';
            }

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div>
                        <div style="font-weight: 800; color: #fff; font-size: 1rem;">${order.serviceName || order.gameName}</div>
                        <div style="font-size: 0.8rem; color: #888;">${order.details || order.optionName}</div>
                    </div>
                    <div style="font-size: 0.8rem; font-weight: 700; color: ${statusColor}; background: ${statusColor}15; padding: 4px 10px; border-radius: 20px;">
                        ${statusText}
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px; margin-top: 10px;">
                    <div style="font-size: 0.75rem; color: #555;">${new Date(order.timestamp).toLocaleString('ar-EG')}</div>
                    <div style="font-weight: 800; color: #00ff88; font-size: 1rem;">${order.price} ${order.currency}</div>
                </div>
            `;
            list.appendChild(card);
        });

    } catch (e) {
        console.error("Load User Orders Error:", e);
        list.innerHTML = '<p style="text-align:center; color:red;">فشل في تحميل الطلبات. حاول لاحقاً.</p>';
    }
}

window.loadUserOrders = loadUserOrders;

const initOrdersControls = () => {
    const ordersBtn = document.getElementById('modal-orders-btn');
    if (ordersBtn) {
        ordersBtn.onclick = () => {
            if (typeof window.openModal === 'function') window.openModal('user-orders-modal');
            loadUserOrders();
        };
    }

    // Game Buy Handler
    const gameBuyBtn = document.getElementById('game-buy-btn');
    if (gameBuyBtn) {
        gameBuyBtn.addEventListener('click', async () => {
            const phoneContainer = document.getElementById('game-phone-container');
            const phoneInput = document.getElementById('game-order-phone');

            if (!phoneContainer || !phoneInput) return;

            if (phoneContainer.classList.contains('hidden')) {
                phoneContainer.classList.remove('hidden');
                phoneInput.focus();
                gameBuyBtn.innerHTML = '<i class="ph-fill ph-check-circle"></i> تأكيد الحجز';
                return;
            }

            const phone = phoneInput.value.trim();
            const phoneError = document.getElementById('game-phone-error');
            const phoneRegex = /^[0-9]{11}$/;

            if (!phoneRegex.test(phone)) {
                phoneInput.style.borderColor = 'var(--neon-red)';
                if (phoneError) phoneError.classList.remove('hidden');
                return;
            } else {
                phoneInput.style.borderColor = 'var(--border-light)';
                if (phoneError) phoneError.classList.add('hidden');
            }

            const originalText = gameBuyBtn.innerHTML;
            gameBuyBtn.disabled = true;
            gameBuyBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> جاري الإرسال...';

            try {
                await addDoc(collection(db, "orders"), {
                    userId: state.currentUser ? state.currentUser.uid : 'guest',
                    userEmail: state.currentUser ? state.currentUser.email : 'guest',
                    type: 'game',
                    gameName: (state.selectedGameOrder.game.nameAr || state.selectedGameOrder.game.name || state.selectedGameOrder.game.title || 'لعبة'),
                    optionName: (state.selectedGameOrder.option.name || 'شحن'),
                    price: (state.selectedGameOrder.option.price || '0'),
                    currency: (state.selectedGameOrder.game.currency || 'ج.م'),
                    phone: phone,
                    status: 'pending',
                    timestamp: Date.now()
                });

                document.getElementById('game-selection-step').classList.add('hidden');
                document.getElementById('game-success-step').classList.remove('hidden');
                phoneInput.value = '';

            } catch (error) {
                console.error("Booking Error:", error);
                alert("حدث خطأ أثناء إرسال طلبك. يرجى المحاولة مرة أخرى.");
            } finally {
                gameBuyBtn.disabled = false;
                gameBuyBtn.innerHTML = originalText;
            }
        });
    }

    // Smart/Direct Order Handler
    const smartOrderBtn = document.getElementById('confirm-order-btn');
    if (smartOrderBtn) {
        smartOrderBtn.addEventListener('click', async () => {
            const phoneContainer = document.getElementById('smart-order-phone-container');
            const phoneInput = document.getElementById('smart-order-phone');

            if (!phoneContainer || !phoneInput) return;

            if (phoneContainer.classList.contains('hidden')) {
                phoneContainer.classList.remove('hidden');
                phoneInput.focus();
                smartOrderBtn.innerHTML = '<i class="ph-fill ph-check-circle"></i> تأكيد الحجز';
                return;
            }

            const phone = phoneInput.value.trim();
            const phoneError = document.getElementById('smart-phone-error');
            const phoneRegex = /^[0-9]{11}$/;

            if (!phoneRegex.test(phone)) {
                phoneInput.style.borderColor = 'var(--neon-red)';
                if (phoneError) phoneError.classList.remove('hidden');
                return;
            } else {
                phoneInput.style.borderColor = 'var(--border-light)';
                if (phoneError) phoneError.classList.add('hidden');
            }

            smartOrderBtn.disabled = true;
            smartOrderBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> جاري الإرسال...';

            try {
                await addDoc(collection(db, "orders"), {
                    userId: state.currentUser ? state.currentUser.uid : 'guest',
                    userEmail: state.currentUser ? state.currentUser.email : 'guest',
                    type: state.selectedGameOrder.type || 'other',
                    serviceName: state.selectedGameOrder.game.name,
                    details: state.selectedGameOrder.option.name,
                    price: state.selectedGameOrder.option.price,
                    currency: state.selectedGameOrder.currency || 'ج.م',
                    phone: phone,
                    status: 'pending',
                    timestamp: Date.now()
                });

                document.getElementById('smart-order-selection-step').classList.add('hidden');
                document.getElementById('smart-order-success-step').classList.remove('hidden');
                phoneInput.value = '';

            } catch (error) {
                console.error("Smart Booking Error:", error);
                alert("حدث خطأ أثناء إرسال طلبك.");
            } finally {
                smartOrderBtn.disabled = false;
            }
        });
    }

    // Error clearance listeners
    const gPhone = document.getElementById('game-order-phone');
    if (gPhone) {
        const clearFunc = () => {
            gPhone.style.borderColor = 'var(--border-light)';
            const err = document.getElementById('game-phone-error');
            if (err) err.classList.add('hidden');
        };
        gPhone.addEventListener('input', clearFunc);
        gPhone.addEventListener('focus', clearFunc);
    }

    const sPhone = document.getElementById('smart-order-phone');
    if (sPhone) {
        const clearFunc = () => {
            sPhone.style.borderColor = 'var(--border-light)';
            const err = document.getElementById('smart-phone-error');
            if (err) err.classList.add('hidden');
        };
        sPhone.addEventListener('input', clearFunc);
        sPhone.addEventListener('focus', clearFunc);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOrdersControls);
} else {
    initOrdersControls();
}
