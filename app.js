const STORAGE_KEY = "xhsMarketAssistants.v1";

const sampleText = `好烦，今天上班又迟到了
评论 33 点赞 120
今天地铁太挤了，整个人都不好了。

学生党百元防晒衣测评，别再买闷热款
#防晒衣 #学生党 #平价 #防晒测评
点赞 2680 收藏 1510 评论 188
预算有限优先看 UPF 标识、透气孔和版型，短款更适合小个子。

防晒衣怎么选才不闷，通勤和户外都能穿
#防晒衣 #通勤穿搭 #夏天
点赞 1240 收藏 860 评论 96
轻薄不闷、帽檐够大、袖口能包住手背，日常通勤比硬防晒更方便。

海边旅行防晒清单，敏感肌也能少踩雷
#海边 #敏感肌 #旅行 #户外防晒
点赞 980 收藏 1320 评论 74
用户更关心一整套方案：防晒衣、防晒霜、遮阳帽和补涂。`;

const researchModes = {
  product: {
    label: "产品机会",
    groups: [
      { name: "痛点 / 情绪", terms: ["好烦", "踩雷", "后悔", "劝退", "闷热", "不舒服", "不透气", "显黑", "太贵", "不好用"] },
      { name: "购买决策", terms: ["怎么选", "测评", "对比", "真实评价", "性价比", "平替", "值得买吗", "推荐"] },
      { name: "人群", terms: ["学生党", "小个子", "敏感肌", "宝妈", "打工人", "新手", "男生", "女生"] },
      { name: "场景", terms: ["通勤", "夏天", "旅行", "海边", "户外", "骑车", "军训", "露营"] }
    ]
  },
  pain: {
    label: "用户痛点",
    groups: [
      { name: "抱怨表达", terms: ["好烦", "受不了", "劝退", "踩雷", "后悔", "吐槽", "避雷", "不推荐"] },
      { name: "问题描述", terms: ["闷热", "不舒服", "不透气", "显黑", "起球", "过敏", "不好洗", "不耐用"] },
      { name: "评论问题", terms: ["怎么办", "怎么解决", "有没有同款", "求推荐", "求平替", "求避雷"] }
    ]
  },
  content: {
    label: "内容选题",
    groups: [
      { name: "内容形式", terms: ["合集", "清单", "测评", "对比", "教程", "攻略", "避雷", "开箱"] },
      { name: "标题方向", terms: ["推荐", "真实评价", "怎么选", "新手", "必看", "平价", "高性价比"] },
      { name: "场景选题", terms: ["通勤", "旅行", "夏天", "学生党", "小个子", "懒人", "日常"] }
    ]
  },
  competitor: {
    label: "竞品分析",
    groups: [
      { name: "竞品对比", terms: ["对比", "测评", "平替", "同款", "替代", "哪家好", "值得买吗"] },
      { name: "品牌评价", terms: ["真实评价", "踩雷", "推荐", "劝退", "售后", "质量", "价格"] },
      { name: "购买决策", terms: ["性价比", "便宜", "贵", "预算", "百元", "大牌", "平价"] }
    ]
  }
};

const insightDictionaries = {
  pain: ["好烦", "踩雷", "后悔", "劝退", "闷热", "不舒服", "不透气", "显黑", "太贵", "不好用", "过敏", "起球", "避雷"],
  audience: ["学生党", "小个子", "敏感肌", "宝妈", "打工人", "新手", "男生", "女生", "懒人"],
  scene: ["通勤", "夏天", "旅行", "海边", "户外", "骑车", "军训", "露营", "日常"],
  decision: ["怎么选", "测评", "对比", "推荐", "真实评价", "性价比", "平替", "值得买吗", "预算", "百元"],
  competitor: ["同款", "平替", "替代", "大牌", "哪家好", "质量", "售后", "价格"]
};

const stopWords = new Set([
  "小红书",
  "搜索",
  "发现",
  "更多",
  "展开",
  "点赞",
  "收藏",
  "评论",
  "分享",
  "关注",
  "主页",
  "笔记",
  "视频",
  "图片",
  "这个",
  "一个",
  "真的",
  "可以",
  "不是",
  "没有",
  "怎么",
  "什么",
  "推荐",
  "相关",
  "内容",
  "综合",
  "最热",
  "最新"
]);

