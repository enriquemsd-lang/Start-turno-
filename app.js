/* ═══════════════════════════════════════════════════════════════════════════════
   MONITOR DE MÁQUINAS V5 - JAVASCRIPT MODULARIZADO
   ═══════════════════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DE STATUS
// ─────────────────────────────────────────────────────────────────────────────

const ST = {
  "Produzindo": { c: "#00e676", bg: "#0a2010", b: "#00e676", wa: "✅", sh: "Prod." },
  "Parada": { c: "#ff1744", bg: "#2a0506", b: "#ff1744", wa: "🔴", sh: "Parada" },
  "Manutenção": { c: "#ff9100", bg: "#2a1200", b: "#ff9100", wa: "🟡", sh: "Manut." },
  "Setup": { c: "#2979ff", bg: "#001230", b: "#2979ff", wa: "🔵", sh: "Setup" },
  "Falta MO": { c: "#d500f9", bg: "#180024", b: "#d500f9", wa: "🟣", sh: "F.MO" },
  "Sem Carga": { c: "#78909c", bg: "#0d1114", b: "#455a64", wa: "⚪", sh: "S.Carg" }
};

const SS = Object.keys(ST);

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────────────────────────────────────────

let mqs = [];
let cfg = { data: "", turno: "1° Turno", resp: "" };
let fil = "Todos";
let dd = null;
let history = [];

// ─────────────────────────────────────────────────────────────────────────────
// BASE DE DADOS PADRÃO
// ─────────────────────────────────────────────────────────────────────────────

const BASE = [
  ["2910117", "RF RLM PERFILADORA"],
  ["2910119", "RF STAM 1 PERFILADORA"],
  ["2910120", "RF BENDER PARACHOQUE BCAR"],
  ["2910121", "RF BENDER PARACHOQUE BSUV"],
  ["2910123", "RF STAM 2 PERFILADORA"],
  ["2910160", "HS PRENSA SMALL HOTSTAMPING 1"],
  ["2910161", "HS PRENSA SMALL HOTSTAMPING 2"],
  ["2910162", "HS PRENSA MEDIUM HOTSTAMPING"],
  ["2910170", "HS CORTE LASER 170"],
  ["2910171", "HS CORTE LASER 171"],
  ["2910604", "HS SOLDA RESIST VW COLUNA B 1 MQB"],
  ["2910615", "HS SOLDA RESIST VW PATCHWORK MQB"],
  ["2910622", "HS SOLDA RESIST VW COLUNA A 2 MQB"],
  ["2910623", "HS SOLDA RESIST VW COLUNA B 2 MQB"],
  ["2910625", "HS SOLDA RESIST GM COLUNA A BSUV"],
  ["2910626", "HS SOLDA RESIST GM COLUNA B BSUV"],
  ["2910627", "HS SOLDA HS RESIST REF ASSOALHO BSUV/PU1"],
  ["2910628", "HS SOLDA HS RESIST ST PATCHWORK CC24/NB"],
  ["2910634", "HS SOLDA RESIST SCANIA"],
  ["2910640", "HS SOLDA HS RESIST REF ASSOALHO BSUV/PU2"]
];

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES UTILITÁRIAS
// ─────────────────────────────────────────────────────────────────────────────

function tstr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function todayISO() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function iso2pt(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function pt2iso(pt) {
  if (!pt) return "";
  const [d, m, y] = pt.split('/');
  return `${y}-${m}-${d}`;
}

function fmtT(ms) {
  if (!ms) return "—";
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("on");
  setTimeout(() => el.classList.remove("on"), 3000);
}

// ─────────────────────────────────────────────────────────────────────────────
// GERENCIAMENTO DE TELAS
// ─────────────────────────────────────────────────────────────────────────────

function showScreen(name) {
  document.querySelectorAll(".scr").forEach(el => el.classList.remove("on"));
  const el = document.getElementById(name);
  if (el) el.classList.add("on");
}

function showOv(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("on");
}

function closeOv(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("on");
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTÊNCIA DE DADOS
// ─────────────────────────────────────────────────────────────────────────────

function load() {
  try {
    const c = localStorage.getItem("cfg");
    if (c) cfg = JSON.parse(c);
    const m = localStorage.getItem("mqs");
    if (m) {
      mqs = JSON.parse(m);
    } else {
      mqs = BASE.map(([cod, nome]) => ({
        cod,
        nome,
        status: "Produzindo",
        obs: "",
        paradaAt: null
      }));
      save();
    }
    const h = localStorage.getItem("history");
    if (h) history = JSON.parse(h);
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
  }
}

function save() {
  try {
    localStorage.setItem("cfg", JSON.stringify(cfg));
    localStorage.setItem("mqs", JSON.stringify(mqs));
    localStorage.setItem("history", JSON.stringify(history));
  } catch (e) {
    console.error("Erro ao salvar dados:", e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GERENCIAMENTO DE MÁQUINAS
// ─────────────────────────────────────────────────────────────────────────────

function addMaq() {
  const cod = document.getElementById("a-cod").value.trim();
  const nome = document.getElementById("a-nome").value.trim();

  if (!cod || !nome) {
    toast("⚠️ Preencha código e nome!");
    return;
  }

  if (mqs.find(m => m.cod === cod)) {
    toast("⚠️ Código já existe!");
    return;
  }

  mqs.push({
    cod,
    nome,
    status: "Produzindo",
    obs: "",
    paradaAt: null
  });

  addHistory(`Máquina adicionada: ${nome} (${cod})`);
  save();
  closeOv("mod-add");
  document.getElementById("a-cod").value = "";
  document.getElementById("a-nome").value = "";
  renderList();
  toast("✅ Máquina adicionada!");
}

function delMaq(cod) {
  confirm(`Deseja remover a máquina ${cod}?`, () => {
    const idx = mqs.findIndex(m => m.cod === cod);
    if (idx !== -1) {
      const nome = mqs[idx].nome;
      mqs.splice(idx, 1);
      addHistory(`Máquina removida: ${nome} (${cod})`);
      save();
      renderList();
      toast("🗑️ Máquina removida!");
    }
  });
}

function setStatus(cod, status) {
  const m = mqs.find(m => m.cod === cod);
  if (m) {
    const oldStatus = m.status;
    m.status = status;
    m.paradaAt = status === "Produzindo" ? null : Date.now();
    addHistory(`Status alterado: ${cod} | ${oldStatus} → ${status}`);
    save();
    renderList();
  }
}

function editObs(cod) {
  const m = mqs.find(m => m.cod === cod);
  if (!m) return;
  const el = document.querySelector(`[data-obs-edit="${cod}"]`);
  if (!el) return;
  el.style.display = "flex";
  el.querySelector("input").focus();
}

function saveObs(cod) {
  const m = mqs.find(m => m.cod === cod);
  if (!m) return;
  const el = document.querySelector(`[data-obs-edit="${cod}"]`);
  const val = el.querySelector("input").value.trim();
  m.obs = val;
  addHistory(`Observação atualizada: ${cod}`);
  save();
  renderList();
}

function cancelObs(cod) {
  const el = document.querySelector(`[data-obs-edit="${cod}"]`);
  if (el) el.style.display = "none";
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTÓRICO
// ─────────────────────────────────────────────────────────────────────────────

function addHistory(msg) {
  history.unshift({
    ts: Date.now(),
    msg: msg,
    data: cfg.data,
    turno: cfg.turno
  });
  if (history.length > 100) history.pop();
}

function showHistory() {
  const h = history.slice(0, 20).map(e => 
    `[${iso2pt(cfg.data)} ${e.turno}] ${e.msg}`
  ).join('\n');
  alert(h || "Sem histórico");
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDERIZAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

function cnt() {
  const c = {};
  SS.forEach(s => c[s] = 0);
  mqs.forEach(m => c[m.status]++);
  return c;
}

function renderKpis() {
  const c = cnt();
  const el = document.getElementById("kpis");
  el.innerHTML = SS.map(s => `
    <div class="kpi-card" onclick="fil='${s}'; renderList()">
      <div class="kpi-value">${c[s]}</div>
      <div class="kpi-label">${s}</div>
    </div>
  `).join("");
}

function renderChart() {
  const c = cnt();
  const el = document.getElementById("barchart");
  const max = Math.max(...SS.map(s => c[s]), 1);
  el.innerHTML = SS.map(s => `
    <div class="bw">
      <div class="bar" style="background:${ST[s].c};height:${(c[s]/max)*100}px;"></div>
      <div class="bval">${c[s]}</div>
      <div class="blbl">${ST[s].sh}</div>
    </div>
  `).join("");
}

function renderLegend() {
  const el = document.getElementById("legend");
  el.innerHTML = SS.map(s => `
    <div class="legend-item">
      <div class="ldot" style="background:${ST[s].c};"></div>
      ${s}
    </div>
  `).join("");
}

function renderFilters() {
  const el = document.getElementById("filters");
  const c = cnt();
  el.innerHTML = ["Todos", ...SS].map(s => {
    const cnt_val = s === "Todos" ? mqs.length : c[s];
    const isOn = fil === s;
    return `
      <button class="fbtn ${isOn ? 'on' : ''}" 
        style="${isOn ? `--fb:${ST[s]?.bg || '#080c08'};--fc:${ST[s]?.c || '#1e4d2b'};` : ''}"
        onclick="fil='${s}'; renderList()">
        ${s} (${cnt_val})
      </button>
    `;
  }).join("");
}

function renderList() {
  const search = document.getElementById("search").value.toLowerCase();
  let filtered = mqs;

  if (fil !== "Todos") {
    filtered = filtered.filter(m => m.status === fil);
  }

  if (search) {
    filtered = filtered.filter(m => 
      m.cod.toLowerCase().includes(search) || 
      m.nome.toLowerCase().includes(search)
    );
  }

  const el = document.getElementById("mlist");
  document.getElementById("cnt-s").textContent = filtered.length;
  document.getElementById("cnt-t").textContent = mqs.length;

  el.innerHTML = filtered.map((m, i) => `
    <div class="mrow">
      <div class="mrow-main">
        <div class="mnum">${i + 1}</div>
        <div>
          <div class="mname">${m.nome}</div>
          <div class="mcod">[${m.cod}]</div>
        </div>
        <div class="ddwrap">
          <button class="sbtn" style="color:${ST[m.status].c};border-color:${ST[m.status].b};" 
            onclick="dd=dd==='${m.cod}'?null:'${m.cod}'; renderList()">
            ${m.status}
          </button>
          ${dd === m.cod ? `
            <div class="ddmenu">
              ${SS.map(s => `
                <div class="ddi" onclick="setStatus('${m.cod}', '${s}'); dd=null; renderList()">
                  <span style="color:${ST[s].c}">●</span> ${s}
                </div>
              `).join('')}
              <div class="dddel" onclick="delMaq('${m.cod}')">🗑️ Remover</div>
            </div>
          ` : ''}
        </div>
        <div class="mtime">${fmtT(m.paradaAt)}</div>
      </div>
      <div class="mobs" onclick="editObs('${m.cod}')">
        <div class="obstext ${m.obs ? 'has' : ''}">
          ${m.obs ? m.obs : '+ observação...'}
        </div>
      </div>
      <div class="obs-edit" data-obs-edit="${m.cod}" style="display:none;">
        <input type="text" class="oinput" value="${m.obs}" placeholder="Observação...">
        <button class="ook" onclick="saveObs('${m.cod}')">✓</button>
        <button class="ocancel" onclick="cancelObs('${m.cod}')">✕</button>
      </div>
    </div>
  `).join("");

  renderKpis();
  renderChart();
  renderLegend();
  renderFilters();
}

// ─────────────────────────────────────────────────────────────────────────────
// AÇÕES
// ─────────────────────────────────────────────────────────────────────────────

function showAdd() {
  showOv("mod-add");
}

function showCfg() {
  document.getElementById("c-data").value = pt2iso(cfg.data) || todayISO();
  document.getElementById("c-turno").value = cfg.turno;
  document.getElementById("c-resp").value = cfg.resp;
  showOv("mod-cfg");
}

function saveCfg() {
  cfg.data = iso2pt(document.getElementById("c-data").value);
  cfg.turno = document.getElementById("c-turno").value;
  cfg.resp = document.getElementById("c-resp").value;
  save();
  closeOv("mod-cfg");
  renderList();
  toast("✅ Configurações salvas!");
}

function entrar() {
  cfg.data = iso2pt(document.getElementById("l-data").value);
  cfg.turno = document.getElementById("l-turno").value;
  cfg.resp = document.getElementById("l-resp").value;
  save();
  document.getElementById("h-resp").textContent = cfg.resp || "—";
  document.getElementById("h-turno").textContent = cfg.turno;
  document.getElementById("h-data").textContent = cfg.data;
  showScreen("main");
  renderList();
}

function zerarStatus() {
  confirm("Zerar status de todas as máquinas?", () => {
    mqs.forEach(m => {
      m.status = "Produzindo";
      m.paradaAt = null;
    });
    addHistory("Status zerado para todas as máquinas");
    save();
    renderList();
    toast("🔄 Status zerado!");
  });
}

function limparTudo() {
  confirm("Limpar TODOS os dados? Esta ação não pode ser desfeita!", () => {
    mqs = BASE.map(([cod, nome]) => ({
      cod,
      nome,
      status: "Produzindo",
      obs: "",
      paradaAt: null
    }));
    history = [];
    addHistory("Dados limpos");
    save();
    renderList();
    toast("🗑️ Dados limpos!");
  });
}

function exportCSV() {
  const rows = [
    ["#", "Código", "Equipamento", "Status", "Observação", "Tempo Parado"],
    ...mqs.map((m, i) => [i + 1, m.cod, m.nome, m.status, m.obs || "", fmtT(m.paradaAt)])
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" }));
  a.download = `maquinas_${cfg.data.replace(/\//g, "-")}.csv`;
  a.click();
  toast("📊 CSV baixado!");
}

function enviarWA() {
  const c = cnt();
  let t = `*MONITOR DE MÁQUINAS V5*\n📅 ${cfg.data}\n🕐 ${cfg.turno}`;
  if (cfg.resp) t += `\n👤 *Responsável:* ${cfg.resp}`;
  t += `\n\n━━━━━━━━━━━━━━━━━━━━\n📊 *RESUMO*\n`;
  SS.forEach(s => c[s] > 0 && (t += `${ST[s].wa} ${s}: ${c[s]}\n`));
  t += `📦 Total: ${mqs.length}\n`;
  SS.forEach(st => {
    const g = mqs.filter(m => m.status === st);
    if (!g.length) return;
    t += `\n━━━━━━━━━━━━━━━━━━━━\n${ST[st].wa} *${st.toUpperCase()} (${g.length})*\n`;
    g.forEach(m => {
      t += `• [${m.cod}] ${m.nome}${m.obs ? " — _" + m.obs + "_" : ""}\n`;
    });
  });
  t += `\n_Gerado automaticamente_`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(t)}`, "_blank");
}

function modoTV() {
  const c = cnt();
  document.getElementById("tv-title").textContent = `MONITOR DE MÁQUINAS · ${cfg.data} · ${cfg.turno}${cfg.resp ? " · " + cfg.resp : ""}`;
  document.getElementById("tv-kpis").innerHTML = SS.map(s => `
    <div class="tvkpi" style="background:${ST[s].bg};border-color:${ST[s].b}">
      <div style="color:${ST[s].c};font-size:28px;font-weight:900">${c[s]}</div>
      <div style="color:${ST[s].c}88;font-size:8px">${s}</div>
    </div>`).join("");
  let g = "";
  SS.filter(s => s !== "Produzindo").forEach(st => {
    const gr = mqs.filter(m => m.status === st);
    if (!gr.length) return;
    g += `<div style="margin-bottom:14px"><div style="color:${ST[st].c};font-size:9px;letter-spacing:2px;margin-bottom:6px">${st.toUpperCase()} (${gr.length})</div>
    ${gr.map(m => `<div style="background:${ST[st].bg};border:1px solid ${ST[st].b}55;border-radius:8px;padding:8px 12px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center">
      <div><div style="color:#e0e0e0;font-size:11px">${m.nome}</div>
      <div style="color:#2a4a2a;font-size:9px">[${m.cod}]</div>
      ${m.obs ? `<div style="color:#888;font-size:9px;margin-top:2px">${m.obs}</div>` : ""}</div>
      <div style="color:${ST[st].c};font-size:11px;min-width:48px;text-align:right">${fmtT(m.paradaAt)}</div>
    </div>`).join("")}</div>`;
  });
  document.getElementById("tv-grupos").innerHTML = g || `<div style="text-align:center;color:#1e3318;padding:40px;font-size:14px">✅ Todas produzindo!</div>`;
  const tvEl = document.getElementById("tv-scr");
  tvEl.style.display = "block";
  tvEl.classList.add("on");
  document.getElementById("tv-time").textContent = tstr();
}

function sairTV() {
  const e = document.getElementById("tv-scr");
  e.classList.remove("on");
  e.style.display = "none";
}

// ─────────────────────────────────────────────────────────────────────────────
// DIÁLOGO DE CONFIRMAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

let dlgCallback = null;

function confirm(msg, callback) {
  dlgCallback = callback;
  document.getElementById("dlg-msg").textContent = msg;
  document.getElementById("dlg-overlay").classList.add("on");
}

function dlgResp(ok) {
  document.getElementById("dlg-overlay").classList.remove("on");
  if (ok && dlgCallback) dlgCallback();
  dlgCallback = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// INICIALIZAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

setInterval(() => {
  const e = document.getElementById("hdr-time");
  if (e) e.textContent = tstr();
}, 30000);

document.addEventListener("click", () => {
  if (dd) {
    dd = null;
    renderList();
  }
});

load();
document.getElementById("l-data").value = pt2iso(cfg.data) || todayISO();
document.getElementById("l-turno").value = cfg.turno;
document.getElementById("l-resp").value = cfg.resp;
document.getElementById("hdr-time").textContent = tstr();
showScreen("login");
