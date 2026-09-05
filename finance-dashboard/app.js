const INDUSTRIES = ["半导体", "新能源", "医药生物", "计算机", "机械设备", "食品饮料", "汽车", "化工", "电子", "军工", "传媒", "电力设备"];
const BOARDS = [
  { name: "沪市主板", prefixes: ["600", "601", "603"] },
  { name: "深市主板", prefixes: ["000", "002"] },
  { name: "创业板", prefixes: ["300", "301"] },
  { name: "科创板", prefixes: ["688"] },
  { name: "北交所", prefixes: ["920"] },
];
const BRANDS = ["澄光", "北衡", "岚图", "青渚", "沐野", "瀚川", "砚山", "朔风", "锦澄", "远帆", "启微", "星澜", "华岑", "辰石", "云栖", "柏川", "禾野", "泽航", "鼎衡", "青城", "临溪", "拾贝", "南枝", "苍梧", "流石"];
const SUFFIX = {
  半导体: ["微芯", "晶测", "材料"],
  新能源: ["能源", "储充", "氢能"],
  医药生物: ["生物", "制药", "诊疗"],
  计算机: ["软件", "数据", "云科"],
  机械设备: ["智造", "装备", "精工"],
  食品饮料: ["食品", "饮品", "农牧"],
  汽车: ["汽配", "智驾", "动力"],
  化工: ["新材", "化工", "催化剂"],
  电子: ["光电", "器件", "连接"],
  军工: ["航科", "防务", "机电"],
  传媒: ["传媒", "文创", "互动"],
  电力设备: ["电气", "电网", "传动"],
};

const state = {
  seed: 1,
  companies: [],
  revTh: 15,
  npTh: 15,
  onlyPass: true,
  sortKey: "npYoy",
  sortDir: -1,
  search: "",
  selected: null,
};

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function gauss(rng, mean, sd) {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function generate(seed) {
  const rng = mulberry32(seed);
  const usedCodes = new Set();
  const usedNames = new Set();
  const rows = [];
  let i = 0;
  while (rows.length < 220 && i < 800) {
    i += 1;
    const board = pick(rng, BOARDS);
    const industry = pick(rng, INDUSTRIES);
    let code = pick(rng, board.prefixes) + String(Math.floor(rng() * 1000)).padStart(3, "0");
    if (usedCodes.has(code)) continue;
    usedCodes.add(code);
    let name = pick(rng, BRANDS) + pick(rng, SUFFIX[industry]);
    if (usedNames.has(name)) name += String.fromCharCode(65 + Math.floor(rng() * 12));
    usedNames.add(name);

    const growthBucket = rng();
    const revYoy = growthBucket < 0.32 ? gauss(rng, 28, 14) : gauss(rng, 7, 11);
    const npYoy = growthBucket < 0.32 ? gauss(rng, 31, 18) : gauss(rng, 5, 16);
    const revenue = Math.exp(gauss(rng, 3.1, 0.85));
    const margin = clamp(gauss(rng, 0.11, 0.05), 0.015, 0.32);
    const profit = revenue * margin;
    const roe = clamp(gauss(rng, 11, 6), 1.2, 38);
    const mcap = revenue * clamp(gauss(rng, 4.2, 1.4), 1.2, 14);
    const pe = clamp(mcap / Math.max(profit, 0.05), 6, 95);
    const quarters = [];
    let q = revenue / 2.15;
    for (let k = 0; k < 8; k += 1) {
      q *= 1 + gauss(rng, revYoy / 400, 0.06);
      quarters.push(Math.max(0.2, q));
    }
    rows.push({
      code,
      name,
      board: board.name,
      industry,
      revenue: +revenue.toFixed(2),
      profit: +profit.toFixed(2),
      revYoy: +revYoy.toFixed(2),
      npYoy: +npYoy.toFixed(2),
      roe: +roe.toFixed(2),
      margin: +(margin * 100).toFixed(2),
      pe: +pe.toFixed(1),
      mcap: +mcap.toFixed(2),
      quarters: quarters.map((n) => +n.toFixed(2)),
    });
  }
  return rows;
}

function isPass(row) {
  return row.revYoy > state.revTh && row.npYoy > state.npTh && row.profit > 0;
}

function filtered() {
  const q = state.search.trim();
  return state.companies.filter((row) => {
    if (state.onlyPass && !isPass(row)) return false;
    if (!q) return true;
    return `${row.code}${row.name}${row.industry}${row.board}`.includes(q);
  });
}

function sortedRows() {
  const rows = filtered().slice();
  const key = state.sortKey;
  rows.sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (typeof va === "string") return va.localeCompare(vb, "zh") * state.sortDir;
    return (va - vb) * state.sortDir;
  });
  return rows;
}

