const express = require('express');
const line = require('@line/bot-sdk');
const getRawBody = require('raw-body');
const admin = require('firebase-admin');
const app = express();

// LINE設定
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};
const client = new line.Client(config);

// Firebase認証
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// 生のbodyを受け取る（署名検証に必要）
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
        const userMessage = event.message.text;
        const replyToken = event.replyToken;

        // Firestoreに保存（任意）
        await db.collection('messages').add({
          userId: event.source.userId,
          message: userMessage,
          timestamp: new Date(),
        });

        // 返信メッセージ
        await client.replyMessage(replyToken, {
          type: 'text',
          text: `LUCAからの返信：${userMessage}`,
        });
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Error');
  }
});

// Railway用ポート対応（ここ重要）
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
