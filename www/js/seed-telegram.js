import { db, setDoc, doc, collection, getDocs, deleteDoc } from "./firebase-config.js";

const telegramData = [
    { name: "ميانمار", flag: "mm", price: 50 },
    { name: "مصر", flag: "eg", price: 60 },
    { name: "ج أفريقيا", flag: "za", price: 60 },
    { name: "فيتنام", flag: "vn", price: 60 },
    { name: "المغرب", flag: "ma", price: 60 },
    { name: "اندونيسيا", flag: "id", price: 60 },
    { name: "الجزائر", flag: "dz", price: 60 },
    { name: "نيبال", flag: "np", price: 60 },
    { name: "كينيا", flag: "ke", price: 60 },
    { name: "باكستان", flag: "pk", price: 60 },
    { name: "كندا", flag: "ca", price: 60 },
    { name: "امريكا", flag: "us", price: 60 },
    { name: "بولندا", flag: "pl", price: 65 },
    { name: "ج أفريقيا ط", flag: "cf", price: 65 },
    { name: "ايران", flag: "ir", price: 65 },
    { name: "انغولا", flag: "ao", price: 65 },
    { name: "موزمبيق", flag: "mz", price: 65 },
    { name: "انجلترا", flag: "gb", price: 65 },
    { name: "النيجر", flag: "ne", price: 70 },
    { name: "الفلبين", flag: "ph", price: 70 },
    { name: "بورتوريكو", flag: "pr", price: 70 },
    { name: "افغانستان", flag: "af", price: 70 },
    { name: "ماليزيا", flag: "my", price: 70 },
    { name: "ترينيداد", flag: "tt", price: 70 },
    { name: "تشيلي", flag: "cl", price: 70 },
    { name: "سريلانكا", flag: "lk", price: 75 },
    { name: "تونس", flag: "tn", price: 75 },
    { name: "فنلندا", flag: "fi", price: 75 },
    { name: "إسواتيني", flag: "sz", price: 80 },
    { name: "برمودا", flag: "bm", price: 80 },
    { name: "سوريا", flag: "sy", price: 80 },
    { name: "غوام", flag: "gu", price: 80 },
    { name: "غانا", flag: "gh", price: 80 },
    { name: "لوكسمبورغ", flag: "lu", price: 80 },
    { name: "الدومينيكان", flag: "do", price: 80 },
    { name: "كولومبيا", flag: "co", price: 80 },
    { name: "سيراليون", flag: "sl", price: 80 },
    { name: "كوبا", flag: "cu", price: 80 },
    { name: "كوستاريكا", flag: "cr", price: 80 },
    { name: "غوادلوب", flag: "gp", price: 80 },
    { name: "اوزبكستان", flag: "uz", price: 85 },
    { name: "جزر سليمان", flag: "sb", price: 85 },
    { name: "جيبوتي", flag: "dj", price: 85 },
    { name: "موريتانيا", flag: "mr", price: 85 },
    { name: "غيانا", flag: "gy", price: 85 },
    { name: "جامايكا", flag: "jm", price: 85 },
    { name: "الأرجنتين", flag: "ar", price: 85 },
    { name: "اليمن", flag: "ye", price: 85 },
    { name: "الإكوادور", flag: "ec", price: 95 },
    { name: "تيمور الشرقية", flag: "tl", price: 95 },
    { name: "اذربيجان", flag: "az", price: 95 },
    { name: "تركمانستان", flag: "tm", price: 95 },
    { name: "جزر القمر", flag: "km", price: 95 },
    { name: "السودان", flag: "sd", price: 95 },
    { name: "لاوس", flag: "la", price: 95 },
    { name: "بيرو", flag: "pe", price: 95 },
    { name: "إخرائيل💩", flag: "il", price: 95 },
    { name: "جنوب السودان", flag: "ss", price: 95 },
    { name: "فنزويلا", flag: "ve", price: 100 },
    { name: "طاجيكستان", flag: "tj", price: 100 },
    { name: "العراق", flag: "iq", price: 100 },
    { name: "البرازيل", flag: "br", price: 100 },
    { name: "السويد", flag: "se", price: 100 },
    { name: "تركيا", flag: "tr", price: 100 },
    { name: "هايتي", flag: "ht", price: 100 },
    { name: "قرغيزستان", flag: "kg", price: 100 },
    { name: "الغرينادين", flag: "vc", price: 100 },
    { name: "الأخضر", flag: "cv", price: 100 },
    { name: "موريشيوسي", flag: "mu", price: 100 },
    { name: "سانت لوسيا", flag: "lc", price: 100 },
    { name: "ليسوتو", flag: "ls", price: 100 },
    { name: "سورينام", flag: "sr", price: 100 },
    { name: "بلغاريا", flag: "bg", price: 100 },
    { name: "المكسيك", flag: "mx", price: 100 },
    { name: "صربيا", flag: "rs", price: 100 },
    { name: "نيكاراغوا", flag: "ni", price: 100 },
    { name: "السلفادور", flag: "sv", price: 100 },
    { name: "الصومال", flag: "so", price: 100 },
    { name: "هندوراس", flag: "hn", price: 100 },
    { name: "غواتيمالا", flag: "gt", price: 100 },
    { name: "رومانيا", flag: "ro", price: 100 },
    { name: "منغوليا", flag: "mn", price: 100 },
    { name: "مالاوي", flag: "mw", price: 100 },
    { name: "بابوا", flag: "pg", price: 110 },
    { name: "ساموا", flag: "ws", price: 110 },
    { name: "النمسا", flag: "at", price: 110 },
    { name: "فيجي", flag: "fj", price: 110 },
    { name: "السعودية", flag: "sa", price: 110 },
    { name: "برينسيب", flag: "st", price: 110 },
    { name: "أوكرانيا", flag: "ua", price: 110 },
    { name: "بليز", flag: "bz", price: 110 },
    { name: "فلسطين", flag: "ps", price: 110 },
    { name: "هونغ كونغ", flag: "hk", price: 110 },
    { name: "الصين", flag: "cn", price: 110 },
    { name: "مولدوفا", flag: "md", price: 110 },
    { name: "لبنان", flag: "lb", price: 130 },
    { name: "هولندا", flag: "nl", price: 130 },
    { name: "سلوفينيا", flag: "si", price: 130 },
    { name: "كازاخستان", flag: "kz", price: 130 },
    { name: "اليونان", flag: "gr", price: 130 },
    { name: "المالديف", flag: "mv", price: 130 },
    { name: "ألمانيا", flag: "de", price: 130 },
    { name: "ألبانيا", flag: "al", price: 130 },
    { name: "اليابان", flag: "jp", price: 130 },
    { name: "ماكاو", flag: "mo", price: 160 },
    { name: "نيوزيلندا", flag: "nz", price: 160 },
    { name: "الأردن", flag: "jo", price: 160 },
    { name: "البرتغال", flag: "pt", price: 180 },
    { name: "الإمارات", flag: "ae", price: 200 },
    { name: "ايطاليا", flag: "it", price: 210 },
    { name: "اسبانيا", flag: "es", price: 210 },
    { name: "النرويج", flag: "no", price: 200 },
    { name: "فرنسا", flag: "fr", price: 200 },
    { name: "سنغافورة", flag: "sg", price: 200 },
    { name: "الدنمارك", flag: "dk", price: 230 },
    { name: "عمان", flag: "om", price: 230 },
    { name: "الكويت", flag: "kw", price: 370 }
];

