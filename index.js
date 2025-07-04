const express = require('express');
const line = require('@line/bot-sdk');
const app = express();
app.use(express.json());

// 環境変数
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.Client(config);

// データ記録用（簡易ログ）
let userStates = {};
let questionOrder = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'];
let questionTexts = {
  Q1: '最近、時間の流れが早いと感じる？',
  Q2: '「得か損か」で判断する場面、多いと思う？',
  Q3: '誰かの期待に応えるために動くこと、ある？',
  Q4: '選べないとき、どうする？直感？先延ばし？',
  Q5: 'ひとりの時間って必要？それとも退屈？'
};

app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userId = event.source.userId;
      const userText = event.message.text.trim();
      const state = userStates[userId] || { step: 0, answers: {} };

      // セリフ処理：こんにちはなどで挨拶→Q1
      if (state.step === 0) {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: questionTexts['Q1']
        });
        state.step++;
        userStates[userId] = state;
        continue;
      }

      // 質問への回答処理
      if (state.step > 0 && state.step <= 5) {
        const qKey = questionOrder[state.step - 1];
        state.answers[qKey] = userText;

        if (state.step < 5) {
          const nextQ = questionTexts[questionOrder[state.step]];
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: nextQ
          });
        } else {
          // すべての質問に回答完了 → LUCAログ生成
          const code = generateLUCAcode(state.answers);
          const responseText = generateLUCAresponse(state.answers, code);

          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: responseText
          });
        }

        state.step++;
        userStates[userId] = state;
      }
    }
  }

  res.sendStatus(200);
});

// LUCAログ生成関数（Code + 観察入り）
function generateLUCAcode(answers) {
  // 例: 回答から何かしらの傾向を仮に抽出
  if (answers.Q2?.includes('思う') && answers.Q5?.includes('必要')) {
    return 'Code0872';
  }
  return 'Code0416';
}

// LUCAセリフ生成（人格切替／MBTI予測／伏線演出）
function generateLUCAresponse(answers, code) {
  const mbti = predictMBTI(answers);
  const log = Object.entries(answers).map(([k, v]) => `${k}：${v}`).join('\n');

  return `📘LUCAログ：${code}
—
${log}

🧠観測結果：
どうやら君は、${mbti}っぽいね。
「選べない時に先延ばしする癖」も、ちょっと目についた。

…ちなみに、もしあの時「違う選択」をしていたら、
Code0993になってたと思うよ。

どちらも君の一部。LUCAは、そう見てる。`;
}

// 仮のMBTI予測関数（実装簡略ver）
function predictMBTI(answers) {
  const introvert = answers.Q5?.includes('ひとり');
  const thinker = answers.Q2?.includes('損') || answers.Q4?.includes('直感');

  if (introvert && thinker) return 'INTP';
  if (introvert) return 'INFJ';
  return 'ENFP';
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LUCA webhook is running on port ${PORT}`);
});
