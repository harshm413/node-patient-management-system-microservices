import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import prisma from './prisma/client';
import { createPatientRouter } from './controllers/patient.controller';
import { errorMiddleware } from './middleware/error.middleware';
import { BillingServiceGrpcClient } from './grpc/billing-client';
import { KafkaProducer } from './kafka/producer';
import { PatientService } from './services/patient.service';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// JSON body parser
app.use(express.json());

// Swagger setup
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Patient Service API',
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

// Create dependencies
const billingClient = new BillingServiceGrpcClient();
const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const kafkaProducer = new KafkaProducer(kafkaBrokers);
const patientService = new PatientService(billingClient, kafkaProducer);

// Mount patient router at /patients
const patientRouter = createPatientRouter(patientService);
app.use('/patients', patientRouter);

// Error middleware AFTER routes
app.use(errorMiddleware);

// Seed function (reuses logic from prisma/seed.ts)
async function seed(): Promise<void> {
  const patients = [
    { id: '123e4567-e89b-12d3-a456-426614174000', name: 'John Doe', email: 'john.doe@example.com', address: '123 Main St, Springfield', dateOfBirth: new Date('1985-06-15'), registeredDate: new Date('2024-01-10') },
    { id: '123e4567-e89b-12d3-a456-426614174001', name: 'Jane Smith', email: 'jane.smith@example.com', address: '456 Elm St, Shelbyville', dateOfBirth: new Date('1990-09-23'), registeredDate: new Date('2023-12-01') },
    { id: '123e4567-e89b-12d3-a456-426614174002', name: 'Alice Johnson', email: 'alice.johnson@example.com', address: '789 Oak St, Capital City', dateOfBirth: new Date('1978-03-12'), registeredDate: new Date('2022-06-20') },
    { id: '123e4567-e89b-12d3-a456-426614174003', name: 'Bob Brown', email: 'bob.brown@example.com', address: '321 Pine St, Springfield', dateOfBirth: new Date('1982-11-30'), registeredDate: new Date('2023-05-14') },
    { id: '123e4567-e89b-12d3-a456-426614174004', name: 'Emily Davis', email: 'emily.davis@example.com', address: '654 Maple St, Shelbyville', dateOfBirth: new Date('1995-02-05'), registeredDate: new Date('2024-03-01') },
    { id: '223e4567-e89b-12d3-a456-426614174005', name: 'Michael Green', email: 'michael.green@example.com', address: '987 Cedar St, Springfield', dateOfBirth: new Date('1988-07-25'), registeredDate: new Date('2024-02-15') },
    { id: '223e4567-e89b-12d3-a456-426614174006', name: 'Sarah Taylor', email: 'sarah.taylor@example.com', address: '123 Birch St, Shelbyville', dateOfBirth: new Date('1992-04-18'), registeredDate: new Date('2023-08-25') },
    { id: '223e4567-e89b-12d3-a456-426614174007', name: 'David Wilson', email: 'david.wilson@example.com', address: '456 Ash St, Capital City', dateOfBirth: new Date('1975-01-11'), registeredDate: new Date('2022-10-10') },
    { id: '223e4567-e89b-12d3-a456-426614174008', name: 'Laura White', email: 'laura.white@example.com', address: '789 Palm St, Springfield', dateOfBirth: new Date('1989-09-02'), registeredDate: new Date('2024-04-20') },
    { id: '223e4567-e89b-12d3-a456-426614174009', name: 'James Harris', email: 'james.harris@example.com', address: '321 Cherry St, Shelbyville', dateOfBirth: new Date('1993-11-15'), registeredDate: new Date('2023-06-30') },
    { id: '223e4567-e89b-12d3-a456-426614174010', name: 'Emma Moore', email: 'emma.moore@example.com', address: '654 Spruce St, Capital City', dateOfBirth: new Date('1980-08-09'), registeredDate: new Date('2023-01-22') },
    { id: '223e4567-e89b-12d3-a456-426614174011', name: 'Ethan Martinez', email: 'ethan.martinez@example.com', address: '987 Redwood St, Springfield', dateOfBirth: new Date('1984-05-03'), registeredDate: new Date('2024-05-12') },
    { id: '223e4567-e89b-12d3-a456-426614174012', name: 'Sophia Clark', email: 'sophia.clark@example.com', address: '123 Hickory St, Shelbyville', dateOfBirth: new Date('1991-12-25'), registeredDate: new Date('2022-11-11') },
    { id: '223e4567-e89b-12d3-a456-426614174013', name: 'Daniel Lewis', email: 'daniel.lewis@example.com', address: '456 Cypress St, Capital City', dateOfBirth: new Date('1976-06-08'), registeredDate: new Date('2023-09-19') },
    { id: '223e4567-e89b-12d3-a456-426614174014', name: 'Isabella Walker', email: 'isabella.walker@example.com', address: '789 Willow St, Springfield', dateOfBirth: new Date('1987-10-17'), registeredDate: new Date('2024-03-29') },
  ];

  for (const patient of patients) {
    await prisma.patient.upsert({
      where: { id: patient.id },
      update: {},
      create: patient,
    });
  }

  console.log('Seed completed: 15 test patients upserted');
}

// Start server
async function main(): Promise<void> {
  await prisma.$connect();
  await seed();

  try {
    await kafkaProducer.connect();
  } catch (error) {
    console.error('Failed to connect Kafka producer:', error);
  }

  app.listen(PORT, () => {
    console.log(`Patient Service started on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start Patient Service:', err);
  process.exit(1);
});
