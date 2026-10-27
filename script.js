import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

const PDF_URL = "./assets/scape-book.pdf";

const canvas = document.getElementById("pdfCanvas");
const ctx = canvas.getContext("2d");
const layer = document.getElementById("interactiveLayer");
const feedback = document.getElementById("feedback");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const firstBtn = document.getElementById("firstBtn");
const solutionsBtn = document.getElementById("solutionsBtn");
const pageJump = document.getElementById("pageJump");
const goBtn = document.getElementById("goBtn");

const progressText = document.getElementById("progressText");
const lockStatus = document.getElementById("lockStatus");

let pdf = null;
let currentPage = 1;
let solved = JSON.parse(localStorage.getItem("scapeSolved") || "{}");

/*
  PÁGINAS INTERACTIVAS REALES DEL PDF
  17 = RETO 1 (impreso 16)
  21 = RETO 2 (impreso 20)
  26 = RETO 3 (impreso 25)
  31 = RETO 4 (impreso 30)
  36 = RETO 5 (impreso 35)
*/
const challenges = {
  17: {
    id: "reto1",
    answer: "1618764",
    type: "text",
    title: "Código de los anillos"
  },
  21: {
    id: "reto2",
    answer: "24 Y 48",
    type: "latlon",
    title: "Coordenadas"
  },
  26: {
    id: "reto3",
    answer: "342",
    type: "text",
    title: "Cables"
  },
  31: {
    id: "reto4",
    answer: "245",
    type: "text",
    title: "Válvulas"
  },
  36: {
    id: "reto5",
    answer: "C",
    type: "text",
    title: "Ruta de minas"
  }
};

/*
  BLOQUEOS:
  Después de cada reto, el siguiente tramo queda bloqueado hasta resolverlo.
  Se permite retroceder.
*/
const gates = [
  { afterPage: 17, required: "reto1" },
  { afterPage: 21, required: "reto2" },
  { afterPage: 26, required: "reto3" },
  { afterPage: 31, required: "reto4" },
  { afterPage: 36, required: "reto5" }
];

