import { db } from "./firebase-config.js";
import { collection, getDocs, doc, setDoc } from "./firebase-config.js";

// Safe Native Platform Check - يشمل الـ Parent Frame
function getCapacitorBridge() {
    if (window.Capacitor) return window.Capacitor;
    if (window.parent && window.parent.Capacitor) return window.parent.Capacitor;
    if (window.top && window.top.Capacitor) return window.top.Capacitor;
    return null;
}

export function isNativePlatform() {
    const cap = getCapacitorBridge();
    if (!cap) return false;
    if (typeof cap.getPlatform === 'function') {
        return cap.getPlatform() !== 'web';
    }
    return typeof cap.isNativePlatform === 'function' ? cap.isNativePlatform() : false;
}
window.isNativePlatform = isNativePlatform;

// FCM Service Account credentials for Admin alerts
const _fcmSA = {
    project_id: "antiko-cb40b",
    client_email: "firebase-adminsdk-fbsvc@antiko-cb40b.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDj4kqbXU9e+qhg\n44ol71MZtQxOA+LgpQty+E4omionkc6ERmT7lJSB+xAfMuHhskiGXyXXQcKo15k9\naTgFP0WBFY/R61rh+Cqt1fJCmbKVzmcgcdmYGwbOa5Jiu6TPZXTq3XL8YVtPh481\nKO8SM2mSij7B30B7SvellioFUoTUSYbToy3enfw5aF8WOUpW6a0fEdedzfTUTONg\nuvy9YmYdSomzFRLec7km50VkcJT3Cvs/WT0ZVPSstJgZYRbl5exlQUhQUkuJtM7W\n7zPk5qNi/WfBVndjTW+DK4NVEflsEdB1J3A4EeD6/SJAGsOKttTHt//VhMSCJeOu\ng4C3X2IdAgMBAAECggEAAxHrq5X0hkgkZMQox2PaGXJ120bN7Sg8DcBbnGXRsJCU\nMo/L0RNw2e/Ub6v2g0OTTfNR/3x8aPYZAEzlFM9qTWSWRR+bE1VBDSN6bO93vb3q\nNMBj5cEwQWKnAugaC2ZuAbLNcRBf5wpH+x4O9NtQp+LV5c272o1csod7dgpLdAKp\n3EIkqF/GoeSjrvV1HUcjxAb7v8ceFAie2lVYTzPVJYG/OQHbIy5s4GlGm/HCIBMS\n4B9CHfjYD03Bv2GwyVDWY4lzOeKBmQrYZJPfITaSwB/gO1wRzSgUGc8VJEiqUR0S\nk7rPEYEzzNSXcYwaV1EjewoSC+UvV12BtRTllq1zTwKBgQD333GBasLEZlFcG62x\n4pLrD0ucMTtJapTVeoe3aGfga1lVCTXCSMWz6WwIMu5UuIyBVaezHYQqTApx2Ert\nCetGWEoiKeDJDFgGGciacAl4sBsTFxJYM5PaZ3pTxvJgSYsQR5zaYQWDAlo4dySD\n8GQmprMHwPMoFhiLH+8YMc+7DwKBgQDrWxGKyK/ePObxsq7VKRSMi7cad7eBpRKj\nwrXpWE0HYUABrIvLknja7ONa/qkON7WcY7mldmPnW+7/nwypjZGY3X0eSEWHYDWo\nwBbwl4qgpwvdXi6PgcI02ORCyfBV5piV5umpYQRGpkNStTtKLi0aWJa0LuMxgGwG\nEYzvpcOAEwKBgQCb1GR2WRjjAfQqNNho2alFj5MYObcs+41f/C0wN7n+U16Q4D5k\nyv1Hkvqw2NwOdQsYEDJin67ELJPwaGsKRE8eJUlN2wgPPOxlwXXk6YR61DPhN4L3\n4k0UZDN6Ubt0nyeG746Dl7UwXJ09nGFfdRRxXCF3QW1ciS+a31Of4UjYLwKBgQC/\nuQj6QG+bn4sWO1PWy0c1Ep+PTRTM5Lbhdj0QIGFncJ5efrvGksQmuzCeMLNwpIsq\nIcbadi3+C1MPIvaCrJN9rng9Eeyp0gMEO660QQ6pvkqZAx70wmR8/m47xhslLtr/\nygJwe1qrXsea+Y2Z6THOs3nYwBVNfusAqo1fr24pxwKBgAgS4fGWFUOxp3NnDxk7\njFKmk0EF7SdvK5mcwMjlq+GNgE1UT5I3qs6Y4tcp0stK1x0JNON1y+5uD2XrILm2\n02dKwNLG86tzlauB8Xo1jAFe5760Duf+VEs35d2MLaNYjmVn3WvUoUzRojF43t1B\n/kjNn0itFFnzD4eD1NUC96DD\n-----END PRIVATE KEY-----\n"
};
let _fcmTokenCache = null;
let _fcmTokenExpiry = 0;

