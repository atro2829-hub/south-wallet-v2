/**
 * Send FCM notifications for the latest transactions from Firebase RTDB
 * 
 * Data structure:
 * - transactions/ (flat, each has fromUserId, toUserId)
 * - orders/ (flat, each has userId, userName)
 * - depositRequests/ (flat, each has userId, userName)
 * - supportChat/ (per userId)
 * - users/ (per uid, with fcmToken)
 */

const admin = require('firebase-admin');
const { getDatabase } = require('firebase-admin/database');
const { getMessaging } = require('firebase-admin/messaging');
const serviceAccount = require('/home/z/my-project/upload/southern-portfolio-firebase-adminsdk-fbsvc-46f601a3ba.json');

const app = admin.initializeApp({
  credential: admin.cert(serviceAccount),
  databaseURL: 'https://southern-portfolio-default-rtdb.firebaseio.com'
}, 'notif-sender');

const db = getDatabase(app);
const messaging = getMessaging(app);

function stringifyData(data) {
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = String(value ?? '');
  }
  return result;
}

async function sendFCM(token, title, body, data = {}) {
  try {
    // FCM data field requires all values to be strings
    const stringData = stringifyData({
      type: 'transaction',
      click_action: '/',
      ...data,
    });

    const message = {
      notification: { title, body },
      data: stringData,
      android: {
        priority: 'high',
        notification: {
          channel_id: 'transfers',
          icon: '@drawable/ic_notification',
          color: '#E60000',
          sound: 'transfer_sound',
          tag: String(data.type || 'transaction'),
          default_sound: false,
          default_vibrate_timings: false,
          visibility: 'private',
          notification_priority: 'PRIORITY_HIGH',
        },
      },
      token,
    };

    const response = await messaging.send(message);
    console.log(`    🔔 FCM مرسل بنجاح: ${response.substring(0, 30)}...`);
    return true;
  } catch (error) {
    console.warn(`    ⚠️ فشل إرسال FCM: ${error.message}`);
    return false;
  }
}

