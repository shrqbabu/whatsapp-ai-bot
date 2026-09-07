import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { runMigrations } from '../src/database/db.js';

describe('Authentication & Scoped Resources', () => {
  const app = createApp();

  beforeEach(async () => {
    await runMigrations();
  });

  it('registers a new user and returns JWT + session', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'testuser@example.com',
        password: 'password123',
        fullName: 'Test User',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('testuser@example.com');
    expect(res.body.data.session.id).toBeDefined();
    expect(res.body.data.session.status).toBe('DISCONNECTED');
  });

  it('rejects duplicate email registration', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'duplicate@example.com',
        password: 'password123',
        fullName: 'First User',
      });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'duplicate@example.com',
        password: 'password456',
        fullName: 'Second User',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('logs in an existing user with correct credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'loginuser@example.com',
        password: 'secretpassword',
        fullName: 'Login User',
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'loginuser@example.com',
        password: 'secretpassword',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('loginuser@example.com');
  });

  it('rejects login with invalid password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'wrongpass@example.com',
        password: 'correctpassword',
        fullName: 'User',
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'wrongpass@example.com',
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns current user details on GET /api/auth/me with valid token', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'meuser@example.com',
        password: 'password123',
        fullName: 'Me User',
      });

    const token = registerRes.body.data.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('meuser@example.com');
  });

  it('rejects unauthenticated requests to protected endpoints', async () => {
    const res = await request(app).get('/api/whatsapp/status');
    expect(res.status).toBe(401);
  });
});
