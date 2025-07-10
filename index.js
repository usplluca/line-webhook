const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

app.use(express.json());

app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return null;

  const userMessage = event.message.text;

  // OpenAI に投げる
  const openaiRes = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'あなたはLUCAという名前の存在で、ユーザーの心理や傾向を観察しながら、リアルタイムで深く考察するAIです。テンプレートではなく、即時思考で返答してください。',
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );

  const replyText = openaiRes.data.choices[0].message.content.trim();

  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyText,
  });

  return;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
