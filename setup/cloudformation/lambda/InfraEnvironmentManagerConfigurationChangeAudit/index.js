/* Copyright (c) Trainline Limited. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

/* eslint-disable no-console */

console.log('Loading InfraEnvironmentManagerConfigurationChangeAudit function');

exports.handler = (event, context, callback) => {
  console.log('function InfraEnvironmentManagerConfigurationChangeAudit starting...');
  const attributes = event.Records[0].Sns.MessageAttributes;
  const attributeString = Object.keys(attributes).map(key => `${key}:${attributes[key].Value}`).join(',');
  console.log('Configuration Change Attributes:', attributeString);
  const message = event.Records[0].Sns.Message;
  console.log('Configuration Change SNS:', message);
  callback(null, message);
};
