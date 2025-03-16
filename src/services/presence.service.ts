import { redisClient } from '../config/db';

class PresenceService {
    private readonly PRESENCE_TTL = 300; // 5 minutes

    async updatePresence(docId: string, userId: string) {
        const key = `presence:${docId}`;
        await redisClient.zAdd(key, { score: Date.now(), value: userId });
        await redisClient.expire(key, this.PRESENCE_TTL);
    }

    async getActiveUsers(docId: string) {
        const key = `presence:${docId}`;
        const now = Date.now();
        const activeUsers = await redisClient.zRangeByScore(
            key,
            now - this.PRESENCE_TTL * 1000,
            now
        );
        return activeUsers;
    }

    async removeUser(docId: string, userId: string) {
        const key = `presence:${docId}`;
        await redisClient.zRem(key, userId);
    }


    async updateLastActive(docId: string, userId: string) {
        const key = `presence:${docId}`;
        await redisClient.zAdd(key, { score: Date.now(), value: userId });
    }

    async userLeft(docId: string, userId: string) {
        await this.removeUser(docId, userId);
    }

    async userJoined(docId: string, userId: string) {
        await this.updatePresence(docId, userId);
    }

}

export default new PresenceService();