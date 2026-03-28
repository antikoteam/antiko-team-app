import { db, collection, getDocs, updateDoc, doc } from "./firebase-config.js";

async function fixTargetCollections() {
    console.log("Fixing critical target collections...");
    const snap = await getDocs(collection(db, "services"));
    for (const d of snap.docs) {
        const s = d.data();
        let target = s.targetCollection;

        if (s.slug === "whatsapp-numbers") target = "whatsapp_countries";
        if (s.slug === "telegram-numbers") target = "telegram_countries";
        if (s.slug === "books-novels") target = "books_novels";
        if (s.slug === "recharge-subscriptions") target = "recharge_subscriptions";
        if (s.slug === "bot-design") target = "bot_designs";
        if (s.slug === "game-design") target = "game_designs";
        if (s.slug === "websites-apps-design") target = "websites_apps_designs";

        if (target !== s.targetCollection) {
            await updateDoc(doc(db, "services", d.id), { targetCollection: target });
            console.log(`Fixed [${s.slug}] -> ${target}`);
        }
    }
    console.log("Fix complete!");
}

window.fixTargetCollections = fixTargetCollections;
