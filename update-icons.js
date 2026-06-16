// Script to update provider icons in Firebase
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

const serviceAccount = require('./upload/southern-portfolio-firebase-adminsdk-fbsvc-46f601a3ba.json');

async function main() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: 'https://southern-portfolio-default-rtdb.firebaseio.com',
    });
  }

  const db = getDatabase();

  // Icon mapping for each provider
  const providerIcons = {
    // الاتصالات
    'yemen-mobile': '📱',
    'yo': '📞',
    'sabafon': '☎️',
    'y': '📲',

    // الإنترنت
    'yemen-net': '🌐',
    'y-net-internet': '📶',
    'sabafon-internet': '📡',

    // خدمات ترفيهية
    'pubg': '🔫',
    'freefire': '🔥',
    'call-of-duty': '🎯',
    'clash-royale': '👑',
    'clash-of-clans': '⚔️',
    'roblox': '🧱',
    'fortnite': '🏗️',
    'minecraft': '⛏️',
    'valorant': '🎯',
    'league-legends': '🏆',
    'apex-legends': '🎯',
    'genshin-impact': '⭐',
    'honkai-star': '🌟',
    'ea-fc': '⚽',
    'steam': '🎮',
    'netflix': '🎬',
    'spotify': '🎵',
    'youtube-premium': '▶️',

    // بطاقات رقمية
    'google-play': '▶️',
    'apple-itunes': '🍎',
    'amazon-gift': '📦',
    'psn-card': '🎮',
    'xbox-card': '🟢',
    'nintendo-card': '🔴',
    'visa-virtual': '💳',
    'mastercard-virtual': '💳',
    'paypal': '💰',

    // الكهرباء والماء
    'elec-sanaa': '⚡',
    'elec-aden': '💡',
    'water-sanaa': '💧',
    'water-aden': '🚿',

    // خدمات حكومية
    'civil-registry': '🏛️',
    'passport': '🛂',
    'traffic': '🚗',
    'municipal': '🏢',

    // الكريبتو
    'bitcoin': '₿',
    'ethereum': 'Ξ',
    'usdt': '💲',
    'bnb': '🔶',
    'solana': '🟣',
    'tron': '🔴',

    // استثمار الكريبتو
    'usdt-daily': '📈',
    'usdt-weekly': '📊',
    'usdt-monthly': '💹',
    'usdt-quarterly': '🏦',
  };

  // Section icons
  const sectionIcons = {
    'telecom': '📱',
    'internet': '🌐',
    'entertainment': '🎮',
    'cards': '💳',
    'electricity': '⚡',
    'government': '🏛️',
    'crypto': '₿',
    'crypto-invest': '📈',
  };

  try {
    // Update providers
    const providersRef = db.ref('providers');
    const providersSnapshot = await providersRef.once('value');

    if (providersSnapshot.exists()) {
      const providers = providersSnapshot.val();
      const updates = {};

      for (const [key, provider] of Object.entries(providers)) {
        const icon = providerIcons[provider.id || key];
        if (icon) {
          updates[`providers/${key}/icon`] = icon;
          console.log(`Setting icon for ${provider.name || key}: ${icon}`);
        } else {
          // Default icon based on category
          const categoryIcon = sectionIcons[provider.categoryId] || '📦';
          updates[`providers/${key}/icon`] = categoryIcon;
          console.log(`Setting default icon for ${provider.name || key}: ${categoryIcon}`);
        }
      }

      await db.ref().update(updates);
      console.log(`Updated ${Object.keys(updates).length} provider icons`);
    } else {
      console.log('No providers found in Firebase');
    }

    // Update sections
    const sectionsRef = db.ref('ownerSettings/sections');
    const sectionsSnapshot = await sectionsRef.once('value');

    if (sectionsSnapshot.exists()) {
      const sections = sectionsSnapshot.val();
      const updates = {};

      for (const [key, section] of Object.entries(sections)) {
        const icon = sectionIcons[section.id || key];
        if (icon) {
          updates[`ownerSettings/sections/${key}/icon`] = icon;
          console.log(`Setting icon for section ${section.name || key}: ${icon}`);
        }
      }

      await db.ref().update(updates);
      console.log(`Updated ${Object.keys(updates).length} section icons`);
    }

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

main();
