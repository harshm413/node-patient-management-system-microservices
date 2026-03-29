export interface RouteConfig {
  path: string;
  target: string;
  pathRewrite?: Record<string, string>;
  stripPrefix?: string;
  jwtProtected?: boolean;
}

const PROFILE = process.env.PROFILE || '';

const isProd = PROFILE === 'prod';

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL ||
  (isProd ? 'http://host.docker.internal:4005' : 'http://auth-service:4005');

const PATIENT_SERVICE_URL =
  process.env.PATIENT_SERVICE_URL ||
  (isProd ? 'http://host.docker.internal:4000' : 'http://patient-service:4000');

export const routes: RouteConfig[] = [
  {
    path: '/auth',
    target: AUTH_SERVICE_URL,
    stripPrefix: '/auth',
  },
  {
    path: '/api/patients',
    target: PATIENT_SERVICE_URL,
    stripPrefix: '/api',
    jwtProtected: true,
  },
  {
    path: '/api-docs/patients',
    target: PATIENT_SERVICE_URL,
    pathRewrite: { '^/api-docs/patients': '/v3/api-docs' },
  },
  {
    path: '/api-docs/auth',
    target: AUTH_SERVICE_URL,
    pathRewrite: { '^/api-docs/auth': '/v3/api-docs' },
  },
];
