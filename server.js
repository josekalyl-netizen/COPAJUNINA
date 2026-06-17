import express from "express";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "W3G@2026";
const DB_PATH = process.env.DB_PATH || join(__dirname, "bolao.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS palpites (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nome            TEXT NOT NULL,
    telefone        TEXT,
    supervisor      TEXT,
    gols_brasil     INTEGER NOT NULL,
    gols_adversario INTEGER NOT NULL,
    pago            INTEGER NOT NULL DEFAULT 0,
    criado_em       TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS config ( chave TEXT PRIMARY KEY, valor TEXT );
`);

const setConfig = db.prepare(
  "INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor"
);
const getConfigStmt = db.prepare("SELECT valor FROM config WHERE chave = ?");
function getConfig(chave, fallback = "") {
  const row = getConfigStmt.get(chave);
  return row ? row.valor : fallback;
}
if (getConfigStmt.get("adversario") === undefined) setConfig.run("adversario", "Escócia");
if (getConfigStmt.get("adversario_flag") === undefined) setConfig.run("adversario_flag", "🏴󠁧󠁢󠁳󠁣󠁴󠁿");
if (getConfigStmt.get("valor_aposta") === undefined) setConfig.run("valor_aposta", "20");
if (getConfigStmt.get("apostas_abertas") === undefined) setConfig.run("apostas_abertas", "1");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, "public")));

function checkAdmin(req, res, next) {
  const pass =
    req.headers["x-admin-password"] || req.query.password || (req.body && req.body.password);
  if (pass === ADMIN_PASSWORD) return next();
  return res.status(401).json({ ok: false, error: "Senha incorreta." });
}

// ============ PÚBLICO ============
app.get("/api/info", (req, res) => {
  res.json({
    ok: true,
    adversario: getConfig("adversario", "Adversário"),
    adversario_flag: getConfig("adversario_flag", "🏴"),
    valor_aposta: getConfig("valor_aposta", "20"),
    apostas_abertas: getConfig("apostas_abertas", "1") === "1",
    total: db.prepare("SELECT COUNT(*) AS n FROM palpites").get().n,
  });
});

const insertPalpite = db.prepare(`
  INSERT INTO palpites (nome, telefone, supervisor, gols_brasil, gols_adversario, pago, criado_em)
  VALUES (@nome, @telefone, @supervisor, @gols_brasil, @gols_adversario, 0, @criado_em)
`);

// normaliza telefone: mantém só dígitos, para comparar de forma confiável
function normalizarTelefone(t) {
  return (t || "").replace(/\D/g, "");
}

app.post("/api/palpite", (req, res) => {
  if (getConfig("apostas_abertas", "1") !== "1")
    return res.status(403).json({ ok: false, error: "As apostas estão encerradas." });
  const b = req.body || {};
  const nome = (b.nome || "").trim();
  const telefone = (b.telefone || "").trim();
  const supervisor = (b.supervisor || "").trim();
  const gb = parseInt(b.gols_brasil, 10);
  const ga = parseInt(b.gols_adversario, 10);
  if (!nome) return res.status(400).json({ ok: false, error: "Informe seu nome." });
  if (!telefone) return res.status(400).json({ ok: false, error: "Informe seu telefone." });
  if (!supervisor) return res.status(400).json({ ok: false, error: "Informe seu supervisor." });
  if (Number.isNaN(gb) || Number.isNaN(ga) || gb < 0 || ga < 0 || gb > 20 || ga > 20)
    return res.status(400).json({ ok: false, error: "Placar inválido." });

  // trava: um palpite por telefone
  const telNormalizado = normalizarTelefone(telefone);
  const todos = db.prepare("SELECT id, telefone FROM palpites").all();
  const jaApostou = todos.some((p) => normalizarTelefone(p.telefone) === telNormalizado && telNormalizado !== "");
  if (jaApostou) {
    return res.status(409).json({ ok: false, error: "Este telefone já registrou um palpite. Cada pessoa pode apostar apenas uma vez." });
  }

  insertPalpite.run({ nome, telefone, supervisor, gols_brasil: gb, gols_adversario: ga, criado_em: new Date().toISOString() });
  res.json({ ok: true });
});

// ============ ADMIN ============
app.post("/api/admin/login", (req, res) => {
  const pass = (req.body && req.body.password) || "";
  if (pass === ADMIN_PASSWORD) return res.json({ ok: true });
  return res.status(401).json({ ok: false, error: "Senha incorreta." });
});

// visão AGRUPADA por placar
app.get("/api/admin/palpites", checkAdmin, (req, res) => {
  const palpites = db.prepare("SELECT * FROM palpites ORDER BY criado_em ASC").all();
  const total = palpites.length;

  // agrupa por placar
  const mapa = {};
  for (const p of palpites) {
    const k = `${p.gols_brasil}x${p.gols_adversario}`;
    if (!mapa[k]) mapa[k] = { placar: k, gols_brasil: p.gols_brasil, gols_adversario: p.gols_adversario, apostadores: [] };
    mapa[k].apostadores.push(p);
  }
  const grupos = Object.values(mapa).sort((a, b) => b.apostadores.length - a.apostadores.length);

  res.json({
    ok: true,
    grupos,
    stats: { total, total_placares: grupos.length },
    config: {
      adversario: getConfig("adversario", "Adversário"),
      adversario_flag: getConfig("adversario_flag", "🏴"),
      apostas_abertas: getConfig("apostas_abertas", "1") === "1",
    },
  });
});

app.post("/api/admin/pago/:id", checkAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare("SELECT pago FROM palpites WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ ok: false, error: "Não encontrado." });
  const novo = row.pago ? 0 : 1;
  db.prepare("UPDATE palpites SET pago = ? WHERE id = ?").run(novo, id);
  res.json({ ok: true, pago: novo });
});

app.post("/api/admin/excluir/:id", checkAdmin, (req, res) => {
  db.prepare("DELETE FROM palpites WHERE id = ?").run(parseInt(req.params.id, 10));
  res.json({ ok: true });
});

// zera TODOS os palpites (usado para limpar testes antes do evento)
app.post("/api/admin/zerar-tudo", checkAdmin, (req, res) => {
  const info = db.prepare("DELETE FROM palpites").run();
  res.json({ ok: true, removidos: info.changes });
});

app.post("/api/admin/config", checkAdmin, (req, res) => {
  const b = req.body || {};
  if (b.adversario !== undefined) setConfig.run("adversario", String(b.adversario));
  if (b.adversario_flag !== undefined) setConfig.run("adversario_flag", String(b.adversario_flag));
  if (b.valor_aposta !== undefined) setConfig.run("valor_aposta", String(b.valor_aposta));
  if (b.apostas_abertas !== undefined) setConfig.run("apostas_abertas", b.apostas_abertas ? "1" : "0");
  res.json({ ok: true });
});

app.get("/api/admin/csv", checkAdmin, (req, res) => {
  const palpites = db.prepare("SELECT * FROM palpites ORDER BY gols_brasil, gols_adversario, criado_em").all();
  const adversario = getConfig("adversario", "Adversário");
  const header = ["ID", "Nome", "Telefone", "Supervisor", adversario, "Brasil", "Placar (Adv x Brasil)", "Data"];
  const linhas = palpites.map((p) =>
    [p.id, p.nome, p.telefone, p.supervisor, p.gols_adversario, p.gols_brasil,
     `${p.gols_adversario}x${p.gols_brasil}`,
     new Date(p.criado_em).toLocaleString("pt-BR")]
      .map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
  );
  const csv = "\uFEFF" + [header.join(","), ...linhas].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="bolao-copa-junina.csv"');
  res.send(csv);
});

app.listen(PORT, () => {
  console.log(`\n🎉 Bolão Copa Junina rodando em http://localhost:${PORT}`);
  console.log(`   Página pública (corretores): http://localhost:${PORT}/`);
  console.log(`   Painel admin (você):         http://localhost:${PORT}/admin.html`);
  console.log(`   Senha do admin:              ${ADMIN_PASSWORD}\n`);
});
