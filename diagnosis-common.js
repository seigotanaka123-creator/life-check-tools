const NOTE_PROFILE_URL = "https://note.com/cheeky_guppy1145";
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
  document.getElementById("resultArticles").innerHTML = data.articles.map(article => `<li>${article}</li>`).join("");
  document.getElementById("noteLink").href = data.url || NOTE_PROFILE_URL;
  document.getElementById("noteLink").textContent = data.url ? "おすすめ記事を読む" : "noteで記事を探す";
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

renderQuestion();
