const express = require('express');
const line = require('@line/bot-sdk');
const getRawBody = require('raw-body');
const admin = require('firebase-admin');

const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// LINEクライアント
const client = new line.Client(config);

// Firebase初期化（B64 decode）
const firebaseCredential = JSON.parse(
  Buffer.from(process.env.FIREBASE_CREDENTIAL_B64, 'base64').toString()
);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseCredential),
  });
}

// Webhook受信
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
          text: `LUCAは見てるよ：「${event.message.text}」`,
        });
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});
