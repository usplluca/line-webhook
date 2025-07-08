const express = require('express');
const line = require('@line/bot-sdk');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

// LINE公式SDK設定
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const app = express();

// LINEのWebhookミドルウェアを使用
app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;
  const client = new line.Client(config);

  // イベントごとに処理
  const results = await Promise.all(events.map(async (event) => {
    if (event.type === 'message' && event.message.type === 'text') {
      const replyText = `LUCA: 「${event.message.text}」を受け取ったよ。`;

      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: replyText
      });
    } else {
      return Promise.resolve(null);
    }
  }));

  res.json(results);
});

// 動作確認用
app.get('/', (req, res) => {
  res.send('LUCA webhook is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
