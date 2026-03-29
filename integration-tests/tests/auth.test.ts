import axios from 'axios';
import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:4004';

describe('Auth Integration Tests', () => {
  it('should return OK with valid token', async () => {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'testuser@test.com',
      password: 'password123',
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status).toBe(200);
    expect(response.data.token).toBeTruthy();
    console.log('Generated Token:', response.data.token);
  });

  it('should return unauthorized on invalid login', async () => {
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: 'invalid_user@test.com',
        password: 'wrongpassword',
      }, {
        headers: { 'Content-Type': 'application/json' },
      });
      expect.fail('Expected 401 error');
    } catch (error: any) {
      expect(error.response.status).toBe(401);
    }
  });
});
