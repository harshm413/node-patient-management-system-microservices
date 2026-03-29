import express from 'express';
import { startGrpcServer } from './grpc/billing.service';

const app = express();
const PORT = parseInt(process.env.PORT || '4001', 10);
const GRPC_PORT = parseInt(process.env.GRPC_PORT || '9001', 10);

// JSON body parser
app.use(express.json());

// Start servers
function main(): void {
  // Start gRPC server
  startGrpcServer(GRPC_PORT);

  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`Billing Service started on port ${PORT}`);
  });
}

main();
