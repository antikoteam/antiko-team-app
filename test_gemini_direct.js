async function testGemini() {
    const key = "AIzaSyDYHJtZiA753kY0CBj5Dsd1EUrfVKStG_I";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: "hi" }] }]
            })
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Test failed:", e.message);
    }
}
testGemini();
