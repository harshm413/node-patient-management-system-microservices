import { App, AppProps, StackProps, BootstraplessSynthesizer } from 'aws-cdk-lib';
import { LocalStack } from '../lib/local-stack';

const app = new App({ outdir: './cdk.out' } as AppProps);

const props: StackProps = {
  synthesizer: new BootstraplessSynthesizer(),
};

new LocalStack(app, 'localstack', props);
app.synth();
console.log('App synthesizing in progress...');
