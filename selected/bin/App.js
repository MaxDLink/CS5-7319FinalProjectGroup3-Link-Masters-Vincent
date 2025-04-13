"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");

const cdk = require("aws-cdk-lib");
const App_1 = require("../lib/App");
const app = new cdk.App();

new App_1.App(app, 'App', {});