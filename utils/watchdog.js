// utils/watchdog.js
import { db } from './firebase.js';

export function startWatchdog(client) {
  console.log("[WATCHDOG] Monitoring the wasteland for unverified souls...");
  
  setInterval(async () => {
    const now = Date.now();
    
    try {
      const snapshot = await db.collection('pariah_players').get();

      snapshot.forEach(async doc => {
        const data = doc.data();
        if (data.verified) return;

        const firstSeen = data.firstSeen || now;
        const diffMinutes = Math.floor((now - firstSeen) / 60000);

        if (diffMinutes >= 45) {
          console.log(`[BAN TRIGGER] ${data.gamertag} has expired.`);
          // Placeholder for G-Portal API call
        } else if (diffMinutes > 0 && diffMinutes % 15 === 0) {
          console.log(`[WARNING] ${data.gamertag} has ${45 - diffMinutes} minutes left.`);
          // Placeholder for G-Portal Broadcast call
        }
      });
    } catch (error) {
      console.error("[WATCHDOG ERROR]", error);
    }
  }, 60000); // Pulse every minute
}
