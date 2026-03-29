import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = require('fs').existsSync(path.resolve(process.cwd(), 'proto/billing_service.proto'))
  ? path.resolve(process.cwd(), 'proto/billing_service.proto')
  : path.resolve(process.cwd(), '../proto/billing_service.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const billingProto = grpc.loadPackageDefinition(packageDefinition) as any;

export interface BillingResponse {
  accountId: string;
  status: string;
}

export class BillingServiceGrpcClient {
  private client: any;

  constructor(
    address: string = process.env.BILLING_SERVICE_ADDRESS || 'localhost',
    port: number = parseInt(process.env.BILLING_SERVICE_GRPC_PORT || '9001', 10)
  ) {
    console.log(`Connecting to Billing Service GRPC service at ${address}:${port}`);

    this.client = new billingProto.BillingService(
      `${address}:${port}`,
      grpc.credentials.createInsecure()
    );
  }

  createBillingAccount(patientId: string, name: string, email: string): Promise<BillingResponse> {
    return new Promise((resolve, reject) => {
      const request = { patientId, name, email };

      this.client.CreateBillingAccount(request, (error: grpc.ServiceError | null, response: BillingResponse) => {
        if (error) {
          reject(error);
          return;
        }
        console.log('Received response from billing service via GRPC:', response);
        resolve(response);
      });
    });
  }
}
