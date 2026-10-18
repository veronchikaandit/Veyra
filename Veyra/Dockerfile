# Veyra — статичний сайт (HTML/CSS/JS), без збірки.
FROM nginx:alpine

# Прибрати дефолтну сторінку nginx і покласти сайт
RUN rm -rf /usr/share/nginx/html/*
COPY . /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
