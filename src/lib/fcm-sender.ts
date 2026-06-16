/**
 * FCM Direct Sender - Sends FCM push notifications directly from the client
 * using the Google OAuth2 + FCM HTTP v1 API.
 *
 * This module is needed because both apps use `output: "export"` (static export)
 * for Capacitor, which means API routes (/api/send-push) are NOT available at runtime.
 * Without this, FCM push notifications never get sent when the app runs as an APK.
 */

// Service account credentials (needed for FCM HTTP v1 API authentication)
const SERVICE_ACCOUNT = {
  clientEmail: 'firebase-adminsdk-fbsvc@southern-portfolio.iam.gserviceaccount.com',
  projectId: 'southern-portfolio',
  privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDSoLSizxsLvnqq
KejwDJshZvJwwS1a6DKvw2whJhjMXrwXqOE8xELjF/0ewv4vBNSjP6l+oJrHSsCs
4UwZY8wbPAe40lsICuBVcdme7KSMjNf/aEBDISlPdK/OMZ2iKaPZews14PFGQTz1
VWySMXCdW8egzxyqPS+kay2VFhC/rxU7zfFYvTJQ6jJnTyjOQIAEl293A7HERLEU
MBeyTNdHguIMRWF+CF141dCRoPhX7IMyhweeSTdFfigDgs6gg5NVzljBEwF/uHQY
LAjGDZQmVCLAvauTfy4z7Jo6mAtNMXbEk5dba6xwPFAJ09L3OPNNWOYqzZ0+Vj8J
amUqbEStAgMBAAECggEAELNub0RlvBon5ss47aPKPy1HBvrCSmWD81zW+4/mQno2
hte8uFFFjnUt/Fzww7Cp3aHkIibA7xF10p9wpci8e+JYKGcBkdMu84d5/nh8Garn
S5isE8aS3Hp/oCVd/ug3VjzD6EtERlJQ75EM8VCbQdbvrsgNWVBNsUdQT3R28oPe
IBHopgkyDvQNA20DIPanEygKVkS1qYif5YeDQmNnM3Qt2fxd+v/mo93PxVpEX17q
RP7B5m1eppwLpp1HXiHU59QddSzYeQLVpbE9YficRzJoQTYwgiDsYrxVJEaYDPFO
oymreBxsk92jJ0Qur0l0KhqFIiPADuP8NLQPbYbx/wKBgQDul1P1D1fU4LFQkKgc
ObCpYCfdJU/wuiUzDRbJmWllpURKMQWHne21XBgURsvqKqUCgQUtmFn2O7jwpIb9
Dr+tOsqvHgr6rxZS1KFURX7ASexcYSqvkWdRFcqFb0A4zKlP9ibelbS5M6Dw8vBI
ZtupZcN08Hg8xq/8tE+kkxf2UwKBgQDh/wvrSxpuDr+FqrU1t4aARHbJ/y7LTJDg
bMJp9foZ0+7efieKfj9HDJXARkxP7/sWYuF0FkbkB2Vil52zZk372P/njBvSzKC3
1nPRe83l08AbhSpP9n6zlJPWcgpjT8R+9zM5aUaxZ+Y6Hx++g6XCIWLJjNs3mJSL
QiY/vK14/wKBgQDUnLOrYJXTVLuN4Kp+JIaiGNbNQe+/xBFcMeDJm9UJSEHXn2Gf
HYPzpnKqtwAF1ySeW5ziqa4ZN9UxVFwaa6cxVn/Bl5MPGzFYdLSjJR6zeeyP0eK4
+2jHIBUN3TqsouyKHf87QMsActqLfOHUkxxSEyYfMh7jgebX2VJThOTIkwKBgQCY
orCDJ0Nfh9h0x9oBwMU3xoXQYehR6JGE8g/QjxBu90PCw8Oi9yd3rhlKNnB+IOAd
u4T36b/RbOld0HbzXqpW6bXUxj1Yf1ohL9cjahGjIwQB0kvEm//w++1pjbZUYuCc
vAq9wMu9MCY/pRvEiZefaPsWk2rPvt68u12n+J/VMwKBgQDkQjAfYVIUL0f9edOm
Q0kV5I30RyZiIN7LJIiSfiWH31cm/06V4J977RKZtHoJuNDRA8VNHh5D4n+jJfUH
jfRRZtdkO/QuKVPFHMRQ0oVJ1OetIY5fRl7BFlNfCTIRgTuLcVfaBA3AvLrB1bNh
6wokHdu6OPa3b8ulkZwQ2ER7Sw==
-----END PRIVATE KEY-----`,
};

// Cache the access token to avoid requesting a new one on every call
let cachedAccessToken: string | null = null;
let tokenExpiry = 0;

/**
 * Convert a PEM private key to an ArrayBuffer for Web Crypto API
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Get a Google OAuth2 access token using JWT assertion
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedAccessToken && Date.now() < tokenExpiry - 300000) {
    return cachedAccessToken;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: SERVICE_ACCOUNT.clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  // Encode header and payload
  const base64url = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  const headerB64 = base64url(header);
  const payloadB64 = base64url(payload);
  const headerPayload = `${headerB64}.${payloadB64}`;

  // Import the private key
  const keyBuffer = pemToArrayBuffer(SERVICE_ACCOUNT.privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the JWT
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(headerPayload)
  );

  // Convert signature to base64url
  const signatureArray = new Uint8Array(signature);
  let signatureB64 = btoa(String.fromCharCode(...signatureArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${headerPayload}.${signatureB64}`;

  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OAuth2 token error:', errorText);
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const tokenData = await response.json();
  cachedAccessToken = tokenData.access_token;
  tokenExpiry = Date.now() + (tokenData.expires_in || 3600) * 1000;

  return cachedAccessToken!;
}

