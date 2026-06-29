const API_BASE = window.SHICI_API_BASE ?? "https://poetry.palemoky.com";
const PAGE_SIZE = 10;
const CORS_MESSAGE = "浏览器无法读取远程 API，通常是 CORS 限制。当前显示演示数据；同源部署或代理后会使用真实 API。";

const demoPoems = [
  {
    id: 309946,
    title: "静夜思",
    content: ["床前看月光，疑是地上霜。", "举头望山月，低头思故乡。"],
    author: { id: 2045, name: "李白" },
    dynasty: { id: 6, name: "唐" },
    type: { id: 11, name: "五言绝句" },
  },
  {
    id: 1,
    title: "登鹳雀楼",
    content: ["白日依山尽，黄河入海流。", "欲穷千里目，更上一层楼。"],
    author: { id: 0, name: "王之涣" },
    dynasty: { id: 6, name: "唐" },
    type: { id: 11, name: "五言绝句" },
  },
  {
    id: 2,
    title: "春晓",
    content: ["春眠不觉晓，处处闻啼鸟。", "夜来风雨声，花落知多少。"],
    author: { id: 0, name: "孟浩然" },
    dynasty: { id: 6, name: "唐" },
    type: { id: 11, name: "五言绝句" },
  },
];

const $ = (id) => document.getElementById(id);

const state = {
  page: 1,
  hasMore: false,
  poems: [],
  selected: null,
  lastMode: "search",
};

const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

const els = {
  form: $("searchForm"),
  query: $("query"),
  searchType: $("searchType"),
  lang: $("lang"),
  dynasty: $("dynasty"),
  author: $("author"),
  poemType: $("poemType"),
  randomBtn: $("randomBtn"),
  resetBtn: $("resetBtn"),
  refreshBtn: $("refreshBtn"),
  prevBtn: $("prevBtn"),
  nextBtn: $("nextBtn"),
  list: $("poemList"),
  message: $("message"),
  resultTitle: $("resultTitle"),
  resultMeta: $("resultMeta"),
  requestTime: $("requestTime"),
  pageLabel: $("pageLabel"),
  apiStatus: $("apiStatus"),
  readerDynasty: $("readerDynasty"),
  readerTitle: $("readerTitle"),
  readerAuthor: $("readerAuthor"),
  readerChips: $("readerChips"),
  readerBody: $("readerBody"),
  rawJson: $("rawJson"),
  copyBtn: $("copyBtn"),
  copyJsonBtn: $("copyJsonBtn"),
  copyState: $("copyState"),
};

function setMessage(text, tone = "info") {
  els.message.hidden = !text;
  els.message.textContent = text || "";
  els.message.dataset.tone = tone;
}

function setApiStatus(ok) {
  const dot = els.apiStatus.querySelector(".dot");
  dot.classList.toggle("ok", ok === true);
  dot.classList.toggle("bad", ok === false);
  els.apiStatus.lastElementChild.textContent = ok === false ? "API 异常" : "API 状态";
}

function commonParams(extra = {}) {
  const query = new URLSearchParams({ lang: els.lang.value, ...extra });
  if (els.dynasty.value) query.set("dynasty", els.dynasty.value);
  if (els.author.value.trim()) query.set("author", els.author.value.trim());
  return query;
}

function randomParams() {
  const query = commonParams();
  if (els.poemType.value) query.set("type", els.poemType.value);
  return query;
}

function hasFilters() {
  return Boolean(els.dynasty.value || els.author.value.trim() || els.poemType.value);
}

function searchParams(q, page, includeFilters = true) {
  const query = new URLSearchParams({
    lang: els.lang.value,
    q,
    page,
    pageSize: PAGE_SIZE,
  });
  if (els.searchType.value !== "all") query.set("type", els.searchType.value);
  if (includeFilters) {
    if (els.dynasty.value) query.set("dynasty", els.dynasty.value);
    if (els.author.value.trim()) query.set("author", els.author.value.trim());
    if (els.poemType.value) query.set("poemType", els.poemType.value);
  }
  return query;
}

