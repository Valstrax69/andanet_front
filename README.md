# front — Interfaz del asistente

Página de chat simple (HTML/CSS/JS) servida por Nginx, detrás del gateway.
Permite el flujo principal: escribir un mensaje y ver la respuesta del asistente,
con la intención detectada y, si corresponde, el aviso de derivación.

Llama a `/api/chat` (mismo origen, vía gateway). No publica puerto propio.

## Construir
```bash
docker build -t front .
```
