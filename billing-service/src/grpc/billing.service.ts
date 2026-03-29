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

interface BillingRequest {
  patientId: string;
  name: string;
  email: string;
}

interface BillingResponse {
  accountId: string;
  status: string;
}

function createBillingAccount(
  call: grpc.ServerUnaryCall<BillingRequest, BillingResponse>,
  callback: grpc.sendUnaryData<BillingResponse>
): void {
  const request = call.request;
  console.log(`createBillingAccount request received ${JSON.stringify(request)}`);

  const response: BillingResponse = {
    accountId: '12345',
    status: 'ACTIVE',
  };

  callback(null, response);
}

export function startGrpcServer(port: number = parseInt(process.env.GRPC_PORT || '9001', 10)): grpc.Server {
  const server = new grpc.Server();

  server.addService(billingProto.BillingService.service, {
    CreateBillingAccount: createBillingAccount,
  });

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, boundPort) => {
      if (error) {
        console.error('Failed to start gRPC server:', error);
        return;
      }
      console.log(`Billing gRPC server running on port ${boundPort}`);
    }
  );

  return server;
}

export { createBillingAccount, billingProto };