async function saveNotification(uid, title, body, type, data = {}) {
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.ref(`notifications/${uid}/${notifId}`).set({
    id: notifId,
    title,
    body,
    type,
    isRead: false,
    createdAt: new Date().toISOString(),
    data,
  });
  return notifId;
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  إرسال إشعارات FCM لآخر المعاملات           ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // 1. Get all users
  const usersSnapshot = await db.ref('users').once('value');
  const users = usersSnapshot.val() || {};
  
  // Build user map
  const userMap = {};
  for (const [uid, userData] of Object.entries(users)) {
    userMap[uid] = {
      name: userData.name || uid,
      fcmToken: userData.fcmToken || null,
      balance: userData.balance || 0,
    };
  }

  console.log('📋 المستخدمون:');
  for (const [uid, info] of Object.entries(userMap)) {
    console.log(`  ${info.name}: FCM=${info.fcmToken ? '✅' : '❌'}`);
  }
  console.log('');

  let totalFCMSent = 0;
  let totalFCMFailed = 0;
  let totalInApp = 0;

  // ============================================
  // 2. PROCESS TRANSACTIONS (flat structure)
  // ============================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💳 المعاملات');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const txSnapshot = await db.ref('transactions').once('value');
  const transactions = txSnapshot.val() || {};
  const txList = Object.entries(transactions)
    .map(([id, tx]) => ({ id, ...tx }))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  // Get existing notifications to avoid duplicates
  const notifSnapshot = await db.ref('notifications').once('value');
  const existingNotifs = notifSnapshot.val() || {};

  // Build a set of already notified transaction IDs per user
  const notifiedTxns = {};
  for (const [uid, userNotifs] of Object.entries(existingNotifs)) {
    notifiedTxns[uid] = new Set();
    for (const n of Object.values(userNotifs)) {
      if (n.data && n.data.txnId) notifiedTxns[uid].add(n.data.txnId);
    }
  }

  for (const tx of txList) {
    const fromUser = userMap[tx.fromUserId];
    const toUser = userMap[tx.toUserId];
    
    console.log(`📌 معاملة: ${tx.id}`);
    console.log(`   النوع: ${tx.type} | المبلغ: ${tx.amount} ${tx.currency} | الحالة: ${tx.status}`);
    console.log(`   من: ${fromUser?.name || tx.fromUserId} → إلى: ${toUser?.name || tx.toUserId}`);
    console.log(`   التاريخ: ${tx.createdAt}`);

    // Determine who to notify based on transaction type
    let notifications = [];

    switch (tx.type) {
      case 'transfer': {
        // Notify the recipient of incoming transfer
        if (tx.toUserId && tx.toUserId !== 'system' && tx.toUserId !== 'GIFT_CODE') {
          const alreadyNotified = notifiedTxns[tx.toUserId]?.has(tx.id);
          if (!alreadyNotified) {
            notifications.push({
              uid: tx.toUserId,
              title: 'تحويل وارد',
              body: `استلمت ${tx.amount} ${tx.currency} من ${fromUser?.name || 'مستخدم'}`,
              type: 'transaction',
              data: { txnId: tx.id, action: 'transfer_received', amount: tx.amount, currency: tx.currency },
            });
          }
        }
        // Notify the sender that transfer was completed
        if (tx.fromUserId) {
          const alreadyNotified = notifiedTxns[tx.fromUserId]?.has(tx.id + '_sent');
          if (!alreadyNotified) {
            notifications.push({
              uid: tx.fromUserId,
              title: 'تم التحويل بنجاح',
              body: `تم تحويل ${tx.amount} ${tx.currency} إلى ${toUser?.name || 'مستخدم'}`,
              type: 'transaction',
              data: { txnId: tx.id, action: 'transfer_sent', amount: tx.amount, currency: tx.currency },
            });
          }
        }
        break;
      }
      case 'order': {
        // Notify user about their order
        if (tx.fromUserId) {
          const alreadyNotified = notifiedTxns[tx.fromUserId]?.has(tx.id);
          if (!alreadyNotified) {
            notifications.push({
              uid: tx.fromUserId,
              title: 'تم تنفيذ الطلب',
              body: `تم تنفيذ طلبك بمبلغ ${tx.amount} ${tx.currency}`,
              type: 'transaction',
              data: { txnId: tx.id, action: 'order_completed', amount: tx.amount, currency: tx.currency },
            });
          }
        }
        break;
      }
      case 'investment': {
        if (tx.fromUserId) {
          const alreadyNotified = notifiedTxns[tx.fromUserId]?.has(tx.id);
          if (!alreadyNotified) {
            notifications.push({
              uid: tx.fromUserId,
              title: 'استثمار جديد',
              body: `تم استثمار ${tx.amount} ${tx.currency} بنجاح`,
              type: 'transaction',
              data: { txnId: tx.id, action: 'investment', amount: tx.amount, currency: tx.currency },
            });
          }
        }
        break;
      }
      case 'withdraw': {
        if (tx.fromUserId) {
          const alreadyNotified = notifiedTxns[tx.fromUserId]?.has(tx.id);
          if (!alreadyNotified) {
            const isGiftCode = tx.toUserId === 'GIFT_CODE';
            notifications.push({
              uid: tx.fromUserId,
              title: isGiftCode ? 'تم إنشاء قسيمة هدية' : 'سحب',
              body: isGiftCode
                ? `تم إنشاء قسيمة هدية بقيمة ${tx.amount} ${tx.currency}`
                : `تم سحب ${tx.amount} ${tx.currency} من حسابك`,
              type: 'transaction',
              data: { txnId: tx.id, action: isGiftCode ? 'gift_code' : 'withdraw', amount: tx.amount, currency: tx.currency },
            });
          }
        }
        break;
      }
      default: {
        // Generic transaction notification
        if (tx.fromUserId) {
          const alreadyNotified = notifiedTxns[tx.fromUserId]?.has(tx.id);
          if (!alreadyNotified) {
            notifications.push({
              uid: tx.fromUserId,
              title: 'معاملة جديدة',
              body: tx.description || `${tx.type}: ${tx.amount} ${tx.currency}`,
              type: 'transaction',
              data: { txnId: tx.id, action: tx.type, amount: tx.amount, currency: tx.currency },
            });
          }
        }
      }
    }

    // Send each notification
    for (const notif of notifications) {
      const userInfo = userMap[notif.uid];
      if (!userInfo) continue;

      // Save in-app notification
      await saveNotification(notif.uid, notif.title, notif.body, notif.type, notif.data);
      totalInApp++;
      console.log(`   📱 إشعار داخل التطبيق ← ${userInfo.name}: ${notif.title}`);

      // Send FCM push
      if (userInfo.fcmToken) {
        const success = await sendFCM(userInfo.fcmToken, notif.title, notif.body, notif.data);
        if (success) totalFCMSent++;
        else totalFCMFailed++;
      } else {
        console.log(`   ⚠️ لا يوجد FCM token لـ ${userInfo.name}`);
      }
    }
    console.log('');
  }

  // ============================================
  // 3. PROCESS ORDERS (flat structure)
  // ============================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 الطلبات');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const ordersSnapshot = await db.ref('orders').once('value');
  const orders = ordersSnapshot.val() || {};
  const orderList = Object.entries(orders)
    .map(([id, o]) => ({ id, ...o }))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  for (const order of orderList) {
    const userInfo = userMap[order.userId];
    if (!userInfo) continue;

    console.log(`📌 طلب: ${order.id}`);
    console.log(`   الخدمة: ${order.packageName} (${order.providerName})`);
    console.log(`   المبلغ: ${order.amount} ${order.currency} | الحالة: ${order.status}`);
    console.log(`   المستخدم: ${order.userName}`);

    // Check if already notified
    const alreadyNotified = notifiedTxns[order.userId]?.has(`order_${order.id}`);
    if (alreadyNotified) {
      console.log(`   ✅ تم إرسال إشعار مسبقاً\n`);
      continue;
    }

    let title = '';
    let body = '';

    switch (order.status) {
      case 'completed':
        title = 'تم إكمال طلبك';
        body = `تم إكمال طلب "${order.packageName}" بنجاح - ${order.amount} ${order.currency}`;
        break;
      case 'pending':
        title = 'طلب قيد التنفيذ';
        body = `طلبك "${order.packageName}" قيد التنفيذ - ${order.amount} ${order.currency}`;
        break;
      case 'cancelled':
        title = 'تم إلغاء الطلب';
        body = `تم إلغاء طلب "${order.packageName}" - ${order.amount} ${order.currency}`;
        break;
      case 'refunded':
        title = 'تم استرداد المبلغ';
        body = `تم استرداد مبلغ ${order.amount} ${order.currency} لطلب "${order.packageName}"`;
        break;
      default:
        title = 'تحديث الطلب';
        body = `تحديث طلب "${order.packageName}" - ${order.status} - ${order.amount} ${order.currency}`;
    }

    const notifData = {
      orderId: order.id,
      action: 'order_status',
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      type: 'transaction',
    };

    // Save in-app notification
    await saveNotification(order.userId, title, body, 'transaction', notifData);
    totalInApp++;
    console.log(`   📱 إشعار داخل التطبيق ← ${userInfo.name}: ${title}`);

    // Send FCM push
    if (userInfo.fcmToken) {
      const success = await sendFCM(userInfo.fcmToken, title, body, notifData);
      if (success) totalFCMSent++;
      else totalFCMFailed++;
    } else {
      console.log(`   ⚠️ لا يوجد FCM token`);
    }

    // Also notify admin for pending orders
    if (order.status === 'pending') {
      const adminNotifId = `admin_notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.ref(`adminNotifications/${adminNotifId}`).set({
        id: adminNotifId,
        title: 'طلب خدمة جديد',
        body: `${order.userName}: ${order.packageName} - ${order.amount} ${order.currency}`,
        type: 'transaction',
        category: 'orders',
        isRead: false,
        createdAt: new Date().toISOString(),
        data: { action: 'new_order', userId: order.userId, orderId: order.id },
      });
      console.log(`   📋 تم إرسال إشعار للأدمن`);
    }
    console.log('');
  }

  // ============================================
  // 4. PROCESS DEPOSIT REQUESTS
  // ============================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 طلبات الإيداع');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const depSnapshot = await db.ref('depositRequests').once('value');
  const deposits = depSnapshot.val() || {};
  const depList = Object.entries(deposits)
    .map(([id, d]) => ({ id, ...d }))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  for (const dep of depList) {
    const userInfo = userMap[dep.userId];
    if (!userInfo) continue;

    console.log(`📌 طلب إيداع: ${dep.id}`);
    console.log(`   المبلغ: ${dep.amount} ${dep.currency} | الحالة: ${dep.status}`);
    console.log(`   المستخدم: ${dep.userName}`);

    // Check if already notified
    const alreadyNotified = notifiedTxns[dep.userId]?.has(`deposit_${dep.id}`);
    if (alreadyNotified) {
      console.log(`   ✅ تم إرسال إشعار مسبقاً\n`);
      continue;
    }

    let title = '';
    let body = '';

    switch (dep.status) {
      case 'approved':
        title = 'تم قبول طلب الإيداع';
        body = `تم قبول طلب إيداعك بمبلغ ${dep.amount} ${dep.currency} وإضافته إلى رصيدك`;
        break;
      case 'rejected':
        title = 'تم رفض طلب الإيداع';
        body = `تم رفض طلب إيداعك بمبلغ ${dep.amount} ${dep.currency}`;
        break;
      case 'pending':
        title = 'طلب إيداع قيد المراجعة';
        body = `تم استلام طلب إيداعك بمبلغ ${dep.amount} ${dep.currency}. سيتم مراجعته قريباً`;
        break;
      default:
        title = 'تحديث طلب الإيداع';
        body = `تحديث طلب إيداعك بمبلغ ${dep.amount} ${dep.currency} - الحالة: ${dep.status}`;
    }

    const notifData = {
      depositId: dep.id,
      action: 'deposit_status',
      status: dep.status,
      amount: dep.amount,
      currency: dep.currency,
      type: 'transaction',
    };

    // Save in-app notification
    await saveNotification(dep.userId, title, body, 'transaction', notifData);
    totalInApp++;
    console.log(`   📱 إشعار داخل التطبيق ← ${userInfo.name}: ${title}`);

    // Send FCM push
    if (userInfo.fcmToken) {
      const success = await sendFCM(userInfo.fcmToken, title, body, notifData);
      if (success) totalFCMSent++;
      else totalFCMFailed++;
    } else {
      console.log(`   ⚠️ لا يوجد FCM token`);
    }
    console.log('');
  }

  // ============================================
  // 5. PROCESS SUPPORT CHAT
  // ============================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💬 محادثات الدعم الفني');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const chatSnapshot = await db.ref('supportChat').once('value');
  const chats = chatSnapshot.val() || {};

  for (const [uid, chatData] of Object.entries(chats)) {
    const userInfo = userMap[uid];
    if (!userInfo) continue;

    console.log(`📌 محادثة: ${userInfo.name}`);
    console.log(`   آخر رسالة: ${chatData.lastMessage}`);
    console.log(`   رسائل غير مقروءة للمستخدم: ${chatData.unreadUser || 0}`);

    const messages = chatData.messages || {};
    const msgList = Object.entries(messages)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

    // Notify user about admin replies
    const adminReplies = msgList.filter(m => m.sender === 'admin');
    for (const msg of adminReplies.slice(0, 2)) {
      const alreadyNotified = notifiedTxns[uid]?.has(`chat_${msg.id}`);
      if (alreadyNotified) continue;

      const title = 'رسالة جديدة من الدعم الفني';
      const body = msg.text || 'لديك رسالة جديدة من الدعم';

      const notifData = {
        action: 'support_chat',
        messageId: msg.id,
        type: 'info',
      };

      await saveNotification(uid, title, body, 'info', notifData);
      totalInApp++;
      console.log(`   📱 إشعار رسالة أدمن ← ${userInfo.name}: ${body.substring(0, 30)}`);

      if (userInfo.fcmToken) {
        const success = await sendFCM(userInfo.fcmToken, title, body, notifData);
        if (success) totalFCMSent++;
        else totalFCMFailed++;
      }
    }

    // Notify admin about user messages
    const userMsgs = msgList.filter(m => m.sender === 'user');
    for (const msg of userMsgs.slice(0, 2)) {
      const adminNotifId = `admin_notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.ref(`adminNotifications/${adminNotifId}`).set({
        id: adminNotifId,
        title: 'رسالة دعم فني جديدة',
        body: `${userInfo.name}: ${msg.text ? msg.text.substring(0, 50) : 'رسالة جديدة'}`,
        type: 'info',
        category: 'support',
        isRead: false,
        createdAt: new Date().toISOString(),
        data: { action: 'support_chat', userId: uid },
      });
      totalInApp++;
      console.log(`   📋 إشعار للأدمن من ${userInfo.name}: ${msg.text?.substring(0, 30)}`);
    }
    console.log('');
  }

  // ============================================
  // 6. PROCESS WITHDRAW REQUESTS (if any)
  // ============================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💸 طلبات السحب');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const withdrawsSnapshot = await db.ref('withdrawRequests').once('value');
  const withdraws = withdrawsSnapshot.val() || {};

  if (Object.keys(withdraws).length === 0) {
    console.log('لا توجد طلبات سحب حالياً\n');
  } else {
    const withdrawList = Object.entries(withdraws)
      .map(([id, w]) => ({ id, ...w }))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    for (const w of withdrawList) {
      const userInfo = userMap[w.userId];
      if (!userInfo) continue;

      console.log(`📌 طلب سحب: ${w.id}`);
      console.log(`   المبلغ: ${w.amount} ${w.currency} | الحالة: ${w.status}`);

      const alreadyNotified = notifiedTxns[w.userId]?.has(`withdraw_${w.id}`);
      if (alreadyNotified) {
        console.log(`   ✅ تم إرسال إشعار مسبقاً\n`);
        continue;
      }

      let title = '';
      let body = '';

      switch (w.status) {
        case 'approved':
          title = 'تم قبول طلب السحب';
          body = `تم قبول طلب سحبك بمبلغ ${w.amount} ${w.currency}`;
          break;
        case 'rejected':
          title = 'تم رفض طلب السحب';
          body = `تم رفض طلب سحبك بمبلغ ${w.amount} ${w.currency}`;
          break;
        case 'pending':
          title = 'طلب سحب قيد المراجعة';
          body = `تم استلام طلب سحبك بمبلغ ${w.amount} ${w.currency}. سيتم مراجعته قريباً`;
          break;
        default:
          title = 'تحديث طلب السحب';
          body = `تحديث على طلب سحبك - ${w.status}`;
      }

      const notifData = {
        withdrawId: w.id,
        action: 'withdraw_status',
        status: w.status,
        amount: w.amount,
        currency: w.currency,
        type: 'transaction',
      };

      await saveNotification(w.userId, title, body, 'transaction', notifData);
      totalInApp++;
      console.log(`   📱 إشعار داخل التطبيق ← ${userInfo.name}: ${title}`);

      if (userInfo.fcmToken) {
        const success = await sendFCM(userInfo.fcmToken, title, body, notifData);
        if (success) totalFCMSent++;
        else totalFCMFailed++;
      }

      if (w.status === 'pending') {
        const adminNotifId = `admin_notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await db.ref(`adminNotifications/${adminNotifId}`).set({
          id: adminNotifId,
          title: 'طلب سحب جديد',
          body: `${userInfo.name}: ${w.amount} ${w.currency}`,
          type: 'transaction',
          category: 'withdrawals',
          isRead: false,
          createdAt: new Date().toISOString(),
          data: { action: 'withdraw_request', userId: w.userId, amount: w.amount },
        });
        console.log(`   📋 تم إرسال إشعار للأدمن`);
      }
      console.log('');
    }
  }

  // ============================================
  // FINAL SUMMARY
  // ============================================
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║            الملخص النهائي                   ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  إشعارات داخل التطبيق: ${totalInApp.toString().padEnd(20)}║`);
  console.log(`║  إشعارات FCM ناجحة:   ${totalFCMSent.toString().padEnd(20)}║`);
  console.log(`║  إشعارات FCM فاشلة:   ${totalFCMFailed.toString().padEnd(20)}║`);
  console.log('╚══════════════════════════════════════════════╝\n');

  process.exit(0);
}

main().catch(err => {
  console.error('❌ خطأ:', err);
  process.exit(1);
});
