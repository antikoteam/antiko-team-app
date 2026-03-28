
const keys = [
    "az_live_71RyuxpeFMsJmQVVQBdNSC22lrs1aIrO",
    "az_live_JNXHEr1oitV5iRZjLgJPRdiRMKbLpEo3",
    "az_live_hzictG9sMj0jkyJSQygr0XWPmh3uttOt"
];

async function testKey(key) {
    console.log(`Testing key: ${key}`);
    try {
        const res = await fetch("https://azy.rest/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`
            },
            body: JSON.stringify({
                model: "gemini-1.5-flash",
                messages: [{ role: "user", content: "hi" }]
            })
        });
        const data = await res.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    }
}

testKey(keys[0]);
