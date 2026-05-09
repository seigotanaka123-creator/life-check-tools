const NOTE_PROFILE_URL = "https://note.com/cheeky_guppy1145";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function renderArticle(article) {
  const title = typeof article === "string" ? article : article.title;
  const url = typeof article === "object" ? article.url : "";
  if (!url) return `<li>${escapeHtml(title)}</li>`;
  return `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(title)}</a></li>`;
}

function initQuiz(config) {
  document.title = config.pageTitle;
  document.querySelector("meta[name='description']").setAttribute("content", config.description);
  document.getElementById("title").textContent = config.title;
  document.getElementById("lead").textContent = config.lead;

  let current = 0;
  const answers = [];
  const quiz = document.getElementById("quiz");
  const questionText = document.getElementById("questionText");
  const choices = document.getElementById("choices");
  const nextButton = document.getElementById("nextButton");
  const backButton = document.getElementById("backButton");
  const progressBar = document.getElementById("progressBar");
  const result = document.getElementById("result");
  const restartButton = document.getElementById("restartButton");
  const noteLink = document.getElementById("noteLink");

  function renderQuestion() {
    const question = config.questions[current];
    questionText.textContent = question.text;
    choices.innerHTML = "";
    question.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice";
      button.textContent = choice.label;
      if (answers[current] === index) button.classList.add("is-selected");
      button.addEventListener("click", () => {
        answers[current] = index;
        renderQuestion();
      });
      choices.appendChild(button);
    });
    progressBar.style.width = `${((current + 1) / config.questions.length) * 100}%`;
    backButton.disabled = current === 0;
    nextButton.disabled = answers[current] === undefined;
    nextButton.textContent = current === config.questions.length - 1 ? "See my result" : "Next";
  }

  function getResultKey() {
    const scores = {};
    Object.keys(config.results).forEach((key) => { scores[key] = 0; });
    answers.forEach((answerIndex, questionIndex) => {
      const selected = config.questions[questionIndex].choices[answerIndex];
      Object.entries(selected.scores).forEach(([key, value]) => {
        scores[key] += value;
      });
    });
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  }

  function showResult() {
    const data = config.results[getResultKey()];
    quiz.style.display = "none";
    result.classList.add("is-visible");
    document.getElementById("resultTitle").textContent = data.title;
    document.getElementById("resultLead").textContent = data.lead;
    document.getElementById("resultAction").textContent = data.action;
    document.getElementById("resultArticles").innerHTML = data.articles.map(renderArticle).join("");
    noteLink.href = NOTE_PROFILE_URL;
    const related = document.getElementById("relatedLinks");
    if (related) {
      related.innerHTML = `
        <h3>Explore more</h3>
        <p>Try another free quiz or open the Japan travel guide for first-time visitors.</p>
        <ul class="link-list">
          <li><a href="index.html">Life Check Tools</a></li>
          <li><a href="japan-travel-tips.html">Japan Travel Guide</a></li>
          <li><a href="shopping-regret-checklist.html">Shopping Regret Checklist</a></li>
        </ul>
      `;
    }
  }

  nextButton.addEventListener("click", () => {
    if (current === config.questions.length - 1) {
      showResult();
      return;
    }
    current += 1;
    renderQuestion();
  });
  backButton.addEventListener("click", () => {
    current = Math.max(0, current - 1);
    renderQuestion();
  });
  restartButton.addEventListener("click", () => {
    current = 0;
    answers.length = 0;
    result.classList.remove("is-visible");
    quiz.style.display = "";
    renderQuestion();
  });
  renderQuestion();
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.EN_DIAGNOSIS_CONFIG) initQuiz(window.EN_DIAGNOSIS_CONFIG);
});
