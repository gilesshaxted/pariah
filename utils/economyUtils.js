// utils/economyUtils.js
import { db } from './firebase.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-pariah';

/**
 * Gets the economy configuration for a specific guild.
 * Path: /artifacts/{appId}/public/data/economy_configs/{guildId}
 */
export async function getEcoConfig(guildId) {
  try {
    const doc = await db.collection('artifacts').doc(appId)
      .collection('public').doc('data')
      .collection('economy_configs').doc(guildId).get();
    
    return doc.exists ? doc.data() : {
      currencyName: 'Scrap',
      currencyEmoji: '⚙️',
      dailyAmount: 100
    };
  } catch (error) {
    console.error('[ECONOMY CONFIG ERROR]', error);
    return { currencyName: 'Scrap', currencyEmoji: '⚙️', dailyAmount: 100 };
  }
}

/**
 * Gets the current balance of a player.
 * Path: /artifacts/{appId}/public/data/economy_balances/{guildId}_{userId}
 */
export async function getBalance(guildId, userId) {
  try {
    const doc = await db.collection('artifacts').doc(appId)
      .collection('public').doc('data')
      .collection('economy_balances').doc(`${guildId}_${userId}`).get();
    return doc.exists ? doc.data().balance : 0;
  } catch (error) {
    console.error('[BALANCE FETCH ERROR]', error);
    return 0;
  }
}

/**
 * Updates a player's balance (can be positive or negative).
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
 * Fetches the user's inventory.
 * Path: /artifacts/{appId}/public/data/economy_inventories/{guildId}_{userId}
 */
export async function getInventory(guildId, userId) {
  try {
    const doc = await db.collection('artifacts').doc(appId)
      .collection('public').doc('data')
      .collection('economy_inventories').doc(`${guildId}_${userId}`).get();
    return doc.exists ? doc.data().items || {} : {};
  } catch (error) {
    console.error('[INVENTORY FETCH ERROR]', error);
    return {};
  }
}

/**
 * Adds or removes items from a player's inventory.
 */
export async function addItem(guildId, userId, itemKey, quantity) {
  const inv = await getInventory(guildId, userId);
  inv[itemKey] = (inv[itemKey] || 0) + quantity;
  
  // Clean up empty items
  if (inv[itemKey] <= 0) delete inv[itemKey];
  
  await db.collection('artifacts').doc(appId)
    .collection('public').doc('data')
    .collection('economy_inventories').doc(`${guildId}_${userId}`).set({
      guildId,
      userId,
      items: inv,
      updatedAt: new Date()
    }, { merge: true });
}

/**
 * Manages cooldowns for economy actions.
 * Path: /artifacts/{appId}/public/data/economy_cooldowns/{guildId}_{userId}
 */
export async function checkCooldown(guildId, userId, type) {
  try {
    const doc = await db.collection('artifacts').doc(appId)
      .collection('public').doc('data')
      .collection('economy_cooldowns').doc(`${guildId}_${userId}`).get();
    
    if (!doc.exists || !doc.data()[type]) return { ready: true };
    
    const lastUsed = doc.data()[type].toDate();
    return { ready: false, lastUsed };
  } catch (error) {
    console.error('[COOLDOWN CHECK ERROR]', error);
    return { ready: true };
  }
}

export async function setCooldown(guildId, userId, type) {
  await db.collection('artifacts').doc(appId)
    .collection('public').doc('data')
    .collection('economy_cooldowns').doc(`${guildId}_${userId}`).set({
      [type]: new Date()
    }, { merge: true });
}