export async function seedTelegram() {
    console.log("Starting Telegram Seeding...");

    // 1. Cleanup old telegram countries
    try {
        const snapshot = await getDocs(collection(db, "telegram_countries"));
        for (const d of snapshot.docs) {
            await deleteDoc(doc(db, "telegram_countries", d.id));
        }
        console.log("Cleanup finished.");
    } catch (e) {
        console.error("Cleanup error:", e);
    }

    // 2. Add new data (Fixed IDs to prevent duplicates)
    for (let i = 0; i < telegramData.length; i++) {
        const item = telegramData[i];
        const countryId = `tg_${item.flag.toLowerCase()}`;

        await setDoc(doc(db, "telegram_countries", countryId), {
            nameAr: item.name,
            flagUrl: item.flag, // Store ISO code
            price: item.price,
            currency: "ج.م",
            active: true,
            sortOrder: i + 1,
            timestamp: Date.now()
        });
    }

    // 3. Ensure Telegram Service is correctly configured
    await setDoc(doc(db, "services", "telegram-numbers"), {
        titleAr: "أرقام تيليجرام",
        slug: "telegram-numbers",
        icon: "telegram-logo",
        color: "#0088cc",
        active: true,
        targetCollection: "telegram_countries",
        sortOrder: 3
    }, { merge: true });

    console.log("Telegram Seeding Finished! ✅");
    alert("تم تحديث أسعار أرقام التيليجرام بنجاح! 🚀");
}
