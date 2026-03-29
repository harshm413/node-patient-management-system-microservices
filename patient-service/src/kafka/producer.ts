import { Kafka, Producer } from 'kafkajs';
import protobuf from 'protobufjs';
import path from 'path';

const PROTO_PATH = require('fs').existsSync(path.resolve(process.cwd(), 'proto/patient_event.proto'))
  ? path.resolve(process.cwd(), 'proto/patient_event.proto')
  : path.resolve(process.cwd(), '../proto/patient_event.proto');

export class KafkaProducer {
  private producer: Producer;
  private PatientEvent: protobuf.Type | null = null;

  constructor(brokers: string[]) {
    const kafka = new Kafka({
      clientId: 'patient-service',
      brokers,
    });
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
    const root = await protobuf.load(PROTO_PATH);
    this.PatientEvent = root.lookupType('patient.events.PatientEvent');
  }

  async sendEvent(patient: { id: string; name: string; email: string }): Promise<void> {
    try {
      if (!this.PatientEvent) {
        throw new Error('PatientEvent type not loaded. Call connect() first.');
      }

      const event = {
        patientId: patient.id,
        name: patient.name,
        email: patient.email,
        event_type: 'PATIENT_CREATED',
      };

      const message = this.PatientEvent.create(event);
      const buffer = Buffer.from(this.PatientEvent.encode(message).finish());

      await this.producer.send({
        topic: 'patient',
        messages: [{ value: buffer }],
      });
    } catch (error) {
      console.error('Error sending PatientCreated event:', error);
    }
  }
}
