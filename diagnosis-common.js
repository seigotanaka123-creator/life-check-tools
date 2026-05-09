const NOTE_PROFILE_URL = "https://note.com/cheeky_guppy1145";

const ARTICLE_URLS = {
  "日焼け止めだけでは防げません。": "https://note.com/cheeky_guppy1145/n/na2249cee2f4e",
  "服も髪も部屋も\"色\"で9割決まる": "https://note.com/cheeky_guppy1145/n/n38b1ad264707",
  "朝の服選びを迷わなくする、ワンピース活用法。": "https://note.com/cheeky_guppy1145/n/n6221254663a2",
  "誰でも\"垢ぬける髪型\"の見つけ方": "https://note.com/cheeky_guppy1145/n/n519a4efe2fd4",
  "見た目と気持ちを整えるアクセサリーの使い方。": "https://note.com/cheeky_guppy1145/n/nf4766bc8e111",
  "センス不要で垢ぬける、骨格診断のシンプルな活用法。": "https://note.com/cheeky_guppy1145/n/n827ff75def2a",
  "\"また会いたい\"につながりやすくなる、さりげない習慣": "https://note.com/cheeky_guppy1145/n/n8f22b161656a",
  "ただの花見が忘れられない1日に近づく方法。": "https://note.com/cheeky_guppy1145/n/n274d93bb997a",
  "センスが良い人に少し近づくためのプレゼント習慣。": "https://note.com/cheeky_guppy1145/n/n679c052825d2",
  "下着を変えるだけで、1日の快適さが変わる話": "https://note.com/cheeky_guppy1145/n/n179e0709601d",
  "週末の質を上げる金曜日の過ごし方。": "https://note.com/cheeky_guppy1145/n/n51dceefd84d8",
  "週末の質を上げる金曜日の過ごし方": "https://note.com/cheeky_guppy1145/n/n51dceefd84d8",
  "無駄な疲れをとるために、気温に合わせて整える暮らし方": "https://note.com/cheeky_guppy1145/n/n7494c17f0ac9",
  "なんとなく疲れた日に、静かに整える習慣。": "https://note.com/cheeky_guppy1145/n/nd7695d2618b1",
  "なんとなく疲れた日に、静かに整える習慣": "https://note.com/cheeky_guppy1145/n/nd7695d2618b1",
  "3つだけで変わる、睡眠の質を上げる習慣": "https://note.com/cheeky_guppy1145/n/n2fa35c7aadb3",
  "朝日とともに整える気持ちのリセット方法": "https://note.com/cheeky_guppy1145/n/n26ec627462c9",
  "小さな幸せに気づける人の、ちょっとした習慣。": "https://note.com/cheeky_guppy1145/n/n9a57178b0a59",
  "お金を使わなくても満たされる、日常の贅沢習慣": "https://note.com/cheeky_guppy1145/n/n5b60a24e2968",
  "無駄を減らして、本当に大切なことに近づく方法。": "https://note.com/cheeky_guppy1145/n/n5ca87b5f4765",
  "なんとなく寂しい夜を、やさしく乗り越えるヒント": "https://note.com/cheeky_guppy1145/n/n02da50e32408",
  "一人ご飯を楽しむためのちょっとした工夫": "https://note.com/cheeky_guppy1145/n/n69295f690877",
  "満たされない毎日を終わらせる考え方": "https://note.com/cheeky_guppy1145/n/n5867705128cc",
  "満たされない毎日を変えたい時の自分へのご褒美の使い方。": "https://note.com/cheeky_guppy1145/n/n929b9d98a82f",
  "推し活が、人生を少し豊かにしてくれる理由。": "https://note.com/cheeky_guppy1145/n/ne9fa01855473",
  "コーヒーと過ごす時間が、人生の選択肢を増やしていく。": "https://note.com/cheeky_guppy1145/n/n948a57214e66",
  "なんとなく乱れている暮らしを、少しずつ整える方法": "https://note.com/cheeky_guppy1145/n/na3b455883712",
  "知らないと損する環境問題の現実。": "https://note.com/cheeky_guppy1145/n/nc034b4b8ea62",
  "自宅を温泉空間に変える、整いの設計図": "https://note.com/cheeky_guppy1145/n/nfe4cf11f320d",
  "実家にいる時間を、無駄にしないための過ごし方": "https://note.com/cheeky_guppy1145/n/n3d849baf62e1",
  "「なんとなく過ぎる毎日」を変えたいときの過ごし方": "https://note.com/cheeky_guppy1145/n/nf85a26ec23fe",
  "「どこに何を置くか」で迷わなくなる収納設計": "https://note.com/cheeky_guppy1145/n/n41f9b3566c63",
  "掃除を楽にするのではなく、「楽になる部屋」のつくり方": "https://note.com/cheeky_guppy1145/n/n6ca24b4f7970",
  "捨てられない人のための、やさしい断捨離": "https://note.com/cheeky_guppy1145/n/n111b4e0ee687",
  "3つだけで変わる、暮らしを豊かにする考え方。": "https://note.com/cheeky_guppy1145/n/ne5d5b6b7ab55",
  "料理しなくても大丈夫な一人暮らし術": "https://note.com/cheeky_guppy1145/n/n19b1f09a15dc",
  "無印良品での\"選び方がうまい人\"に近づくコツ。": "https://note.com/cheeky_guppy1145/n/n05e7ccfcc1aa",
  "ＡＩで生活コストを少し下げる方法": "https://note.com/cheeky_guppy1145/n/n0c236df08ab9",
  "ＡＩで暮らしを少しだけ楽にする20の使い方": "https://note.com/cheeky_guppy1145/n/na3b4f6f561fe",
  "無駄な出費を減らす、買い替えタイミングの見極め方。": "https://note.com/cheeky_guppy1145/n/n7e7c512545da",
  "高額な買い物で後悔しないための考え方": "https://note.com/cheeky_guppy1145/n/nad22e0c6bea8",
  "引っ越しで後悔しないための、ちょっとした見直し。": "https://note.com/cheeky_guppy1145/n/n064e3d75dc7d",
  "自分らしく生きるに少し近づくためのヒント。": "https://note.com/cheeky_guppy1145/n/n16c84cf6447a",
  "時間がない人ほどやるべき、自分時間のつくり方。": "https://note.com/cheeky_guppy1145/n/n2619543a0afd",
  "春から何か始めたい人のための、行動の整え方。": "https://note.com/cheeky_guppy1145/n/n3c77f210437b",
  "何もない日が少し好きになる散歩の時間。": "https://note.com/cheeky_guppy1145/n/nfe8a308ecbe9",
  "パン作りが楽しくなる、最初に知っておきたいコツ": "https://note.com/cheeky_guppy1145/n/n0cfa82ac9160",
  "失敗しない自然栽培の始め方。": "https://note.com/cheeky_guppy1145/n/nb8ae4dbe99e1",
  "子供の偏食が気になる人へ": "https://note.com/cheeky_guppy1145/n/na446a2d94699",
  "子育てに自信が持てない人のため、思考の整え方。": "https://note.com/cheeky_guppy1145/n/n2614af905b5b",
  "頑張りすぎている母親のための、やさしい考え方。": "https://note.com/cheeky_guppy1145/n/n2b08455a9f95",
  "自分を後回しにしてしまう人へ": "https://note.com/cheeky_guppy1145/n/n258bcc443ac8",
  "歯医者が怖い人のための優しい歯の治療ガイド": "https://note.com/cheeky_guppy1145/n/ne9ecf6f9a0b6",
  "視力が落ちるのは「目のせい」だけじゃない。": "https://note.com/cheeky_guppy1145/n/n8e1a992f8131",
  "本×noteで、少しずつ変わる習慣": "https://note.com/cheeky_guppy1145/n/nb191a93cf415",
  "朝ドラから学ぶ「人生がうまくいく人の共通点」": "https://note.com/cheeky_guppy1145/n/n98e0f7700196",
  "やりたいことがわからないを抜け出す自己実現の考え方": "https://note.com/cheeky_guppy1145/n/n9a6de131a11e",
  "「なんのためにやるのか」が分からなくなったときに読む話": "https://note.com/cheeky_guppy1145/n/naeb505285203",
  "なぜかうまくいく人に起きている「現象」の正体。": "https://note.com/cheeky_guppy1145/n/n2b58eecb051b",
  "価値観をアップデートする技術": "https://note.com/cheeky_guppy1145/n/nf884a70901f5",
  "限界まで頑張る人は、なぜうまくいかないのか": "https://note.com/cheeky_guppy1145/n/na8d29f256444",
  "やる気に頼らない、時間の回し方": "https://note.com/cheeky_guppy1145/n/n39b92a292f49",
  "やる気が出ない時でも、最低限うまく回す方法": "https://note.com/cheeky_guppy1145/n/n9a08325bab6e",
  "このままでいいのか不安な時に読む、年齢と時間の整理術": "https://note.com/cheeky_guppy1145/n/n9da33555069c",
  "続けられない人のための、やさしいしい継続のつくり方": "https://note.com/cheeky_guppy1145/n/nca52c3cc7459",
  "経験は積むものじゃなく\"使うもの\"": "https://note.com/cheeky_guppy1145/n/n5b331224f034",
  "大谷翔平から学ぶ、結果を出し続ける人の思考法。": "https://note.com/cheeky_guppy1145/n/ne0b5b657acb6",
  "考えすぎてしまう人のための、思考の整え方": "https://note.com/cheeky_guppy1145/n/n6e1a13aeed24",
  "初めての面接でも安心して話せる準備法": "https://note.com/cheeky_guppy1145/n/n7b18897927f1",
  "新しい環境に慣れるまでの過ごし方。": "https://note.com/cheeky_guppy1145/n/n730d0509729f",
  "新社会人のあなたへ。仕事が怖い日の、少し楽になる考え方。": "https://note.com/cheeky_guppy1145/n/na5f519df0496",
  "このままでいいのかと思ったときに読む仕事論。": "https://note.com/cheeky_guppy1145/n/n4ec2965b6775",
  "結果を出すチームに共通するリーダーの思考法": "https://note.com/cheeky_guppy1145/n/n7bb5cea92465",
  "人が集まらないを終わらせる、参加者募集の設計図。": "https://note.com/cheeky_guppy1145/n/n9e8737bd35e1",
  "リピーターが増える、お店のつくり方。": "https://note.com/cheeky_guppy1145/n/n6be7cffc6368",
  "転職すべきか悩んだ時の、後悔しない判断基準": "https://note.com/cheeky_guppy1145/n/n1bf6b3bd683c",
  "活動休止を「無駄にしない」ための過ごし方": "https://note.com/cheeky_guppy1145/n/nea055cb05bc4",
  "なんとなくモヤモヤするを整える書く習慣。": "https://note.com/cheeky_guppy1145/n/nf582302adb06",
  "書く習慣が続かない人のための、やさしい整え方": "https://note.com/cheeky_guppy1145/n/n3f1208586639",
  "書く習慣のその先へ、やさしい発信のはじめ方": "https://note.com/cheeky_guppy1145/n/na5aa1dc8c299",
  "投稿してるだけで終わっている人のための運営改善。": "https://note.com/cheeky_guppy1145/n/n06bea5c1039a",
  "日本に訪れる人のための困らない情報": "https://note.com/cheeky_guppy1145/n/nffd0836cbc05",
  "日常で役立つ知識（誰でも使える内容）": "https://note.com/cheeky_guppy1145/n/n435fc178ad69"
};

