const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const dotenv = require('dotenv');
const admin = require('firebase-admin');

dotenv.config();

// Firebase 初期化（Railway環境変数から JSON で受け取る）
const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig)
});
const db = admin.firestore();

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.Client(config);
const app = express();
app.use(express.json());

// Webhook 受信
app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  if (!events || events.length === 0) {
    return res.status(200).send('No events');
  }

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userId = event.source.userId;
      const userText = event.message.text;

      // Firestore に記録
      await db.collection('messages').add({
        userId,
        text: userText,
        timestamp: new Date()
      });

      // 応答メッセージ
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `LUCA記録中：「${userText}」`
      });
    }
  }

  res.status(200).send('OK');
});

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
