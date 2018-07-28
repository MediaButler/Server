FROM alpine
LABEL maintainer="MediaButler"

ENV DB_URL=mongodb://mongodb:21017
ENV PLEX_MACHINE_ID=youShouldBeReplacingThis

COPY ./ /app/

RUN apk add --no-cache build-base \
        libssl1.0 \
        curl \
        git \
        nodejs-npm \
        su-exec \
        python \
        nodejs \
    && cd /app \
    && npm install

VOLUME /config
WORKDIR /app
CMD ["npm", "start"]