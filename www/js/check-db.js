import { db, collection, getDocs } from "./firebase-config.js";

async function checkBooks() {
    try {
        const querySnapshot = await getDocs(collection(db, "books_novels"));
        console.log(`Found ${querySnapshot.size} books:`);
        querySnapshot.forEach((doc) => {
            console.log(`${doc.id} => ${doc.data().nameAr || doc.data().name}`);
        });
    } catch (e) {
        console.error("Error checking books:", e);
    }
}

checkBooks();
