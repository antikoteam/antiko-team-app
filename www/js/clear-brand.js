
import { db, doc, setDoc } from "./firebase-config.js";

async function clearBrand() {
    console.log("Clearing site brand in database...");
    try {
        await setDoc(doc(db, "site_settings", "main"), { siteBrand: "" }, { merge: true });
        console.log("Successfully cleared site brand!");
    } catch (e) {
        console.error("Error clearing brand:", e);
    }
}

clearBrand();
