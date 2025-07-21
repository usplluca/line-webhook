const express = require('express');
const line = require('@line/bot-sdk');
const admin = require('firebase-admin');
const getRawBody = require('raw-body');
const axios = require('axios');

// Firebase Base64から初期化
const firebaseCredential = JSON.parse(
  Buffer.from(process.env.FIREBASE_CREDENTIAL_B64, 'base64').toString('utf8')
);
admin.initializeApp({
  credential: admin.credential.cert(firebaseCredential),
});

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);
const app = express();

app.post('/webhook', async (req, res) => {
  try {
    const body = await getRawBody(req);
    const signature = req.headers['x-line-signature'];

    if (!line.validateSignature(body, config.channelSecret, signature)) {
      return res.status(401).send('Signature validation failed');
    }

    const events = JSON.parse(body.toString()).events;
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: `Echo: ${event.message.text}`,
        });
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

app.get('/', (req, res) => {
  res.send('LUCA webhook is alive');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
