# MediaButler Server

MediaButler is aimed as your personal media companion, providing a unified experience for several applications that you may be using. Do you have a Plex Server in your network? Then MediaButler is precisely for you, featuring a full experience for you and your users. Security conscious so private information stays private. The API Server serves as the hub for everything. Open Sourced to allow you/others to implement features which can simplify and automate processes to help make life easier.

# Supported Architectures

x86-64 only for the time being

# Usage

Here are some example snippets to help you get started creating a container.

## docker

```bash
docker run -d \ 
    --name=mongo \
    -p 27017:27017 \
    mongo:latest mongod --smallfiles --bind_ip_all

docker create \
    --name=mediabutler \
    --link mongo:mongo \
    -e PLEX_URL=http://192.168.1.100:32400/ \
    -e DB_URL=mongodb://mongo:27017/mediabutler \
    -v ${HOME}/docker/mediabutler:/config:rw \
    -p 9876:9876 \
    mediabutler/server:latest
docker start mediabutler

```

## docker-compose 

```yaml
---
version: '2'
networks:
  mb:
    driver: bridge
services:
    mediabutler-api:
        container_name: "mediabutler"
        image: mediabutler/server:latest
        hostname: mediabutler
        environment:
            - "URL=https://example.com/mediabutler/"
            - "DB_URL=mongodb://mongo:27017/mediabutler"
            - "PLEX_URL=http://192.168.1.101:32400/"
        volumes:
            - ${HOME}/docker/mediabutler:/config:rw
        networks:
            - mb
        ports:
            - 9876:9876
        links:
            - mongo
        depends_on:
            - mongo
    mongo:
        image: mongo:latest
        container_name: "mongo"
        hostname: mongo
        environment:
            - MONGO_DATA_DIR=/data/db
            - MONGO_LOG_DIR=/dev/null
            - MONGO_URL=mongodb://mongo:27017/
        volumes:
            - ${HOME}/docker/mediabutler/db:/data/db:rw
        networks:
            - mb
        command: mongod --smallfiles --bind_ip_all
```

# Parameters

Container images are configured using parameters passed at runtime (such as those above). These parameters are separated by a colon and indicate <external>:<internal> respectively. For example, -p 8080:80 would expose port 80 from inside the container to be accessible from the host's IP on port 8080 outside the container.

 - `-p 9876` - The port
 - `-v /config` - Mapping the config files for MediaButler
 - `-e PLEX_URL` - Plex URL. eg: http://192.168.1.101:32400/
 - `-e DB_URL` - MongoDB URL. eg: http://127.0.0.1:27017/mediabutler
 - `-e URL` - Override URL for use with Reverse Proxies

# Setting up the application

Setup of the Application can be found the [MediaButler Wiki](https://github.com/MediaButler/Wiki/wiki)


# Info

 - Shell access whilst the container is running: `docker exec -it mediabutler /bin/sh`
 - To monitor the logs of the container in realtime: `docker logs -f mediabutler`

