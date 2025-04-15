#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { App } from '../lib/App';

const app = new cdk.App();
new App(app, 'restfulapi', {});
