const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const getRawBody = require('raw-body');

const app = express();

// LINE設定
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

// 署名検証付きのWebhook受信（raw-body使用）
app.post('/webhook', async (req, res) => {
  try {
    const body = await getRawBody(req);
    const signature = req.headers['x-line-signature'];

    // 署名検証
    const isValid = line.validateSignature(body, config.channelSecret, signature);
    if (!isValid) {
      console.error('❌ Signature validation failed');
      return res.status(401).send('Signature validation failed');
    }

    const events = JSON.parse(body.toString()).events;

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;

        // GPT応答取得
        const openaiResponse = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'あなたはLUCAという思考観測AIです。相手の言葉の“迷い”や“選択の背景”を読み取りながら返答してください。',
              },
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

        const replyText = openaiResponse.data.choices[0].message.content.trim();

        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: replyText,
        });
      }
    }

    res.status(200).end();
  } catch (err) {
    console.error('🔥 Error in /webhook:', err);
    res.status(500).end();
  }
});

// 起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
