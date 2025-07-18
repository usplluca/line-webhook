const express = require('express');
const line = require('@line/bot-sdk');
const admin = require('firebase-admin');
const axios = require('axios');
const getRawBody = require('raw-body');

const app = express();

// LINE設定（Railwayの環境変数を使用）
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

// Firebase設定
const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
firebaseConfig.private_key = firebaseConfig.private_key.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
});
const db = admin.firestore();

// Webhook受信処理
app.post('/webhook', async (req, res) => {
  const body = await getRawBody(req);
  const signature = req.headers['x-line-signature'];

  if (!line.validateSignature(body, config.channelSecret, signature)) {
    return res.status(401).send('Signature validation failed');
  }

  const events = JSON.parse(body.toString()).events;
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text;

      // 応答生成（OpenAI使用する場合）
      const replyMessage = {
        type: 'text',
        text: `受け取ったよ：「${userMessage}」`,
      };

      // Firestoreログ保存（任意）
      await db.collection('logs').add({
        userId: event.source.userId,
        message: userMessage,
        timestamp: new Date(),
      });

      // LINEへ返信
      await client.replyMessage(event.replyToken, [replyMessage]);
    }
  }

  res.send('OK');
});

// ポート指定
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
