import {
  Stack,
  StackProps,
  RemovalPolicy,
  Duration,
  Token,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as msk from 'aws-cdk-lib/aws-msk';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';

export class LocalStack extends Stack {
  private readonly vpc: ec2.Vpc;
  private readonly ecsCluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.vpc = this.createVpc();

    const authServiceDb = this.createDatabase('AuthServiceDB', 'auth-service-db');
    const patientServiceDb = this.createDatabase('PatientServiceDB', 'patient-service-db');

    const authDbHealthCheck = this.createDbHealthCheck(authServiceDb, 'AuthServiceDBHealthCheck');
    const patientDbHealthCheck = this.createDbHealthCheck(patientServiceDb, 'PatientServiceDBHealthCheck');

    const mskCluster = this.createMskCluster();

    this.ecsCluster = this.createEcsCluster();

    const authService = this.createFargateService(
      'AuthService',
      'auth-service',
      [4005],
      authServiceDb,
      { JWT_SECRET: 'Y2hhVEc3aHJnb0hYTzMyZ2ZqVkpiZ1RkZG93YWxrUkM=' }
    );
    authService.node.addDependency(authDbHealthCheck);
    authService.node.addDependency(authServiceDb);

    const billingService = this.createFargateService(
      'BillingService',
      'billing-service',
      [4001, 9001],
      undefined,
      undefined
    );

    const analyticsService = this.createFargateService(
      'AnalyticsService',
      'analytics-service',
      [4002],
      undefined,
      undefined
    );
    analyticsService.node.addDependency(mskCluster);

    const patientService = this.createFargateService(
      'PatientService',
      'patient-service',
      [4000],
      patientServiceDb,
      {
        BILLING_SERVICE_ADDRESS: 'host.docker.internal',
        BILLING_SERVICE_GRPC_PORT: '9001',
      }
    );
    patientService.node.addDependency(patientServiceDb);
    patientService.node.addDependency(patientDbHealthCheck);
    patientService.node.addDependency(billingService);
    patientService.node.addDependency(mskCluster);

    this.createApiGatewayService();
  }

  private createVpc(): ec2.Vpc {
    return new ec2.Vpc(this, 'PatientManagementVPC', {
      vpcName: 'PatientManagementVPC',
      maxAzs: 2,
    });
  }

  private createDatabase(id: string, dbName: string): rds.DatabaseInstance {
    return new rds.DatabaseInstance(this, id, {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_17_2,
      }),
      vpc: this.vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE2,
        ec2.InstanceSize.MICRO
      ),
      allocatedStorage: 20,
      credentials: rds.Credentials.fromGeneratedSecret('admin_user'),
      databaseName: dbName,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }

  private createDbHealthCheck(
    db: rds.DatabaseInstance,
    id: string
  ): route53.CfnHealthCheck {
    return new route53.CfnHealthCheck(this, id, {
      healthCheckConfig: {
        type: 'TCP',
        port: Token.asNumber(db.dbInstanceEndpointPort),
        ipAddress: db.dbInstanceEndpointAddress,
        requestInterval: 30,
        failureThreshold: 3,
      },
    });
  }

  private createMskCluster(): msk.CfnCluster {
    return new msk.CfnCluster(this, 'MskCluster', {
      clusterName: 'kafa-cluster',
      kafkaVersion: '2.8.0',
      numberOfBrokerNodes: 1,
      brokerNodeGroupInfo: {
        instanceType: 'kafka.m5.xlarge',
        clientSubnets: this.vpc.privateSubnets.map((subnet) => subnet.subnetId),
        brokerAzDistribution: 'DEFAULT',
      },
    });
  }

  private createEcsCluster(): ecs.Cluster {
    return new ecs.Cluster(this, 'PatientManagementCluster', {
      vpc: this.vpc,
      defaultCloudMapNamespace: {
        name: 'patient-management.local',
      },
    });
  }

  private createFargateService(
    id: string,
    imageName: string,
    ports: number[],
    db?: rds.DatabaseInstance,
    additionalEnvVars?: Record<string, string>
  ): ecs.FargateService {
    const taskDefinition = new ecs.FargateTaskDefinition(this, `${id}Task`, {
      cpu: 256,
      memoryLimitMiB: 512,
    });

    const envVars: Record<string, string> = {
      SPRING_KAFKA_BOOTSTRAP_SERVERS:
        'localhost.localstack.cloud:4510, localhost.localstack.cloud:4511, localhost.localstack.cloud:4512',
    };

    if (additionalEnvVars) {
      Object.assign(envVars, additionalEnvVars);
    }

    if (db) {
      envVars['SPRING_DATASOURCE_URL'] =
        `jdbc:postgresql://${db.dbInstanceEndpointAddress}:${db.dbInstanceEndpointPort}/${imageName}-db`;
      envVars['SPRING_DATASOURCE_USERNAME'] = 'admin_user';
      envVars['SPRING_DATASOURCE_PASSWORD'] =
        db.secret!.secretValueFromJson('password').toString();
      envVars['SPRING_JPA_HIBERNATE_DDL_AUTO'] = 'update';
      envVars['SPRING_SQL_INIT_MODE'] = 'always';
      envVars['SPRING_DATASOURCE_HIKARI_INITIALIZATION_FAIL_TIMEOUT'] = '60000';
    }

    taskDefinition.addContainer(`${imageName}Container`, {
      image: ecs.ContainerImage.fromRegistry(imageName),
      portMappings: ports.map((port) => ({
        containerPort: port,
        hostPort: port,
        protocol: ecs.Protocol.TCP,
      })),
      logging: ecs.LogDriver.awsLogs({
        logGroup: new logs.LogGroup(this, `${id}LogGroup`, {
          logGroupName: `/ecs/${imageName}`,
          removalPolicy: RemovalPolicy.DESTROY,
          retention: logs.RetentionDays.ONE_DAY,
        }),
        streamPrefix: imageName,
      }),
      environment: envVars,
    });

    return new ecs.FargateService(this, id, {
      cluster: this.ecsCluster,
      taskDefinition,
      assignPublicIp: false,
      serviceName: imageName,
    });
  }

  private createApiGatewayService(): void {
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      'APIGatewayTaskDefinition',
      {
        cpu: 256,
        memoryLimitMiB: 512,
      }
    );

    taskDefinition.addContainer('APIGatewayContainer', {
      image: ecs.ContainerImage.fromRegistry('api-gateway'),
      environment: {
        SPRING_PROFILES_ACTIVE: 'prod',
        AUTH_SERVICE_URL: 'http://host.docker.internal:4005',
      },
      portMappings: [4004].map((port) => ({
        containerPort: port,
        hostPort: port,
        protocol: ecs.Protocol.TCP,
      })),
      logging: ecs.LogDriver.awsLogs({
        logGroup: new logs.LogGroup(this, 'ApiGatewayLogGroup', {
          logGroupName: '/ecs/api-gateway',
          removalPolicy: RemovalPolicy.DESTROY,
          retention: logs.RetentionDays.ONE_DAY,
        }),
        streamPrefix: 'api-gateway',
      }),
    });

    new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      'APIGatewayService',
      {
        cluster: this.ecsCluster,
        serviceName: 'api-gateway',
        taskDefinition,
        desiredCount: 1,
        healthCheckGracePeriod: Duration.seconds(60),
      }
    );
  }
}