const RELATED_TOOLS = {
  "fatigue-reset-diagnosis.html": {
    text: "疲れを整えたあとに、暮らしや自分時間も見直せます。",
    links: [
      ["暮らしの整え方診断", "life-reset-diagnosis.html"],
      ["自分時間のつくり方診断", "self-time-diagnosis.html"],
      ["気持ちの満たし方診断", "mood-fulfillment-diagnosis.html"]
    ]
  },
  "life-reset-diagnosis.html": {
    text: "暮らしの流れを整えたい時は、買い物や疲れの診断も役立ちます。",
    links: [
      ["買う前チェックリスト", "buy-before-checklist.html"],
      ["無駄な出費タイプ診断", "spending-type-diagnosis.html"],
      ["疲れの整え方診断", "fatigue-reset-diagnosis.html"]
    ]
  },
  "mood-fulfillment-diagnosis.html": {
    text: "気持ちの整え方に近いテーマも、続けて確認できます。",
    links: [
      ["自分時間のつくり方診断", "self-time-diagnosis.html"],
      ["疲れの整え方診断", "fatigue-reset-diagnosis.html"],
      ["暮らしの整え方診断", "life-reset-diagnosis.html"]
    ]
  },
  "self-time-diagnosis.html": {
    text: "時間や習慣を整えたい時は、仕事や疲れの悩みも一緒に見直せます。",
    links: [
      ["仕事の悩み整理診断", "work-worry-diagnosis.html"],
      ["疲れの整え方診断", "fatigue-reset-diagnosis.html"],
      ["書く習慣・発信診断", "writing-habit-diagnosis.html"]
    ]
  },
  "appearance-style-diagnosis.html": {
    text: "見た目を整えたあとに、気持ちや暮らしの整え方も見直せます。",
    links: [
      ["気持ちの満たし方診断", "mood-fulfillment-diagnosis.html"],
      ["暮らしの整え方診断", "life-reset-diagnosis.html"],
      ["買う前チェックリスト", "buy-before-checklist.html"]
    ]
  },
  "work-worry-diagnosis.html": {
    text: "仕事の悩みを整理したあとに、疲れや自分時間も整えられます。",
    links: [
      ["自分時間のつくり方診断", "self-time-diagnosis.html"],
      ["疲れの整え方診断", "fatigue-reset-diagnosis.html"],
      ["書く習慣・発信診断", "writing-habit-diagnosis.html"]
    ]
  },
  "parenting-health-diagnosis.html": {
    text: "子育てや健康の不安がある時は、自分の時間や疲れも一緒に確認できます。",
    links: [
      ["自分時間のつくり方診断", "self-time-diagnosis.html"],
      ["疲れの整え方診断", "fatigue-reset-diagnosis.html"],
      ["気持ちの満たし方診断", "mood-fulfillment-diagnosis.html"]
    ]
  },
  "writing-habit-diagnosis.html": {
    text: "書く習慣を整えたい時は、時間や仕事の悩みも近いテーマです。",
    links: [
      ["自分時間のつくり方診断", "self-time-diagnosis.html"],
      ["仕事の悩み整理診断", "work-worry-diagnosis.html"],
      ["暮らしの整え方診断", "life-reset-diagnosis.html"]
    ]
  }
};

