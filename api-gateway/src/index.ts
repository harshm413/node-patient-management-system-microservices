import express, { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

const app = express();
const PORT = process.env.PORT || 4004;
const PROFILE = process.env.PROFILE || '';
const isProd = PROFILE === 'prod';

const AUTH_URL = process.env.AUTH_SERVICE_URL
  || (isProd ? 'http://host.docker.internal:4005' : 'http://auth-service:4005');
const PAT_URL = process.env.PATIENT_SERVICE_URL
  || (isProd ? 'http://host.docker.internal:4000' : 'http://patient-service:4000');

// Parse JSON for all routes
app.use(express.json());

async function proxyRequest(
  req: Request, res: Response,
  targetBase: string, targetPath: string
) {
  try {
    const resp = await axios({
      method: req.method as any,
      url: targetBase + targetPath,
      data: req.body,
      headers: {
        'content-type': req.headers['content-type'] || 'application/json',
        ...(req.headers.authorization
          ? { authorization: req.headers.authorization } : {}),
      },
      validateStatus: () => true,
    });
    res.status(resp.status).json(resp.data);
  } catch (err) {
    const e = err as AxiosError;
    if (e.response) {
      res.status(e.response.status).send(e.response.data);
    } else {
      res.status(502).json({ message: 'Bad Gateway' });
    }
  }
}

async function validateJwt(authHeader: string | undefined): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  try {
    await axios.get(AUTH_URL + '/validate', {
      headers: { Authorization: authHeader },
    });
    return true;
  } catch { return false; }
}

// /api-docs/patients -> patient-service /v3/api-docs
app.get('/api-docs/patients', (req, res) => {
  proxyRequest(req, res, PAT_URL, '/v3/api-docs');
});

// /api-docs/auth -> auth-service /v3/api-docs
app.get('/api-docs/auth', (req, res) => {
  proxyRequest(req, res, AUTH_URL, '/v3/api-docs');
});

// /auth/** -> auth-service, strip /auth prefix
app.all('/auth/*', (req, res) => {
  const path = req.originalUrl.replace(/^\/auth/, '') || '/';
  proxyRequest(req, res, AUTH_URL, path);
});
app.all('/auth', (req, res) => {
  proxyRequest(req, res, AUTH_URL, '/');
});

// /api/patients/** -> patient-service, strip /api, JWT protected
app.all('/api/patients/*', async (req, res) => {
  if (!(await validateJwt(req.headers.authorization))) {
    res.status(401).end(); return;
  }
  const path = req.originalUrl.replace(/^\/api/, '');
  proxyRequest(req, res, PAT_URL, path);
});
app.all('/api/patients', async (req, res) => {
  if (!(await validateJwt(req.headers.authorization))) {
    res.status(401).end(); return;
  }
  proxyRequest(req, res, PAT_URL, '/patients');
});

app.listen(PORT, () => {
  console.log('API Gateway started on port ' + PORT);
});
