import { db, setDoc, doc } from "./firebase-config.js";

async function addMissingServices() {
    const services = [
        {
            titleAr: "الروايات",
            slug: "books-novels",
            descriptionAr: "أفضل الروايات الحصرية",
            icon: "book-open",
            color: "#ff9900",
            active: true,
            sortOrder: 1,
            targetCollection: "books_novels",
            showBanner: true,
            bannerText: "مجموعة جديدة من الروايات وصلت مؤخراً!"
        },
        {
            titleAr: "أرقام واتس أب",
            slug: "whatsapp-numbers",
            descriptionAr: "اختر الدولة المناسبة وابدأ",
            icon: "whatsapp-logo",
            color: "#25D366",
            active: true,
            sortOrder: 2,
            targetCollection: "whatsapp_countries",
            showBanner: true,
            bannerText: "نظام آلي 100% لتفعيل أرقام واتساب"
        },
        {
            titleAr: "أرقام تيليجرام",
            slug: "telegram-numbers",
            descriptionAr: "أرقام لتفعيل حسابات تيليجرام",
            icon: "telegram-logo",
            color: "#0088cc",
            active: true,
            sortOrder: 3,
            targetCollection: "telegram_countries",
            showBanner: true,
            bannerText: "أفضل الأرقام الروسية والخليجية للتيليجرام"
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
            bannerText: "شحن شدات واكتيفات لمختلف الألعاب العالمية"
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
            bannerText: "نصمم لك البوت الذي تحرّم القوانين منافسته!"
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
            bannerText: "خصم خاص على تصميم الألعاب هذا الشهر!"
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
            bannerText: "نصمم لك حلمك باحترافية وسرعة فائقة"
        }
    ];

    const initialRecharges = [];
    // User wants to add their own items from the dashboard.
    console.log("Recharge service added/updated. Skipping auto-seeding of items as requested.");

    console.log("Adding/Deleting services...");

    try {
        const { getDocs, collection, deleteDoc } = await import("./firebase-config.js");
        const snapshot = await getDocs(collection(db, "services"));
        const allowedSlugs = services.map(s => s.slug);

        for (const docSnap of snapshot.docs) {
            if (!allowedSlugs.includes(docSnap.id)) {
                await deleteDoc(doc(db, "services", docSnap.id));
                console.log(`Deleted service: ${docSnap.id}`);
            }
        }
    } catch (err) {
        console.error("Cleanup error:", err);
    }
    for (const s of services) {
        try {
            await setDoc(doc(db, "services", s.slug), s, { merge: true });
            console.log(`Successfully added/updated: ${s.titleAr}`);
        } catch (e) {
            console.error(`Error adding ${s.slug}:`, e);
        }
    }

    console.log("Seeding process finished!");
}

// Do NOT call this automatically as it will overwrite user edits on every refresh
// addMissingServices();

window.runSeeding = addMissingServices;
