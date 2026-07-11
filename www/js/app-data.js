import { db, doc, collection, query, orderBy, getDoc, getDocs } from "./firebase-config.js";
import { state } from "./app-state.js";
import { navigateTo } from "./app-ui.js";

// Helper function to safely set Arabic text
const safeSetText = (idOrEl, text) => {
    const el = (typeof idOrEl === 'string') ? document.getElementById(idOrEl) : idOrEl;
    if (el && text !== undefined) {
        el.textContent = text.trim();
    }
};

export async function loadPublicData() {
    const loader = document.getElementById('loader');
    const appContent = document.getElementById('app-content');
    
    try {
        // 0. Site Settings & Sound
        const sSettingsRef = doc(db, "site_settings", "main");
        const sSettingsSnap = await getDoc(sSettingsRef);
        if (sSettingsSnap.exists()) {
            const sData = sSettingsSnap.data();
            if (sData.customBtnSound) {
                state.appSettings.customSound = sData.customBtnSound;
            }
        }

        // 1. DYNAMIC SERVICES
        const servicesRef = collection(db, "services");
        const qServices = query(servicesRef, orderBy("sortOrder", "asc"));
        const servicesSnap = await getDocs(qServices);
        const storeGrid = document.getElementById('store-sections-grid');

        if (storeGrid) {
            storeGrid.innerHTML = '';
            if (servicesSnap.empty) {
                storeGrid.innerHTML = '<p class="text-center" style="width:100%;">لا توجد أقسام متاحة حالياً.</p>';
            } else {
                servicesSnap.forEach(sDoc => {
                    try {
                        const s = sDoc.data();
                        if (s.active === false) return;

                        const card = document.createElement('div');
                        card.className = `glass-card menu-card slide-in storefront-card`;
                        card.style.cursor = 'pointer';

                        let iconHtml;
                        if (s.logoBase64) {
                            iconHtml = `
                                    <div style="position:relative; width:60px; height:60px; display:flex; align-items:center; justify-content:center; margin: 0 auto;">
                                        <img src="${s.logoBase64}" alt="..." width="60" height="60" style="object-fit: contain; filter: drop-shadow(0 0 10px ${s.color || '#ff003c'}80); position:relative; z-index:2;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                        <div style="position:absolute; inset:0; display:none; align-items:center; justify-content:center; color: ${s.color || '#ff003c'};"><i class="ph-fill ph-${s.icon || 'package'}" style="font-size:3rem;"></i></div>
                                    </div>`;
                        } else {
                            const iconName = s.icon || 'star';
                            iconHtml = `<div style="color: ${s.color || '#ff003c'}; filter: drop-shadow(0 0 15px ${s.color || '#ff003c'}); display: inline-block;"><i class="ph-fill ph-${iconName}" style="color: inherit;"></i></div>`;
                        }

                        card.innerHTML = `
                                <div class="card-edge"></div>
                                <div class="card-inner text-center" style="padding: 40px 20px;">
                                    <div class="menu-icon">${iconHtml}</div>
                                    <h2 style="font-weight: 800;">${s.titleAr || 'قسم جديد'}</h2>
                                    <p class="text-muted" style="font-size: 0.9rem;">${s.descriptionAr || ''}</p>
                                </div>
                            `;
                        card.onclick = () => { loadCountriesForService(s); };
                        storeGrid.appendChild(card);
                    } catch (err) {
                        console.error("Error rendering service card:", err);
                    }
                });
            }
        }

        // 2. SITE SETTINGS
        if (sSettingsSnap.exists()) {
            const s = sSettingsSnap.data();
            safeSetText('hero-top-text', s.heroTopText);
            const hTitle = document.getElementById('hero-title');
            if (hTitle) {
                hTitle.textContent = s.heroTitle;
                hTitle.setAttribute('data-text', s.heroTitle || '');
            }
            safeSetText('hero-subtitle', s.heroSubtitle);

            safeSetText('team-card-title', s.teamCardTitle);
            safeSetText('team-card-sub', s.teamCardSub);
            safeSetText('store-card-title', s.storeCardTitle);
            safeSetText('store-card-sub', s.storeCardSub);

            // Announcement
            const homeAnnounceWrapper = document.getElementById('home-announcement-wrapper');
            if (homeAnnounceWrapper) {
                if (s.showMainAnnounce && s.mainAnnounceText) {
                    homeAnnounceWrapper.style.display = 'flex';
                    const content = homeAnnounceWrapper.querySelector('.announcement-content');
                    if (content) content.textContent = s.mainAnnounceText;
                } else {
                    homeAnnounceWrapper.style.display = 'none';
                }
            }
            safeSetText('tg-card-title', s.tgCardTitle);
            safeSetText('tg-card-sub', s.tgCardSub);

            state.adminWhatsApp = s.adminWa || "";
        }

        if (loader) loader.classList.add('hidden');
        if (appContent) appContent.classList.remove('hidden');

    } catch (error) {
        console.error("Error loading app data:", error);
        if (loader) loader.classList.add('hidden');
        if (appContent) appContent.classList.remove('hidden');
    }
}

