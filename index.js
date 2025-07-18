const express = require('express');
const line = require('@line/bot-sdk');
const getRawBody = require('raw-body');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};
const client = new line.Client(config);

// 🔧 Firebase初期化（JSON文字列から構文解析）
const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
});

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
          text: 'LUCAが受信したよ：' + event.message.text,
        });
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Error handling webhook:', err);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
