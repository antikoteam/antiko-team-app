import { db, setDoc, doc, collection, getDocs, deleteDoc } from "./firebase-config.js";

const whatsappData = [
    { name: "السعودية", flag: "sa", price: 90 },
    { name: "كندا", flag: "ca", price: 70 },
    { name: "امريكا", flag: "us", price: 70 },
    { name: "المغرب", flag: "ma", price: 60 },
    { name: "اليمن", flag: "ye", price: 60 },
    { name: "الكويت", flag: "kw", price: 60 },
    { name: "إسرائيل", flag: "il", price: 60 },
    { name: "الأردن", flag: "jo", price: 60 },
    { name: "فيتنام", flag: "vn", price: 60 },
    { name: "مصر", flag: "eg", price: 60 },
    { name: "تايلاند", flag: "th", price: 50 },
    { name: "فرنسا", flag: "fr", price: 50 },
    { name: "الفلبين", flag: "ph", price: 50 },
    { name: "اندونيسيا", flag: "id", price: 50 },
    { name: "البرتغال", flag: "pt", price: 50 },
    { name: "البرازيل", flag: "br", price: 50 },
    { name: "انجلترا", flag: "gb", price: 50 },
    { name: "اليابان", flag: "jp", price: 50 },
    { name: "كولومبيا", flag: "co", price: 50 },
    { name: "عمان", flag: "om", price: 50 },
    { name: "لإمارات", flag: "ae", price: 50 },
    { name: "تركيا", flag: "tr", price: 50 }
];

export async function seedWhatsapp() {
    const btn = document.getElementById('seed-whatsapp-btn');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> جاري التحديث...';

    for (let i = 0; i < whatsappData.length; i++) {
        const item = whatsappData[i];
        const docId = `wa_${item.flag.toLowerCase()}`;
        const data = {
            nameAr: item.name,
            nameEn: item.name,
            price: item.price,
            currency: "ج.م",
            flagUrl: item.flag.toLowerCase(), // Store ISO code ONLY (Pattern like Telegram)
            active: true,
            sortOrder: i + 1
        };
        await setDoc(doc(db, "whatsapp_countries", docId), data);
    }

    // GUARANTEE: Sync the service document targetCollection
    await setDoc(doc(db, "services", "whatsapp-numbers"), {
        targetCollection: "whatsapp_countries"
    }, { merge: true });

    alert("تم تحديث أرقام الواتساب بنجاح!");
    window.location.reload();
}

window.seedWhatsapp = seedWhatsapp;
