// utils/economyUtils.js
import { db } from './firebase.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-pariah';

/**
 * Helper to get guild-specific economy configuration
 */
export async function getEcoConfig(guildId) {
  const doc = await db.collection('artifacts').doc(appId)
    .collection('public').doc('data')
    .collection('economy_configs').doc(guildId).get();
  
  return doc.exists ? doc.data() : {
    currencyName: 'Scrap',
    currencyEmoji: '⚙️',
    dailyAmount: 100,
    robCooldown: 3600000, // 1 hour
    roamCooldown: 600000  // 10 mins
  };
}

/**
 * Gets or initializes a player's balance
 */
export async function getBalance(guildId, userId) {
  const doc = await db.collection('artifacts').doc(appId)
    .collection('public').doc('data')
    .collection('economy_balances').doc(`${guildId}_${userId}`).get();
  
  return doc.exists ? doc.data().balance : 0;
}

/**
 * Updates a player's balance
 */
export async function updateBalance(guildId, userId, amount) {
  const current = await getBalance(guildId, userId);
  const newBalance = Math.max(0, current + amount);
  
  await db.collection('artifacts').doc(appId)
    .collection('public').doc('data')
    .collection('economy_balances').doc(`${guildId}_${userId}`).set({
      guildId,
      userId,
      balance: newBalance,
      updatedAt: new Date()
    }, { merge: true });
    
  return newBalance;
}

/**
 * Cooldown Manager
 */
export async function checkCooldown(guildId, userId, type) {
  const doc = await db.collection('artifacts').doc(appId)
    .collection('public').doc('data')
    .collection('economy_cooldowns').doc(`${guildId}_${userId}`).get();
    
  if (!doc.exists) return { ready: true };
  
  const lastUsed = doc.data()[type]?.toDate() || 0;
  return { ready: false, lastUsed };
}

export async function setCooldown(guildId, userId, type) {
  await db.collection('artifacts').doc(appId)
    .collection('public').doc('data')
    .collection('economy_cooldowns').doc(`${guildId}_${userId}`).set({
      [type]: new Date()
    }, { merge: true });
}
