function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return countryCode;
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

console.log('SA:', getFlagEmoji('SA'));
console.log('EG:', getFlagEmoji('EG'));
console.log('US:', getFlagEmoji('US'));
console.log('Emoji RU (len):', '🇷🇺'.length);