const config = window.DIAGNOSIS_CONFIG;
let current = 0;
const answers = [];
const scores = {};

for (const key of Object.keys(config.results)) scores[key] = 0;

document.title = config.pageTitle;
document.querySelector('meta[name="description"]').setAttribute("content", config.description);
document.querySelector('meta[property="og:title"]').setAttribute("content", config.pageTitle);
document.querySelector('meta[property="og:description"]').setAttribute("content", config.description);
document.querySelector('meta[name="twitter:title"]').setAttribute("content", config.pageTitle);
document.querySelector('meta[name="twitter:description"]').setAttribute("content", config.description);
document.getElementById("title").textContent = config.title;
document.getElementById("lead").textContent = config.lead;

const questionText = document.getElementById("questionText");
const choices = document.getElementById("choices");
const nextButton = document.getElementById("nextButton");
const backButton = document.getElementById("backButton");
const quiz = document.getElementById("quiz");
const result = document.getElementById("result");
const progressBar = document.getElementById("progressBar");

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function renderArticle(article) {
  const title = typeof article === "string" ? article : article.title;
  const url = typeof article === "object" && article.url ? article.url : ARTICLE_URLS[title];
  const safeTitle = escapeHtml(title);
  if (!url) return `<li>${safeTitle}</li>`;
  return `<li><a href="${url}">${safeTitle}</a></li>`;
}