async function fetchJson(path) {
  const started = performance.now();
  const res = await fetch(`${API_BASE}${path}`, { headers: { accept: "application/json" } });
  const data = await res.json().catch(() => ({}));
  els.requestTime.textContent = `用时 ${Math.round(performance.now() - started)}ms`;

  if (!res.ok) {
    throw new Error(data?.error?.message || `请求失败：${res.status}`);
  }
  return data;
}

function isNetworkBlocked(err) {
  return err instanceof TypeError || /failed to fetch/i.test(String(err?.message || err));
}

function demoSearch(q) {
  const value = q.trim();
  const data = demoPoems.filter((poem) => {
    const meta = poemMeta(poem);
    return [poem.title, meta.author, meta.dynasty, meta.type, ...meta.content].join("").includes(value);
  });
  return { data: data.length ? data : demoPoems, pagination: { page: 1, pageSize: PAGE_SIZE, hasMore: false } };
}

function poemMeta(poem) {
  return {
    author: poem?.author?.name || "佚名",
    dynasty: poem?.dynasty?.name || "未详",
    type: poem?.type?.name || "未分体裁",
    content: Array.isArray(poem?.content) ? poem.content : [String(poem?.content || "")],
  };
}

function renderList() {
  els.list.innerHTML = "";
  state.poems.forEach((poem) => {
    const meta = poemMeta(poem);
    const row = document.createElement("button");
    row.type = "button";
    row.className = `poem-row${state.selected?.id === poem.id ? " is-active" : ""}`;
    row.innerHTML = `
      <div>
        <h3>${esc(poem.title || "无题")}</h3>
        <small>${esc(meta.dynasty)} · ${esc(meta.author)}</small>
        <p>${esc(meta.content.slice(0, 2).join(" "))}</p>
      </div>
      <span class="tag">${esc(meta.type)}</span>
    `;
    row.addEventListener("click", () => selectPoem(poem));
    els.list.append(row);
  });

  els.prevBtn.disabled = state.page <= 1;
  els.nextBtn.disabled = !state.hasMore;
  els.pageLabel.textContent = `第 ${state.page} 页`;
}

function selectPoem(poem) {
  state.selected = poem;
  const meta = poemMeta(poem);
  els.readerDynasty.textContent = meta.dynasty.slice(0, 1);
  els.readerTitle.textContent = poem.title || "无题";
  els.readerAuthor.textContent = `${meta.dynasty} · ${meta.author}`;
  els.readerBody.innerHTML = meta.content.map((line) => `<p>${esc(line)}</p>`).join("");
  els.readerChips.innerHTML = [meta.dynasty, meta.author, meta.type].map((item) => `<span>${esc(item)}</span>`).join("");
  els.rawJson.textContent = JSON.stringify(poem, null, 2);
  renderList();
}

function setLoading(text) {
  setMessage(text);
  els.resultMeta.textContent = "正在请求诗库";
}

async function search(page = 1) {
  const q = els.query.value.trim();
  if (q.length < 3) {
    setMessage("搜索词至少 3 个字符。可以试试「静夜思」或「床前明月」。", "warn");
    return;
  }

  state.lastMode = "search";
  state.page = page;
  setLoading("检索中...");

  try {
    let json;
    try {
      json = await fetchJson(`/api/search?${searchParams(q, page)}`);
    } catch (err) {
      if (isNetworkBlocked(err)) {
        json = demoSearch(q);
        setApiStatus(false);
        setMessage(CORS_MESSAGE, "warn");
      } else {
      if (!hasFilters()) throw err;
      json = await fetchJson(`/api/search?${searchParams(q, page, false)}`);
      setMessage("接口未接受部分筛选参数，已按关键词返回结果。", "warn");
      }
    }
    state.poems = json.data || [];
    state.hasMore = Boolean(json.pagination?.hasMore);
    els.resultTitle.textContent = "搜索结果";
    els.resultMeta.textContent = state.poems.length ? `找到 ${state.poems.length} 首，本页展示` : "没有匹配结果";
    if (!els.message.textContent.startsWith("浏览器无法读取")) setApiStatus(true);
    if (state.poems.length && els.message.textContent.startsWith("接口未接受")) {
      els.message.hidden = false;
    } else {
      setMessage(state.poems.length ? "" : "没有找到匹配诗词，换一个关键词试试。");
    }
    renderList();
    if (state.poems[0]) selectPoem(state.poems[0]);
  } catch (err) {
    setApiStatus(false);
    setMessage(err.message, "error");
  }
}

