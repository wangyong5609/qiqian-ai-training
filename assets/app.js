import { companyName, industries } from "./data.js";
import { calculateReport } from "./scoring.js";

const state = {
  industryKey: "",
  current: 0,
  answers: [],
  lastReport: null,
  lastFocusedElement: null,
  leadPanelVisible: false
};

const screens = {
  start: document.getElementById("startScreen"),
  industry: document.getElementById("industryScreen"),
  quiz: document.getElementById("quizScreen"),
  result: document.getElementById("resultScreen")
};

const questionMount = document.getElementById("questionMount");
const progressFill = document.getElementById("progressFill");
const quizIndustry = document.getElementById("quizIndustry");
const quizCount = document.getElementById("quizCount");
const asideIndustry = document.getElementById("asideIndustry");
const formNotice = document.getElementById("formNotice");
const industryList = document.getElementById("industryList");
const consentField = document.getElementById("consentField");
const leadConsent = document.getElementById("leadConsent");
const successModal = document.getElementById("successModal");
const successMessage = document.getElementById("successMessage");
const successCode = document.getElementById("successCode");
const leadPanel = document.querySelector(".lead-panel");
const mobileResultCta = document.getElementById("mobileResultCta");
const productionApiOrigin = "https://qibenniu-tax-risk.pages.dev";

function isLocalPreview() {
  return window.location.protocol === "file:"
    || window.location.hostname === "localhost"
    || window.location.hostname === "127.0.0.1";
}

function apiUrl(path) {
  return isLocalPreview() ? `${productionApiOrigin}${path}` : path;
}

function renderIndustryList() {
  industryList.innerHTML = Object.entries(industries).map(([key, industry]) => `
    <button class="industry-card" type="button" data-industry="${key}">
      <span class="industry-icon">${industry.mark}</span>
      <span class="industry-copy">
        <strong>${industry.name}</strong>
        <span>${industry.description}</span>
      </span>
    </button>
  `).join("");

  industryList.querySelectorAll(".industry-card").forEach((button) => {
    button.addEventListener("click", () => selectIndustry(button.dataset.industry));
  });
}

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
  if (name === "result") state.leadPanelVisible = false;
  document.body.classList.toggle("result-active", name === "result");
  updateMobileResultCta();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startAssessment() {
  showScreen("industry");
}

function scrollToProcess() {
  document.getElementById("assessmentFlow").scrollIntoView({ behavior: "smooth", block: "center" });
}

function selectIndustry(key) {
  state.industryKey = key;
  state.current = 0;
  state.answers = new Array(industries[key].questions.length).fill(null);
  renderQuestion();
  showScreen("quiz");
}

