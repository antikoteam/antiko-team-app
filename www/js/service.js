import { db, collection, getDocs, getDoc, doc, query, where, orderBy, addDoc } from "./firebase-config.js";

document.addEventListener('DOMContentLoaded', async () => {

    // Get slug from URL
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    const loader = document.getElementById('loader');
    const appContent = document.getElementById('app-content');
    const announcementWrapper = document.getElementById('announcement-wrapper');
    const announcementText = document.getElementById('announcement-text');
    const serviceTitle = document.getElementById('service-title');
    const serviceDesc = document.getElementById('service-desc');
    const countriesGrid = document.getElementById('countries-grid');

    if (!slug) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // Fetch Site Settings for Announcement
        const settingsRef = doc(db, "site_settings", "main");
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
            const settings = settingsSnap.data();
            if (settings.showAnnouncement && settings.announcementText) {
                announcementText.textContent = settings.announcementText;
            } else {
                announcementWrapper.classList.add('hidden');
            }
        } else {
            announcementWrapper.classList.add('hidden');
        }

        // Fetch Service details
        const servicesRef = collection(db, "services");
        const qService = query(servicesRef, where("slug", "==", slug));
        const serviceSnap = await getDocs(qService);

        if (serviceSnap.empty) {
            countriesGrid.innerHTML = '<p class="text-muted text-center" style="width: 100%;">الخدمة غير موجودة.</p>';
        } else {
            const service = serviceSnap.docs[0].data();
            const cleanTitle = (service.titleAr || "").trim();
            serviceTitle.innerHTML = `<i class="ph ph-${service.icon || 'star'}"></i> ${cleanTitle}`;
            serviceDesc.textContent = (service.descriptionAr || "").trim();

            // Fetch Items for this service, fallback to slug as collection name if no targetCollection
            const targetColl = (service.targetCollection && service.targetCollection.trim() !== "")
                ? service.targetCollection.trim()
                : slug;
            const itemsRef = collection(db, targetColl);
            const qItems = query(itemsRef, orderBy("sortOrder", "asc"));
            const itemsSnap = await getDocs(qItems);

            countriesGrid.innerHTML = '';
            let hasVisibleItems = false;

            if (!itemsSnap.empty) {
                itemsSnap.forEach(docSnap => {
                    const country = docSnap.data();
                    if (country.active === false) return; // Skip inactive locally

                    hasVisibleItems = true;

                    const card = document.createElement('div');
                    card.className = 'glass-card country-card slide-in';

                    // Determine visual HTML (Flags, Books, or Games)
                    let flagHtml = '';
                    const collLow = targetColl.toLowerCase();
                    const slugLow = slug.toLowerCase();
                    const isBook = collLow.includes('book') || slugLow.includes('book');
                    const isGame = collLow.includes('game') || collLow.includes('recharge') || slugLow.includes('game') || slugLow.includes('recharge');
                    const isProject = collLow.includes('design') || collLow.includes('web') || collLow.includes('app');

                    if (isBook) {
                        const imgUrl = country.coverBase64 || country.logoBase64 || country.imageBase64;
                        flagHtml = imgUrl
                            ? `<img src="${imgUrl}" alt="${country.nameAr || country.name}" width="120" height="180" style="border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); object-fit: cover; border: 1px solid var(--border-light);">`
                            : `<div style="font-size: 5rem; opacity: 0.8;">📚</div>`;
                    } else if (isGame || isProject) {
                        const logoUrl = country.logoBase64 || country.imageBase64 || country.coverBase64 || country.icon || (isGame ? getGameLogo(country.name) : '');
                        if (logoUrl) {
                            flagHtml = `<img src="${logoUrl}" alt="${country.nameAr || country.name}" width="100" height="100" style="border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); object-fit: cover; border: 1px solid var(--border-light);">`;
                        } else {
                            flagHtml = `<i class="ph ph-image" style="font-size: 4rem; opacity: 0.5;"></i>`;
                        }
                    } else {
                        flagHtml = FlagsHelper.getFlagHtml(country.logoBase64 || country.imageBase64 || country.coverBase64 || country.flagUrl || country.flag || country.icon);
                    }


                    const countryName = country.nameAr || country.title || (country.name && country.name.length > 3 ? country.name : 'خدمة');
                    const safePrice = country.price || '0';
                    const safeCurrency = country.currency || 'ج.م';

                    card.innerHTML = `
                        <div class="card-edge"></div>
                        <div class="card-inner">
                            <div class="country-flag">${flagHtml || '🏳️'}</div>
                            <div class="country-name">${countryName}</div>
                            <div class="country-price" style="margin-bottom: 15px;">${safePrice} ${safeCurrency}</div>
                            <button class="premium-btn w-100" style="font-size: 0.9rem; padding: 10px;">
                                <i class="ph-fill ph-shopping-cart"></i> شراء
                            </button>
                        </div>
                    `;

                    const startPurchase = (e) => {
                        if (e) {
                            e.preventDefault();
                            e.stopPropagation();
                        }

                        if (isGame) {
                            openGameOptions(country, flagHtml);
                            return;
                        }

                        // Open Smart Order Modal
                        const modal = document.getElementById('smart-order-modal');
                        const titleEl = document.getElementById('order-modal-title');
                        const priceEl = document.getElementById('order-modal-price');
                        const iconEl = document.getElementById('order-modal-icon');
                        const confirmBtn = document.getElementById('confirm-order-btn');
                        const phoneContainer = document.getElementById('smart-order-phone-container');
                        const selectionStep = document.getElementById('smart-order-selection-step');
                        const successStep = document.getElementById('smart-order-success-step');

                        if (modal && titleEl && priceEl && iconEl) {
                            selectedOrder = {
                                game: { name: country.nameAr || country.name },
                                option: { name: 'طلب مباشر', price: country.price },
                                type: targetColl.split('_')[0] || slug,
                                serviceSlug: slug,
                                serviceName: service.titleAr,
                                currency: country.currency || 'ج.م'
                            };

                            titleEl.textContent = country.nameAr || country.name;
                            priceEl.textContent = `${country.price} ${country.currency || 'ج.م'}`;
                            phoneContainer.classList.add('hidden');
                            selectionStep.classList.remove('hidden');
                            successStep.classList.add('hidden');
                            confirmBtn.innerHTML = '<i class="ph-fill ph-shopping-bag"></i> حجز الآن';

                            const phoneError = document.getElementById('smart-phone-error');
                            if (phoneError) phoneError.classList.add('hidden');
                            document.getElementById('smart-order-phone').style.borderColor = 'var(--border-light)';
                            document.getElementById('smart-order-phone').value = '';

                            iconEl.innerHTML = flagHtml;
                            modal.classList.remove('hidden');
                        }
                    };

                    card.addEventListener('click', startPurchase);
                    countriesGrid.appendChild(card);
                });
            }

            if (!hasVisibleItems) {
                countriesGrid.innerHTML = '<p class="text-muted text-center" style="width: 100%;">لا توجد أرقام متاحة حالياً.</p>';
            }
        }

        // Hide loader, show app
        loader.classList.add('hidden');
        appContent.classList.remove('hidden');

    } catch (error) {
        console.error("Error loading service data:", error);
    }
});

