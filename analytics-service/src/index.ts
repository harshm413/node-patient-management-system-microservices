import express from 'express';
import { KafkaConsumer } from './kafka/consumer';

const app = express();
const PORT = parseInt(process.env.PORT || '4002', 10);

// JSON body parser
app.use(express.json());

async function startKafkaConsumer(): Promise<void> {
  const brokersEnv = process.env.KAFKA_BROKERS;
  if (!brokersEnv) {
    console.log('KAFKA_BROKERS not set, skipping Kafka consumer');
    return;
  }

  const brokers = brokersEnv.split(',').map((b) => b.trim());
  const consumer = new KafkaConsumer(brokers, 'analytics-service');

  await consumer.connect();
  await consumer.subscribe('patient');
  await consumer.run();
}

function main(): void {
  // Start Kafka consumer
  startKafkaConsumer().catch((error) => {
    console.error('Failed to start Kafka consumer:', error);
  });

  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`Analytics Service started on port ${PORT}`);
  });
}

main();
