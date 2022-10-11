#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ScSelfServiceStack } from '../lib/sc-self-service-stack';

const app = new cdk.App();

new ScSelfServiceStack(app, 'ScSelfServiceStack', {
  terminationProtection: false
});
