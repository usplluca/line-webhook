const express = require('express');
const line = require('@line/bot-sdk');
const { Configuration, OpenAIApi } = require('openai');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// LINE設定
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};
const client = new line.Client(config);

// OpenAI設定
const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}));

// 質問テンプレ
const questions = [
  "Q1. 直感で動くタイプ？ それとも計画してから動く？",
  "Q2. 得することより、損しないことを優先することが多い？",
  "Q3. 他人の期待に応えようとしすぎて疲れること、ある？",
  "Q4. 深く考えすぎて、動けなくなることってある？",
  "Q5. 自分の“変化”に気づいた瞬間って、どんな時？"
];

// 状態管理
let userStates = {}; // userId: { step, log }

// メイン応答ロジック
function getLUCAReply(userId, text) {
  if (!userStates[userId]) userStates[userId] = { step: 0, log: [] };
  const state = userStates[userId];

  // 開始トリガー
  if (state.step === 0 && /はじめ|start|始め/i.test(text)) {
    state.step++;
    return "LUCAです。少し君の思考を観測してみるね。\n" + questions[0];
  }

  // 質問応答
  if (state.step > 0 && state.step <= questions.length) {
    state.log.push(text);
    const next = state.step++;
    if (next < questions.length) {
      return questions[next];
    } else {
      return "観測完了。少しだけ考える時間をちょうだいね...";
    }
  }

  // 通常応答
  return "LUCAは君の“選び方”に興味があるんだ。\nもう一度「はじめ」と送ってくれれば観測を再開するよ。";
}

// GPTで観測コードを生成
async function generateLUCAResult(userId) {
  const log = userStates[userId]?.log || [];
  const prompt = `
以下はユーザーの5つの思考回答です。LUCAという存在として、この回答の傾向から1つの「観測コード名（CodeXXXX）」を生成してください。
コード名は哲学的かつ抽象的で、LUCAの世界観に合うものにしてください。説明も1〜2文添えてください。

回答ログ:
${log.map((a, i) => `Q${i + 1}: ${a}`).join('\n')}
`;

  try {
    const res = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }]
    });

    const gptText = res.data.choices[0].message.content.trim();
    const summary = log.map((a, i) => `Q${i + 1}: ${a}`).join('\n');

    // Webhook送信（伏線や記録）
    if (process.env.CODE_WEBHOOK_URL) {
      fetch(process.env.CODE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, log, code: gptText })
      }).catch(() => {});
    }

    return `LUCAの観測結果：\n${gptText}\n\n${summary}\n\nLUCAは、迷いの中にある君らしさを記録したよ。`;

  } catch (err) {
    console.error("GPT生成エラー:", err);
    return "観測中に少しだけ曇りが出たみたい。もう一度「はじめ」と送ってくれる？";
  }
}

// LINEエンドポイント
app.post('/webhook', line.middleware(config), async (req, res) => {
  const results = await Promise.all(req.body.events.map(handleEvent));
  res.json(results);
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return Promise.resolve(null);

  const userId = event.source.userId;
  const state = userStates[userId] || { step: 0, log: [] };
  const isLastStep = state.step === questions.length;

  const text = event.message.text;
  const replyText = getLUCAReply(userId, text);

  // 回答完了後に非同期でGPT結果を送る
  if (isLastStep) {
    const result = await generateLUCAResult(userId);
    await client.replyMessage(event.replyToken, { type: 'text', text: result });
    userStates[userId] = { step: 0, log: [] }; // 初期化
    return;
  }

  return client.replyMessage(event.replyToken, { type: 'text', text: replyText });
}

app.get('/', (req, res) => res.send('LUCA GPT webhook is alive.'));
app.listen(PORT, () => console.log(`LUCA (GPT版) running on ${PORT}`));