export async function loadCountriesForService(service) {
    const countriesTitle = document.getElementById('countries-title');
    const countriesGrid = document.getElementById('countries-grid');
    
    navigateTo('countries-section');
    if (countriesTitle) {
        countriesTitle.innerHTML = `<i class="ph ph-${service.icon || 'star'}"></i> ${service.titleAr}`;
    }
    if (countriesGrid) {
        countriesGrid.innerHTML = '<div class="loader-spinner" style="margin: 0 auto;"></div><p class="text-center" style="width: 100%;">جاري التحميل...</p>';
    }

    try {
        const targetCollection = (service.targetCollection && service.targetCollection.trim() !== "")
            ? service.targetCollection.trim()
            : service.slug;

        const announcementWrapper = document.getElementById('announcement-wrapper');
        if (announcementWrapper) {
            const showBanner = service.showBanner;
            const bannerText = service.bannerText;

            if (showBanner && bannerText) {
                announcementWrapper.style.display = 'flex';
                const contentDiv = announcementWrapper.querySelector('.announcement-content');
                if (contentDiv) contentDiv.textContent = bannerText;
            } else {
                const settingsRef = doc(db, "site_settings", "main");
                const settingsSnap = await getDoc(settingsRef);
                if (settingsSnap.exists()) {
                    const settings = settingsSnap.data();
                    const gShow = settings.showMainAnnounce;
                    const gText = settings.mainAnnounceText;
                    if (gShow && gText) {
                        announcementWrapper.style.display = 'flex';
                        const contentDiv = announcementWrapper.querySelector('.announcement-content');
                        if (contentDiv) contentDiv.textContent = gText;
                    } else {
                        announcementWrapper.style.display = 'none';
                    }
                } else {
                    announcementWrapper.style.display = 'none';
                }
            }
        }

        const countriesRef = collection(db, targetCollection);
        const qCountries = query(countriesRef, orderBy("sortOrder", "asc"));
        const countriesSnap = await getDocs(qCountries);

        if (!countriesGrid) return;
        countriesGrid.innerHTML = '';
        let hasActiveCountries = false;
        
        const isNumberService = service.sectionType ? (service.sectionType === 'numbers') :
            ((targetCollection || "").toLowerCase().includes('whatsapp') ||
                (targetCollection || "").toLowerCase().includes('telegram') ||
                (service.slug || "").toLowerCase().includes('number'));

        // Layout switches
        if (isNumberService) {
            countriesGrid.style.display = 'flex';
            countriesGrid.style.flexDirection = 'column';
            countriesGrid.style.gap = '12px';
        } else {
            countriesGrid.style.display = 'grid';
            countriesGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
            countriesGrid.style.gap = '30px';
        }

        if (!countriesSnap.empty) {
            countriesSnap.forEach(docSnap => {
                const country = docSnap.data();
                const isOutOfStock = country.active === false;
                const card = document.createElement('div');

                const collLow = (targetCollection || "").toLowerCase();
                const slugLow = (service.slug || "").toLowerCase();

                let isBook = collLow.includes('book') || slugLow.includes('book');
                let isGame = collLow.includes('game') || collLow.includes('recharge') || slugLow.includes('game') || slugLow.includes('recharge');
                let isProject = collLow.includes('design') || collLow.includes('web') || collLow.includes('app');

                if (service.sectionType === 'options') { isGame = true; isBook = false; }
                if (service.sectionType === 'store') { isGame = false; isProject = true; isBook = false; }

                let visualHtml = '';

                if (isNumberService) {
                    card.className = `glass-card slide-in ${isOutOfStock ? 'out-of-stock' : ''}`;
                    card.style = "margin-bottom: 12px; padding: 2px;";

                    visualHtml = window.FlagsHelper ? 
                        window.FlagsHelper.getFlagHtml(country.logoBase64 || country.imageBase64 || country.coverBase64 || country.flagUrl || country.flag || country.icon, 48, 48, '1.5rem') : '';
                    const priceDisplay = `${country.price || '0'} ${country.currency || 'ج.م'}`;
                    const displayName = country.nameAr || country.name || country.title || 'دولة غير معروفة';

                    card.innerHTML = `
                            <div class="card-edge"></div>
                            <div class="card-inner" style="flex-direction: row; align-items: center; justify-content: space-between; padding: 12px 20px; gap: 15px;">
                                <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                                    <div style="flex-shrink: 0;">${visualHtml}</div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 1.15rem; font-weight: 800; color: #fff;">${displayName}</div>
                                        <div style="font-size: 0.8rem; color: var(--text-secondary); opacity: 0.8;">جاهز للاستخدام</div>
                                    </div>
                                </div>
                                <div style="text-align: left; display: flex; align-items: center; gap: 15px;">
                                    <div style="color: var(--neon-red); font-size: 1.25rem; font-weight: 800; font-family: var(--font-heading); white-space: nowrap;">
                                        ${priceDisplay}
                                    </div>
                                    ${isOutOfStock ? `
                                        <span class="badge offline" style="font-size: 0.7rem; padding: 4px 8px;">غير متاح</span>
                                    ` : `
                                        <button class="buy-btn premium-btn" style="padding: 8px 15px; font-size: 0.85rem; border-radius: 6px; min-width: 80px;">
                                            <i class="ph ph-shopping-cart"></i> شراء
                                        </button>
                                    `}
                                </div>
                            </div>
                        `;
                } else {
                    card.className = `glass-card slide-in ${isOutOfStock ? 'out-of-stock' : ''}`;
                    card.style.padding = '0';

                    if (isBook) {
                        const imgUrl = country.coverBase64 || country.logoBase64 || country.imageBase64;
                        visualHtml = imgUrl
                            ? `<img src="${imgUrl}" alt="..." width="120" height="180" style="border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); object-fit: cover; border: 1px solid var(--border-light);">`
                            : `<div style="font-size: 5rem; opacity: 0.8;">📚</div>`;
                    } else if (isGame || isProject) {
                        const logoUrl = country.logoBase64 || country.imageBase64 || country.coverBase64 || country.icon || (isGame ? getGameLogo(country.name) : '');
                        visualHtml = `<img src="${logoUrl}" alt="..." width="100" height="100" style="border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); object-fit: cover; border: 1px solid var(--border-light);">`;
                    } else {
                        visualHtml = window.FlagsHelper ?
                            window.FlagsHelper.getFlagHtml(country.logoBase64 || country.imageBase64 || country.coverBase64 || country.flagUrl || country.flag || country.icon, 70, 70, '2.5rem') : '';
                    }

                    let priceDisplay = `${country.price || '0'} ${country.currency || 'ج.م'}`;
                    card.innerHTML = `
                            <div class="card-edge"></div>
                            <div class="card-inner" style="align-items: center; justify-content: center; text-align: center; gap: 8px; padding: 20px;">
                                <div style="${isBook || isGame || isProject ? 'margin-bottom: 5px;' : 'margin-bottom: 10px;'}">${visualHtml}</div>
                                <div style="font-size: 1.15rem; font-weight: 800; color: #fff; margin-top: 5px;">${country.nameAr || country.name || country.title || 'خدمة'}</div>
                                <div style="color: var(--neon-red); font-size: 1.1rem; font-weight: 700;">${priceDisplay}</div>
                                ${isOutOfStock ? `
                                    <div class="badge offline" style="width:100%; padding:10px;">نفذت الكمية</div>
                                ` : `
                                    <button class="buy-btn premium-btn w-100" style="padding: 10px; font-size: 0.9rem; border-radius: 8px;">
                                        <i class="ph ph-shopping-cart"></i> شراء
                                    </button>
                                `}
                            </div>
                        `;
                }

                card.style.cursor = isOutOfStock ? 'not-allowed' : 'pointer';

                if (!isOutOfStock) {
                    card.addEventListener('click', (e) => {
                        let isGamePurchase = (targetCollection || "").toLowerCase().includes('game') || (targetCollection || "").toLowerCase().includes('recharge');
                        if (service.sectionType === 'options') isGamePurchase = true;
                        if (service.sectionType === 'store' || service.sectionType === 'numbers') isGamePurchase = false;

                        if (e) { e.preventDefault(); e.stopPropagation(); }
                        if (isGamePurchase) {
                            const pLogo = window.FlagsHelper ? window.FlagsHelper.getFlagHtml(country.flagUrl || country.flag || country.icon, 70, 70, '2.5rem') : '';
                            openGameOptions(country, pLogo);
                            return;
                        }

                        const modal = document.getElementById('smart-order-modal');
                        const titleEl = document.getElementById('order-modal-title');
                        const priceEl = document.getElementById('order-modal-price');
                        const iconEl = document.getElementById('order-modal-icon');

                        if (modal && titleEl && priceEl && iconEl) {
                            const confirmBtn = document.getElementById('confirm-order-btn');
                            const phoneContainer = document.getElementById('smart-order-phone-container');
                            const selectionStep = document.getElementById('smart-order-selection-step');
                            const successStep = document.getElementById('smart-order-success-step');

                            state.selectedGameOrder = {
                                game: { name: country.nameAr || country.name || country.title || 'خدمة' },
                                option: { name: 'طلب مباشر', price: country.price || '0' },
                                type: (targetCollection.includes('_') ? targetCollection.split('_')[0] : targetCollection) || (service ? service.slug : 'direct'),
                                serviceSlug: service ? service.slug : 'other',
                                serviceName: service ? service.titleAr : 'خدمة مباشرة',
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
                            
                            const phoneInput = document.getElementById('smart-order-phone');
                            if (phoneInput) {
                                phoneInput.style.borderColor = 'var(--border-light)';
                                phoneInput.value = '';
                            }

                            if (isBook) iconEl.innerHTML = `<div style="font-size: 4rem;">📖</div>`;
                            else iconEl.innerHTML = visualHtml;

                            modal.classList.remove('hidden');
                        }
                    });
                }

                countriesGrid.appendChild(card);
                hasActiveCountries = true;
            });
        }

        if (!hasActiveCountries) {
            countriesGrid.innerHTML = '<p class="text-muted text-center" style="width: 100%;">لا توجد أرقام متاحة حالياً.</p>';
        }
    } catch (error) {
        console.error("Error loading countries:", error);
        if (countriesGrid) {
            countriesGrid.innerHTML = `
                <div class="text-center w-100">
                    <i class="ph ph-warning-circle text-red" style="font-size: 3rem; color: var(--neon-red);"></i>
                    <p style="color: var(--neon-red);">حدث خطأ أثناء تحميل الدول.</p>
                </div>
            `;
        }
    }
}

export function openGameOptions(game, logoHtml) {
    const modal = document.getElementById('game-options-modal');
    const list = document.getElementById('game-options-list');
    const title = document.getElementById('game-options-title');
    const desc = document.getElementById('game-options-desc');
    const logo = document.getElementById('game-options-logo');
    const buyBtn = document.getElementById('game-buy-btn');
    const phoneContainer = document.getElementById('game-phone-container');
    const selectionStep = document.getElementById('game-selection-step');
    const successStep = document.getElementById('game-success-step');

    if (!modal || !list) return;

    state.selectedGameOrder = { game, option: null };
    if (title) title.textContent = game.nameAr || game.name || game.title || 'شحن رصيد';
    if (desc) desc.textContent = game.description || game.descriptionAr || 'اختر الكمية التي تريد شحنها:';
    if (logo) logo.innerHTML = logoHtml;
    list.innerHTML = '';

    if (selectionStep) selectionStep.classList.remove('hidden');
    if (successStep) successStep.classList.add('hidden');
    if (phoneContainer) phoneContainer.classList.add('hidden');

    const phoneError = document.getElementById('game-phone-error');
    if (phoneError) phoneError.classList.add('hidden');
    
    const phoneInput = document.getElementById('game-order-phone');
    if (phoneInput) {
        phoneInput.style.borderColor = 'var(--border-light)';
        phoneInput.value = '';
    }

    if (buyBtn) {
        buyBtn.disabled = true;
        buyBtn.style.opacity = '0.5';
        buyBtn.style.cursor = 'not-allowed';
        buyBtn.innerHTML = '<i class="ph-fill ph-shopping-cart"></i> إتمام الطلب';
    }

    if (!Array.isArray(game.options)) {
        game.options = [];
    }

    if (game.options.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-secondary);">لا توجد خيارات متاحة حالياً.</div>';
    } else {
        game.options.forEach((opt) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'glass-card game-option-item';
            btn.style.display = 'flex';
            btn.style.justifyContent = 'space-between';
            btn.style.alignItems = 'center';
            btn.style.padding = '15px 20px';
            btn.style.width = '100%';
            btn.style.border = '1px solid var(--border-light)';
            btn.style.transition = 'all 0.3s ease';
            btn.style.cursor = 'pointer';

            const imgHtml = opt.image ? `<img src="${opt.image}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px; margin-left: 10px;">` : '';
            btn.innerHTML = `
                        <div style="display: flex; align-items: center;">
                            ${imgHtml}
                            <div style="font-weight: 700; font-size: 1.1rem; color: #fff;">${opt.name}</div>
                        </div>
                        <div style="font-weight: 800; color: var(--neon-red); font-size: 1.1rem;">${opt.price} ${game.currency || 'ج.م'}</div>
                    `;

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                document.querySelectorAll('.game-option-item').forEach(el => {
                    el.style.borderColor = 'var(--border-light)';
                    el.style.background = 'transparent';
                    el.style.boxShadow = 'none';
                });

                btn.style.borderColor = 'var(--neon-red)';
                btn.style.background = 'rgba(255, 0, 60, 0.1)';
                btn.style.boxShadow = '0 0 15px rgba(255, 0, 60, 0.2)';

                state.selectedGameOrder.option = opt;

                if (buyBtn) {
                    buyBtn.disabled = false;
                    buyBtn.style.opacity = '1';
                    buyBtn.style.cursor = 'pointer';
                }
            });
            list.appendChild(btn);
        });
    }

    modal.classList.remove('hidden');
}

