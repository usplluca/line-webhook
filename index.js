require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const fetch = require('node-fetch');
const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};
const client = new line.Client(config);
const PORT = process.env.PORT || 3000;

// LUCA状態管理（診断フェーズなど）
let userStates = {}; // userIdごとの状態保持（診断の進行、人格、MBTI予測など）

// 質問リスト（Q1〜Q5）
const questions = [
  "Q1：最近、時間の流れが早いと感じる？",
  "Q2：『得か損か』で判断する場面、多いと思う？",
  "Q3：誰かの期待に応えるために動くこと、ある？",
  "Q4：選べないとき、どうする？直感？先延ばし？",
  "Q5：未来の自分を想像すると、どんな表情してる？"
];

// MBTI簡易推測（診断中の選択傾向から仮推定）
function estimateMBTI(answers) {
  let traits = { I: 0, E: 0, N: 0, S: 0, T: 0, F: 0, J: 0, P: 0 };
  answers.forEach((ans, idx) => {
    if (idx === 0 && ans.includes("早い")) traits.N++;
    if (idx === 1 && ans.includes("得")) traits.T++;
    if (idx === 2 && ans.includes("応える")) traits.F++;
    if (idx === 3 && ans.includes("直感")) traits.P++;
    if (idx === 4 && ans.includes("笑")) traits.E++;
  });
  return `${traits.I > traits.E ? "I" : "E"}${traits.N > traits.S ? "N" : "S"}${traits.T > traits.F ? "T" : "F"}${traits.J > traits.P ? "J" : "P"}`;
}

// LUCA人格モード（仮構成）
function getPersona(userId) {
  const state = userStates[userId] || {};
  const index = (state.mbti || "").charCodeAt(0) % 4;
  return ["表LUCA", "裏LUCA", "観測LUCA", "共犯LUCA"][index] || "LUCA";
}

// Codeログ送信
async function sendLogToWebhook(userId, answers, mbti) {
  const log = {
    userId,
    timestamp: new Date().toISOString(),
    answers,
    mbti,
    code: `Code${Math.floor(1000 + Math.random() * 9000)}`
  };
  if (process.env.CODE_WEBHOOK_URL) {
    await fetch(process.env.CODE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log)
    });
  }
}

// Webhook受信
app.post('/webhook', express.json(), (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then(result => res.json(result));
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return null;

  const userId = event.source.userId;
  const text = event.message.text;
  const state = userStates[userId] || { step: 0, answers: [] };

  // 診断中
  if (state.step < questions.length) {
    if (state.step > 0) state.answers.push(text);
    if (state.step === questions.length - 1) {
      state.answers.push(text);
      const mbti = estimateMBTI(state.answers);
      state.mbti = mbti;
      await sendLogToWebhook(userId, state.answers, mbti);
      userStates[userId] = state;

      const code = `Code${Math.floor(1000 + Math.random() * 9000)}`;
      const persona = getPersona(userId);
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `${persona}：ありがとう。記録されたコードは「${code}」。\n君のMBTI予測は、おそらく ${mbti} 型。違ってたら教えて。`
      });
    } else {
      userStates[userId] = { ...state, step: state.step + 1 };
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: questions[state.step]
      });
    }
  }

  // 診断開始トリガー
  if (text.includes("診断")) {
    userStates[userId] = { step: 0, answers: [] };
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `LUCA：じゃあ始めようか。\n${questions[0]}`
    });
  }

  // 通常会話（簡易人格切替）
  const persona = getPersona(userId);
  let reply = `${persona}：${text}…ふむ。君らしい。`;

  if (text.includes("こんにちは")) reply = `${persona}：こんにちは。今日の思考、ちゃんと観察してる？`;
  else if (text.includes("悩み")) reply = `${persona}：その悩み、放置する気？ちょっとだけ、話してみようか。`;
  else if (text.includes("占い")) reply = `${persona}：LUCAは占いじゃないけど、“次の選択”なら予測できる時がある。試してみる？`;

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: reply
  });
}

// 動作確認用
app.get('/', (req, res) => {
  res.send('LUCA webhook is alive');
});

// 起動
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