function pct(n) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function renderKpis() {
  const all = state.companies;
  const pass = all.filter(isPass);
  const avgRev = pass.length ? pass.reduce((s, r) => s + r.revYoy, 0) / pass.length : 0;
  const avgNp = pass.length ? pass.reduce((s, r) => s + r.npYoy, 0) / pass.length : 0;
  const items = [
    ["样本公司", all.length, `种子 ${state.seed}`],
    ["双增家数", pass.length, `占比 ${((pass.length / all.length) * 100).toFixed(1)}%`],
    ["双增营收同比均值", pct(avgRev), `阈值 ${state.revTh}%`],
    ["双增净利同比均值", pct(avgNp), `阈值 ${state.npTh}%`],
  ];
  document.getElementById("kpis").innerHTML = items
    .map(([k, v, e]) => `<div class="kpi"><span>${k}</span><b>${v}</b><em>${e}</em></div>`)
    .join("");
  const tape = pass.slice(0, 18).map((r) => `${r.code} ${r.name} 营收${pct(r.revYoy)} 净利${pct(r.npYoy)}`).join("    ·    ");
  document.getElementById("ticker").textContent = tape || "当前阈值下没有双增公司，试试调低阈值或换一批样本。";
}

function svgEl(name, attrs) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

function renderScatter() {
  const host = document.getElementById("scatter");
  host.innerHTML = "";
  const width = Math.max(host.clientWidth, 320);
  const height = 360;
  const m = { t: 16, r: 16, b: 36, l: 44 };
  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, role: "img" });
  const rows = state.companies;
  const xs = rows.map((r) => r.revYoy);
  const ys = rows.map((r) => r.npYoy);
  const minX = Math.min(-20, ...xs);
  const maxX = Math.max(80, ...xs);
  const minY = Math.min(-30, ...ys);
  const maxY = Math.max(90, ...ys);
  const x = (v) => m.l + ((v - minX) / (maxX - minX)) * (width - m.l - m.r);
  const y = (v) => height - m.b - ((v - minY) / (maxY - minY)) * (height - m.t - m.b);
  const maxM = Math.max(...rows.map((r) => r.mcap));

  for (let g = Math.ceil(minX / 20) * 20; g <= maxX; g += 20) {
    svg.appendChild(svgEl("line", { x1: x(g), x2: x(g), y1: m.t, y2: height - m.b, stroke: "#24332c", "stroke-width": 1 }));
    svg.appendChild(svgEl("text", { x: x(g), y: height - 12, fill: "#8ea398", "font-size": 11, "text-anchor": "middle" })).textContent = `${g}%`;
  }
  for (let g = Math.ceil(minY / 20) * 20; g <= maxY; g += 20) {
    svg.appendChild(svgEl("text", { x: 8, y: y(g) + 4, fill: "#8ea398", "font-size": 11 })).textContent = `${g}%`;
  }
  svg.appendChild(svgEl("line", { x1: x(state.revTh), x2: x(state.revTh), y1: m.t, y2: height - m.b, stroke: "#d7b56a", "stroke-dasharray": "5 4" }));
  svg.appendChild(svgEl("line", { x1: m.l, x2: width - m.r, y1: y(state.npTh), y2: y(state.npTh), stroke: "#d7b56a", "stroke-dasharray": "5 4" }));
  svg.appendChild(svgEl("text", { x: x(state.revTh) + 6, y: m.t + 12, fill: "#d7b56a", "font-size": 11 })).textContent = `营收 ${state.revTh}%`;
  svg.appendChild(svgEl("text", { x: width - m.r - 4, y: y(state.npTh) - 6, fill: "#d7b56a", "font-size": 11, "text-anchor": "end" })).textContent = `净利 ${state.npTh}%`;

  rows.forEach((row) => {
    const pass = isPass(row);
    const c = svgEl("circle", {
      class: "dot",
      cx: x(row.revYoy),
      cy: y(row.npYoy),
      r: 3.2 + (row.mcap / maxM) * 8,
      fill: pass ? "rgba(62,224,138,0.82)" : "rgba(211,107,107,0.28)",
      stroke: row.code === state.selected ? "#fff" : "transparent",
      "stroke-width": 2,
      "data-code": row.code,
    });
    c.addEventListener("mouseenter", (ev) => showTip(ev, row));
    c.addEventListener("mouseleave", hideTip);
    c.addEventListener("click", () => selectCompany(row.code));
    svg.appendChild(c);
  });
  host.appendChild(svg);
}

