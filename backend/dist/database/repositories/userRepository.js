import { randomUUID } from 'node:crypto';
import { getDatabase } from '../db.js';
export class UserRepository {
    static async findById(id) {
        const db = getDatabase();
        return db.queryOne('SELECT * FROM users WHERE id = $1', [id]);
    }
    static async findByEmail(email) {
        const db = getDatabase();
        return db.queryOne('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    }
    static async create(data) {
        const db = getDatabase();
        const id = randomUUID();
        const now = new Date().toISOString();
        await db.execute('INSERT INTO users (id, email, password_hash, full_name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)', [id, data.email.toLowerCase(), data.password_hash, data.full_name, now, now]);
        const user = await this.findById(id);
        if (!user)
            throw new Error('Failed to create user record');
        return user;
    }
}
//# sourceMappingURL=userRepository.js.map