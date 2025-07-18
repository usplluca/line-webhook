const express = require('express');
const line = require('@line/bot-sdk');
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// .env 環境変数の読み込み
require('dotenv').config();

// Firebaseの初期化（Railway環境変数からJSONをパースして渡す）
const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
initializeApp({
  credential: cert(firebaseConfig)
});
const db = getFirestore();

// LINE設定
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};
const client = new line.Client(config);

// Expressアプリ設定
const app = express();
app.use(express.json());

// LINE webhook受信
app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events;
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: 'LUCAが受信したよ：' + event.message.text,
        });

        // Firestoreにメッセージ保存
        await db.collection('messages').add({
          userId: event.source.userId,
          message: event.message.text,
          timestamp: new Date(),
        });
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ポート設定
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
