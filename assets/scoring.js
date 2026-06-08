import { industries, levels } from "./data.js";

export function getLevel(score) {
  return levels.find((level) => score >= level.min) || levels[levels.length - 1];
}

export function calculateReport(industryKey, answers) {
  const industry = industries[industryKey];
  if (!industry) {
    throw new Error("Unknown industry");
  }

  const scoredItems = industry.questions.map((question, index) => {
    const answer = answers[index] || {};
    const optionIndex = Number.isInteger(answer.optionIndex) ? answer.optionIndex : -1;
    const selectedOption = question.options[optionIndex] || null;
    const score = selectedOption ? selectedOption[1] : 0;

    return {
      questionTitle: question.title,
      questionDesc: question.desc,
      desc: question.desc,
      riskName: question.riskName,
      score,
      optionIndex,
      selectedOptionText: selectedOption ? selectedOption[0] : "",
      fix: question.fix,
      tag: question.tag
    };
  });

  const rawScore = scoredItems.reduce((sum, item) => sum + item.score, 0);
  const totalScore = Math.round(rawScore / (industry.questions.length * 10) * 100);
  const level = getLevel(totalScore);
  const highItems = scoredItems.filter((item) => item.score >= 7);
  const warnItems = scoredItems.filter((item) => item.score >= 3 && item.score < 7);

  return {
    industry: industry.name,
    industryKey,
    score: totalScore,
    level: level.label,
    title: level.title,
    message: level.message,
    highItems: highItems.map((item) => item.riskName),
    warnItems: warnItems.map((item) => item.riskName),
    answers: scoredItems
  };
}
