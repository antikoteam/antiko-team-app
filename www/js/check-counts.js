import { db, collection, getDocs } from "./firebase-config.js";

async function checkCounts() {
    const collections = ["whatsapp_countries", "whatsapp-countries", "countries", "services"];
    for (const c of collections) {
        try {
            const snap = await getDocs(collection(db, c));
            console.log(`Collection [${c}] count: ${snap.size}`);
        } catch (e) {
            console.log(`Collection [${c}] error or missing.`);
        }
    }
}

window.checkCounts = checkCounts;