// Map notification type to Android notification channel
function getChannelForType(type: string): string {
  switch (type) {
    case 'transaction': return 'transfers';
    case 'security': return 'security';
    case 'promo': return 'promo';
    default: return 'general';
  }
}

// Map notification type to sound file (in res/raw)
function getSoundForType(type: string): string {
  switch (type) {
    case 'transaction': return 'transfer_sound';
    case 'security': return 'security_sound';
    case 'promo': return 'promo_sound';
    default: return 'notification_sound';
  }
}

/**
 * Send FCM push notification to specific tokens using the FCM HTTP v1 API
 * This works directly from the client without needing a server-side API route.
 */
export async function sendFCMDirect(
  tokens: string[],
  title: string,
  body: string,
  type: string = 'info',
  data?: Record<string, any>
): Promise<{ successCount: number; failureCount: number }> {
  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const accessToken = await getAccessToken();
    const channelId = getChannelForType(type);
    const soundFile = getSoundForType(type);

    const validTokens = tokens.filter(Boolean);
    let totalSuccess = 0;
    let totalFailure = 0;

    // FCM HTTP v1 API sends to one token at a time (no multicast)
    // We'll send in parallel batches for efficiency
    const batchSize = 10;
    for (let i = 0; i < validTokens.length; i += batchSize) {
      const batch = validTokens.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (token) => {
          const message: any = {
            message: {
              token,
              notification: {
                title,
                body,
              },
              data: Object.fromEntries(
                Object.entries({
                  type: type || 'info',
                  title,
                  body,
                  ...(data || {}),
                  click_action: data?.url || '/',
                }).map(([k, v]) => [k, String(v ?? '')])
              ),
              android: {
                priority: 'high' as const,
                notification: {
                  channel_id: channelId,
                  icon: '@drawable/ic_notification',
                  color: '#5C1A1B',
                  sound: soundFile,
                  tag: type || 'info',
                  default_sound: false,
                  default_vibrate_timings: true,
                  visibility: 'private' as const,
                  notification_priority: 'PRIORITY_HIGH' as const,
                  sticky: false,
                  local_only: false,
                  ticker: body,
                },
              },
              apns: {
                payload: {
                  aps: {
                    sound: 'default',
                    badge: 1,
                    'thread-id': channelId,
                  },
                },
              },
              webpush: {
                notification: {
                  icon: '/icons/icon-192x192.png',
                  badge: '/icons/icon-72x72.png',
                  dir: 'rtl' as const,
                  lang: 'ar',
                  vibrate: type === 'transaction'
                    ? [100, 50, 100, 50, 100]
                    : type === 'security'
                    ? [200, 100, 200, 100, 200]
                    : [100, 50, 100],
                  sound: '/sounds/notification.wav',
                  requireInteraction: type === 'security',
                  tag: `south-${type || 'info'}-${Date.now()}`,
                },
                fcm_options: {
                  link: data?.url || '/',
                },
              },
            },
          };

          const response = await fetch(
            `https://fcm.googleapis.com/v1/projects/${SERVICE_ACCOUNT.projectId}/messages:send`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(message),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.warn(`FCM send failed for token ${token.substring(0, 20)}...:`, errorText);
            return { success: false };
          }

          return { success: true };
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
          totalSuccess++;
        } else {
          totalFailure++;
        }
      }
    }

    console.log(`FCM Direct: ${totalSuccess} success, ${totalFailure} failed out of ${validTokens.length} tokens`);
    return { successCount: totalSuccess, failureCount: totalFailure };
  } catch (error) {
    console.error('FCM Direct send error:', error);
    return { successCount: 0, failureCount: tokens.length };
  }
}
