FROM alpine:latest
LABEL maintainer="MediaButler"

ENV DB_URL=mongodb://mongodb:21017
ENV PLEX_MACHINE_ID notSetCorrectly
ENV PLEX_URL notSetCorrectly

COPY ./ /app/

RUN apk add --no-cache build-base \
        libssl1.0 \
        curl \
        git \
        nodejs-npm \
        su-exec \
        python \
        nodejs-current \
        openssl \
        ca-certificates \
    && cd /app \
    && npm install

VOLUME /config
WORKDIR /app
EXPOSE 9876
CMD ["npm", "start"]