'use strict';

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const tableName = process.env.DYNAMODB_TABLE;

  // Parse the incoming request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    console.error('Invalid JSON format:', err);
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ message: 'Invalid JSON format' }),
    };
  }

  const { pk, sk, data } = body;

  // Validate required fields
  if (!pk || !sk || !data || !data.name) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ message: 'Missing required fields: pk, sk, and data.name' }),
    };
  }

  // Construct the DynamoDB parameters
  const params = {
    TableName: tableName,
    Item: {
      pk: pk, // Partition key
      sk: sk, // Sort key
      name: data.name, // Store the name
    },
  };

  // Save the item to DynamoDB
  // Save the item to DynamoDB
try {
  console.log('Name to be saved:', data.name); // Log the name being added
  await dynamodb.put(params).promise();
  console.log('Data saved successfully:', params.Item); 
  
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ message: 'Data saved successfully', data: params.Item }),
    };
  } catch (err) {
    console.error('Error saving data:', err);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ message: 'Failed to save data', error: err.message }),
    };
  }
};