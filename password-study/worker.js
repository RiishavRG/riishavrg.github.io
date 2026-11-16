import { PasswordChecker } from "./checker.js";

const ready = PasswordChecker.load(new URL("./model/", import.meta.url), (loaded, total) => {
  postMessage({ type: "progress", loaded, total });
});

ready.then(
  () => postMessage({ type: "ready" }),
  error => postMessage({ type: "failed", error: error.message }),
);

const jobs = {
  check: (checker, d) => checker.check(d.password),
  improve: (checker, d) => checker.improve(d.password, d.answers, d.number, d.symbol, d.k),
  answers: (checker, d) => checker.fromAnswers(d.answers, d.number, d.symbol, d.k, d.related),
};

onmessage = async ({ data }) => {
  try {
    const checker = await ready;
    postMessage({ id: data.id, ok: true, result: jobs[data.type](checker, data) });
  } catch (error) {
    postMessage({ id: data.id, ok: false, error: error.message });
  }
};
