import prisma from '../prisma/client';
import { BillingServiceGrpcClient } from '../grpc/billing-client';
import { KafkaProducer } from '../kafka/producer';
import {
  EmailAlreadyExistsException,
  PatientNotFoundException,
} from '../errors/errors';

export interface PatientRequestDTO {
  name: string;
  email: string;
  address: string;
  dateOfBirth: string;
  registeredDate?: string;
}

export interface PatientResponseDTO {
  id: string;
  name: string;
  email: string;
  address: string;
  dateOfBirth: string;
}

function toDTO(patient: {
  id: string;
  name: string;
  email: string;
  address: string;
  dateOfBirth: Date;
}): PatientResponseDTO {
  return {
    id: patient.id,
    name: patient.name,
    email: patient.email,
    address: patient.address,
    dateOfBirth: patient.dateOfBirth.toISOString().split('T')[0],
  };
}

export class PatientService {
  private billingClient: BillingServiceGrpcClient;
  private kafkaProducer: KafkaProducer;

  constructor(
    billingClient: BillingServiceGrpcClient,
    kafkaProducer: KafkaProducer
  ) {
    this.billingClient = billingClient;
    this.kafkaProducer = kafkaProducer;
  }

  async getPatients(): Promise<PatientResponseDTO[]> {
    const patients = await prisma.patient.findMany();
    return patients.map(toDTO);
  }

  async createPatient(dto: PatientRequestDTO): Promise<PatientResponseDTO> {
    const existingPatient = await prisma.patient.findFirst({
      where: { email: dto.email },
    });

    if (existingPatient) {
      throw new EmailAlreadyExistsException(
        'A patient with this email already exists' + dto.email
      );
    }

    const newPatient = await prisma.patient.create({
      data: {
        name: dto.name,
        email: dto.email,
        address: dto.address,
        dateOfBirth: new Date(dto.dateOfBirth),
        registeredDate: new Date(dto.registeredDate!),
      },
    });

    this.billingClient.createBillingAccount(
      newPatient.id,
      newPatient.name,
      newPatient.email
    );

    this.kafkaProducer.sendEvent({
      id: newPatient.id,
      name: newPatient.name,
      email: newPatient.email,
    });

    return toDTO(newPatient);
  }

  async updatePatient(
    id: string,
    dto: PatientRequestDTO
  ): Promise<PatientResponseDTO> {
    const patient = await prisma.patient.findUnique({ where: { id } });

    if (!patient) {
      throw new PatientNotFoundException('Patient not found with ID: ' + id);
    }

    const emailConflict = await prisma.patient.findFirst({
      where: {
        email: dto.email,
        id: { not: id },
      },
    });

    if (emailConflict) {
      throw new EmailAlreadyExistsException(
        'A patient with this email already exists' + dto.email
      );
    }

    const updatedPatient = await prisma.patient.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        address: dto.address,
        dateOfBirth: new Date(dto.dateOfBirth),
      },
    });

    return toDTO(updatedPatient);
  }

  async deletePatient(id: string): Promise<void> {
    await prisma.patient.deleteMany({ where: { id } });
  }
}