// Audio Feedback (Tick sound)
const playClick = () => {
    const appSettings = JSON.parse(localStorage.getItem('antiko_settings')) || {
        soundEnabled: true,
        volume: 30
    };
    if (!appSettings.soundEnabled) return;

    // Fetch custom sound from Firestore or Fallback
    const settingsRef = doc(db, "site_settings", "main");
    getDoc(settingsRef).then(snap => {
        let soundUrl = '/assets/sounds/click.mp3';
        if (snap.exists() && snap.data().customBtnSound) {
            soundUrl = snap.data().customBtnSound;
        }
        const audio = new Audio(soundUrl);
        audio.volume = 1.0;
        audio.play().catch(() => { });
    }).catch(() => {
        // Fallback if firestore fails
        const audio = new Audio('/assets/sounds/click.mp3');
        audio.volume = 1.0;
        audio.play().catch(() => { });
    });
};

document.addEventListener('click', (e) => {
    if (e.target.closest('button, .premium-btn, .glass-card, .action-btn')) {
        playClick();
    }
});

function getGameLogo(name) {
    if (!name) return 'https://img.freepik.com/premium-vector/joystick-neon-logo-design-template-gamer-neon-logo-concept-pro-gamer-logo-neon-vector-illustration_155165-154.jpg';
    const n = name.toLowerCase();
    if (n.includes('pubg') || n.includes('ببجي')) return 'https://w7.pngwing.com/pngs/381/68/png-transparent-playerunknown-s-battlegrounds-logo-pubg-thumbnail.png';
    if (n.includes('free fire') || n.includes('فري فاير')) return 'https://e7.pngegg.com/pngimages/279/119/png-clipart-garena-free-fire-battle-royale-game-garena-free-fire-logo-logo-fictional-character.png';
    if (n.includes('roblox') || n.includes('روبلوكس')) return 'https://w7.pngwing.com/pngs/710/188/png-transparent-roblox-logo-thumbnail.png';
    if (n.includes('valorant') || n.includes('فالورانت')) return 'https://w7.pngwing.com/pngs/1/86/png-transparent-valorant-logo-thumbnail.png';
    return 'https://img.freepik.com/premium-vector/joystick-neon-logo-design-template-gamer-neon-logo-concept-pro-gamer-logo-neon-vector-illustration_155165-154.jpg';
}