let history = loadHistory();
let currentPlan = null;
let currentReport = null;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 30)));
}

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("is-visible");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => el.classList.remove("is-visible"), 2200);
}

function splitLines(value) {
  return String(value || "")
    .split(/[\n,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeNumber(value) {
  const text = String(value || "").replace(/\s/g, "");
  const matched = text.match(/(\d+(?:\.\d+)?)(万|k|K)?/);
  if (!matched) return 0;
  const number = Number(matched[1]);
  if (Number.isNaN(number)) return 0;
  if (matched[2] === "万") return Math.round(number * 10000);
  if (matched[2] === "k" || matched[2] === "K") return Math.round(number * 1000);
  return Math.round(number);
}

function cleanLine(line) {
  return String(line || "").replace(/\s+/g, " ").trim();
}

function xhsSearchUrl(query) {
  return `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(query)}`;
}

function makeQuery(topic, term) {
  if (term.includes(topic)) return term;
  return `${topic} ${term}`;
}

function generateSearchPlan(topic, customTerms, mode = "product") {
  const config = researchModes[mode] || researchModes.product;
  const groups = config.groups.map((group) => ({
    name: group.name,
    queries: group.terms.map((term) => makeQuery(topic, term))
  }));

  if (customTerms.length) {
    groups.unshift({
      name: "你的补充词",
      queries: customTerms.map((term) => makeQuery(topic, term))
    });
  }

  const seen = new Set();
  return {
    topic,
    mode,
    modeLabel: config.label,
    createdAt: new Date().toISOString(),
    groups: groups.map((group) => ({
      ...group,
      queries: group.queries.filter((query) => {
        if (seen.has(query)) return false;
        seen.add(query);
        return true;
      })
    }))
  };
}

function allQueries(plan = currentPlan) {
  return plan ? plan.groups.flatMap((group) => group.queries) : [];
}

function renderQueryBox(plan) {
  const box = document.getElementById("queryBox");
  box.innerHTML = "";
  if (!plan) {
    box.innerHTML = `<div class="empty">输入主题后生成搜索词组</div>`;
    return;
  }

  plan.groups.forEach((group) => {
    const section = document.createElement("section");
    section.className = "query-group";
    section.innerHTML = `
      <h3>${escapeHtml(group.name)}</h3>
      <div class="query-list">
        ${group.queries
          .map((query) => `<a class="query-chip" href="${xhsSearchUrl(query)}" target="_blank" rel="noopener">${escapeHtml(query)}</a>`)
          .join("")}
      </div>
    `;
    box.appendChild(section);
  });
}

function topicAnchors(topic) {
  const anchors = new Set([topic]);
  const compact = topic.replace(/\s/g, "");
  if (compact.length >= 3) {
    anchors.add(compact);
    anchors.add(compact.slice(0, -1));
  }
  if (compact.includes("防晒")) anchors.add("防晒");
  if (compact.includes("洗面")) anchors.add("洗面");
  if (compact.includes("露营")) anchors.add("露营");
  return [...anchors].filter((item) => item.length >= 2);
}

function extractHashtags(text) {
  return [...text.matchAll(/#([\u4e00-\u9fa5A-Za-z0-9_-]{2,24})/g)].map((match) => match[1]);
}

function countOccurrences(text, term) {
  if (!term) return 0;
  return (text.match(new RegExp(escapeRegExp(term), "g")) || []).length;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isUiNoise(line) {
  return /^(点赞|收藏|评论|赞|藏|评|广告|大家都在搜|相关搜索|综合|最热|最新|筛选|登录|打开小红书)/.test(line);
}

function isLikelyTitle(line) {
  const text = cleanLine(line);
  if (!text) return false;
  if (text.length < 6 || text.length > 90) return false;
  if (isUiNoise(text)) return false;
  if (/^[\d\s.万kK]+$/.test(text)) return false;
  if (text.includes("#") && text.replace(/#[^\s#]+/g, "").trim().length < 6) return false;
  return true;
}

function isRelevant(text, anchors) {
  return anchors.some((anchor) => text.includes(anchor));
}

function parseBlocks(rawText, topic) {
  const anchors = topicAnchors(topic);
  const lines = rawText.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const roughBlocks = rawText.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const blocks = [];
  const seenTitles = new Set();

  roughBlocks.forEach((block) => {
    const blockLines = block.split(/\r?\n/).map(cleanLine).filter(Boolean);
    const title = blockLines.find(isLikelyTitle) || blockLines[0] || "";
    if (!title) return;
    const key = title.slice(0, 90);
    if (seenTitles.has(key)) return;
    seenTitles.add(key);
    blocks.push({ title: key, text: block });
  });

  lines.forEach((line, index) => {
    if (!isLikelyTitle(line)) return;
    const title = cleanLine(line);
    if (seenTitles.has(title)) return;
    const text = lines.slice(index, Math.min(lines.length, index + 5)).join("\n");
    seenTitles.add(title);
    blocks.push({ title, text });
  });

  return blocks.map((block) => ({
    ...block,
    relevant: isRelevant(block.text, anchors)
  }));
}

function extractTerms(text, topic, queries) {
  const termCounts = new Map();
  const anchors = topicAnchors(topic);
  const queryTerms = queries
    .flatMap((query) => query.replace(topic, "").split(/\s+/))
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);

  [...extractHashtags(text), ...queryTerms].forEach((term) => {
    if (stopWords.has(term)) return;
    const count = countOccurrences(text, term);
    if (count > 0) termCounts.set(term, (termCounts.get(term) || 0) + count);
  });

  const words = [...text.matchAll(/[\u4e00-\u9fa5A-Za-z0-9]{2,12}/g)].map((match) => match[0]);
  words.forEach((word) => {
    if (stopWords.has(word)) return;
    if (anchors.includes(word)) return;
    if (/^\d+$/.test(word)) return;
    const count = countOccurrences(text, word);
    if (count >= 2 || queryTerms.includes(word)) {
      termCounts.set(word, Math.max(termCounts.get(word) || 0, count));
    }
  });

  return [...termCounts.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([term, count]) => ({ term, count }));
}

function countDictionary(text, words) {
  return words
    .map((word) => ({ term: word, count: countOccurrences(text, word) }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

function topLabel(items, emptyText = "暂不明显") {
  return items.length ? items.slice(0, 4).map((item) => `${item.term}(${item.count})`).join("、") : emptyText;
}

function buildInsights(topic, mode, relevantText, terms, posts, filteredCount) {
  const pain = countDictionary(relevantText, insightDictionaries.pain);
  const audience = countDictionary(relevantText, insightDictionaries.audience);
  const scene = countDictionary(relevantText, insightDictionaries.scene);
  const decision = countDictionary(relevantText, insightDictionaries.decision);
  const competitor = countDictionary(relevantText, insightDictionaries.competitor);
  const topTerms = terms.slice(0, 5).map((item) => item.term).join("、") || "暂无";
  const modeLabel = researchModes[mode]?.label || "产品机会";

  const opportunityText =
    mode === "content"
      ? `优先围绕 ${topLabel(scene, "高频场景")} 做选题，标题可结合 ${topLabel(decision, "测评/清单/避雷")}。`
      : mode === "competitor"
        ? `优先查看 ${topLabel(competitor, "竞品/价格词")} 相关内容，补充品牌名后再跑一轮。`
        : mode === "pain"
          ? `优先验证 ${topLabel(pain, "痛点词")} 是否集中在具体人群或场景。`
          : `优先关注 ${topLabel(pain, "痛点")} + ${topLabel(audience, "人群")} + ${topLabel(scene, "场景")} 的交叉机会。`;

  return [
    {
      title: "调研口径",
      tone: "info",
      body: `${modeLabel}：围绕“${topic}”过滤内容，本轮过滤无关 ${filteredCount} 条。`
    },
    {
      title: "核心痛点",
      tone: pain.length ? "warning" : "muted",
      body: topLabel(pain)
    },
    {
      title: "人群 / 场景",
      tone: "info",
      body: `人群：${topLabel(audience)}；场景：${topLabel(scene)}。`
    },
    {
      title: "下一步建议",
      tone: "muted",
      body: `${opportunityText} 高频词：${topTerms}。`
    }
  ];
}

function analyze(topic, rawText, plan) {
  const text = rawText.trim();
  const blocks = parseBlocks(text, topic);
  const relevantBlocks = blocks.filter((block) => block.relevant);
  const filteredBlocks = blocks.filter((block) => !block.relevant);
  const relevantText = relevantBlocks.map((block) => block.text).join("\n\n");
  const queries = allQueries(plan);

  const posts = relevantBlocks
    .map((block) => {
      const likes = normalizeNumber(block.text.match(/(?:点赞|赞)[:：]?\s*([\d.万kK]+)/)?.[1]);
      const collects = normalizeNumber(block.text.match(/(?:收藏|藏)[:：]?\s*([\d.万kK]+)/)?.[1]);
      const comments = normalizeNumber(block.text.match(/(?:评论|评)[:：]?\s*([\d.万kK]+)/)?.[1]);
      const tags = extractHashtags(block.text).slice(0, 8);
      const topicHits = topicAnchors(topic).reduce((sum, anchor) => sum + countOccurrences(block.text, anchor), 0);
      return {
        title: block.title,
        tags,
        likes,
        collects,
        comments,
        topicHits,
        score: topicHits * 10 + Math.log10(likes + collects + comments + 10) * 8
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);

  const terms = extractTerms(relevantText, topic, queries);
  const insights = buildInsights(topic, plan?.mode || "product", relevantText, terms, posts, filteredBlocks.length);

  return {
    id: `report_${Date.now().toString(36)}`,
    topic,
    createdAt: new Date().toISOString(),
    rawText: text,
    plan,
    mode: plan?.mode || "product",
    modeLabel: plan?.modeLabel || researchModes.product.label,
    lineCount: text.split(/\r?\n/).map(cleanLine).filter(Boolean).length,
    blockCount: blocks.length,
    filteredCount: filteredBlocks.length,
    filteredBlocks: filteredBlocks.slice(0, 8).map((block) => ({ title: block.title, text: block.text.slice(0, 180) })),
    topicMentions: topicAnchors(topic).reduce((sum, anchor) => sum + countOccurrences(relevantText, anchor), 0),
    relatedTermCount: terms.length,
    relatedPostCount: posts.length,
    insights,
    terms,
    posts
  };
}

function buildSummary(report) {
  const queryCount = allQueries(report.plan).length;
  const topTerms = report.terms.slice(0, 12).map((item) => `${item.term}(${item.count})`).join("、") || "暂无";
  const topPosts = report.posts.slice(0, 6).map((post, index) => `${index + 1}. ${post.title}`).join("\n") || "暂无";
  const insightText = (report.insights || []).map((item) => `- ${item.title}：${item.body}`).join("\n") || "- 暂无结论";

  return [
    `调研主题：${report.topic}`,
    `调研类型：${report.modeLabel || "产品机会"}`,
    `生成时间：${new Date(report.createdAt).toLocaleString("zh-CN")}`,
    "",
    `搜索词组：${queryCount} 个`,
    `候选内容块：${report.blockCount} 个`,
    `过滤无关内容：${report.filteredCount} 个`,
    `相关帖子：${report.relatedPostCount} 条`,
    `相关词条：${report.relatedTermCount} 个`,
    `主题出现：${report.topicMentions} 次`,
    "",
    `高频相关词：${topTerms}`,
    "",
    "调研结论：",
    insightText,
    "",
    "相关帖子：",
    topPosts,
    "",
    "判断口径：只有同一内容块里出现调研主题或主题锚点，才会计入报告。像“好烦，今天上班迟到”这种不含主题的内容会被过滤。"
  ].join("\n");
}

function renderReport(report) {
  currentReport = report;
  document.getElementById("metricTerms").textContent = report.relatedTermCount;
  document.getElementById("metricPosts").textContent = report.relatedPostCount;
  document.getElementById("metricFiltered").textContent = report.filteredCount;
  document.getElementById("metricMentions").textContent = report.topicMentions;
  document.getElementById("postCountLabel").textContent = `${report.relatedPostCount} 条`;
  document.getElementById("summaryText").textContent = buildSummary(report);
  document.getElementById("filteredCountLabel").textContent = `${report.filteredCount} 条`;
  renderInsights(report.insights || []);
  renderTerms(report.terms);
  renderPosts(report.posts);
  renderFiltered(report.filteredBlocks || []);
}

function renderInsights(insights) {
  const list = document.getElementById("insightList");
  list.innerHTML = "";
  if (!insights.length) {
    list.innerHTML = `<div class="empty">生成报告后显示结论</div>`;
    return;
  }

  insights.forEach((insight) => {
    const item = document.createElement("article");
    item.className = `insight-item ${insight.tone || ""}`.trim();
    item.innerHTML = `
      <strong>${escapeHtml(insight.title)}</strong>
      <p>${escapeHtml(insight.body)}</p>
    `;
    list.appendChild(item);
  });
}

function renderTerms(terms) {
  const box = document.getElementById("termBars");
  box.innerHTML = "";
  if (!terms.length) {
    box.innerHTML = `<div class="empty">没有识别到相关词</div>`;
    return;
  }

  const max = Math.max(...terms.map((item) => item.count));
  terms.slice(0, 18).forEach((item) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span class="bar-name">${escapeHtml(item.term)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(8, (item.count / max) * 100)}%"></div></div>
      <strong>${item.count}</strong>
    `;
    box.appendChild(row);
  });
}

function renderPosts(posts) {
  const list = document.getElementById("postList");
  list.innerHTML = "";
  if (!posts.length) {
    list.innerHTML = `<div class="empty">没有识别到相关帖子标题</div>`;
    return;
  }

  posts.slice(0, 12).forEach((post) => {
    const item = document.createElement("article");
    item.className = "post-item";
    item.innerHTML = `
      <strong>${escapeHtml(post.title)}</strong>
      <div class="meta">主题命中 ${post.topicHits} 次 · 赞 ${post.likes} · 藏 ${post.collects} · 评 ${post.comments}</div>
      <div class="tag-row">${post.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
    `;
    list.appendChild(item);
  });
}

function renderFiltered(blocks) {
  const list = document.getElementById("filteredList");
  list.innerHTML = "";
  if (!blocks.length) {
    list.innerHTML = `<div class="empty">暂无被过滤内容</div>`;
    return;
  }

  blocks.slice(0, 6).forEach((block) => {
    const item = document.createElement("article");
    item.className = "filtered-item";
    item.innerHTML = `
      <strong>${escapeHtml(block.title)}</strong>
      <p>${escapeHtml(block.text)}</p>
    `;
    list.appendChild(item);
  });
}

function renderHistory() {
  const list = document.getElementById("historyList");
  document.getElementById("historyCount").textContent = `${history.length} 次`;
  list.innerHTML = "";
  if (!history.length) {
    list.innerHTML = `<div class="empty">报告会自动存在这里</div>`;
    return;
  }

  history.slice(0, 10).forEach((report) => {
    const item = document.createElement("article");
    item.className = "history-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(report.topic)}</strong>
        <div class="meta">${report.relatedPostCount} 条相关帖子 · 过滤 ${report.filteredCount} 条 · ${new Date(report.createdAt).toLocaleDateString("zh-CN")}</div>
      </div>
      <button class="secondary-button" data-load="${report.id}" type="button">查看</button>
    `;
    list.appendChild(item);
  });
}

function saveReport(report) {
  history = [report, ...history.filter((item) => item.id !== report.id)].slice(0, 30);
  saveHistory();
  renderHistory();
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function exportCsv(report) {
  if (!report) {
    toast("先生成报告");
    return;
  }
  const rows = [
    ["类型", "名称", "次数", "点赞", "收藏", "评论"],
    ...report.terms.map((item) => ["相关词", item.term, item.count, "", "", ""]),
    ...report.posts.map((post) => ["相关帖子", post.title, post.topicHits, post.likes, post.collects, post.comments])
  ];
  const csv = "\ufeff" + rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  downloadText(`xiaohongshu-${report.topic}-report.csv`, csv, "text/csv;charset=utf-8");
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setupEvents() {
  document.getElementById("suggestButton").addEventListener("click", () => {
    const topic = document.getElementById("topicInput").value.trim();
    const mode = document.getElementById("researchType").value;
    if (!topic) {
      toast("先填调研主题");
      return;
    }
    currentPlan = generateSearchPlan(topic, splitLines(document.getElementById("seedInput").value), mode);
    renderQueryBox(currentPlan);
    toast("搜索词组已生成");
  });

  document.getElementById("copyQueriesButton").addEventListener("click", async () => {
    if (!currentPlan) {
      toast("先生成搜索词组");
      return;
    }
    await copyText(allQueries().join("\n"));
    toast("搜索词组已复制");
  });

  document.getElementById("openSearchButton").addEventListener("click", () => {
    const topic = document.getElementById("topicInput").value.trim();
    const mode = document.getElementById("researchType").value;
    if (!topic) {
      toast("先填调研主题");
      return;
    }
    if (!currentPlan || currentPlan.topic !== topic || currentPlan.mode !== mode) {
      currentPlan = generateSearchPlan(topic, splitLines(document.getElementById("seedInput").value), mode);
      renderQueryBox(currentPlan);
    }
    allQueries().slice(0, 6).forEach((query) => window.open(xhsSearchUrl(query), "_blank", "noopener"));
    toast("已打开前 6 个搜索页");
  });

  document.getElementById("generateButton").addEventListener("click", () => {
    const topic = document.getElementById("topicInput").value.trim();
    const mode = document.getElementById("researchType").value;
    const text = document.getElementById("pageTextInput").value.trim();
    if (!topic) {
      toast("先填调研主题");
      return;
    }
    if (!text) {
      toast("先粘贴小红书页面文字");
      return;
    }
    if (!currentPlan || currentPlan.topic !== topic || currentPlan.mode !== mode) {
      currentPlan = generateSearchPlan(topic, splitLines(document.getElementById("seedInput").value), mode);
      renderQueryBox(currentPlan);
    }
    const report = analyze(topic, text, currentPlan);
    renderReport(report);
    saveReport(report);
    toast("报告已生成并保存到本页");
  });

  document.getElementById("copyReportButton").addEventListener("click", async () => {
    if (!currentReport) {
      toast("先生成报告");
      return;
    }
    await copyText(buildSummary(currentReport));
    toast("报告已复制");
  });

  document.getElementById("exportCsvButton").addEventListener("click", () => exportCsv(currentReport));

  document.getElementById("loadSampleButton").addEventListener("click", () => {
    document.getElementById("topicInput").value = "防晒衣";
    document.getElementById("researchType").value = "product";
    document.getElementById("seedInput").value = "好烦\n闷热\n学生党\n怎么选";
    document.getElementById("pageTextInput").value = sampleText;
    currentPlan = generateSearchPlan("防晒衣", splitLines(document.getElementById("seedInput").value), "product");
    renderQueryBox(currentPlan);
    const report = analyze("防晒衣", sampleText, currentPlan);
    renderReport(report);
    saveReport(report);
    toast("示例报告已生成");
  });

  document.getElementById("clearAllButton").addEventListener("click", () => {
    if (!confirm("清空本页保存的报告？")) return;
    history = [];
    currentPlan = null;
    currentReport = null;
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
    renderQueryBox(null);
    document.getElementById("topicInput").value = "";
    document.getElementById("researchType").value = "product";
    document.getElementById("seedInput").value = "";
    document.getElementById("pageTextInput").value = "";
    renderReport({
      topic: "",
      createdAt: new Date().toISOString(),
      plan: null,
      mode: "product",
      modeLabel: researchModes.product.label,
      lineCount: 0,
      blockCount: 0,
      filteredCount: 0,
      filteredBlocks: [],
      topicMentions: 0,
      relatedTermCount: 0,
      relatedPostCount: 0,
      insights: [],
      terms: [],
      posts: []
    });
    document.getElementById("summaryText").textContent = "先输入调研主题，生成搜索词组；然后把小红书搜索结果文字粘贴回来，点击生成报告。";
    toast("已清空");
  });

  document.getElementById("historyList").addEventListener("click", (event) => {
    const id = event.target.dataset.load;
    if (!id) return;
    const report = history.find((item) => item.id === id);
    if (!report) return;
    currentPlan = report.plan || generateSearchPlan(report.topic, [], report.mode || "product");
    document.getElementById("topicInput").value = report.topic;
    document.getElementById("researchType").value = report.mode || report.plan?.mode || "product";
    document.getElementById("seedInput").value = "";
    document.getElementById("pageTextInput").value = report.rawText || "";
    renderQueryBox(currentPlan);
    renderReport(report);
    toast("已打开历史报告");
  });
}

setupEvents();
renderHistory();
renderInsights([]);
renderFiltered([]);
