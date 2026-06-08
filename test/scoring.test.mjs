import assert from "node:assert/strict";
import test from "node:test";

import { industries } from "../assets/data.js";
import { calculateReport, getLevel } from "../assets/scoring.js";

test("calculateReport computes score, level, risk buckets, and full answers dynamically", () => {
  const answers = industries.construction.questions.map((question, index) => ({
    optionIndex: index % 4,
    score: question.options[index % 4][1]
  }));

  const report = calculateReport("construction", answers);
  const expectedScore = Math.round(
    answers.reduce((sum, answer) => sum + answer.score, 0) / (answers.length * 10) * 100
  );

  assert.equal(report.industry, "建筑工程");
  assert.equal(report.score, expectedScore);
  assert.equal(report.level, getLevel(expectedScore).label);
  assert.equal(report.answers.length, industries.construction.questions.length);
  assert.equal(report.answers[1].questionTitle, industries.construction.questions[1].title);
  assert.equal(report.answers[1].desc, industries.construction.questions[1].desc);
  assert.equal(report.answers[1].selectedOptionText, industries.construction.questions[1].options[1][0]);
  assert.equal(report.highItems.length, answers.filter((answer) => answer.score >= 7).length);
  assert.equal(report.warnItems.length, answers.filter((answer) => answer.score >= 3 && answer.score < 7).length);
});

test("calculateReport treats missing answers as zero-risk answers", () => {
  const report = calculateReport("construction", []);

  assert.equal(report.score, 0);
  assert.equal(report.level, "绿色稳健");
  assert.equal(report.highItems.length, 0);
  assert.equal(report.warnItems.length, 0);
  assert.equal(report.answers[0].score, 0);
  assert.equal(report.answers[0].selectedOptionText, "");
});

test("calculateReport exposes display-ready descriptions for every industry", () => {
  for (const [industryKey, industry] of Object.entries(industries)) {
    const answers = industry.questions.map(() => ({ optionIndex: 1 }));
    const report = calculateReport(industryKey, answers);

    report.answers.forEach((item, index) => {
      assert.equal(typeof item.desc, "string", `${industryKey}[${index}] desc`);
      assert.notEqual(item.desc.trim(), "", `${industryKey}[${index}] desc`);
      assert.equal(typeof item.fix, "string", `${industryKey}[${index}] fix`);
      assert.notEqual(item.fix.trim(), "", `${industryKey}[${index}] fix`);
    });
  }
});
