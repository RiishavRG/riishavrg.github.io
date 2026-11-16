import { SHEET_URL } from "./config.js";
import { ORDER, QUESTIONS } from "./questions.js";

const MAX_QUESTIONS = 5;
const RECALL_TRIES = 2;
const KEEP_FINISHED_MS = 2 * 60 * 60 * 1000;
const STORE = "password-study-v2";
const OUTBOX = "password-study-outbox-v2";
const STRENGTH = { weak: "Weak", medium: "Medium", strong: "Strong" };
const SYMBOL = /[!-\/:-@\[-`{-~]/;
const $ = id => document.getElementById(id);
const uuid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
const pending = new Map();
const cards = [];
let nextId = 0;
let flushing = false;

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

const saved = read(STORE);
const expired = Boolean(saved?.finished) && Date.now() - new Date(saved.finished) > KEEP_FINISHED_MS;
if (expired) write(STORE, null);
const state = (!expired && saved) || { session: uuid().slice(0, 8), participant: "", consented: null, started: null,
  finished: null, questions: [], asked: [], shown: [], checks: 0, passwordOpen: false, final: null, finalHash: null,
  confirmed: false };
const outbox = read(OUTBOX) || [];
const save = () => write(STORE, state);

async function flush() {
  if (flushing || !SHEET_URL) return;
  flushing = true;
  while (outbox.length) {
    const row = outbox[0];
    let reply;
    try {
      const response = await fetch(SHEET_URL, { method: "POST", body: JSON.stringify(row), keepalive: true });
      reply = await response.json();
    } catch {
      break;
    }
    if (!reply.ok) {
      row.tries = (row.tries || 0) + 1;
      if (row.tries < 10) {
        write(OUTBOX, outbox);
        break;
      }
    }
    outbox.shift();
    write(OUTBOX, outbox);
  }
  flushing = false;
  if (outbox.length) setTimeout(flush, 10000);
}

function log(event, fields) {
  if (!SHEET_URL) return;
  outbox.push({ row_id: uuid(), session: state.session, participant: state.participant, event, ...fields });
  write(OUTBOX, outbox);
  flush();
}

function el(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== "") node.textContent = text;
  return node;
}

function setStatus(text, failed = false) {
  $("status").textContent = text;
  $("status").classList.toggle("error", failed);
}

worker.onmessage = ({ data }) => {
  if (data.type === "progress") return setStatus(`Loading the password checker… ${Math.round((100 * data.loaded) / data.total)}%`);
  if (data.type === "ready") return setStatus("Password checker ready");
  if (data.type === "failed") return setStatus(`The checker could not load (${data.error}). Please reload the page.`, true);
  const job = pending.get(data.id);
  pending.delete(data.id);
  if (data.ok) job.resolve(data.result);
  else job.reject(new Error(data.error));
};

worker.onerror = () => setStatus("This browser cannot run the checker. Please use a recent Chrome, Edge, Firefox or Safari.", true);

function ask(type, payload) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, type, ...payload });
  });
}

function guessesInWords(log10) {
  if (log10 < 3) return Math.max(1, Math.round(10 ** log10)).toLocaleString("en-US");
  if (log10 >= 18) return "more than a billion billion";
  const [power, name] = [[15, "quadrillion"], [12, "trillion"], [9, "billion"], [6, "million"], [3, "thousand"]]
    .find(([p]) => log10 >= p);
  const value = 10 ** (log10 - power);
  return `${value < 10 ? Number(value.toFixed(1)) : Math.round(value)} ${name}`;
}

function pickQuestion(index) {
  const type = ORDER[index % ORDER.length];
  const options = QUESTIONS[type].filter(q => !state.asked.includes(q.text));
  const { text, words } = options[Math.floor(Math.random() * options.length)];
  state.asked.push(text);
  return { type, question: text, related: words, answer: "", choice: "", ideas: null };
}

function answerParts() {
  const words = [];
  let number = "", symbol = "";
  for (const { type, answer, choice } of state.questions) {
    if (!choice) continue;
    if (type === "number" && /\d/.test(answer)) number = answer;
    else if (type === "symbol" && SYMBOL.test(answer)) symbol = answer;
    else if (!words.some(w => w.toLowerCase() === answer.toLowerCase())) words.push(answer);
  }
  return { words, number, symbol };
}

function questionsLeft() {
  return MAX_QUESTIONS - state.questions.length;
}

function showMessage(box, lines, className = "error") {
  box.replaceChildren(...[lines].flat().map(text => el("p", className, text)));
}

function showResult(box, r) {
  const meter = el("div", `meter ${r.strength}`);
  const fill = el("span");
  fill.style.width = `${Math.min(100, Math.max(4, (r.log10_guesses / 15) * 100))}%`;
  meter.append(fill);
  const next = r.strong_enough ? "Strong. You are done!"
    : `Not strong yet. Change your password and check again${questionsLeft() > 0 ? ", or answer another question for more ideas" : ""}.`;
  box.replaceChildren(el("p", "verdict", STRENGTH[r.strength]), meter,
    el("p", "", `An attacker would need about ${guessesInWords(r.log10_guesses)} guesses.`), el("p", "next", next));
}

function suggestionItem(row) {
  const item = el("li");
  const top = el("div", "suggestion");
  top.append(el("code", "", row.password), el("span", "pill", row.meets_rule ? STRENGTH[row.strength] : "Too short"));
  item.append(top, el("p", "muted", `Remember it as: ${row.remember}`));
  return item;
}

function showIdeas(card, item) {
  const list = card.querySelector(".suggestions"), note = card.querySelector(".ideas-note");
  if (!item.ideas) {
    note.textContent = "";
    list.replaceChildren(el("li", "muted", "Finding ideas… this can take a few seconds."));
    return;
  }
  const valid = item.ideas.filter(r => r.meets_rule);
  const rows = valid.length ? valid : item.ideas;
  note.textContent = valid.length
    ? "Pick one you can remember, change it, or use it to make your own."
    : "These ideas are too short (under 12 characters). Answer another question to get longer ideas, or make your own password.";
  list.replaceChildren(...(rows.length ? rows.map(suggestionItem)
    : [el("li", "muted", "No ideas from this answer yet. Answer another question, or make your own password.")]));
}

async function loadIdeas(card, item) {
  showIdeas(card, item);
  try {
    const { words, number, symbol } = answerParts();
    const related = state.questions.filter(q => q.choice).reverse().flatMap(q => q.related || []);
    item.ideas = await ask("answers", { answers: words, number, symbol, k: 20, related });
    for (const row of item.ideas) if (!state.shown.includes(row.password)) state.shown.push(row.password);
    save();
    showIdeas(card, item);
  } catch (error) {
    card.querySelector(".suggestions").replaceChildren(el("li", "error", `Could not make ideas: ${error.message}`));
  }
}

function paint() {
  const done = Boolean(state.finished), left = questionsLeft();
  cards.forEach((card, i) => {
    const item = state.questions[i], latest = i === state.questions.length - 1;
    const find = selector => card.querySelector(selector);
    find(".answer").disabled = Boolean(item.choice) || done;
    find(".choose").hidden = Boolean(item.choice) || done;
    find(".ideas").hidden = item.choice !== "ideas" || !latest;
    find(".next").hidden = !latest || state.passwordOpen || done;
    find(".next .another").hidden = left <= 0;
    find(".next .another").textContent = `Answer another question (${left} left)`;
  });
  $("password-card").hidden = !state.passwordOpen && !done;
  $("password").disabled = done;
  $("check").hidden = done;
  $("another").hidden = done || left <= 0;
  $("another").textContent = `Answer another question (${left} left)`;
}

function openPassword() {
  state.passwordOpen = true;
  save();
  paint();
  $("password").focus();
}

function addCard(item, i) {
  const card = $("question-card").content.firstElementChild.cloneNode(true);
  const find = selector => card.querySelector(selector);
  const answer = find(".answer");
  find(".kicker").textContent = `Question ${i + 1}`;
  find(".prompt").textContent = item.question;
  answer.value = item.answer;
  answer.oninput = () => {
    item.answer = answer.value;
    save();
  };
  const choose = choice => {
    const text = answer.value.trim();
    if (!text) {
      find(".answer-error").textContent = "Please answer the question first.";
      return answer.focus();
    }
    find(".answer-error").textContent = "";
    item.answer = text;
    item.choice = choice;
    save();
    log("answer", { number: i + 1, question: item.question, answer: text, choice: choice === "ideas" ? "show ideas" : "make own password" });
    if (choice === "own") return openPassword();
    paint();
    loadIdeas(card, item);
  };
  find(".show-ideas").onclick = () => choose("ideas");
  find(".choose .own").onclick = () => choose("own");
  find(".next .own").onclick = openPassword;
  find(".next .another").onclick = another;
  $("questions").append(card);
  cards.push(card);
  if (item.choice === "ideas" && i === state.questions.length - 1) {
    if (item.ideas) showIdeas(card, item);
    else loadIdeas(card, item);
  }
  return card;
}

function another() {
  if (questionsLeft() <= 0) return;
  state.passwordOpen = false;
  const item = pickQuestion(state.questions.length);
  state.questions.push(item);
  save();
  const card = addCard(item, state.questions.length - 1);
  paint();
  card.scrollIntoView({ behavior: "smooth", block: "start" });
  card.querySelector(".answer").focus({ preventScroll: true });
}

function formatTime(iso) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function buildRecord() {
  const seconds = Math.round((new Date(state.finished) - new Date(state.started)) / 1000);
  const answered = state.questions.filter(q => q.choice);
  const facts = [
    ["Participant", state.participant],
    ["Consent", `Agreed ${formatTime(state.consented)}`],
    ["Started", formatTime(state.started)],
    ["Finished", formatTime(state.finished)],
    ["Time taken", `${Math.floor(seconds / 60)} min ${seconds % 60} s`],
    ["Questions answered", answered.length],
    ["Password checks", state.checks],
    ["Final strength", `${STRENGTH[state.final.strength]} (score ${state.final.score.toFixed(2)})`],
  ];
  const list = el("dl");
  for (const [term, value] of facts) list.append(el("dt", "", term), el("dd", "", value));
  const head = el("tr");
  for (const title of ["#", "Security question", "Ideas shown"]) head.append(el("th", "", title));
  const body = el("tbody");
  answered.forEach((q, i) => {
    const row = el("tr");
    for (const value of [i + 1, q.question, q.choice === "ideas" ? "Yes" : "No"]) row.append(el("td", "", value));
    body.append(row);
  });
  const thead = el("thead");
  thead.append(head);
  const table = el("table");
  table.append(thead, body);
  const scroll = el("div", "table-scroll");
  scroll.append(table);
  $("record").replaceChildren(el("h2", "", "Study record"), list, scroll);
}

async function fingerprint(text) {
  if (!globalThis.crypto?.subtle) return `${state.session}:${text}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${state.session}:${text}`));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function openConfirm() {
  const input = $("confirm-password");
  input.value = "";
  input.disabled = false;
  input.type = "password";
  $("confirm-toggle").textContent = "Show";
  $("confirm-check").hidden = false;
  $("confirm-new").hidden = true;
  $("confirm-close").hidden = true;
  $("confirm-result").replaceChildren();
  if (!$("confirm-dialog").open) $("confirm-dialog").showModal();
  input.focus();
}

function showFinish(scroll) {
  $("finish-message").textContent = state.confirmed ? "You are good to go. Thank you, see you next week!"
    : "Your password is Strong. One last step: type it again to show you remember it.";
  $("confirm-open").hidden = state.confirmed || !state.finalHash;
  buildRecord();
  $("finish").hidden = false;
  if (scroll) $("finish").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function finish(password, r) {
  state.finished = new Date().toISOString();
  state.final = { strength: r.strength, score: r.log10_guesses };
  state.finalHash = await fingerprint(password);
  state.confirmed = false;
  save();
  const seconds = Math.round((new Date(state.finished) - new Date(state.started)) / 1000);
  log("finish", { final_password: password, final_strength: r.strength, final_score: r.log10_guesses,
    questions_used: state.questions.length, password_checks: state.checks, from_suggestion: state.shown.includes(password),
    first_question: state.questions[0].question, minutes: Math.round(seconds / 6) / 10 });
  $("password").value = "";
  paint();
  showFinish(true);
  openConfirm();
}

$("check").onclick = async () => {
  const password = $("password").value;
  if (!password) return showMessage($("result"), "Please type a password.");
  $("check").disabled = true;
  showMessage($("result"), "Checking…", "muted");
  try {
    const r = await ask("check", { password });
    if (!r.ok) return showMessage($("result"), "Use only standard keyboard characters (letters, numbers, symbols), up to 64.");
    state.checks++;
    save();
    log("check", { password, strength: r.strength, score: r.log10_guesses, meets_rule: r.meets_baseline,
      questions_used: state.questions.length, from_suggestion: state.shown.includes(password) });
    if (!r.meets_baseline) return showMessage($("result"), ["This password does not meet the rule yet.", ...r.baseline_issues]);
    showResult($("result"), r);
    if (r.strong_enough) await finish(password, r);
  } catch (error) {
    showMessage($("result"), `Something went wrong: ${error.message}`);
  } finally {
    $("check").disabled = false;
  }
};

$("password").onkeydown = event => {
  if (event.key === "Enter" && !$("check").disabled) $("check").click();
};

$("toggle").onclick = () => {
  const show = $("password").type === "password";
  $("password").type = show ? "text" : "password";
  $("toggle").textContent = show ? "Hide" : "Show";
  $("toggle").setAttribute("aria-label", show ? "Hide password" : "Show password");
};

$("another").onclick = another;

$("confirm-check").onclick = async () => {
  const input = $("confirm-password");
  if (!input.value) return showMessage($("confirm-result"), "Please type your password.");
  if ((await fingerprint(input.value)) === state.finalHash) {
    state.confirmed = true;
    save();
    input.disabled = true;
    $("confirm-check").hidden = true;
    $("confirm-new").hidden = true;
    $("confirm-close").hidden = false;
    showMessage($("confirm-result"), "You are good to go. Thank you, see you next week!", "next");
    showFinish(false);
    return $("confirm-close").focus();
  }
  input.value = "";
  $("confirm-new").hidden = false;
  showMessage($("confirm-result"), "That's not your password. Have you forgotten it? Please type the correct password, or create a new password.");
  input.focus();
};

$("confirm-password").onkeydown = event => {
  if (event.key === "Enter" && !$("confirm-check").hidden) $("confirm-check").click();
};

for (const type of ["paste", "drop", "copy", "cut"]) {
  $("confirm-password").addEventListener(type, event => {
    event.preventDefault();
    showMessage($("confirm-result"), "Copy and paste are turned off. Please type your password.");
  });
}

$("confirm-toggle").onclick = () => {
  const show = $("confirm-password").type === "password";
  $("confirm-password").type = show ? "text" : "password";
  $("confirm-toggle").textContent = show ? "Hide" : "Show";
  $("confirm-toggle").setAttribute("aria-label", show ? "Hide password" : "Show password");
};

$("confirm-new").onclick = () => {
  $("confirm-dialog").close();
  Object.assign(state, { finished: null, final: null, finalHash: null, confirmed: false, passwordOpen: true });
  save();
  $("finish").hidden = true;
  $("result").replaceChildren();
  paint();
  $("password").focus();
};

$("confirm-close").onclick = () => $("confirm-dialog").close();
$("confirm-open").onclick = openConfirm;
$("confirm-dialog").addEventListener("cancel", event => {
  if (!state.confirmed) event.preventDefault();
});

function setMode(returning) {
  $("mode-first").setAttribute("aria-pressed", String(!returning));
  $("mode-return").setAttribute("aria-pressed", String(returning));
  $("intro").hidden = returning;
  $("return").hidden = !returning;
  if (returning) $("return-name").focus();
}

async function call(body) {
  const response = await fetch(SHEET_URL, { method: "POST", body: JSON.stringify(body) });
  const reply = await response.json();
  if (!reply.ok) throw new Error(reply.error || "server error");
  return reply;
}

function formatDay(iso) {
  return new Date(iso).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function returnMessage(text, className = "") {
  $("return-body").replaceChildren(el("p", className, text));
}

function showTry(name, number, hint) {
  const box = el("div", "recall");
  box.append(el("h2", "", `Try ${number} of ${RECALL_TRIES}`));
  if (hint) {
    const cue = el("div", "question");
    cue.append(el("p", "kicker", "Hint: your first security question last week"), el("p", "prompt", hint));
    box.append(cue);
  }
  const input = el("input");
  Object.assign(input, { type: "password", autocomplete: "off", spellcheck: false });
  input.setAttribute("autocapitalize", "off");
  input.setAttribute("aria-label", "Your password from last week");
  const toggle = el("button", "", "Show");
  toggle.type = "button";
  toggle.onclick = () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    toggle.textContent = show ? "Hide" : "Show";
  };
  const row = el("div", "password-row");
  row.append(input, toggle);
  const check = el("button", "primary", "Check");
  check.type = "button";
  const result = el("div", "result");
  result.setAttribute("aria-live", "polite");
  box.append(el("p", "field", "Type the password you made last week"), row, check, result);
  input.onkeydown = event => {
    if (event.key === "Enter" && !check.disabled) check.click();
  };
  check.onclick = async () => {
    if (!input.value) return showMessage(result, "Please type your password.");
    check.disabled = true;
    showMessage(result, "Checking…", "muted");
    try {
      const r = await call({ action: "recall", name, password: input.value });
      if (!r.found || !r.ready) return showMessage(result, "The memory check is not open for this name. Please contact the study team.");
      input.disabled = true;
      check.remove();
      if (!("correct" in r)) return showMessage(result, "You already did your memory check. Thank you!", "next");
      if (r.correct) return showMessage(result, "Correct! You remembered your password. Thank you, you are done.", "next");
      if (r.done) return showMessage(result, "That was not it. Thank you for taking part. This result helps our study too.", "next");
      showMessage(result, "Not quite. Here is a hint for your last try.", "next");
      showTry(name, number + 1, r.hint);
    } catch (error) {
      showMessage(result, `Could not reach the study server (${error.message}). Please try again.`);
    } finally {
      check.disabled = false;
    }
  };
  $("return-body").append(box);
  input.focus();
}

async function findMe() {
  const name = $("return-name").value.trim();
  if (!name) return returnMessage("Please type your name or participant ID.", "error");
  if (!SHEET_URL) return returnMessage("The memory check is not open yet. Please contact the study team.", "error");
  $("return-find").disabled = true;
  returnMessage("Looking you up…", "muted");
  try {
    const r = await call({ action: "lookup", name });
    if (!r.found) return returnMessage("We could not find that name. Type it exactly as last time. If it still does not work, please contact the study team.", "error");
    if (r.done) return returnMessage(r.remembered ? "You already did your memory check, and you remembered your password. Thank you!" : "You already did your memory check. Thank you for taking part!");
    if (!r.ready) return returnMessage(`Your memory check opens on ${formatDay(r.opens)}. Please come back then.`);
    $("return-name").disabled = true;
    $("return-find").hidden = true;
    $("return-body").replaceChildren();
    showTry(name, RECALL_TRIES - r.tries_left + 1, r.hint);
  } catch (error) {
    returnMessage(`Could not reach the study server (${error.message}). Check your internet and try again.`, "error");
  } finally {
    $("return-find").disabled = false;
  }
}

function lockIntro() {
  $("mode").hidden = true;
  $("participant").value = state.participant;
  $("participant").disabled = true;
  $("consent").checked = true;
  $("consent").disabled = true;
  $("start").hidden = true;
  $("restart").hidden = false;
}

$("privacy").textContent = SHEET_URL
  ? "Your password is checked inside your browser. Your answers, passwords and results are also saved to the study team's private Google Sheet for analysis, so use a made-up password only."
  : "Your password is checked inside your browser. Nothing is sent anywhere.";

$("start").onclick = () => {
  const name = $("participant").value.trim();
  if (!name) {
    $("intro-error").textContent = "Please enter your name or participant ID.";
    return $("participant").focus();
  }
  if (!$("consent").checked) {
    $("intro-error").textContent = "Please tick the box to agree before you start.";
    return $("consent").focus();
  }
  $("intro-error").textContent = "";
  state.participant = name;
  state.started = new Date().toISOString();
  state.consented = state.started;
  state.questions.push(pickQuestion(0));
  save();
  lockIntro();
  const card = addCard(state.questions[0], 0);
  paint();
  card.scrollIntoView({ behavior: "smooth", block: "start" });
  card.querySelector(".answer").focus({ preventScroll: true });
};

$("participant").onkeydown = event => {
  if (event.key === "Enter" && !$("start").hidden) $("start").click();
};

$("restart").onclick = () => {
  if (!confirm("Start over? Your answers on this computer will be cleared.")) return;
  write(STORE, null);
  state.started = null;
  location.reload();
};

$("mode-first").onclick = () => setMode(false);
$("mode-return").onclick = () => setMode(true);
$("return-find").onclick = findMe;
$("return-name").onkeydown = event => {
  if (event.key === "Enter" && !$("return-find").hidden) findMe();
};

window.addEventListener("beforeunload", event => {
  if (outbox.length) event.preventDefault();
});

window.addEventListener("online", flush);
window.addEventListener("hashchange", () => {
  if (location.hash === "#return" && !state.started) setMode(true);
});

if (state.started) {
  lockIntro();
  state.questions.forEach((item, i) => addCard(item, i));
  paint();
  if (state.finished) {
    showResult($("result"), { strength: state.final.strength, log10_guesses: state.final.score, strong_enough: true });
    showFinish(false);
    if (!state.confirmed && state.finalHash) openConfirm();
  }
} else if (location.hash === "#return") {
  setMode(true);
}

flush();
