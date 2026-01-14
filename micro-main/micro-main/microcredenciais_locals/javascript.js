// javascript.js — CLIENTE
// Salvamento automático (IndexedDB) + restauração após F5
// Preview automático do YouTube
// Envio ao Drive SOMENTE no botão final

/* =========================
   CONFIG
========================= */
const APPS_SCRIPT_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzx5To8lK42s_ketzlHbXfXr6MN28yqHnmwcR14DSnrHP7UJRpZcNelUhX4_MPIwDSGKQ/exec";

/* =========================
   INDEXED DB
========================= */
const DB_NAME = "microcredenciais_db";
const STORE_META = "meta";
const STORE_TEXTS = "texts";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_TEXTS)) {
        db.createObjectStore(STORE_TEXTS, { keyPath: "field" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* =========================
   META
========================= */
async function putMeta(key, value) {
  const db = await openDB();
  db.transaction(STORE_META, "readwrite")
    .objectStore(STORE_META)
    .put({ key, value: value ?? "" });
}

async function getMeta(key) {
  const db = await openDB();
  return new Promise((resolve) => {
    const req = db.transaction(STORE_META).objectStore(STORE_META).get(key);
    req.onsuccess = () => resolve(req.result?.value || "");
  });
}

/* =========================
   TEXTOS (tópicos e textos longos)
========================= */
async function putText(field, value) {
  const db = await openDB();
  db.transaction(STORE_TEXTS, "readwrite")
    .objectStore(STORE_TEXTS)
    .put({ field: Number(field), value: value || "" });
}

async function getAllTexts() {
  const db = await openDB();
  return new Promise((resolve) => {
    const req = db.transaction(STORE_TEXTS).objectStore(STORE_TEXTS).getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

/* =========================
   YOUTUBE – PREVIEW
========================= */
function extractYoutubeId(url) {
  if (!url) return null;
  const regex =
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function showYoutubePreview(videoId) {
  const preview = document.getElementById("youtubePreview");
  const iframe = document.getElementById("youtubeIframe");
  const status = document.getElementById("youtubeStatus");
  const idSpan = document.getElementById("youtubeVideoId");
  const input = document.getElementById("youtubeUrl");

  if (!preview || !iframe || !status || !idSpan || !input) return;

  iframe.src = `https://www.youtube.com/embed/${videoId}`;
  idSpan.textContent = videoId;

  preview.classList.remove("d-none");
  input.classList.add("is-valid");
  input.classList.remove("is-invalid");

  status.textContent = "Link válido ✔";
  status.classList.add("text-success");
  status.classList.remove("text-danger");
}

function hideYoutubePreview() {
  const preview = document.getElementById("youtubePreview");
  const iframe = document.getElementById("youtubeIframe");
  const status = document.getElementById("youtubeStatus");
  const input = document.getElementById("youtubeUrl");

  if (!preview || !iframe || !status || !input) return;

  iframe.src = "";
  preview.classList.add("d-none");
  input.classList.remove("is-valid", "is-invalid");
  status.textContent = "";
  status.classList.remove("text-success", "text-danger");
}

/* =========================
   START
========================= */
document.addEventListener("DOMContentLoaded", async () => {

  /* ===== DOM SEGURO ===== */
  const courseName = document.getElementById("courseName");
  const synopsis = document.getElementById("synopsis");
  const textoEtapa = document.getElementById("textoEtapa");

  const youtubeUrl = document.getElementById("youtubeUrl");
  const youtubeProfessor = document.getElementById("youtubeProfessor");
  const lattesUrl = document.getElementById("lattesUrl");

  const dificuldade = document.getElementById("dificuldade");
  const cargaHoraria = document.getElementById("cargaHoraria");
  const nivel = document.getElementById("nivel");
  const carga = document.getElementById("carga");

  const synopsisCount = document.getElementById("synopsisCount");
  const synopsisHint = document.getElementById("synopsisHint");

  const textAreas = document.querySelectorAll(".texto");

  /* =========================
     FOCO AUTOMÁTICO NO 1º TÓPICO
  ========================= */
  const topico1 = document.getElementById("topico1");
  if (topico1) setTimeout(() => topico1.focus(), 300);

  /* =========================
     SINOPSE – CONTADOR
  ========================= */
  function updateSynopsisUI() {
    if (!synopsis || !synopsisCount || !synopsisHint) return;
    const len = synopsis.value.length;
    synopsisCount.textContent = len;
    synopsis.classList.remove("is-valid", "is-invalid");

    if (len === 0) {
      synopsisHint.textContent = "Mínimo 350 e máximo 500 caracteres";
    } else if (len < 350) {
      synopsis.classList.add("is-invalid");
      synopsisHint.textContent = `Faltam ${350 - len} caracteres`;
    } else if (len > 500) {
      synopsis.classList.add("is-invalid");
      synopsisHint.textContent = `Excedeu ${len - 500} caracteres`;
    } else {
      synopsis.classList.add("is-valid");
      synopsisHint.textContent = "Sinopse válida ✔";
    }
  }

  /* =========================
     RESTAURAÇÃO APÓS F5
  ========================= */
  if (courseName) courseName.value = await getMeta("courseName");

  if (synopsis) {
    synopsis.value = await getMeta("synopsis");
    updateSynopsisUI();
  }

  if (textoEtapa)
    textoEtapa.value = await getMeta("textoEtapa");

  if (youtubeUrl) {
    const saved = await getMeta("youtubeUrl");
    youtubeUrl.value = saved;
    const id = extractYoutubeId(saved);
    if (id) showYoutubePreview(id);
  }

  if (youtubeProfessor)
    youtubeProfessor.value = await getMeta("youtubeProfessor");

  if (lattesUrl)
    lattesUrl.value = await getMeta("lattesUrl");

  if (dificuldade)
    dificuldade.value = (await getMeta("dificuldade")) || "facil";

  if (cargaHoraria)
    cargaHoraria.value = (await getMeta("cargaHoraria")) || "20";

  if (nivel)
    nivel.value = (await getMeta("nivel")) || "";

  if (carga)
    carga.value = (await getMeta("carga")) || "";

  const texts = await getAllTexts();
  const map = {};
  texts.forEach(t => map[t.field] = t.value);
  textAreas.forEach(t => t.value = map[t.dataset.field] || "");

  /* =========================
     EVENTOS – SALVAR AUTOMÁTICO
  ========================= */
  courseName?.addEventListener("input", () =>
    putMeta("courseName", courseName.value)
  );

  synopsis?.addEventListener("input", () => {
    putMeta("synopsis", synopsis.value);
    updateSynopsisUI();
  });

  textoEtapa?.addEventListener("input", () =>
    putMeta("textoEtapa", textoEtapa.value)
  );

  youtubeUrl?.addEventListener("input", async () => {
    const url = youtubeUrl.value.trim();
    await putMeta("youtubeUrl", url);

    if (!url) {
      hideYoutubePreview();
      return;
    }

    const id = extractYoutubeId(url);
    if (id) {
      showYoutubePreview(id);
    } else {
      hideYoutubePreview();
      youtubeUrl.classList.add("is-invalid");
      const status = document.getElementById("youtubeStatus");
      status.textContent = "Link inválido";
      status.classList.add("text-danger");
    }
  });

  document.getElementById("btnClearYoutube")?.addEventListener("click", async () => {
    youtubeUrl.value = "";
    await putMeta("youtubeUrl", "");
    hideYoutubePreview();
  });

  youtubeProfessor?.addEventListener("input", () =>
    putMeta("youtubeProfessor", youtubeProfessor.value)
  );

  lattesUrl?.addEventListener("input", () =>
    putMeta("lattesUrl", lattesUrl.value)
  );

  dificuldade?.addEventListener("change", () =>
    putMeta("dificuldade", dificuldade.value)
  );

  cargaHoraria?.addEventListener("change", () =>
    putMeta("cargaHoraria", cargaHoraria.value)
  );

  nivel?.addEventListener("change", () =>
    putMeta("nivel", nivel.value)
  );

  carga?.addEventListener("change", () =>
    putMeta("carga", carga.value)
  );

  textAreas.forEach(t => {
    t.addEventListener("input", () =>
      putText(t.dataset.field, t.value)
    );
  });

});