function renderRelatedPanel(heading = "関連する無料診断") {
  const page = location.pathname.split("/").pop();
  const related = RELATED_TOOLS[page];
  if (!related) return "";
  const links = related.links
    .map(([label, href]) => `<li><a href="${href}">${escapeHtml(label)}</a></li>`)
    .join("");
  return `
    <section class="related-panel" aria-label="${heading}">
      <h2>${heading}</h2>
      <p>${escapeHtml(related.text)}</p>
      <ul class="related-list">${links}</ul>
    </section>
  `;
}

function renderQuestion() {
  const question = config.questions[current];
  questionText.textContent = question.text;
  choices.innerHTML = "";
  question.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice" + (answers[current] === index ? " is-selected" : "");
    button.textContent = choice.label;
    button.addEventListener("click", () => {
      answers[current] = index;
      nextButton.disabled = false;
      renderQuestion();
    });
    choices.appendChild(button);
  });
  backButton.disabled = current === 0;
  nextButton.disabled = answers[current] === undefined;
  nextButton.textContent = current === config.questions.length - 1 ? "結果を見る" : "次へ";
  progressBar.style.width = `${(current / config.questions.length) * 100}%`;
}

function calculateResult() {
  for (const key of Object.keys(scores)) scores[key] = 0;
  answers.forEach((answerIndex, questionIndex) => {
    const selected = config.questions[questionIndex].choices[answerIndex];
    for (const [key, value] of Object.entries(selected.scores)) scores[key] += value;
  });
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

function showResult() {
  const data = config.results[calculateResult()];
  document.getElementById("resultTitle").textContent = data.title;
  document.getElementById("resultLead").textContent = data.lead;
  document.getElementById("resultAction").textContent = data.action;
  document.getElementById("resultArticles").innerHTML = data.articles.map(renderArticle).join("");
  document.getElementById("noteLink").href = data.url || NOTE_PROFILE_URL;
  document.getElementById("noteLink").textContent = data.url ? "おすすめ記事を読む" : "noteで記事を探す";
  const resultRelated = result.querySelector(".related-panel");
  if (!resultRelated) result.insertAdjacentHTML("beforeend", renderRelatedPanel("次に見る無料診断"));
  quiz.style.display = "none";
  result.classList.add("is-visible");
  progressBar.style.width = "100%";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

nextButton.addEventListener("click", () => {
  if (answers[current] === undefined) return;
  if (current === config.questions.length - 1) {
    showResult();
    return;
  }
  current += 1;
  renderQuestion();
});

backButton.addEventListener("click", () => {
  if (current === 0) return;
  current -= 1;
  renderQuestion();
});

document.getElementById("restartButton").addEventListener("click", () => {
  current = 0;
  answers.length = 0;
  quiz.style.display = "block";
  result.classList.remove("is-visible");
  renderQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

result.insertAdjacentHTML("afterend", renderRelatedPanel());
renderQuestion();