function getGameLogo(name) {
    if (!name) return 'https://img.freepik.com/premium-vector/joystick-neon-logo-design-template-gamer-neon-logo-concept-pro-gamer-logo-neon-vector-illustration_155165-154.jpg';
    const n = name.toLowerCase();
    if (n.includes('pubg') || n.includes('ببجي')) return 'https://w7.pngwing.com/pngs/381/68/png-transparent-playerunknown-s-battlegrounds-logo-pubg-thumbnail.png';
    if (n.includes('free fire') || n.includes('فري فاير')) return 'https://e7.pngegg.com/pngimages/279/119/png-clipart-garena-free-fire-battle-royale-game-garena-free-fire-logo-logo-fictional-character.png';
    if (n.includes('roblox') || n.includes('روبلوكس')) return 'https://w7.pngwing.com/pngs/710/188/png-transparent-roblox-logo-thumbnail.png';
    if (n.includes('valorant') || n.includes('فالورانت')) return 'https://w7.pngwing.com/pngs/1/86/png-transparent-valorant-logo-thumbnail.png';
    if (n.includes('league') || n.includes('lol') || n.includes('ليج')) return 'https://w7.pngwing.com/pngs/194/481/png-transparent-league-of-legends-logo-computer-icons-video-game-logo-miscellaneous-game-leaf-thumbnail.png';
    if (n.includes('clash') || n.includes('كلاش')) return 'https://w7.pngwing.com/pngs/669/993/png-transparent-clash-of-clans-clash-royale-clash-of-kings-video-game-logo-thumbnail.png';
    if (n.includes('fortnite') || n.includes('فورتنايت')) return 'https://w7.pngwing.com/pngs/466/291/png-transparent-logo-fortnite-video-game-f-logo-game-angle-white-thumbnail.png';
    if (n.includes('fifa') || n.includes('فيفا') || n.includes('fc')) return 'https://w7.pngwing.com/pngs/403/612/png-transparent-fifa-18-fifa-17-fifa-interactive-world-cup-video-game-fifa-logo-text-trademark-sport-thumbnail.png';
    if (n.includes('ludo') || n.includes('لودو')) return 'https://w7.pngwing.com/pngs/160/288/png-transparent-ludo-king-board-game-android-dice-game-mankind-game-electronics-application-thumbnail.png';
    if (n.includes('tiktok') || n.includes('تيك توك')) return 'https://w7.pngwing.com/pngs/619/847/png-transparent-tiktok-logo-thumbnail.png';
    return 'https://img.freepik.com/premium-vector/joystick-neon-logo-design-template-gamer-neon-logo-concept-pro-gamer-logo-neon-vector-illustration_155165-154.jpg';
}