function renderQuestion() {
  const industry = industries[state.industryKey];
  const question = industry.questions[state.current];
  const total = industry.questions.length;
  quizIndustry.textContent = industry.name;
  asideIndustry.textContent = industry.name;
  quizCount.textContent = `第 ${state.current + 1} / ${total} 题`;
  progressFill.style.width = `${(state.current / total) * 100}%`;

  questionMount.innerHTML = `
    <span class="risk-chip ${question.tagClass}">${question.tag}</span>
    <h2 class="question-title">${question.title}</h2>
    <p class="question-desc">${question.desc}</p>
    <div class="options">
      ${question.options.map((option, index) => `
        <button class="option-btn" type="button" data-score="${option[1]}" data-index="${index}">
          <span class="option-letter">${String.fromCharCode(65 + index)}</span>
          <span>${option[0]}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function selectOption(score, index) {
  state.answers[state.current] = { optionIndex: index };
  const industry = industries[state.industryKey];
  if (state.current < industry.questions.length - 1) {
    state.current += 1;
    renderQuestion();
  } else {
    progressFill.style.width = "100%";
    renderResult();
    showScreen("result");
  }
}

function displayText(...values) {
  const value = values.find((item) => typeof item === "string" && item.trim());
  return value || "请结合合同、发票、资金、台账等资料进一步核对。";
}

function scoreColor(score) {
  if (score >= 70) return "#d92d20";
  if (score >= 50) return "#f59e0b";
  if (score >= 30) return "#0066cc";
  if (score >= 10) return "#2997ff";
  return "#0f9f6e";
}

function updateMobileResultCta() {
  if (!mobileResultCta) return;
  const shouldHide = !screens.result.classList.contains("active") || state.leadPanelVisible;
  mobileResultCta.classList.toggle("is-hidden", shouldHide);
}

function scrollToLeadForm() {
  const topbar = document.querySelector(".topbar");
  const offset = (topbar ? topbar.getBoundingClientRect().height : 68) + 16;
  const top = leadPanel.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
  window.setTimeout(() => {
    document.getElementById("leadName").focus({ preventScroll: true });
  }, 480);
}

function renderResult() {
  const industry = industries[state.industryKey];
  const report = calculateReport(state.industryKey, state.answers);
  const topItems = report.answers
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  state.lastReport = report;

  const scoreCircle = document.querySelector(".score-circle");
  document.getElementById("scoreNumber").textContent = report.score;
  scoreCircle.style.setProperty("--score-angle", `${report.score * 3.6}deg`);
  scoreCircle.style.setProperty("--score-color", scoreColor(report.score));
  document.getElementById("scoreScale").style.setProperty("--score-percent", report.score);
  document.getElementById("scoreMarker").textContent = `${report.score}分`;
  document.getElementById("resultLevel").textContent = `${industry.shortName} · ${report.level}`;
  document.getElementById("resultTitle").textContent = report.title;
  document.getElementById("resultMessage").textContent = report.message;
  document.getElementById("riskSummary").textContent = `${report.highItems.length} 项高危 · ${report.warnItems.length} 项需关注`;
  document.querySelectorAll(".standard-row").forEach((row) => {
    const min = Number(row.dataset.min);
    const max = Number(row.dataset.max);
    row.classList.toggle("active", report.score >= min && report.score <= max);
  });

  const riskList = document.getElementById("riskList");
  if (topItems.length === 0) {
    riskList.innerHTML = `
      <div class="risk-row">
        <div>
          <h3>暂无明显高分风险项</h3>
          <p>继续保持资料留痕和周期性复核。业务规模扩大后，建议重新测评。</p>
        </div>
        <span class="risk-score">稳健</span>
      </div>
    `;
  } else {
    riskList.innerHTML = topItems.map((item) => `
      <div class="risk-row">
        <div>
          <h3>${item.riskName}</h3>
          <p><b>核查重点</b>${displayText(item.desc, item.questionDesc)}</p>
          <p><b>整改方向</b>${displayText(item.fix)}</p>
          <p><b>客户选择</b>${item.selectedOptionText || "未选择"}</p>
        </div>
        <span class="risk-score ${item.score >= 7 ? "hot" : "warn"}">${item.score} 分</span>
      </div>
    `).join("");
  }

  document.getElementById("actionGrid").innerHTML = industry.actions.map((action) => `
    <div class="action-card">
      <b>${action[0]}</b>
      <span>${action[1]}</span>
    </div>
  `).join("");

  formNotice.className = "notice hidden";
  formNotice.textContent = "";
  consentField.classList.remove("consent-invalid");
}

function showNotice(message, type) {
  formNotice.className = `notice ${type || ""}`;
  formNotice.textContent = message;
}

function hideNotice() {
  formNotice.className = "notice hidden";
  formNotice.textContent = "";
}

function highlightConsent() {
  hideNotice();
  consentField.classList.remove("consent-invalid");
  window.requestAnimationFrame(() => {
    consentField.classList.add("consent-invalid");
  });
  consentField.scrollIntoView({ behavior: "smooth", block: "center" });
  leadConsent.focus({ preventScroll: true });
}

function showSuccessModal(leadId) {
  state.lastFocusedElement = document.activeElement;
  successMessage.textContent = `${companyName}顾问会根据测评结果联系您，24小时内给出资料清单。`;
  successCode.textContent = `报告编号：${leadId}`;
  successModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  document.getElementById("closeSuccess").focus({ preventScroll: true });
}

function closeSuccessModal() {
  successModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
  if (state.lastFocusedElement && typeof state.lastFocusedElement.focus === "function") {
    state.lastFocusedElement.focus({ preventScroll: true });
  }
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("提交接口返回异常，请刷新页面后重试。");
  }
}

