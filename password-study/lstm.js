const BOS = 1;
const FIRST_CHAR = 3;
const END_TARGET = 0;
export const MAX_PASSWORD = 64;

function halfToFloat() {
  const table = new Float32Array(65536);
  for (let h = 0; h < 65536; h++) {
    const sign = h & 0x8000 ? -1 : 1;
    const exponent = (h >> 10) & 0x1f;
    const fraction = h & 0x3ff;
    if (exponent === 0) table[h] = sign * fraction * 2 ** -24;
    else if (exponent === 31) table[h] = fraction ? NaN : sign * Infinity;
    else table[h] = sign * (1 + fraction / 1024) * 2 ** (exponent - 15);
  }
  return table;
}

function dot(w, offset, x, n) {
  let s0 = 0, s1 = 0, s2 = 0, s3 = 0;
  for (let k = 0; k < n; k += 4) {
    s0 += w[offset + k] * x[k];
    s1 += w[offset + k + 1] * x[k + 1];
    s2 += w[offset + k + 2] * x[k + 2];
    s3 += w[offset + k + 3] * x[k + 3];
  }
  return s0 + s1 + s2 + s3;
}

const sigmoid = x => 1 / (1 + Math.exp(-x));

export class CharLSTM {
  constructor(manifest, buffer) {
    const half = new Uint16Array(buffer);
    const lookup = halfToFloat();
    this.weights = {};
    for (const t of manifest.weights.tensors) {
      const size = t.shape.reduce((a, b) => a * b, 1);
      const values = new Float32Array(size);
      for (let i = 0; i < size; i++) values[i] = lookup[half[t.offset + i]];
      this.weights[t.name] = values;
    }
    const { hidden, layers, dense, outputs, max_length } = manifest.config;
    Object.assign(this, { hidden, layers, dense, outputs, maxLength: max_length });
    this.gates = new Float64Array(4 * hidden);
    this.denseOut = new Float64Array(dense);
    this.logits = new Float64Array(outputs);
    this.cache = new Map();
    const depth = MAX_PASSWORD + 2;
    const block = () => Array.from({ length: layers }, () => new Float32Array(hidden));
    this.h = Array.from({ length: depth }, block);
    this.c = Array.from({ length: depth }, block);
    this.logp = Array.from({ length: depth }, () => new Float64Array(outputs));
  }

  cell(hOut, cOut, cIn) {
    const H = this.hidden, g = this.gates;
    for (let j = 0; j < H; j++) {
      const c = sigmoid(g[H + j]) * cIn[j] + sigmoid(g[j]) * Math.tanh(g[2 * H + j]);
      cOut[j] = c;
      hOut[j] = sigmoid(g[3 * H + j]) * Math.tanh(c);
    }
  }

  step(token, depth) {
    const H = this.hidden, G = 4 * H, w = this.weights, g = this.gates;
    const hIn = this.h[depth], cIn = this.c[depth], hOut = this.h[depth + 1], cOut = this.c[depth + 1];
    const input0 = w.input0, recurrent0 = w.recurrent0, base = token * G;
    for (let r = 0; r < G; r++) g[r] = input0[base + r] + dot(recurrent0, r * H, hIn[0], H);
    this.cell(hOut[0], cOut[0], cIn[0]);
    for (let l = 1; l < this.layers; l++) {
      const W = w[`weight${l}`], b = w[`bias${l}`], below = hOut[l - 1], own = hIn[l];
      for (let r = 0; r < G; r++) g[r] = b[r] + dot(W, 2 * r * H, below, H) + dot(W, (2 * r + 1) * H, own, H);
      this.cell(hOut[l], cOut[l], cIn[l]);
    }
    const top = hOut[this.layers - 1], D = this.dense, d = this.denseOut, z = this.logits;
    for (let r = 0; r < D; r++) d[r] = Math.max(0, w.dense_bias[r] + dot(w.dense_weight, r * H, top, H));
    let max = -Infinity;
    for (let r = 0; r < this.outputs; r++) {
      let s = w.out_bias[r];
      for (let k = 0; k < D; k++) s += w.out_weight[r * D + k] * d[k];
      z[r] = s;
      if (s > max) max = s;
    }
    let sum = 0;
    for (let r = 0; r < this.outputs; r++) sum += Math.exp(z[r] - max);
    const norm = max + Math.log(sum), out = this.logp[depth + 1];
    for (let r = 0; r < this.outputs; r++) out[r] = z[r] - norm;
  }

  logProbs(passwords) {
    const missing = [...new Set(passwords.filter(p => !this.cache.has(p)))];
    if (missing.length) this.scoreTrie(missing);
    return passwords.map(p => this.cache.get(p));
  }

  scoreTrie(passwords) {
    const root = { children: new Map(), ends: [] };
    for (const p of passwords) {
      let node = root;
      for (const ch of p) {
        if (!node.children.has(ch)) node.children.set(ch, { children: new Map(), ends: [] });
        node = node.children.get(ch);
      }
      node.ends.push(p);
    }
    for (const layer of [...this.h[0], ...this.c[0]]) layer.fill(0);
    this.step(BOS, 0);
    const visit = (node, depth, total) => {
      const logp = this.logp[depth + 1];
      for (const p of node.ends) this.cache.set(p, total + logp[END_TARGET]);
      for (const [ch, child] of node.children) {
        const token = ch.charCodeAt(0) - 32 + FIRST_CHAR;
        const next = total + logp[token - 2];
        this.step(token, depth + 1);
        visit(child, depth + 1, next);
      }
    };
    visit(root, 0, 0);
    if (this.cache.size > 50000) this.cache.clear();
  }
}

export class GuessTable {
  constructor(buffer, info) {
    this.lp = new Float32Array(buffer, 0, info.count);
    this.log10 = new Float64Array(info.count + 1);
    let cum = 0;
    for (let i = 0; i < info.count; i++) {
      cum += Math.exp(-this.lp[i]) / info.draws;
      this.log10[i + 1] = Math.log10(1 + cum);
    }
  }

  lookup(logp) {
    let lo = 0, hi = this.lp.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.lp[mid] > logp) lo = mid + 1;
      else hi = mid;
    }
    return { log10: this.log10[lo], beyond: lo === this.lp.length };
  }
}
