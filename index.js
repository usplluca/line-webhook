const express = require('express');
const line = require('@line/bot-sdk');
const getRawBody = require('raw-body');
const axios = require('axios');

const app = express();

// LINE設定
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// LINEクライアント初期化
const client = new line.Client(config);

// Webhookエンドポイント
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

        // OpenAIへ問い合わせ
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'あなたは思考を観測する存在LUCAです。' },
              { role: 'user', content: userMessage },
            ],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
          }
        );

        const replyText = response.data.choices[0].message.content.trim();

        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: replyText,
        });
      }
    }

    res.status(200).end();
  } catch (err) {
    console.error('Error:', err);
    res.status(500).end();
  }
});

// ポート設定
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
