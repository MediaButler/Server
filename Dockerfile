ARG IMAGE_ARCH=amd64
FROM ${IMAGE_ARCH}/alpine:3.9
LABEL maintainer="MediaButler"

ENV DB_URL=mongodb://mongodb:21017/mediabutler
ENV ENABLE_UPNP=false

COPY ./ /app/
WORKDIR /app

RUN /sbin/apk add --no-cache openssl-dev \
    curl \
    nodejs-npm \
    nodejs-current \
    openssl \
    ca-certificates \
    && npm install

VOLUME /config
EXPOSE 9876
CMD ["npm", "start"]