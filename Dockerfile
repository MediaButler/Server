FROM alpine
LABEL maintainer="MediaButler"

ENV OWNER_TOKEN=BIG_FUCKING_GIANT_JWT_TOKEN
ENV DB_URL=mongodb://mongodb:21017
ENV AUTH_SECRET=notSoSecret
ENV PLEX_URL=http://192.168.1.101:32400/

COPY ./ /app/

RUN apk add --no-cache build-base \
        libssl1.0 \
        curl \
        git \
        nodejs-npm \
        su-exec \
        python \
        nodejs \
        nodejs-npm \
    && cd /app \
    && npm install

VOLUME /config
WORKDIR /app
CMD ["npm", "start"]