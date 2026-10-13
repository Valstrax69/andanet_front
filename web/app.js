// Front del asistente ANDA. Manda el mensaje al gateway (/api/chat) y muestra
// la respuesta. El gateway enruta al micro de dominio.

const forma = document.getElementById("forma");
const entrada = document.getElementById("texto");
const boton = document.getElementById("enviar");
const mensajes = document.getElementById("mensajes");

function burbuja(texto, quien, extra) {
  const div = document.createElement("div");
  div.className = "msg msg--" + quien;
  const p = document.createElement("p");
  p.textContent = texto;
  div.appendChild(p);
  if (extra) div.insertAdjacentHTML("beforeend", extra);
  mensajes.appendChild(div);
  mensajes.scrollTop = mensajes.scrollHeight;
}

async function enviar(texto) {
  burbuja(texto, "user");
  boton.disabled = true;
  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });
    const data = await r.json();
    let meta = "";
    if (data.intencion) {
      const conf = data.confianza != null ? " · " + Math.round(data.confianza * 100) + "%" : "";
      meta += `<span class="badge">${data.intencion}${conf}</span>`;
    }
    if (data.derivar) {
      meta += `<span class="badge badge--deriva">derivado a ejecutivo</span>`;
    }
    burbuja(data.respuesta || "Sin respuesta.", "bot", meta);
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
