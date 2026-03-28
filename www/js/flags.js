/**
 * flags.js - Centralized Country Flag Utility for Antiko App
 */

/**
 * Converts a 2-letter ISO code to a Regional Indicator Symbol Emoji.
 * @param {string} countryCode - e.g., "SA", "EG"
 * @returns {string} - The Emoji flag character
 */
export function getFlagEmoji(countryCode) {
    if (!countryCode || (typeof countryCode !== 'string') || countryCode.length !== 2) return countryCode || "🏳️";
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    try {
        return String.fromCodePoint(...codePoints);
    } catch (e) {
        return countryCode.toUpperCase();
    }
}

/**
 * Checks if a flag URL or name refers to Israel for the custom flag requirement.
 */
export function isIsraelFlag(flagUrl, nameEn) {
    if (!flagUrl || typeof flagUrl !== 'string') return false;
    const n = flagUrl.toLowerCase();
    const e = nameEn ? nameEn.toLowerCase() : "";
    return n.includes('il.png') || n === '🇮🇱' || e.includes('israel') || n === 'il';
}

/**
 * Returns the HTML for a flag (Optimized for EMOJI look on all platforms).
 * @param {string} flagUrl - ISO code, Emoji, or Image URL
 * @param {number} width - Display width
 * @param {number} height - Display height
 * @param {string} fontSize - Font size
 * @returns {string} - The HTML string
 */
export function getFlagHtml(flagUrl, width = 64, height = 64, fontSize = '2.5rem') {
    // 1. Israel special case (Stripes)
    if (isIsraelFlag(flagUrl)) {
        const svg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 50'><rect width='80' height='50' fill='%23fff'/><rect y='8' width='80' height='10' fill='%230038b8'/><rect y='32' width='80' height='10' fill='%230038b8'/></svg>";
        return `<div class="flag-container glass-flag" style="width:${width}px; height:${height}px;">
                    <img src="${svg}" alt="Flag" style="width:70%; height:70%; object-fit:contain; border-radius:3px;">
                </div>`;
    }

    // 2. Detect Flag Emoji or ISO code
    let isoCode = null;
    if (flagUrl && typeof flagUrl === 'string') {
        const trimmed = flagUrl.trim().toUpperCase();
        if (trimmed.length === 2 && /^[A-Z]{2}$/.test(trimmed)) {
            isoCode = trimmed;
        } else {
            const cp0 = flagUrl.codePointAt(0);
            if (cp0 >= 0x1F1E6 && cp0 <= 0x1F1FF) {
                const char1 = String.fromCharCode(cp0 - 0x1F1E6 + 65);
                const cp1 = flagUrl.codePointAt(2);
                if (cp1 >= 0x1F1E6 && cp1 <= 0x1F1FF) {
                    const char2 = String.fromCharCode(cp1 - 0x1F1E6 + 65);
                    isoCode = char1 + char2;
                }
            }
        }
    }

    if (isoCode) {
        const cp1 = (isoCode.charCodeAt(0) - 65 + 0x1F1E6).toString(16).toLowerCase();
        const cp2 = (isoCode.charCodeAt(1) - 65 + 0x1F1E6).toString(16).toLowerCase();

        // Sources for consistent Emoji look
        const twemojiSvg = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${cp1}-${cp2}.svg`;
        const flagsApi = `https://flagsapi.com/${isoCode}/flat/64.png`;
        const nativeEmoji = getFlagEmoji(isoCode);

        return `
            <div class="flag-container glass-flag" style="width:${width}px; height:${height}px;">
                <img src="${twemojiSvg}" alt="${isoCode}" class="flag-img" 
                     onerror="this.src='${flagsApi}'; this.onerror=function(){this.style.display='none'; this.nextElementSibling.style.display='flex';};">
                <div class="flag-fallback" style="display:none; font-size:${fontSize};">${nativeEmoji}</div>
            </div>`;
    }

    // 3. Image URLs (External or Base64)
    if (flagUrl && (typeof flagUrl === 'string') && (flagUrl.startsWith('http') || flagUrl.startsWith('data:image'))) {
        return `
            <div class="flag-container glass-flag" style="width:${width}px; height:${height}px;">
                <img src="${flagUrl}" alt="Icon" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.innerHTML='🏳️';">
            </div>`;
    }

    // 4. Literal fallback
    const val = (flagUrl && flagUrl.length < 10) ? flagUrl : "🏳️";
    return `<div class="flag-container glass-flag" style="width:${width}px; height:${height}px; font-size:${fontSize};">${val}</div>`;
}

/**
 * Add Styles globally for flags
 */
const style = document.createElement('style');
style.textContent = `
    .flag-container {
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        transition: transform 0.3s ease;
    }
    .glass-flag {
        backdrop-filter: blur(5px);
    }
    .flag-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: drop-shadow(0 0 5px rgba(0,0,0,0.2));
    }
    .flag-fallback {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        line-height: 1;
    }
`;
document.head.appendChild(style);

// Support both Module and Legacy Global access
if (typeof window !== 'undefined') {
    window.FlagsHelper = { getFlagEmoji, isIsraelFlag, getFlagHtml };
}