async function randomPoem() {
  state.lastMode = "random";
  setLoading("正在取一首诗...");

  try {
    let json;
    try {
      json = await fetchJson(`/api/poems/random?${randomParams()}`);
    } catch (err) {
      if (isNetworkBlocked(err)) {
        json = { data: demoPoems[Math.floor(Math.random() * demoPoems.length)] };
        setApiStatus(false);
        setMessage(CORS_MESSAGE, "warn");
      } else {
      if (!hasFilters()) throw err;
      json = await fetchJson(`/api/poems/random?${new URLSearchParams({ lang: els.lang.value })}`);
      setMessage("接口未接受部分筛选参数，已随机返回一首。", "warn");
      }
    }
    const poem = json.data;
    if (!poem) throw new Error("接口没有返回诗词。");
    state.poems = [poem];
    state.page = 1;
    state.hasMore = false;
    els.resultTitle.textContent = "随机一首";
    els.resultMeta.textContent = "按当前筛选抽取";
    if (!els.message.textContent.startsWith("浏览器无法读取")) setApiStatus(true);
    if (els.message.textContent.startsWith("接口未接受")) {
      els.message.hidden = false;
    } else {
      setMessage("");
    }
    renderList();
    selectPoem(poem);
  } catch (err) {
    setApiStatus(false);
    setMessage(err.message, "error");
  }
}

async function loadStats() {
  try {
    const json = await fetchJson(`/api/stats?${commonParams()}`);
    const stats = json.data;
    if (stats) {
      els.resultMeta.textContent = `诗 ${stats.poems.toLocaleString()} 首 · 作者 ${stats.authors.toLocaleString()} 位`;
    }
    setApiStatus(true);
  } catch (err) {
    if (isNetworkBlocked(err)) {
      els.resultMeta.textContent = "诗 371,313 首 · 作者 13,577 位";
    }
    setApiStatus(false);
  }
}

async function copy(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  els.copyState.textContent = "已复制";
  window.setTimeout(() => {
    els.copyState.textContent = "";
  }, 1600);
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  search(1);
});

els.randomBtn.addEventListener("click", randomPoem);
els.refreshBtn.addEventListener("click", () => (state.lastMode === "random" ? randomPoem() : search(state.page)));
els.prevBtn.addEventListener("click", () => search(Math.max(1, state.page - 1)));
els.nextBtn.addEventListener("click", () => search(state.page + 1));

els.resetBtn.addEventListener("click", () => {
  els.dynasty.value = "";
  els.author.value = "";
  els.poemType.value = "";
  search(1);
});

document.querySelectorAll("[data-author]").forEach((button) => {
  button.addEventListener("click", () => {
    els.author.value = button.dataset.author || "";
    search(1);
  });
});

[els.lang, els.dynasty, els.poemType].forEach((el) => {
  el.addEventListener("change", () => (state.lastMode === "random" ? randomPoem() : search(1)));
});

els.copyBtn.addEventListener("click", () => {
  if (!state.selected) return;
  copy(poemMeta(state.selected).content.join("\n"));
});

els.copyJsonBtn.addEventListener("click", () => {
  if (!state.selected) return;
  copy(JSON.stringify(state.selected, null, 2));
});

loadStats().finally(() => search(1));
