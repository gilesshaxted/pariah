// utils/modUtils.js
import { db } from './firebase.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-pariah';

/**
 * Logs a moderation action to Firestore
 */
export async function logAction({ guildId, targetId, moderatorId, type, reason, messageContent = null }) {
  const caseId = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  try {
    await db.collection('artifacts').doc(appId).collection('public').doc('data').collection('modlogs').add({
      guildId,
      targetId,
      moderatorId,
      type,
      reason: reason || 'No reason provided',
      messageContent,
      timestamp: new Date(),
      caseId
    });
    return caseId;
  } catch (error) {
    console.error('[FIRESTORE MOD LOG ERROR]', error);
    return null;
  }
}
