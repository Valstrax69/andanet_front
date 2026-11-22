// Front del asistente ANDA. Manda el mensaje al gateway (/api/chat) y muestra
// la respuesta. El gateway enruta al micro de dominio.
//
// Dos cosas nuevas en EP3:
//   1. La API exige la cabecera X-API-Key. Se guarda en el navegador.
//   2. La respuesta llega en dos tiempos. Primero la plantilla de la FAQ, que
//      es inmediata, y despues el mismo contenido redactado por el LLM, que se
//      consulta en /api/respuesta/{id}. Si el LLM falla, queda la plantilla:
//      la atencion no se detiene.

const forma = document.getElementById("forma");
const entrada = document.getElementById("texto");
const boton = document.getElementById("enviar");
const mensajes = document.getElementById("mensajes");
const campoClave = document.getElementById("clave");

const GUARDADA = "anda_api_key";
campoClave.value = localStorage.getItem(GUARDADA) || "";
campoClave.addEventListener("change", () => {
  localStorage.setItem(GUARDADA, campoClave.value.trim());
});

// Cuanto se espera el texto del LLM antes de rendirse: 14 intentos de 1,5 s
const ESPERA_MS = 1500;
const INTENTOS = 14;

function cabeceras() {
  const h = { "Content-Type": "application/json" };
  const clave = campoClave.value.trim();
  if (clave) h["X-API-Key"] = clave;
  return h;
}

function burbuja(texto, quien, extra) {
  const div = document.createElement("div");
  div.className = "msg msg--" + quien;
  const p = document.createElement("p");
  p.textContent = texto;
  div.appendChild(p);
  if (extra) div.insertAdjacentHTML("beforeend", extra);
  mensajes.appendChild(div);
  mensajes.scrollTop = mensajes.scrollHeight;
  return div;
}

function etiqueta(div, texto, clase) {
  const span = document.createElement("span");
  span.className = "badge" + (clase ? " " + clase : "");
  span.textContent = texto;
  div.appendChild(span);
  mensajes.scrollTop = mensajes.scrollHeight;
  return span;
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Pregunta por el texto del LLM hasta que llegue, se degrade, o se acabe la espera
async function esperarTextoDelLLM(id, div) {
  const aviso = etiqueta(div, "redactando…", "badge--espera");
  for (let i = 0; i < INTENTOS; i++) {
    await dormir(ESPERA_MS);
    let data;
    try {
      const r = await fetch(`/api/respuesta/${id}`, { headers: cabeceras() });
      if (!r.ok) break;
      data = await r.json();
    } catch (e) {
      break;
    }
    if (data.estado_llm === "listo" && data.respuesta_llm) {
      aviso.remove();
      const p = document.createElement("p");
      p.textContent = data.respuesta_llm;
      div.insertBefore(p, div.querySelector(".badge"));
      etiqueta(div, "redactado por el LLM", "badge--llm");
      return;
    }
    if (data.estado_llm === "degradado" || data.estado_llm === "error_cola") {
      aviso.remove();
      etiqueta(div, "respuesta de la base de conocimiento (LLM no disponible)", "badge--deriva");
      return;
    }
  }
  aviso.remove();
  etiqueta(div, "respuesta de la base de conocimiento", "badge--deriva");
}

async function enviar(texto) {
  burbuja(texto, "user");
  boton.disabled = true;
  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: cabeceras(),
      body: JSON.stringify({ texto }),
    });

    if (r.status === 401) {
      burbuja("Falta la clave de API, o no es válida. Escríbela arriba y vuelve a enviar.", "bot");
      campoClave.focus();
      return;
    }
    if (r.status === 429) {
      const espera = r.headers.get("Retry-After") || "unos segundos";
      burbuja(`Demasiadas consultas seguidas. Intenta de nuevo en ${espera} segundos.`, "bot");
      return;
    }
    if (!r.ok) {
      burbuja("El servicio respondió con un error. Intenta de nuevo.", "bot");
      return;
    }

    const data = await r.json();
    let meta = "";
    if (data.intencion) {
      const conf = data.confianza != null ? " · " + Math.round(data.confianza * 100) + "%" : "";
      meta += `<span class="badge">${data.intencion}${conf}</span>`;
    }
    if (data.derivar) {
      meta += `<span class="badge badge--deriva">derivado a ejecutivo</span>`;
    }
    const div = burbuja(data.respuesta || "Sin respuesta.", "bot", meta);

    // El texto del LLM llega despues, y solo cuando hubo algo que redactar
    if (data.id && data.estado_llm === "pendiente") {
      esperarTextoDelLLM(data.id, div);
    }
  } catch (e) {
    burbuja("No pude conectar con el servicio. Intenta de nuevo.", "bot");
  } finally {
    boton.disabled = false;
    entrada.focus();
  }
}

forma.addEventListener("submit", (e) => {
  e.preventDefault();
  const texto = entrada.value.trim();
  if (!texto) return;
  entrada.value = "";
  enviar(texto);
});
