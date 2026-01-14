// ======================================================
// javascript.js — Microcredenciais Paraná
// Autosave + Restore (IndexedDB)
// Preview do YouTube (VISUAL)
// PDF Único Final
// ======================================================

const APPS_SCRIPT_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzx5To8lK42s_ketzlHbXfXr6MN28yqHnmwcR14DSnrHP7UJRpZcNelUhX4_MPIwDSGKQ/exec";

/* ======================================================
   INDEXED DB
====================================================== */
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

/* ======================================================
   META
====================================================== */
async function putMeta(key, value) {
  const db = await openDB();
  db.transaction(STORE_META, "readwrite")
    .objectStore(STORE_META)
    .put({ key, value: value ?? "" });
}

async function getMeta(key) {
  const db = await openDB();
  return new Promise(resolve => {
    const req = db.transaction(STORE_META).objectStore(STORE_META).get(key);
    req.onsuccess = () => resolve(req.result?.value || "");
  });
}

/* ======================================================
   TEXTOS
====================================================== */
async function putText(field, value) {
  const db = await openDB();
  db.transaction(STORE_TEXTS, "readwrite")
    .objectStore(STORE_TEXTS)
    .put({ field: Number(field), value: value || "" });
}

async function getAllTexts() {
  const db = await openDB();
  return new Promise(resolve => {
    const req = db.transaction(STORE_TEXTS).objectStore(STORE_TEXTS).getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

/* ======================================================
   YOUTUBE – PREVIEW (FUNCIONAL)
====================================================== */
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

  if (!preview || !iframe) return;

  iframe.src = `https://www.youtube.com/embed/${videoId}`;
  iframe.style.width = "100%";
  iframe.style.height = "220px";
  iframe.style.borderRadius = "8px";

  preview.classList.remove("d-none");
  preview.style.display = "block";

  if (status) {
    status.textContent = "Vídeo carregado ✔";
    status.classList.remove("text-danger");
    status.classList.add("text-success");
  }
}

function hideYoutubePreview() {
  const preview = document.getElementById("youtubePreview");
  const iframe = document.getElementById("youtubeIframe");
  const status = document.getElementById("youtubeStatus");

  if (!preview || !iframe) return;

  iframe.src = "";
  preview.classList.add("d-none");
  preview.style.display = "none";
  if (status) status.textContent = "";
}

/* ======================================================
   AUTOSAVE + RESTORE
====================================================== */
document.addEventListener("DOMContentLoaded", async () => {

  const fields = document.querySelectorAll("input, textarea, select");

  /* ===== RESTAURAÇÃO ===== */
  const texts = await getAllTexts();
  const textMap = {};
  texts.forEach(t => textMap[t.field] = t.value);

  for (const el of fields) {
    if (el.dataset.field) {
      el.value = textMap[el.dataset.field] || "";
    } else if (el.id) {
      el.value = await getMeta(el.id);
    }
  }

  /* ===== PREVIEW YOUTUBE (RESTORE) ===== */
  const youtubeInput = document.getElementById("youtubeUrl");
  if (youtubeInput) {
    const saved = await getMeta("youtubeUrl");
    youtubeInput.value = saved || "";

    const id = extractYoutubeId(saved);
    if (id) showYoutubePreview(id);

    youtubeInput.addEventListener("input", () => {
      const idNow = extractYoutubeId(youtubeInput.value);
      putMeta("youtubeUrl", youtubeInput.value);

      if (idNow) showYoutubePreview(idNow);
      else hideYoutubePreview();
    });
  }
/* ===== BOTÃO REMOVER LINK DO YOUTUBE ===== */
const btnClearYoutube = document.getElementById("btnClearYoutube");

if (btnClearYoutube && youtubeInput) {
  btnClearYoutube.addEventListener("click", async () => {

    // Limpa input
    youtubeInput.value = "";

    // Remove do IndexedDB
    await putMeta("youtubeUrl", "");

    // Esconde preview
    hideYoutubePreview();

    // Feedback visual
    const status = document.getElementById("youtubeStatus");
    if (status) {
      status.textContent = "Link removido";
      status.classList.remove("text-success");
      status.classList.add("text-muted");
    }
  });
}

  /* ===== SALVAMENTO AUTOMÁTICO ===== */
  fields.forEach(el => {
    const handler = () => {
      if (el.dataset.field) {
        putText(el.dataset.field, el.value);
      } else if (el.id) {
        putMeta(el.id, el.value);
      }
    };
    el.addEventListener("input", handler);
    el.addEventListener("change", handler);
  });

  /* ===== BOTÃO FINAL ===== */
  const btnFinal = document.getElementById("btnFinalizarApresentacao");
  if (!btnFinal) return;

  btnFinal.addEventListener("click", async e => {
    e.preventDefault();

    Swal.fire({
      title: "Salvando tudo…",
      text: "Gerando PDF da apresentação",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const pdfBytes = await gerarPdfApresentacaoCompleta();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "apresentacao_microcredencial.pdf";
      a.click();

      Swal.fire("Concluído!", "PDF gerado com sucesso.", "success")
        .then(() => window.location.href = "../desafio/desafio_0.html");

    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao gerar o PDF.", "error");
    }
  });
});

/* ======================================================
   PDF
====================================================== */
function wrapText(text, font, size, maxWidth) {
  if (!text) return ["—"];
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function gerarPdfApresentacaoCompleta() {
  const courseName = await getMeta("courseName");
  const synopsis = await getMeta("synopsis");
  const nivel = await getMeta("nivel");
  const carga = await getMeta("carga");
  const textoCurso = await getMeta("textoEtapa");
  const youtubeCurso = await getMeta("youtubeUrl");
  const youtubeProfessor = await getMeta("youtubeProfessor");
  const lattesUrl = await getMeta("lattesUrl");

  const texts = await getAllTexts();
  const topicos = texts.filter(t => t.field >= 1 && t.field <= 4)
    .sort((a, b) => a.field - b.field);
  const textoProfessor = texts.find(t => t.field === 6)?.value || "";

  const pdf = await PDFLib.PDFDocument.create();
  const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);

  let page = pdf.addPage([595.28, 841.89]);
  let y = 800;

  function novaPagina() {
    page = pdf.addPage([595.28, 841.89]);
    y = 800;
  }

  function bloco(titulo, texto) {
    if (y < 120) novaPagina();
    page.drawText(titulo, { x: 50, y, size: 14, font });
    y -= 18;

    wrapText(texto, font, 11, 495).forEach(l => {
      if (y < 80) novaPagina();
      page.drawText(l, { x: 50, y, size: 11, font });
      y -= 14;
    });
    y -= 12;
  }

  page.drawText("APRESENTAÇÃO COMPLETA – MICROCREDENCIAIS", {
    x: 50, y, size: 18, font
  });
  y -= 40;

  bloco("Curso", courseName);
  bloco("Nível", nivel);
  bloco("Carga Horária", carga ? `${carga} horas` : "");
  bloco("Sinopse", synopsis);
  topicos.forEach(t => bloco(`Tópico ${t.field}`, t.value));
  bloco("Apresentação do Curso", textoCurso);
  bloco("Vídeo do Curso (link)", youtubeCurso);
  bloco("Apresentação do(a) Professor(a)", textoProfessor);
  bloco("Vídeo do Professor (link)", youtubeProfessor);
  bloco("Currículo Lattes", lattesUrl);

  return await pdf.save();
}
