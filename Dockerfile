FROM alpine
LABEL maintainer="MediaButler"

ENV DB_URL=mongodb://mongodb:21017
ENV PLEX_MACHINE_ID notSetCorrectly
ENV PLEX_URL notSetCorrectly
ENV TAUTULLI_URL notSetCorrectly
ENV AUTULLI_KEY notSetCorrectly
ENV SONARR_URL notSetCorrectly
ENV SONARR_KEY notSetCorrectly
ENV SONARR_PROFILE_NAME notSetCorrectly
ENV SONARR_ROOT_PATH notSetCorrectly
ENV RADARR_URL notSetCorrectly
ENV RADARR_KEY notSetCorrectly
ENV RADARR_PROFILE_NAME notSetCorrectly
ENV RADARR_ROOT_PATH notSetCorrectly
ENV ORGANIZR_URL notSetCorrectly
ENV ORGANIZR_KEY notSetCorrectly

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