// Flags are now handled via FlagsHelper in flags.js

let selectedOrder = { game: null, option: null };

function openGameOptions(game, logoHtml) {
    const modal = document.getElementById('game-options-modal');
    const list = document.getElementById('game-options-list');
    const title = document.getElementById('game-options-title');
    const logo = document.getElementById('game-options-logo');
    const buyBtn = document.getElementById('game-buy-btn');
    const phoneContainer = document.getElementById('game-phone-container');
    const selectionStep = document.getElementById('game-selection-step');
    const successStep = document.getElementById('game-success-step');

    if (modal && list && title) {
        title.textContent = game.nameAr || game.name;
        logo.innerHTML = logoHtml;
        list.innerHTML = '';
        buyBtn.disabled = true;
        phoneContainer.classList.add('hidden');
        selectionStep.classList.remove('hidden');
        successStep.classList.add('hidden');

        // Sample options (In a real app, these would come from sub-collection)
        const options = [
            { name: "باقة 1", price: game.price },
            { name: "باقة 2", price: Math.round(game.price * 1.8) },
            { name: "باقة 3", price: game.price * 3 }
        ];

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'glass-card';
            btn.style.width = '100%';
            btn.style.padding = '15px';
            btn.style.display = 'flex';
            btn.style.justifyContent = 'space-between';
            btn.style.alignItems = 'center';
            btn.style.color = '#fff';

            btn.innerHTML = `
                <span>${opt.name}</span>
                <span style="color: var(--neon-red); font-weight: 800;">${opt.price} ج.م</span>
            `;

            btn.onclick = () => {
                document.querySelectorAll('#game-options-list button').forEach(b => b.style.borderColor = 'var(--border-light)');
                btn.style.borderColor = 'var(--neon-red)';
                selectedOrder.game = game;
                selectedOrder.option = opt;
                buyBtn.disabled = false;
            };
            list.appendChild(btn);
        });

        modal.classList.remove('hidden');
    }
}

// Global modal confirming helpers
document.addEventListener('click', async (e) => {
    // Smart Order Modal Logic
    if (e.target.id === 'confirm-order-btn' || e.target.closest('#confirm-order-btn')) {
        const btn = document.getElementById('confirm-order-btn');
        const phoneContainer = document.getElementById('smart-order-phone-container');
        const phoneInput = document.getElementById('smart-order-phone');

        if (phoneContainer.classList.contains('hidden')) {
            phoneContainer.classList.remove('hidden');
            phoneInput.focus();
            btn.innerHTML = '<i class="ph-fill ph-check-circle"></i> تأكيد الحجز';
            return;
        }

        const phone = phoneInput.value.trim();
        const phoneRegex = /^[0-9]{11}$/;
        if (!phoneRegex.test(phone)) {
            phoneInput.style.borderColor = 'var(--neon-red)';
            return;
        }

        btn.disabled = true;
        btn.innerHTML = 'جاري الإرسال...';
        try {
            await addDoc(collection(db, "orders"), {
                type: selectedOrder.type,
                serviceName: selectedOrder.game.name,
                details: selectedOrder.option.name,
                price: selectedOrder.option.price,
                currency: selectedOrder.currency,
                phone: phone,
                timestamp: Date.now()
            });
            document.getElementById('smart-order-selection-step').classList.add('hidden');
            document.getElementById('smart-order-success-step').classList.remove('hidden');
        } catch (err) { alert("خطأ في الإرسال"); } finally { btn.disabled = false; }
    }

    // Game Modal Logic
    if (e.target.id === 'game-buy-btn' || e.target.closest('#game-buy-btn')) {
        const btn = document.getElementById('game-buy-btn');
        const phoneContainer = document.getElementById('game-phone-container');
        const phoneInput = document.getElementById('game-order-phone');

        if (phoneContainer.classList.contains('hidden')) {
            phoneContainer.classList.remove('hidden');
            phoneInput.focus();
            btn.innerHTML = '<i class="ph-fill ph-check-circle"></i> تأكيد الحجز';
            return;
        }

        const phone = phoneInput.value.trim();
        if (!/^[0-9]{11}$/.test(phone)) {
            phoneInput.style.borderColor = 'var(--neon-red)';
            return;
        }

        btn.disabled = true;
        try {
            await addDoc(collection(db, "orders"), {
                type: 'game',
                gameName: selectedOrder.game.nameAr || selectedOrder.game.name,
                optionName: selectedOrder.option.name,
                price: selectedOrder.option.price,
                phone: phone,
                timestamp: Date.now()
            });
            document.getElementById('game-selection-step').classList.add('hidden');
            document.getElementById('game-success-step').classList.remove('hidden');
        } catch (err) { alert("خطأ"); } finally { btn.disabled = false; }
    }
});