function normalize(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function canEnter(pageNumber) {
  for (const gate of gates) {
    if (pageNumber > gate.afterPage && !solved[gate.required]) {
      return false;
    }
  }
  return true;
}

function firstUnsolvedChallenge() {
  for (const [page, data] of Object.entries(challenges)) {
    if (!solved[data.id]) return Number(page);
  }
  return null;
}

function showFeedback(message, ok = true) {
  feedback.textContent = message;
  feedback.classList.add("show");
  feedback.classList.toggle("error", !ok);
  window.clearTimeout(showFeedback.timer);
  showFeedback.timer = window.setTimeout(() => {
    feedback.classList.remove("show");
  }, 2600);
}

function makeInput(x, y, w, h, placeholder = "") {
  const input = document.createElement("input");
  input.className = "interactive challenge-input";
  input.placeholder = placeholder;
  input.style.left = `${x}%`;
  input.style.top = `${y}%`;
  input.style.width = `${w}%`;
  input.style.height = `${h}%`;
  return input;
}

function makeButton(x, y, w, h, label) {
  const button = document.createElement("button");
  button.className = "interactive challenge-button";
  button.textContent = label;
  button.style.left = `${x}%`;
  button.style.top = `${y}%`;
  button.style.width = `${w}%`;
  button.style.height = `${h}%`;
  return button;
}

function createTextChallenge(pageNumber, data) {
  // Posición del campo de respuesta sobre la caja del PDF.
  const input = makeInput(27, 67, 46, 6, "ESCRIBE LA RESPUESTA");
  const button = makeButton(27, 74, 46, 6, "COMPROBAR");

  button.addEventListener("click", () => {
    if (normalize(input.value) === normalize(data.answer)) {
      solved[data.id] = true;
      localStorage.setItem("scapeSolved", JSON.stringify(solved));
      showFeedback("✓ CORRECTO. El sistema acepta la respuesta.");
      renderPage(currentPage);
    } else {
      showFeedback("✕ INCORRECTO. Revisa las pistas e inténtalo de nuevo.", false);
    }
  });

  layer.append(input, button);
}

function createLatLonChallenge(data) {
  const lat = makeInput(27, 72, 20, 6, "LATITUD");
  const lon = makeInput(53, 72, 20, 6, "LONGITUD");
  const button = makeButton(27, 80, 46, 6, "COMPROBAR");

  button.addEventListener("click", () => {
    const a = normalize(lat.value);
    const b = normalize(lon.value);

    const valid =
      (a === "24" && b === "48") ||
      (a === "24.0" && b === "48.0");

    if (valid) {
      solved[data.id] = true;
      localStorage.setItem("scapeSolved", JSON.stringify(solved));
      showFeedback("✓ COORDENADAS CORRECTAS. PUNTO CERO LOCALIZADO.");
      renderPage(currentPage);
    } else {
      showFeedback("✕ COORDENADAS INCORRECTAS.", false);
    }
  });

  layer.append(lat, lon, button);
}

function createChallenge(pageNumber) {
  layer.innerHTML = "";
  const data = challenges[pageNumber];
  if (!data) return;

  if (solved[data.id]) {
    const done = document.createElement("div");
    done.className = "interactive";
    done.style.left = "25%";
    done.style.top = "66%";
    done.style.width = "50%";
    done.style.height = "15%";
    done.style.display = "grid";
    done.style.placeItems = "center";
    done.style.color = "#4ee6dc";
    done.style.fontWeight = "900";
    done.style.fontSize = "clamp(14px, 2vw, 22px)";
    done.textContent = "✓ RETO RESUELTO";
    layer.appendChild(done);
    return;
  }

  if (data.type === "latlon") {
    createLatLonChallenge(data);
  } else {
    createTextChallenge(pageNumber, data);
  }
}

async function renderPage(pageNumber) {
  if (!pdf) return;

  if (!canEnter(pageNumber)) {
    const target = firstUnsolvedChallenge();
    showFeedback(`PÁGINA BLOQUEADA. Primero debes resolver el ${challenges[target]?.title || "reto pendiente"}.`, false);
    return;
  }

  currentPage = pageNumber;
  const page = await pdf.getPage(pageNumber);

  // Ajusta la resolución sin hacer el archivo visualmente gigante.
  const base = page.getViewport({ scale: 1 });
  const maxWidth = Math.min(window.innerWidth * 0.78, 650);
  const scale = maxWidth / base.width;
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: ctx,
    viewport
  }).promise;

  progressText.textContent = `PÁGINA ${currentPage} / ${pdf.numPages}`;
  pageJump.value = currentPage;

  const challenge = challenges[currentPage];
  lockStatus.textContent = challenge
    ? (solved[challenge.id] ? "RETO RESUELTO" : "RETO ACTIVO")
    : "SISTEMA ACTIVO";

  createChallenge(currentPage);

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === pdf.numPages;
}

function go(delta) {
  const target = currentPage + delta;
  if (target >= 1 && target <= pdf.numPages) renderPage(target);
}

prevBtn.addEventListener("click", () => go(-1));
nextBtn.addEventListener("click", () => go(1));
firstBtn.addEventListener("click", () => renderPage(1));

goBtn.addEventListener("click", () => {
  const target = Number(pageJump.value);
  if (target >= 1 && target <= pdf.numPages) renderPage(target);
});

pageJump.addEventListener("keydown", (event) => {
  if (event.key === "Enter") goBtn.click();
});

solutionsBtn.addEventListener("click", () => {
  // El PDF ya contiene las soluciones en las últimas páginas.
  const solutionPage = 41;
  if (canEnter(solutionPage)) {
    renderPage(solutionPage);
  } else {
    showFeedback("Las soluciones permanecen bloqueadas hasta completar los retos.", false);
  }
});

window.addEventListener("resize", () => renderPage(currentPage));

pdfjsLib.getDocument(PDF_URL).promise
  .then(loadedPdf => {
    pdf = loadedPdf;
    renderPage(1);
  })
  .catch(error => {
    console.error(error);
    showFeedback("No se pudo cargar el PDF. Revisa la ruta del archivo.", false);
  });