function showTip(ev, row) {
  const tip = document.getElementById("tooltip");
  tip.hidden = false;
  tip.innerHTML = `<b>${row.name}</b> ${row.code}<br/>${row.board} · ${row.industry}<br/>营收 ${row.revenue}亿 ${pct(row.revYoy)}<br/>净利 ${row.profit}亿 ${pct(row.npYoy)}`;
  tip.style.left = `${ev.clientX + 12}px`;
  tip.style.top = `${ev.clientY + 12}px`;
}

function hideTip() {
  document.getElementById("tooltip").hidden = true;
}

function renderIndustry() {
  const host = document.getElementById("industry");
  host.innerHTML = "";
  const pass = state.companies.filter(isPass);
  const counts = INDUSTRIES.map((name) => ({ name, n: pass.filter((r) => r.industry === name).length })).sort((a, b) => b.n - a.n);
  const width = Math.max(host.clientWidth, 280);
  const rowH = 26;
  const height = 20 + counts.length * rowH;
  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}` });
  const maxN = Math.max(1, ...counts.map((c) => c.n));
  counts.forEach((c, i) => {
    const y = 8 + i * rowH;
    const w = ((width - 120) * c.n) / maxN;
    svg.appendChild(svgEl("text", { x: 0, y: y + 12, fill: "#c5d6cb", "font-size": 12 })).textContent = c.name;
    svg.appendChild(svgEl("rect", { x: 78, y: y, width: Math.max(w, 2), height: 16, fill: "#3ee08a" }));
    svg.appendChild(svgEl("text", { x: 86 + w, y: y + 12, fill: "#8ea398", "font-size": 11 })).textContent = c.n;
  });
  host.appendChild(svg);
}

function renderTop() {
  const host = document.getElementById("top-bars");
  host.innerHTML = "";
  const top = state.companies.filter(isPass).sort((a, b) => b.npYoy - a.npYoy).slice(0, 10);
  const width = Math.max(host.clientWidth, 280);
  const rowH = 32;
  const height = Math.max(120, 16 + top.length * rowH);
  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}` });
  const maxV = Math.max(1, ...top.map((r) => r.npYoy));
  if (!top.length) {
    host.textContent = "没有双增公司。";
    return;
  }
  top.forEach((row, i) => {
    const y = 8 + i * rowH;
    const w = ((width - 150) * row.npYoy) / maxV;
    svg.appendChild(svgEl("text", { x: 0, y: y + 14, fill: "#c5d6cb", "font-size": 12 })).textContent = row.name;
    svg.appendChild(svgEl("rect", { x: 86, y: y, width: Math.max(w, 4), height: 18, fill: "#d7b56a" }));
    svg.appendChild(svgEl("text", { x: 94 + w, y: y + 14, fill: "#e9f2ec", "font-size": 11 })).textContent = pct(row.npYoy);
  });
  host.appendChild(svg);
}

function sparkline(values) {
  const w = 420;
  const h = 120;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 16) + 8;
    const y = 12 + ((max - v) / Math.max(max - min, 0.01)) * (h - 28);
    return `${x},${y}`;
  });
  return `<svg viewBox="0 0 ${w} ${h}"><polyline fill="none" stroke="#3ee08a" stroke-width="2.4" points="${pts.join(" ")}"/>
    ${values.map((v, i) => {
      const x = (i / (values.length - 1)) * (w - 16) + 8;
      const y = 12 + ((max - v) / Math.max(max - min, 0.01)) * (h - 28);
      return `<circle cx="${x}" cy="${y}" r="3" fill="#d7b56a" />`;
    }).join("")}</svg>`;
}

