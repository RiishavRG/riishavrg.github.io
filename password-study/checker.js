import { CharLSTM, GuessTable, MAX_PASSWORD } from "./lstm.js";

export const MIN_LENGTH = 12;
export const MIN_CLASSES = 2;
export const WEAK_BELOW = 6;
export const STRONG_FROM = 10;
const LOG2 = Math.log10(2);
const YEAR_COST = 2;
const LEET = new Map(Object.entries({ 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s", "!": "i" }));
const YEAR = /(19[4-9]\d|20[0-3]\d)/g;
const PRINTABLE = /^[\x20-\x7e]+$/;

const isLower = c => c >= "a" && c <= "z";
const isUpper = c => c >= "A" && c <= "Z";
const isDigit = c => c >= "0" && c <= "9";
const isAlpha = c => isLower(c) || isUpper(c);
const isAlnum = c => isAlpha(c) || isDigit(c);
const round = (x, digits) => Math.round(x * 10 ** digits) / 10 ** digits;

export function strengthLabel(log10Guesses) {
  if (log10Guesses < WEAK_BELOW) return "weak";
  return log10Guesses >= STRONG_FROM ? "strong" : "medium";
}

export function charClasses(pw) {
  const c = { lower: 0, upper: 0, digit: 0, symbol: 0 };
  for (const ch of pw) {
    if (isLower(ch)) c.lower++;
    else if (isUpper(ch)) c.upper++;
    else if (isDigit(ch)) c.digit++;
    else c.symbol++;
  }
  c.classes = [c.lower, c.upper, c.digit, c.symbol].filter(Boolean).length;
  return c;
}

export const meetsPolicy = pw => pw.length >= MIN_LENGTH && charClasses(pw).classes >= MIN_CLASSES;

export function baselineIssues(pw) {
  const issues = [];
  if (pw.length < MIN_LENGTH) issues.push(`Use at least ${MIN_LENGTH} characters (now ${pw.length}).`);
  const k = charClasses(pw).classes;
  if (k < MIN_CLASSES) {
    issues.push(`Use at least ${MIN_CLASSES} kinds of characters (lowercase, uppercase, digits, symbols); now ${k}.`);
  }
  return issues;
}

function deleet(pw) {
  const out = [...pw];
  let swaps = 0;
  for (let i = 0; i < pw.length; i++) {
    if (LEET.has(pw[i]) && ((i > 0 && isAlpha(pw[i - 1])) || (i + 1 < pw.length && isAlpha(pw[i + 1])))) {
      out[i] = LEET.get(pw[i]);
      swaps++;
    }
  }
  return [out.join(""), swaps];
}

function stripYears(pw) {
  let count = 0;
  const out = pw.replace(YEAR, () => {
    count++;
    return "";
  });
  return [out, count];
}

function log10Comb(n, k) {
  let sum = 0;
  for (let i = 1; i <= k; i++) sum += Math.log10((n - k + i) / i);
  return sum;
}

function caseCost(pw) {
  const letters = [...pw].filter(isAlpha);
  const n = letters.length, upper = letters.filter(isUpper).length;
  if (upper === 0) return 0;
  if (upper === n || (upper === 1 && isUpper(letters[0]))) return LOG2;
  return Math.max(LOG2, log10Comb(n, upper));
}

function bruteforce(pw) {
  const c = charClasses(pw);
  const card = 26 * (c.lower > 0) + 26 * (c.upper > 0) + 10 * (c.digit > 0) + 33 * (c.symbol > 0);
  if (card <= 1 || !pw) return 0;
  return pw.length * Math.log10(card) + Math.log10(card / (card - 1));
}

function variants(pw) {
  const low = pw.toLowerCase();
  const [unleet, swaps] = deleet(low);
  const [noYear, years] = stripYears(unleet);
  return { low, unleet, swaps, noYear, years };
}

function permutations(items, size) {
  const out = [];
  const walk = (prefix, used) => {
    if (prefix.length === size) {
      out.push(prefix);
      return;
    }
    items.forEach((item, i) => {
      if (!used.includes(i)) walk([...prefix, item], [...used, i]);
    });
  };
  walk([], []);
  return out;
}

function capitalize(answer) {
  const s = [...answer].filter(isAlnum).join("");
  return s.slice(0, 1).toUpperCase() + s.slice(1).toLowerCase();
}

function suggestionParts(answers, number, symbol) {
  const blocks = answers.map(capitalize).filter(Boolean).slice(0, 3);
  const digits = [...(number || "")].filter(isDigit).join("").slice(0, 6);
  const found = [...(symbol || "")].filter(c => c >= "!" && c <= "~" && !isAlnum(c)).slice(0, 1);
  return { blocks, digits, symbols: found.length ? found : ["@", "#"] };
}

async function download(url, info, onChunk) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${info.file} (HTTP ${response.status})`);
  const bytes = new Uint8Array(info.bytes);
  const reader = response.body.getReader();
  let offset = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (offset + value.length > bytes.length) throw new Error(`${info.file} is larger than expected`);
    bytes.set(value, offset);
    offset += value.length;
    onChunk(value.length);
  }
  if (offset !== bytes.length) throw new Error(`${info.file} is incomplete`);
  if (globalThis.crypto?.subtle) {
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    const hex = [...digest].map(b => b.toString(16).padStart(2, "0")).join("");
    if (hex !== info.sha256) throw new Error(`${info.file} is damaged`);
  }
  return bytes.buffer;
}

export class PasswordChecker {
  constructor(manifest, buffers) {
    this.model = new CharLSTM(manifest, buffers.weights);
    this.general = new GuessTable(buffers.general, manifest.tables.general);
    this.policy = new GuessTable(buffers.policy, manifest.tables.policy);
  }

  static async load(base, onProgress = () => {}) {
    const response = await fetch(new URL("model.json", base), { cache: "no-cache" });
    if (!response.ok) throw new Error(`Could not load model.json (HTTP ${response.status})`);
    const manifest = await response.json();
    const files = { weights: manifest.weights, general: manifest.tables.general, policy: manifest.tables.policy };
    const total = Object.values(files).reduce((sum, f) => sum + f.bytes, 0);
    let loaded = 0;
    const entries = await Promise.all(Object.entries(files).map(async ([key, info]) => {
      const url = new URL(`${info.file}?v=${info.sha256.slice(0, 12)}`, base);
      return [key, await download(url, info, n => onProgress((loaded += n), total))];
    }));
    return new PasswordChecker(manifest, Object.fromEntries(entries));
  }

  score(passwords) {
    const forms = passwords.map(variants);
    const n = passwords.length;
    const lp = this.model.logProbs([...passwords, ...forms.map(f => f.low), ...forms.map(f => f.unleet),
      ...forms.map(f => f.noYear)]);
    const general = i => this.general.lookup(lp[i]).log10;
    return passwords.map((pw, i) => {
      const f = forms[i], raw = this.general.lookup(lp[i]), policy = meetsPolicy(pw);
      let site = raw.log10, beyond = raw.beyond;
      if (policy) {
        const p = this.policy.lookup(lp[i]);
        site = Math.min(raw.log10, p.log10);
        beyond = p.beyond && raw.beyond;
      }
      const cost = caseCost(pw);
      const position = Math.log10(f.noYear.length + 1);
      const yearRoute = f.years > 0 ? general(3 * n + i) + cost + f.swaps * LOG2 + f.years * (YEAR_COST + position) : Infinity;
      const routes = [site, general(n + i) + cost, general(2 * n + i) + cost + f.swaps * LOG2, yearRoute, bruteforce(pw)];
      return { raw: raw.log10, site, conservative: Math.max(Math.min(...routes), 0), beyond, policy };
    });
  }

  check(password) {
    if (typeof password !== "string" || !password || password.length > MAX_PASSWORD || !PRINTABLE.test(password)) {
      return { ok: false, error: "Password must be 1-64 printable ASCII characters." };
    }
    const s = this.score([password])[0];
    const lg = s.conservative;
    const issues = baselineIssues(password);
    return {
      ok: true,
      log10_guesses: round(lg, 3),
      log10_guesses_raw: round(s.raw, 3),
      beyond_table: s.beyond && lg === s.site,
      policy_aware: s.policy,
      strength: strengthLabel(lg),
      meets_baseline: issues.length === 0,
      baseline_issues: issues,
      strong_enough: issues.length === 0 && lg >= STRONG_FROM,
    };
  }

  warm(passwords) {
    const strings = [];
    for (const pw of passwords.filter(p => PRINTABLE.test(p))) {
      const f = variants(pw);
      strings.push(pw, f.low, f.unleet, f.noYear);
    }
    this.model.logProbs(strings);
  }

  rank(candidates) {
    const seen = new Set(), unique = [];
    for (const c of candidates) {
      if (seen.has(c.password) || c.password.length < 1 || c.password.length > MAX_PASSWORD) continue;
      seen.add(c.password);
      unique.push(c);
    }
    this.warm(unique.map(c => c.password));
    const rows = [];
    for (const c of unique) {
      const r = this.check(c.password);
      if (!r.ok) continue;
      rows.push({ password: c.password, log10_guesses: r.log10_guesses, strength: r.strength, meets_rule: r.meets_baseline,
        remember: c.remember });
    }
    return rows.sort((a, b) => b.log10_guesses - a.log10_guesses);
  }

  fromAnswers(answers, number = "", symbol = "", k = 20, related = []) {
    const { blocks, digits, symbols } = suggestionParts(answers, number, symbol);
    if (!blocks.length) return [];
    const build = (words, s) => ({ password: words.join("") + s + digits, remember: [...words, s, ...(digits ? [digits] : [])].join(" + ") });
    const candidates = [];
    for (let size = 1; size <= blocks.length; size++) {
      for (const order of permutations(blocks, size)) {
        for (const s of symbols) candidates.push(build(order, s));
      }
    }
    let rows = this.rank(candidates);
    const extras = [...new Set(related.map(capitalize))].filter(w => w && !blocks.includes(w)).slice(0, 6);
    for (let count = 1; count <= 2 && extras.length && !rows.some(r => r.meets_rule); count++) {
      for (const order of permutations(blocks, blocks.length)) {
        for (const added of permutations(extras, count)) {
          for (const s of symbols) candidates.push(build([...added, ...order], s), build([...order, ...added], s));
        }
      }
      rows = this.rank(candidates);
    }
    return rows.slice(0, k);
  }

  improve(password, answers, number = "", symbol = "", k = 20) {
    const { blocks, digits, symbols } = suggestionParts(answers, number, symbol);
    if (!blocks.length) return [];
    let [, head, tail] = password.match(/^([\s\S]*?)([^A-Za-z]*)$/);
    head = head || password;
    head = head.slice(0, 1).toUpperCase() + head.slice(1);
    const tails = [...(tail ? [tail] : []), ...symbols.map(s => s + digits).filter(t => t !== tail)];
    const candidates = [];
    for (const size of [1, 2]) {
      for (const order of permutations(blocks, size)) {
        for (const before of [false, true]) {
          const letters = before ? order.join("") + head : head + order.join("");
          const pieces = before ? [...order, "your password"] : ["your password", ...order];
          for (const t of tails.length ? tails : [""]) {
            candidates.push({ password: letters + t, remember: [...pieces, ...(t ? [t] : [])].join(" + ") });
          }
        }
      }
    }
    return this.rank(candidates).slice(0, k);
  }
}
