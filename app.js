/* ═══════════════════════════════════════════════════════════════════════════════
   MONITOR DE MÁQUINAS V5 - JAVASCRIPT MODULARIZADO
   ═══════════════════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DE STATUS
// ─────────────────────────────────────────────────────────────────────────────

const ST = {
  "Produzindo":      { c: "#00e676", bg: "#0a2010", b: "#00e676", wa: "✅", sh: "Prod." },
  "Sem Carga":       { c: "#90a4ae", bg: "#0d1114", b: "#546e7a", wa: "⚪", sh: "S.Carg" },
  "MO Deslocada":    { c: "#ffd600", bg: "#1a1500", b: "#ffd600", wa: "🟡", sh: "MO Des." },
  "Falta de MO":     { c: "#d500f9", bg: "#180024", b: "#d500f9", wa: "🟣", sh: "F.MO" },
  "Setup":           { c: "#448aff", bg: "#001230", b: "#448aff", wa: "🔵", sh: "Setup" },
  "Manutenção":      { c: "#ff9100", bg: "#2a1200", b: "#ff9100", wa: "🟠", sh: "Manut." },
  "Ferramentaria":   { c: "#ffab40", bg: "#1a0e00", b: "#ffab40", wa: "🔨", sh: "Ferr." },
  "Engenharia":      { c: "#00e5ff", bg: "#001a1f", b: "#00e5ff", wa: "📐", sh: "Eng." },
  "Falha Logística": { c: "#ff1744", bg: "#2a0506", b: "#ff1744", wa: "🔴", sh: "F.Log." }
};

const SS = Object.keys(ST);

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────────────────────────────────────────

let mqs = [];
let cfg = { data: "", turno: "1° Turno", resp: "", grupo: "" };
let fil = "Todos";
let dd = null;
let history = [];
let pendingMOCod = null;
let ausencias = [];

// ─────────────────────────────────────────────────────────────────────────────
// BASE DE DADOS POR GRUPO
// ─────────────────────────────────────────────────────────────────────────────

const GRUPOS_BASE = {
  "Roll Forming": [
    ["2910113", "RF DALTEC PERFILADORA"],
    ["2910117", "RF RLM PERFILADORA"],
    ["2910119", "RF STAM 1 PERFILADORA"],
    ["2910120", "RF BENDER PARACHOQUE BCAR"],
    ["2910121", "RF BENDER PARACHOQUE BSUV"],
    ["2910122", "RF SOLDA MIG TB PARACHOQUE 230B"],
    ["2910123", "RF STAM 2 PERFILADORA"]
  ],
  "Prensas": [
    ["2910160", "HS PRENSA SMALL HOTSTAMPING 1"],
    ["2910161", "HS PRENSA SMALL HOTSTAMPING 2"],
    ["2910162", "HS PRENSA MEDIUM HOTSTAMPING"]
  ],
  "Laser's": [
    ["2910170", "HS CORTE LASER 170"],
    ["2910171", "HS CORTE LASER 171"],
    ["2910172", "HS CORTE LASER 172"],
    ["2910173", "HS CORTE LASER 173"],
    ["2910174", "HS CORTE LASER 174"],
    ["2910175", "HS CORTE LASER 175"],
    ["2910177", "HS CORTE LASER 177"],
    ["2910178", "HS CORTE LASER 178"],
    ["2910179", "HS CORTE LASER 179"]
  ],
  "Solda Rocker": [
    ["2910200", "HS SOLDA HS RESIST GM ROCKER INNER BSUV1"],
    ["2910201", "HS SOLDA HS RESIST GM ROCKER INNER BSUV2"],
    ["2910202", "HS SOLDA HS RESIST GM ROCKER OUTER GEMPU"],
    ["2910628", "HS SOLDA HS RESIST ST PATCHWORK CC24/NB"],
    ["2910615", "HS SOLDA RESIST VW PATCHWORK MQB"],
    ["2910111", "ESTACIONÁRIA ROCKER"],
    ["2910628A", "HS ESTACIONÁRIA TOYOTA"]
  ],
  "Solda MQQ/SCANIA": [
    ["2910603", "HS SOLDA RESIST VW COLUNA A 1 MQB"],
    ["2910604", "HS SOLDA RESIST VW COLUNA B 1 MQB"],
    ["2910622", "HS SOLDA RESIST VW COLUNA A 2 MQB"],
    ["2910623", "HS SOLDA RESIST VW COLUNA B 2 MQB"],
    ["2910634", "HS SOLDA RESIST SCANIA"],
    ["2910634A", "INSPEÇÃO SCANIA"]
  ],
  "Solda GEM": [
    ["2910625", "HS SOLDA RESIST GM COLUNA A BSUV"],
    ["2910626", "HS SOLDA RESIST GM COLUNA B BSUV"],
    ["2910627", "HS SOLDA HS RESIST REF ASSOALHO BSUV/PU1"],
    ["2910640", "HS SOLDA HS RESIST REF ASSOALHO BSUV/PU2"],
    ["2910642", "HS SOLDA RESIST GM COLUNA A GEM PU"],
    ["2910643", "HS SOLDA RESIST GM COLUNA B GEM PU"],
    ["2910610", "ESTACIONÁRIA PSA"]
  ]
};

const BASE = Object.entries(GRUPOS_BASE).flatMap(([grupo, maquinas]) =>
  maquinas.map(([cod, nome]) => ({ cod, nome, grupo }))
);

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

// Retorna apenas as máquinas do grupo selecionado (ou todas se nenhum grupo)
function getMqs() {
  if (!cfg.grupo) return mqs;
  return mqs.filter(m => m.grupo === cfg.grupo);
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
    if (c) cfg = { data: "", turno: "1° Turno", resp: "", grupo: "", ...JSON.parse(c) };
    const m = localStorage.getItem("mqs");
    if (m) {
      mqs = JSON.parse(m);
      // Migração: adicionar grupo se não existir
      mqs.forEach(maq => {
        if (!maq.grupo) {
          const found = BASE.find(b => b.cod === maq.cod);
          maq.grupo = found ? found.grupo : "";
        }
      });
    } else {
      mqs = BASE.map(b => ({
        cod: b.cod,
        nome: b.nome,
        grupo: b.grupo,
        status: "Produzindo",
        obs: "",
        paradaAt: null
      }));
      save();
    }
    const h = localStorage.getItem("history");
    if (h) history = JSON.parse(h);
    const a = localStorage.getItem("ausencias");
    if (a) ausencias = JSON.parse(a);
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
  }
}

function save() {
  try {
    localStorage.setItem("cfg", JSON.stringify(cfg));
    localStorage.setItem("mqs", JSON.stringify(mqs));
    localStorage.setItem("history", JSON.stringify(history));
    localStorage.setItem("ausencias", JSON.stringify(ausencias));
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
    grupo: cfg.grupo || "",
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
  // MO Deslocada exige justificativa
  if (status === "MO Deslocada") {
    pendingMOCod = cod;
    document.getElementById("mo-dest").value = "";
    dd = null;
    closeOv("mod-add");
    showOv("mod-mo");
    return;
  }

  const m = mqs.find(m => m.cod === cod);
  if (m) {
    const oldStatus = m.status;
    m.status = status;
    m.paradaAt = status === "Produzindo" ? null : Date.now();
    addHistory(`Status alterado: ${cod} | ${oldStatus} → ${status}`);
    save();
    dd = null;
    renderList();
  }
}

function confirmMODesloc() {
  const dest = document.getElementById("mo-dest").value.trim();
  if (!dest) {
    toast("⚠️ Informe para onde a MO foi deslocada!");
    document.getElementById("mo-dest").focus();
    return;
  }

  const m = mqs.find(m => m.cod === pendingMOCod);
  if (m) {
    const oldStatus = m.status;
    m.status = "MO Deslocada";
    m.obs = `Deslocada para: ${dest}`;
    m.paradaAt = Date.now();
    addHistory(`Status alterado: ${pendingMOCod} | ${oldStatus} → MO Deslocada (${dest})`);
    save();
    closeOv("mod-mo");
    pendingMOCod = null;
    renderList();
    toast("🟡 Status atualizado!");
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
  getMqs().forEach(m => {
    if (c[m.status] !== undefined) c[m.status]++;
  });
  return c;
}

function renderKpis() {
  const c = cnt();
  const el = document.getElementById("kpis");
  el.innerHTML = SS.map(s => `
    <div class="kpi-card" onclick="fil='${s}'; renderList()">
      <div class="kpi-value" style="color:${ST[s].c}">${c[s]}</div>
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
      <div class="bval" style="color:${ST[s].c}">${c[s]}</div>
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
  const total = getMqs().length;
  el.innerHTML = ["Todos", ...SS].map(s => {
    const cnt_val = s === "Todos" ? total : c[s];
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
  let filtered = getMqs();

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
  document.getElementById("cnt-t").textContent = getMqs().length;

  if (!filtered.length) {
    el.innerHTML = `<div class="empty">Nenhuma máquina encontrada</div>`;
  } else {
    el.innerHTML = filtered.map((m, i) => {
      const st = ST[m.status] || ST["Produzindo"];
      return `
        <div class="mrow">
          <div class="mrow-main">
            <div class="mnum">${i + 1}</div>
            <div>
              <div class="mname">${m.nome}</div>
              <div class="mcod">[${m.cod}]</div>
            </div>
            <div class="ddwrap">
              <button class="sbtn"
                style="color:${st.c};border-color:${st.b};background:${st.bg};"
                onclick="dd=dd==='${m.cod}'?null:'${m.cod}'; event.stopPropagation(); renderList()">
                ${m.status}
              </button>
              ${dd === m.cod ? `
                <div class="ddmenu">
                  ${SS.map(s => `
                    <div class="ddi" onclick="setStatus('${m.cod}', '${s}'); event.stopPropagation()">
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
            <input type="text" class="oinput" value="${m.obs || ''}" placeholder="Observação...">
            <button class="ook" onclick="saveObs('${m.cod}')">✓</button>
            <button class="ocancel" onclick="cancelObs('${m.cod}')">✕</button>
          </div>
        </div>
      `;
    }).join("");
  }

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
  renderInfo();
  renderList();
  toast("✅ Configurações salvas!");
}

function renderInfo() {
  document.getElementById("h-resp").textContent = cfg.resp || "—";
  document.getElementById("h-turno").textContent = cfg.turno;
  document.getElementById("h-data").textContent = cfg.data;
  document.getElementById("h-grupo").textContent = cfg.grupo || "Todos";
}

function entrar() {
  const resp = document.getElementById("l-resp").value.trim();
  if (!resp) {
    toast("⚠️ Informe o nome do responsável!");
    return;
  }
  cfg.data = iso2pt(document.getElementById("l-data").value);
  cfg.turno = document.getElementById("l-turno").value;
  cfg.resp = resp;
  cfg.grupo = document.getElementById("l-grupo").value;
  save();
  renderInfo();
  showScreen("main");
  fil = "Todos";
  renderList();
}

function zerarStatus() {
  confirm("Zerar status de todas as máquinas para Produzindo?", () => {
    const lista = cfg.grupo ? mqs.filter(m => m.grupo === cfg.grupo) : mqs;
    lista.forEach(m => {
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
    mqs = BASE.map(b => ({
      cod: b.cod,
      nome: b.nome,
      grupo: b.grupo,
      status: "Produzindo",
      obs: "",
      paradaAt: null
    }));
    history = [];
    ausencias = [];
    addHistory("Dados limpos");
    save();
    fil = "Todos";
    renderList();
    toast("🗑️ Dados limpos!");
  });
}

function exportCSV() {
  const lista = getMqs();
  const rows = [
    ["#", "Grupo", "Código", "Equipamento", "Status", "Observação", "Tempo Parado"],
    ...lista.map((m, i) => [i + 1, m.grupo || "", m.cod, m.nome, m.status, m.obs || "", fmtT(m.paradaAt)])
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" }));
  a.download = `maquinas_${cfg.data.replace(/\//g, "-")}_${cfg.grupo || "todos"}.csv`;
  a.click();
  toast("📊 CSV baixado!");
}

function enviarWA() {
  const c = cnt();
  const lista = getMqs();
  let t = `*MONITOR DE MÁQUINAS V5*\n📅 ${cfg.data}\n🕐 ${cfg.turno}`;
  if (cfg.grupo) t += `\n👥 *Grupo:* ${cfg.grupo}`;
  if (cfg.resp) t += `\n👤 *Responsável:* ${cfg.resp}`;
  t += `\n\n━━━━━━━━━━━━━━━━━━━━\n📊 *RESUMO*\n`;
  SS.forEach(s => c[s] > 0 && (t += `${ST[s].wa} ${s}: ${c[s]}\n`));
  t += `📦 Total: ${lista.length}\n`;
  SS.forEach(st => {
    const g = lista.filter(m => m.status === st);
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
  const lista = getMqs();
  document.getElementById("tv-title").textContent =
    `MONITOR · ${cfg.data} · ${cfg.turno}${cfg.grupo ? " · " + cfg.grupo : ""}${cfg.resp ? " · " + cfg.resp : ""}`;
  document.getElementById("tv-kpis").innerHTML = SS.map(s => `
    <div class="tvkpi" style="background:${ST[s].bg};border-color:${ST[s].b}">
      <div style="color:${ST[s].c};font-size:28px;font-weight:900">${c[s]}</div>
      <div style="color:${ST[s].c}88;font-size:8px">${s}</div>
    </div>`).join("");
  let g = "";
  SS.filter(s => s !== "Produzindo").forEach(st => {
    const gr = lista.filter(m => m.status === st);
    if (!gr.length) return;
    g += `<div style="margin-bottom:14px">
      <div style="color:${ST[st].c};font-size:9px;letter-spacing:2px;margin-bottom:6px">${st.toUpperCase()} (${gr.length})</div>
      ${gr.map(m => `
        <div style="background:${ST[st].bg};border:1px solid ${ST[st].b}55;border-radius:8px;padding:8px 12px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="color:#e0e0e0;font-size:11px">${m.nome}</div>
            <div style="color:#2a4a2a;font-size:9px">[${m.cod}]</div>
            ${m.obs ? `<div style="color:#888;font-size:9px;margin-top:2px">${m.obs}</div>` : ""}
          </div>
          <div style="color:${ST[st].c};font-size:11px;min-width:48px;text-align:right">${fmtT(m.paradaAt)}</div>
        </div>`).join("")}
    </div>`;
  });
  document.getElementById("tv-grupos").innerHTML = g ||
    `<div style="text-align:center;color:#1e3318;padding:40px;font-size:14px">✅ Todas produzindo!</div>`;
  const tvEl = document.getElementById("tv-scr");
  tvEl.style.display = "block";
  tvEl.classList.add("on");
  document.getElementById("tv-time").textContent = tstr();
}

// ─────────────────────────────────────────────────────────────────────────────
// AUSÊNCIAS
// ─────────────────────────────────────────────────────────────────────────────

function showAusencias() {
  renderAusList();
  showOv("mod-aus");
}

function toggleAusDest() {
  const tipo = document.getElementById("aus-tipo").value;
  const wrap = document.getElementById("aus-dest-wrap");
  wrap.style.display = tipo === "MO Deslocada" ? "block" : "none";
}

function renderAusList() {
  const el = document.getElementById("aus-list");
  const cntEl = document.getElementById("cnt-aus");
  if (cntEl) cntEl.textContent = ausencias.length;

  if (!ausencias.length) {
    el.innerHTML = `<div style="text-align:center;color:#555;padding:16px;font-size:13px;">Nenhuma ausência registrada</div>`;
    return;
  }

  const iconeTipo = { "Falta": "❌", "Férias": "🏖️", "MO Deslocada": "🔀" };
  const corTipo   = { "Falta": "#ff5252", "Férias": "#40c4ff", "MO Deslocada": "#ffd600" };

  el.innerHTML = ausencias.map((a, i) => `
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:12px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span style="font-size:16px;">${iconeTipo[a.tipo] || "👤"}</span>
          <span style="color:${corTipo[a.tipo]};font-size:11px;font-weight:700;letter-spacing:1px;">${a.tipo.toUpperCase()}</span>
        </div>
        <div style="color:#f0f0f0;font-size:14px;font-weight:700;">${a.nome}</div>
        ${a.mat ? `<div style="color:#888;font-size:11px;">Mat: ${a.mat}</div>` : ""}
        ${a.dest ? `<div style="color:#ffd600;font-size:11px;">→ ${a.dest}</div>` : ""}
      </div>
      <button onclick="delAusencia(${i})" style="background:none;border:none;color:#ff5252;font-size:20px;cursor:pointer;padding:4px;">✕</button>
    </div>
  `).join("");
}

function addAusencia() {
  const tipo = document.getElementById("aus-tipo").value;
  const nome = document.getElementById("aus-nome").value.trim();
  const mat  = document.getElementById("aus-mat").value.trim();
  const dest = document.getElementById("aus-dest").value.trim();

  if (!nome) {
    toast("⚠️ Informe o nome do colaborador!");
    return;
  }
  if (tipo === "MO Deslocada" && !dest) {
    toast("⚠️ Informe para onde a MO foi deslocada!");
    document.getElementById("aus-dest").focus();
    return;
  }

  ausencias.push({ tipo, nome, mat, dest });
  addHistory(`Ausência registrada: ${tipo} - ${nome}${mat ? " (" + mat + ")" : ""}`);
  save();

  // Limpar campos
  document.getElementById("aus-nome").value = "";
  document.getElementById("aus-mat").value = "";
  document.getElementById("aus-dest").value = "";
  document.getElementById("aus-tipo").value = "Falta";
  document.getElementById("aus-dest-wrap").style.display = "none";

  renderAusList();
  toast("✅ Ausência registrada!");
}

function delAusencia(i) {
  ausencias.splice(i, 1);
  save();
  renderAusList();
  toast("🗑️ Ausência removida!");
}


// ─────────────────────────────────────────────────────────────────────────────
// GERAR IMAGEM DO DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function buildDashHTML() {
  const c = cnt();
  const lista = getMqs();
  const iconeTipo = { "Falta": "❌", "Férias": "🏖️", "MO Deslocada": "🔀" };
  const corTipo   = { "Falta": "#ff5252", "Férias": "#40c4ff", "MO Deslocada": "#ffd600" };

  const total = lista.length;
  const produzindo = c["Produzindo"] || 0;
  const paradas = total - produzindo;
  const pct = total ? Math.round((produzindo / total) * 100) : 0;

  // Blocos de status (apenas com valor > 0)
  const statusBlocks = SS.filter(s => c[s] > 0).map(s => `
    <div style="background:${ST[s].bg};border:1px solid ${ST[s].b};border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <span style="color:${ST[s].c};font-size:13px;font-weight:700;">${s}</span>
      <span style="color:${ST[s].c};font-size:22px;font-weight:900;">${c[s]}</span>
    </div>`).join("");

  // Máquinas não produzindo
  const naoProds = SS.filter(s => s !== "Produzindo").flatMap(s =>
    lista.filter(m => m.status === s).map(m => `
      <div style="background:#161616;border-left:3px solid ${ST[s].b};border-radius:6px;padding:8px 12px;margin-bottom:5px;">
        <div style="color:#f0f0f0;font-size:12px;font-weight:700;">${m.nome}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;">
          <span style="color:${ST[s].c};font-size:11px;">${m.status}</span>
          ${m.obs ? `<span style="color:#888;font-size:10px;">${m.obs}</span>` : ""}
          <span style="color:#888;font-size:10px;">${fmtT(m.paradaAt)}</span>
        </div>
      </div>`)
  ).join("");

  // Ausências
  const ausBlock = ausencias.length ? `
    <div style="margin-top:16px;">
      <div style="color:#e040fb;font-size:10px;letter-spacing:3px;font-weight:700;margin-bottom:8px;">👥 AUSÊNCIAS (${ausencias.length})</div>
      ${ausencias.map(a => `
        <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:8px 12px;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span style="color:${corTipo[a.tipo]||'#aaa'};font-size:11px;font-weight:700;">${iconeTipo[a.tipo]||'👤'} ${a.tipo}</span>
            <div style="color:#f0f0f0;font-size:13px;font-weight:700;margin-top:2px;">${a.nome}${a.mat ? ` <span style="color:#888;font-size:11px;">— ${a.mat}</span>` : ""}</div>
            ${a.dest ? `<div style="color:#ffd600;font-size:11px;">→ ${a.dest}</div>` : ""}
          </div>
        </div>`).join("")}
    </div>` : "";

  return `
    <div style="background:#0a0a0a;width:480px;padding:24px;font-family:monospace;">
      <!-- Header -->
      <div style="border-bottom:2px solid #00e676;padding-bottom:14px;margin-bottom:16px;">
        <div style="color:#00e676;font-size:18px;font-weight:900;letter-spacing:3px;">🏭 MONITOR DE MÁQUINAS</div>
        <div style="color:#888;font-size:11px;margin-top:4px;">
          📅 ${cfg.data} &nbsp;|&nbsp; 🕐 ${cfg.turno} &nbsp;|&nbsp; 👤 ${cfg.resp}${cfg.grupo ? " &nbsp;|&nbsp; 👥 " + cfg.grupo : ""}
        </div>
      </div>

      <!-- KPIs principais -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
        <div style="background:#0a2010;border:1px solid #00e676;border-radius:10px;padding:12px;text-align:center;">
          <div style="color:#00e676;font-size:28px;font-weight:900;">${produzindo}</div>
          <div style="color:#00e676;font-size:10px;">PRODUZINDO</div>
        </div>
        <div style="background:#2a0506;border:1px solid #ff1744;border-radius:10px;padding:12px;text-align:center;">
          <div style="color:#ff1744;font-size:28px;font-weight:900;">${paradas}</div>
          <div style="color:#ff1744;font-size:10px;">PARADAS</div>
        </div>
        <div style="background:#001230;border:1px solid #448aff;border-radius:10px;padding:12px;text-align:center;">
          <div style="color:#448aff;font-size:28px;font-weight:900;">${pct}%</div>
          <div style="color:#448aff;font-size:10px;">EFICIÊNCIA</div>
        </div>
      </div>

      <!-- Status -->
      <div style="color:#aaa;font-size:10px;letter-spacing:3px;font-weight:700;margin-bottom:8px;">📊 STATUS DAS MÁQUINAS</div>
      ${statusBlocks}

      <!-- Máquinas paradas -->
      ${naoProds ? `<div style="margin-top:14px;">
        <div style="color:#aaa;font-size:10px;letter-spacing:3px;font-weight:700;margin-bottom:8px;">⚠️ MÁQUINAS COM OCORRÊNCIA</div>
        ${naoProds}
      </div>` : '<div style="text-align:center;color:#00e676;padding:12px;font-size:13px;">✅ Todas as máquinas produzindo!</div>'}

      <!-- Ausências -->
      ${ausBlock}

      <!-- Rodapé -->
      <div style="border-top:1px solid #222;margin-top:16px;padding-top:10px;text-align:center;color:#555;font-size:10px;">
        Gerado em ${cfg.data} · ${tstr()} · Monitor de Máquinas V5
      </div>
    </div>`;
}

function gerarImagem() {
  toast("📸 Gerando imagem...");
  const dash = document.getElementById("dash-img");
  dash.style.display = "block";
  dash.innerHTML = buildDashHTML();

  setTimeout(() => {
    html2canvas(dash, {
      backgroundColor: "#0a0a0a",
      scale: 2,
      useCORS: true,
      logging: false
    }).then(canvas => {
      dash.style.display = "none";
      const link = document.createElement("a");
      link.download = `monitor_${cfg.data.replace(/\//g, "-")}_${cfg.grupo || "geral"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast("✅ Imagem salva!");
    }).catch(err => {
      dash.style.display = "none";
      toast("⚠️ Erro ao gerar imagem!");
      console.error(err);
    });
  }, 300);
}

function exportPDF() {
  toast("📄 Gerando PDF...");
  const dash = document.getElementById("dash-img");
  dash.style.display = "block";
  dash.innerHTML = buildDashHTML();

  setTimeout(() => {
    html2canvas(dash, {
      backgroundColor: "#0a0a0a",
      scale: 2,
      useCORS: true,
      logging: false
    }).then(canvas => {
      dash.style.display = "none";
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [480, canvas.height / 2] });
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, 480, canvas.height / 2);
      pdf.save(`monitor_${cfg.data.replace(/\//g, "-")}_${cfg.grupo || "geral"}.pdf`);
      toast("✅ PDF salvo!");
    }).catch(err => {
      dash.style.display = "none";
      toast("⚠️ Erro ao gerar PDF!");
      console.error(err);
    });
  }, 300);
}


function voltarHome() {
  showScreen("login");
  dd = null;
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

document.addEventListener("click", (e) => {
  if (dd && !e.target.closest(".ddwrap")) {
    dd = null;
    renderList();
  }
});

load();
document.getElementById("l-data").value = pt2iso(cfg.data) || todayISO();
document.getElementById("l-turno").value = cfg.turno;
document.getElementById("l-resp").value = cfg.resp;
document.getElementById("l-grupo").value = cfg.grupo || "";
document.getElementById("hdr-time").textContent = tstr();
showScreen("login");
