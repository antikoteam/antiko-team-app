import { db, collection, setDoc, doc, getDocs } from "./firebase-config.js";

const initialCountries = [
    { nameAr: "السعودية", nameEn: "Saudi Arabia", price: 90, currency: "ج.م", flagUrl: "🇸🇦", sortOrder: 1, active: true },
    { nameAr: "كندا", nameEn: "Canada", price: 70, currency: "ج.م", flagUrl: "🇨🇦", sortOrder: 2, active: true },
    { nameAr: "امريكا", nameEn: "USA", price: 70, currency: "ج.م", flagUrl: "🇺🇸", sortOrder: 3, active: true },
    { nameAr: "المغرب", nameEn: "Morocco", price: 60, currency: "ج.م", flagUrl: "🇲🇦", sortOrder: 4, active: true },
    { nameAr: "اليمن", nameEn: "Yemen", price: 60, currency: "ج.م", flagUrl: "🇾🇪", sortOrder: 5, active: true },
    { nameAr: "الكويت", nameEn: "Kuwait", price: 60, currency: "ج.م", flagUrl: "🇰🇼", sortOrder: 6, active: true },
    { nameAr: "إسرائيل", nameEn: "Israel", price: 60, currency: "ج.م", flagUrl: "🇮🇱", sortOrder: 7, active: true },
    { nameAr: "الأردن", nameEn: "Jordan", price: 60, currency: "ج.م", flagUrl: "🇯🇴", sortOrder: 8, active: true },
    { nameAr: "فيتنام", nameEn: "Vietnam", price: 60, currency: "ج.م", flagUrl: "🇻🇳", sortOrder: 9, active: true },
    { nameAr: "مصر", nameEn: "Egypt", price: 60, currency: "ج.م", flagUrl: "eg", sortOrder: 10, active: true },
    { nameAr: "تايلاند", nameEn: "Thailand", price: 50, currency: "ج.م", flagUrl: "🇹🇭", sortOrder: 11, active: true },
    { nameAr: "فرنسا", nameEn: "France", price: 50, currency: "ج.م", flagUrl: "🇫🇷", sortOrder: 12, active: true },
    { nameAr: "الفلبين", nameEn: "Philippines", price: 50, currency: "ج.م", flagUrl: "🇵🇭", sortOrder: 13, active: true },
    { nameAr: "اندونيسيا", nameEn: "Indonesia", price: 50, currency: "ج.م", flagUrl: "🇮🇩", sortOrder: 14, active: true },
    { nameAr: "البرتغال", nameEn: "Portugal", price: 50, currency: "ج.م", flagUrl: "🇵🇹", sortOrder: 15, active: true },
    { nameAr: "البرازيل", nameEn: "Brazil", price: 50, currency: "ج.م", flagUrl: "🇧🇷", sortOrder: 16, active: true },
    { nameAr: "انجلترا", nameEn: "England", price: 50, currency: "ج.م", flagUrl: "🇬🇧", sortOrder: 17, active: true },
    { nameAr: "اليابان", nameEn: "Japan", price: 50, currency: "ج.م", flagUrl: "🇯🇵", sortOrder: 18, active: true },
    { nameAr: "كولومبيا", nameEn: "Colombia", price: 50, currency: "ج.م", flagUrl: "🇨🇴", sortOrder: 19, active: true },
    { nameAr: "عمان", nameEn: "Oman", price: 50, currency: "ج.م", flagUrl: "🇴🇲", sortOrder: 20, active: true },
    { nameAr: "لإمارات", nameEn: "UAE", price: 50, currency: "ج.م", flagUrl: "🇦🇪", sortOrder: 21, active: true },
    { nameAr: "تركيا", nameEn: "Turkey", price: 50, currency: "ج.م", flagUrl: "🇹🇷", sortOrder: 22, active: true }
];

const initialServices = [
    {
        titleAr: "أرقام واتس أب",
        slug: "whatsapp-numbers",
        descriptionAr: "اختر الدولة المناسبة وابدأ",
        icon: "whatsapp-logo",
        color: "#25D366",
        active: true,
        sortOrder: 1,
        targetCollection: "whatsapp_countries",
        showBanner: true,
        bannerText: "نوفر لكم أرقام واتس أب لجميع الدول وبأرخص الأسعار"
    },
    {
        titleAr: "أرقام تيليجرام",
        slug: "telegram-numbers",
        descriptionAr: "أرقام لتفعيل حسابات تيليجرام",
        icon: "telegram-logo",
        color: "#0088cc",
        active: true,
        sortOrder: 2,
        targetCollection: "telegram_countries",
        showBanner: true,
        bannerText: "أرقام تيليجرام مميزة وحصرية لجميع الدول"
    },
    {
        titleAr: "الروايات",
        slug: "books-novels",
        descriptionAr: "أفضل الروايات الحصرية",
        icon: "book-open",
        color: "#ff9900",
        active: true,
        sortOrder: 3,
        targetCollection: "books_novels",
        showBanner: true,
        bannerText: "أفضل الروايات العربية والعالمية الحصرية"
    },
    {
        titleAr: "شحن واشتراكات",
        slug: "recharge-subscriptions",
        descriptionAr: "شحن ألعاب، بطاقات واشتراكات متنوعة",
        icon: "credit-card",
        color: "#007bff",
        active: true,
        sortOrder: 4,
        targetCollection: "recharge_subscriptions",
        showBanner: true,
        bannerText: "اشحن ألعابك المفضلة واحصل على اشتراكات بريميوم"
    },
    {
        titleAr: "تصميم بوتات",
        slug: "bot-design",
        descriptionAr: "خدمات تصميم وبرمجة بوتات متطورة",
        icon: "robot",
        color: "#ff003c",
        active: true,
        sortOrder: 5,
        targetCollection: "bot_designs",
        showBanner: true,
        bannerText: "نصمم لك أقوى البوتات البرمجية لكل المنصات"
    },
    {
        titleAr: "تصميم ألعاب",
        slug: "game-design",
        descriptionAr: "تصميم وتطوير ألعاب مخصصة باحترافية",
        icon: "game-controller",
        color: "#6f42c1",
        active: true,
        sortOrder: 6,
        targetCollection: "game_designs",
        showBanner: true,
        bannerText: "نصمم لك لعبتك الخاصة بأعلى كفاءة"
    },
    {
        titleAr: "مواقع وتطبيقات",
        slug: "websites-apps-design",
        descriptionAr: "تصميم وتطوير مواقع الويب وتطبيقات الموبايل",
        icon: "browser",
        color: "#fd7e14",
        active: true,
        sortOrder: 7,
        targetCollection: "websites_apps_designs",
        showBanner: true,
        bannerText: "مواقعك وتطبيقاتك بلمسة فنية مدروسة"
    }
];