async function _getFcmAccessToken() {
    const now = Math.floor(Date.now() / 1000);
    if (_fcmTokenCache && now < _fcmTokenExpiry - 60) return _fcmTokenCache;
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" })).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    const claims = btoa(JSON.stringify({ iss: _fcmSA.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now })).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    const cleanPem = _fcmSA.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
    const binaryDer = Uint8Array.from(atob(cleanPem), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey('pkcs8', binaryDer.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    const jwt = `${header}.${claims}.${sigB64}`;
    const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}` });
    const data = await res.json();
    _fcmTokenCache = data.access_token;
    _fcmTokenExpiry = now + (data.expires_in || 3600);
    return _fcmTokenCache;
}

async function _sendFcmToToken(token, title, body) {
    try {
        const accessToken = await _getFcmAccessToken();
        await fetch(`https://fcm.googleapis.com/v1/projects/${_fcmSA.project_id}/messages:send`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: { token, android: { priority: "high" }, data: { title, body } } })
        });
    } catch(e) { console.warn("_sendFcmToToken error:", e); }
}

// Send FCM notification to all admins (used when user sends support message)
export async function notifyAdmins(title, body) {
    try {
        const adminList = [
            "karemkoko257koko@gmail.com", "omaranter.abdallah@gmail.com",
            "antiko.cb40b@gmail.com", "admin257@gmail.com",
            "kareem9989193@gmail.com", "zyadwzyry0@gmail.com",
            "b35435573@gmail.com", "rsam64833@gmail.com",
            "faresmanee3@gmail.com", "ferrohq1@gmail.com"
        ];
        const snap = await getDocs(collection(db, "users"));
        const promises = [];
        snap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.fcmToken && data.email && adminList.includes(data.email.toLowerCase())) {
                promises.push(_sendFcmToToken(data.fcmToken, title, body));
            }
        });
        await Promise.all(promises);
        console.log(`Admin notifications sent to ${promises.length} admin(s).`);
    } catch(e) { console.warn("notifyAdmins error:", e); }
}

// Native Notification Helper - يستخدم postMessage bridge لضمان الوصول للـ Native Layer
export function sendNativeNotification(title, body) {
    try {
        const settings = JSON.parse(localStorage.getItem('antiko_settings')) || {};
        if (settings.notificationsEnabled === false) return;
    } catch(e) {}

    const isNative = isNativePlatform();

    if (isNative) {
        // ✅ استخدام postMessage bridge للـ Parent Frame
        const target = window.parent !== window ? window.parent : window;
        target.postMessage({ type: 'ANTIKO_SHOW_NOTIFICATION', title, body }, '*');
        return;
    }

    // Web fallback: use Web Notification API
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: 'assets/icon.png' });
        return;
    }

    // Last resort: in-app toast
    if (typeof window.showToast === 'function') {
        window.showToast(`🔔 ${title}: ${body}`, 'success');
    }
}
window.sendNativeNotification = sendNativeNotification;

// Setup user notifications - يستخدم postMessage bridge للحصول على FCM Token
export function setupUserNotifications(user) {
    if (!user) return;
    const isNative = isNativePlatform();
    if (!isNative) return;

    const saveToken = (token) => {
        if (!token) return;
        console.log("Saving FCM token:", token.substring(0, 20) + "...");
        setDoc(doc(db, "users", user.uid), {
            fcmToken: token,
            email: user.email || ""
        }, { merge: true }).then(() => {
            console.log("FCM Token saved to Firestore OK.");
        }).catch(err => {
            console.error("Error saving token:", err);
        });
    };

    // طلب FCM Token عبر postMessage bridge (لأن الـ Plugin Promises تعلق في الـ iframe)
    const target = window.parent !== window ? window.parent : window;

    const timer = setTimeout(() => {
        window.removeEventListener('message', tokenHandler);
        console.warn('FCM token request timed out');
    }, 15000);

    function tokenHandler(event) {
        if (!event.data || event.data.type !== 'ANTIKO_FCM_TOKEN_RESULT') return;
        clearTimeout(timer);
        window.removeEventListener('message', tokenHandler);
        if (event.data.token) {
            saveToken(event.data.token);
        } else {
            console.warn('No FCM token returned:', event.data.error);
        }
    }

    window.addEventListener('message', tokenHandler);
    target.postMessage({ type: 'ANTIKO_GET_FCM_TOKEN' }, '*');
}
