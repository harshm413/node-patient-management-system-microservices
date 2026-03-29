import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import prisma from './prisma/client';
import authController from './controllers/auth.controller';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();
const PORT = parseInt(process.env.PORT || '4005', 10);

// JSON body parser
app.use(express.json());

// Swagger setup
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Auth Service API',
      version: '1.0.0',
    },
  },
  apis: ['./src/controllers/*.ts', './dist/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.get('/v3/api-docs', (_req, res) => {
  res.json(swaggerSpec);
});

app.use('/swagger-ui', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount auth controller at root
app.use('/', authController);

// Error middleware AFTER routes
app.use(errorMiddleware);

// Seed function (reuses logic from prisma/seed.ts)
async function seed(): Promise<void> {
  await prisma.user.upsert({
    where: { id: '223e4567-e89b-12d3-a456-426614174006' },
    update: {},
    create: {
      id: '223e4567-e89b-12d3-a456-426614174006',
      email: 'testuser@test.com',
      password: '$2b$12$7hoRZfJrRKD2nIm2vHLs7OBETy.LWenXXMLKf99W8M4PUwO6KB7fu',
      role: 'ADMIN',
    },
  });
  console.log('Seed completed: test user upserted');
}

// Start server
async function main(): Promise<void> {
  await prisma.$connect();
  await seed();

  app.listen(PORT, () => {
    console.log(`Auth Service started on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start Auth Service:', err);
  process.exit(1);
});
