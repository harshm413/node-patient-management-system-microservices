import axios from 'axios';
import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:4004';

describe('Patient Integration Tests', () => {
  it('should return patients with valid token', async () => {
    // Authenticate first
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'testuser@test.com',
      password: 'password123',
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(loginResponse.status).toBe(200);
    const token = loginResponse.data.token;
    expect(token).toBeTruthy();

    // Get patients with Bearer token
    const patientsResponse = await axios.get(`${BASE_URL}/api/patients`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(patientsResponse.status).toBe(200);
    expect(patientsResponse.data).toBeTruthy();
  });
});
