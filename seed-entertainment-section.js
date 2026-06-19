// Seed script to create the الخدمات الترفيهية section structure in Firebase
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://southern-portfolio-default-rtdb.firebaseio.com'
  });
}

const db = admin.database();

async function seed() {
  try {
    // Create الخدمات الترفيهية section
    const entertainmentSection = {
      id: 'entertainment-services',
      name: 'الخدمات الترفيهية',
      icon: '',
      color: '#5C1A1B',
      sortOrder: 1,
      isActive: true,
      type: 'main',
      subSections: {
        'wallet-services-sub': {
          id: 'wallet-services-sub',
          name: 'خدمات المحفظة',
          icon: '',
          sortOrder: 1,
          isActive: true,
          parentId: 'entertainment-services'
        },
        'provider-services-sub': {
          id: 'provider-services-sub',
          name: 'خدمات المزودين',
          icon: '',
          sortOrder: 2,
          isActive: true,
          parentId: 'entertainment-services'
        }
      }
    };

    await db.ref('sections/entertainment-services').update(entertainmentSection);
    console.log('✅ Created الخدمات الترفيهية section');

    // Make wallet services section link to the wallet-services-sub sub-section
    // Get all wallet services and update their sectionId
    const walletServicesSnapshot = await db.ref('walletServices').once('value');
    if (walletServicesSnapshot.exists()) {
      const walletServices = walletServicesSnapshot.val();
      const updates = {};
      for (const [id, service] of Object.entries(walletServices)) {
        if (service && service.sectionId === 'wallet-services') {
          updates[`${id}/sectionId`] = 'entertainment-services';
          updates[`${id}/subSectionId`] = 'wallet-services-sub';
        }
      }
      if (Object.keys(updates).length > 0) {
        await db.ref('walletServices').update(updates);
        console.log(`✅ Updated ${Object.keys(updates).length / 2} wallet services to link to entertainment section`);
      }
    }

    // Make API providers link to the provider-services-sub sub-section
    const apiProvidersSnapshot = await db.ref('adminSettings/apiProviders').once('value');
    if (apiProvidersSnapshot.exists()) {
      const apiProviders = apiProvidersSnapshot.val();
      const updates = {};
      for (const [id, provider] of Object.entries(apiProviders)) {
        if (provider && provider.isActive !== false) {
          updates[`${id}/sectionId`] = 'entertainment-services';
          updates[`${id}/sectionName`] = 'الخدمات الترفيهية';
        }
      }
      if (Object.keys(updates).length > 0) {
        await db.ref('adminSettings/apiProviders').update(updates);
        console.log(`✅ Updated ${Object.keys(updates).length / 2} API providers to link to entertainment section`);
      }
    }

    console.log('🎉 Seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding:', error);
  }
  process.exit(0);
}

seed();
