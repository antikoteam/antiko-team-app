
const keys = [
    "az_live_71RyuxpeFMsJmQVVQBdNSC22lrs1aIrO"
];

async function testEndpoint(url) {
    console.log(`Testing: ${url}`);
    try {
        const res = await fetch(`${url}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${keys[0]}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: "hi" }]
            })
        });
        console.log(`Status for ${url}: ${res.status}`);
        const data = await res.json().catch(() => ({}));
        console.log("Response:", JSON.stringify(data).substring(0, 100));
    } catch (e) {
        console.error(`Error for ${url}: ${e.message}`);
    }
}

const endpoints = [
    "https://api.aizone.ai/v1",
    "https://api.aizone.cc/v1",
    "https://api.aizone.app/v1",
    "https://api.azy.ai/v1",
    "https://api.acy.ae/v1"
];

(async () => {
    for (const url of endpoints) {
        await testEndpoint(url);
    }
})();
