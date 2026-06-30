FROM nginx:1.27-alpine

COPY docker/nginx/site.http.conf /etc/nginx/templates/default.conf.template
COPY index.html styles.css app.js /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
