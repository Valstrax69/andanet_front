FROM nginx:1.27-alpine

COPY default.conf /etc/nginx/conf.d/default.conf
COPY web/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
    CMD wget -q -O /dev/null http://127.0.0.1:80/healthz || exit 1
