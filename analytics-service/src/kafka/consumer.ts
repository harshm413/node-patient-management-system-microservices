import { Kafka, Consumer } from 'kafkajs';
import protobuf from 'protobufjs';
import path from 'path';

const PROTO_PATH = require('fs').existsSync(path.resolve(process.cwd(), 'proto/patient_event.proto'))
  ? path.resolve(process.cwd(), 'proto/patient_event.proto')
  : path.resolve(process.cwd(), '../proto/patient_event.proto');

export class KafkaConsumer {
  private consumer: Consumer;
  private PatientEvent: protobuf.Type | null = null;

  constructor(brokers: string[], groupId: string) {
    const kafka = new Kafka({
      clientId: 'analytics-service',
      brokers,
    });
    this.consumer = kafka.consumer({ groupId });
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
    const root = await protobuf.load(PROTO_PATH);
    this.PatientEvent = root.lookupType('patient.events.PatientEvent');
  }

  async subscribe(topic: string): Promise<void> {
    await this.consumer.subscribe({ topic, fromBeginning: true });
  }

  async run(): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        try {
          if (!this.PatientEvent) {
            throw new Error('PatientEvent type not loaded. Call connect() first.');
          }

          const value = message.value;
          if (!value) {
            return;
          }

          const patientEvent = this.PatientEvent.decode(value);
          const obj = this.PatientEvent.toObject(patientEvent);

          console.log(
            `Received Patient Event: [PatientId=${obj.patientId},PatientName=${obj.name},PatientEmail=${obj.email}]`
          );
        } catch (error) {
          console.error('Error deserializing event', error);
        }
      },
    });
  }
}