const initialSiteSettings = {
    siteBrand: 'أنتيكو تيم',
    heroTopText: 'نظام أنتيكو الرقمي الموحد',
    heroTitle: 'ANTIKO',
    heroSubtitle: 'فخامة الخدمات الرقمية بين يديك',
    teamCardTitle: 'عائلة أنتيكو',
    teamCardSub: 'تحت سقف واحد نخدمكم',
    storeCardTitle: 'المتجر الرسمي',
    storeCardSub: 'تسوق أفضل الخدمات الرقمية',
    showMainAnnounce: true,
    mainAnnounceText: 'أهلاً بكم في تطبيق أنتيكو تيم الرسمي! استمتعوا بأحدث العروض والخدمات الآن.'
};

const initialTeamMembers = [
    {
        name: "ميسا",
        role: "صاحب المتجر",
        bio: "مؤسس ميسا ستور والقائم على إدارته",
        imageBase64: "", // Placeholder
        active: true,
        sortOrder: 1
    }
];

const initialProjectDesigns = [
    {
        nameAr: "تصميم تطبيق متجر",
        nameEn: "Store App Design",
        price: 500,
        currency: "ج.م",
        active: true,
        sortOrder: 1
    }
];

const initialBotDesigns = [
    {
        nameAr: "بوت تواصل آلي",
        nameEn: "Auto Contact Bot",
        price: 300,
        currency: "ج.م",
        active: true,
        sortOrder: 1
    }
];

const initialGameDesigns = [
    {
        nameAr: "تصميم لعبة RPG",
        nameEn: "RPG Game Design",
        price: 1500,
        currency: "ج.م",
        active: true,
        sortOrder: 1
    }
];

const initialUnbanNumbers = [
    {
        nameAr: "فك حظر واتساب",
        nameEn: "Whatsapp Unban",
        price: 100,
        currency: "ج.م",
        active: true,
        sortOrder: 1
    }
];

document.addEventListener('DOMContentLoaded', () => {
    const initBtn = document.getElementById('init-db-btn');
    if (!initBtn) return;

    initBtn.addEventListener('click', async () => {
        const originalText = initBtn.innerHTML;
        initBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> جاري التهيئة...';
        initBtn.disabled = true;

        try {
            // Confirm with user
            const snap = await getDocs(collection(db, "site_settings"));
            if (!snap.empty) {
                if (!confirm('يبدو أن هناك بيانات موجودة بالفعل في قاعدة البيانات. الاستمرار سيؤدي إلى إضافة النسخ الافتراضية أيضاً. هل تريد المتابعة؟')) {
                    initBtn.innerHTML = originalText;
                    initBtn.disabled = false;
                    return;
                }
            }

            // 1. Site Settings
            await setDoc(doc(db, "site_settings", "main"), initialSiteSettings, { merge: true });

            // 2. Services
            for (const s of initialServices) {
                await setDoc(doc(db, "services", s.slug), s, { merge: true });
            }

            // 3. Countries (WhatsApp)
            for (let i = 0; i < initialCountries.length; i++) {
                const c = initialCountries[i];
                await setDoc(doc(db, "whatsapp_countries", `init_wa_${i}`), c, { merge: true });
            }

            // 4. Team Members
            for (const t of initialTeamMembers) {
                await setDoc(doc(db, "team_members", t.name.toLowerCase()), t, { merge: true });
            }

            // 5. Initial Data for sections
            for (const p of initialProjectDesigns) {
                await setDoc(doc(db, "project_designs", `init_pd_0`), p, { merge: true });
            }

            for (const b of initialBotDesigns) {
                await setDoc(doc(db, "bot_designs", `init_bd_0`), b, { merge: true });
            }

            for (const g of initialGameDesigns) {
                await setDoc(doc(db, "game_designs", `init_gd_0`), g, { merge: true });
            }

            alert('تم تهيئة قاعدة البيانات بنجاح!');
            window.location.reload();

        } catch (error) {
            console.error("Init Error:", error);
            alert("حدث خطأ أثناء التهيئة");
        } finally {
            initBtn.innerHTML = originalText;
            initBtn.disabled = false;
        }
    });
});