async function submitLead(event) {
  event.preventDefault();
  const report = state.lastReport;
  const payload = {
    name: document.getElementById("leadName").value.trim(),
    phone: document.getElementById("leadPhone").value.trim(),
    city: document.getElementById("leadCity").value,
    wechat: document.getElementById("leadWechat").value.trim(),
    consent: leadConsent.checked,
    report
  };

  consentField.classList.remove("consent-invalid");

  if (!payload.name) {
    showNotice("请填写您的称呼。", "error");
    return;
  }
  if (!payload.phone && !payload.wechat) {
    showNotice("请至少填写手机号码或微信号。", "error");
    return;
  }
  if (payload.phone && !/^1\d{10}$/.test(payload.phone)) {
    showNotice("手机号码需为 11 位中国大陆手机号；也可以只填写微信号。", "error");
    return;
  }
  if (!payload.city) {
    showNotice("请选择所在城市。", "error");
    return;
  }
  if (!payload.consent) {
    highlightConsent();
    return;
  }

  const button = document.getElementById("submitLead");
  button.disabled = true;
  button.textContent = "提交中...";

  try {
    const response = await fetch(apiUrl("/api/leads"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await readJsonResponse(response);
    if (!response.ok || !result.ok) {
      throw new Error(result.message || "提交失败");
    }
    hideNotice();
    showSuccessModal(result.leadId);
    event.target.reset();
  } catch (error) {
    showNotice(error.message || "提交失败，请稍后重试。", "error");
  } finally {
    button.disabled = false;
    button.textContent = "领取测评报告";
  }
}

renderIndustryList();

document.getElementById("startAssessment").addEventListener("click", startAssessment);
document.getElementById("viewProcess").addEventListener("click", scrollToProcess);

questionMount.addEventListener("click", (event) => {
  const button = event.target.closest(".option-btn");
  if (!button) return;
  selectOption(Number(button.dataset.score), Number(button.dataset.index));
});

document.getElementById("backToIndustry").addEventListener("click", () => showScreen("industry"));
document.getElementById("changeIndustry").addEventListener("click", () => showScreen("industry"));
document.getElementById("restartQuiz").addEventListener("click", () => selectIndustry(state.industryKey));
document.getElementById("jumpToLeadForm").addEventListener("click", scrollToLeadForm);
mobileResultCta.addEventListener("click", scrollToLeadForm);
document.getElementById("leadForm").addEventListener("submit", submitLead);
leadConsent.addEventListener("change", () => {
  if (leadConsent.checked) consentField.classList.remove("consent-invalid");
});
document.getElementById("closeSuccess").addEventListener("click", closeSuccessModal);
document.getElementById("modalRestart").addEventListener("click", () => {
  closeSuccessModal();
  showScreen("industry");
});
successModal.addEventListener("click", (event) => {
  if (event.target === successModal) closeSuccessModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !successModal.classList.contains("hidden")) {
    closeSuccessModal();
  }
});

if ("IntersectionObserver" in window) {
  const leadObserver = new IntersectionObserver((entries) => {
    state.leadPanelVisible = entries.some((entry) => entry.isIntersecting);
    updateMobileResultCta();
  }, { threshold: 0.18 });
  leadObserver.observe(leadPanel);
}
