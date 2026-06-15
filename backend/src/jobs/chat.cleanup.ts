// backend/src/jobs/chat.cleanup.ts
// Nightly cron job — runs at 00:01 every day
// Deletes ChatRooms whose expiresAt has passed (messages + members cascade-deleted by DB)
import cron from 'node-cron';
import { deleteExpiredRooms } from '../services/chat.service';

export function startChatCleanupJob() {
  // Run at 00:01 every day
  cron.schedule('1 0 * * *', async () => {
    console.log('[Cron] Running chat cleanup...');
    try {
      const deleted = await deleteExpiredRooms();
      console.log(`[Cron] Deleted ${deleted} expired chat room(s).`);
    } catch (err) {
      console.error('[Cron] Chat cleanup failed:', err);
    }
  });

  console.log('✅ Chat cleanup cron registered (runs daily at 00:01)');
}
