import { db, getDoc, doc } from "./www/js/firebase-config.js";
(async () => {
    try {
        const snap = await getDoc(doc(db, "settings", "ai_config"));
        if (snap.exists()) {
            console.log("AI Config:", JSON.stringify(snap.data(), null, 2));
        } else {
            console.log("AI Config document not found.");
        }
    } catch (e) {
        console.error("Error reading AI Config:", e);
    }
})();