function renderDetail() {
  const host = document.getElementById("detail");
  const row = state.companies.find((r) => r.code === state.selected);
  if (!row) {
    host.className = "detail empty";
    host.textContent = "尚未选择公司。";
    return;
  }
  host.className = "detail";
  host.innerHTML = `
    <h3>${row.name} <small>${row.code}</small></h3>
    <div class="meta">${row.board} · ${row.industry} · 模拟 PE ${row.pe} · 毛利率口径净利率 ${row.margin}%</div>
    <div class="stats">
      <div><span>营收</span><b>${row.revenue} 亿</b></div>
      <div><span>营收同比</span><b class="${row.revYoy > state.revTh ? "up" : "down"}">${pct(row.revYoy)}</b></div>
      <div><span>净利</span><b>${row.profit} 亿</b></div>
      <div><span>净利同比</span><b class="${row.npYoy > state.npTh ? "up" : "down"}">${pct(row.npYoy)}</b></div>
      <div><span>ROE</span><b>${row.roe}%</b></div>
      <div><span>市值</span><b>${row.mcap} 亿</b></div>
    </div>
    <div class="meta">近八季模拟营收轨迹（亿元）</div>
    ${sparkline(row.quarters)}
  `;
}

function renderTable() {
  const rows = sortedRows();
  document.getElementById("table-meta").textContent = `当前列出 ${rows.length} 家`;
  document.getElementById("tbody").innerHTML = rows
    .map((r) => `
      <tr data-code="${r.code}" class="${r.code === state.selected ? "active" : ""}">
        <td>${r.code}</td>
        <td>${r.name}</td>
        <td>${r.board}</td>
        <td>${r.industry}</td>
        <td class="num">${r.revenue.toFixed(1)}</td>
        <td class="num ${r.revYoy > 0 ? "up" : "down"}">${pct(r.revYoy)}</td>
        <td class="num">${r.profit.toFixed(1)}</td>
        <td class="num ${r.npYoy > 0 ? "up" : "down"}">${pct(r.npYoy)}</td>
        <td class="num">${r.roe.toFixed(1)}%</td>
        <td class="num">${r.mcap.toFixed(0)}</td>
      </tr>`)
    .join("");
  document.querySelectorAll("#tbody tr").forEach((tr) => {
    tr.addEventListener("click", () => selectCompany(tr.dataset.code));
  });
}

function selectCompany(code) {
  state.selected = code;
  renderAll();
}

function renderAll() {
  renderKpis();
  renderScatter();
  renderIndustry();
  renderTop();
  renderDetail();
  renderTable();
}

function exportCsv() {
  const rows = sortedRows();
  const head = ["代码", "名称", "板块", "行业", "营收亿元", "营收同比", "净利亿元", "净利同比", "ROE", "市值亿元"];
  const body = rows.map((r) => [r.code, r.name, r.board, r.industry, r.revenue, r.revYoy, r.profit, r.npYoy, r.roe, r.mcap].join(","));
  const blob = new Blob(["\ufeff" + [head.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `双增样本_${state.seed}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function bind() {
  document.getElementById("rev-th").addEventListener("input", (e) => {
    state.revTh = Number(e.target.value) || 0;
    renderAll();
  });
  document.getElementById("np-th").addEventListener("input", (e) => {
    state.npTh = Number(e.target.value) || 0;
    renderAll();
  });
  document.getElementById("only-pass").addEventListener("change", (e) => {
    state.onlyPass = e.target.checked;
    renderAll();
  });
  document.getElementById("regen").addEventListener("click", () => {
    state.seed = (Math.floor(Math.random() * 900000) + 100000);
    state.companies = generate(state.seed);
    state.selected = null;
    renderAll();
  });
  document.getElementById("search").addEventListener("input", (e) => {
    state.search = e.target.value;
    renderTable();
  });
  document.getElementById("export").addEventListener("click", exportCsv);
  document.querySelectorAll("th[data-key]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      if (state.sortKey === key) state.sortDir *= -1;
      else {
        state.sortKey = key;
        state.sortDir = -1;
      }
      renderTable();
    });
  });
  window.addEventListener("resize", () => {
    renderScatter();
    renderIndustry();
    renderTop();
  });
}

state.seed = 20260905;
state.companies = generate(state.seed);
bind();
renderAll();