export async function renderTeamPublic() {
    const grid = document.getElementById('team-public-grid');
    if (!grid) return;

    try {
        grid.innerHTML = '<div class="text-center" style="width:100%; color:var(--text-secondary);"><i class="ph ph-spinner ph-spin"></i> جاري تحميل الفريق...</div>';
        const q = query(collection(db, "team_members"), orderBy("sortOrder", "asc"));
        const querySnapshot = await getDocs(q);

        const activeMembers = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.active !== false) {
                activeMembers.push({ id: docSnap.id, ...data });
            }
        });

        if (activeMembers.length === 0) {
            grid.innerHTML = '<div class="text-center" style="width:100%; color:var(--text-muted);">سيتم إضافة أعضاء الفريق قريباً.</div>';
            return;
        }

        grid.innerHTML = '';
        activeMembers.forEach((m) => {
            const card = document.createElement('div');
            card.className = 'glass-card text-center menu-card slide-in';
            card.style = "flex: 0 1 300px; padding: 0;";

            const imgUrl = m.imageBase64 || 'https://via.placeholder.com/200?text=Avatar';

            card.innerHTML = `
                    <div class="card-edge"></div>
                    <div class="card-inner" style="padding: 40px 20px;">
                        <div class="team-avatar-wrapper" style="margin-bottom: 20px; position: relative; display: inline-block;">
                            <img src="${imgUrl}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid var(--neon-red); box-shadow: 0 0 20px var(--neon-red-glow);">
                        </div>
                        <h2 style="font-size: 1.5rem; margin-bottom: 5px;">${m.name}</h2>
                        <div style="color: var(--neon-red); font-weight: 700; font-size: 0.9rem; margin-bottom: 15px; font-family: 'Orbitron', sans-serif; letter-spacing: 1px;">${m.role}</div>
                        <p class="text-muted" style="font-size: 0.95rem; line-height: 1.5;">${m.bio || ''}</p>
                    </div>
                `;
            grid.appendChild(card);
        });
    } catch (e) {
        console.error("Error loading team members", e);
        grid.innerHTML = '<div class="text-center" style="width:100%; color:var(--neon-red);">حدث خطأ أثناء تحميل الفريق.</div>';
    }
}

// Bind to window to allow legacy accessibility across routing
window.loadPublicData = loadPublicData;
window.renderTeamPublic = renderTeamPublic;
window.loadCountriesForService = loadCountriesForService;
window.openGameOptions = openGameOptions;
