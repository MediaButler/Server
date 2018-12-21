# MediaButler API Server

## What is it?

MediaButler is aimed as your personal media companion, providing a unified experience for several applications that you may be using. Do you have a Plex Server in your network? Then MediaButler is precisely for you, featuring a full experience for you and your users. Security conscious so private information stays private. The API Server serves as the hub for everything. Open Sourced to allow you/others to implement features which can simplify and automate processes to help make life easier.

## Supported Integrations

Ticks are currently supported. Others are planned support.

- [X] Plex
- [X] Sonarr (+ Varients: 4K)
- [X] Radarr (+ Varients: 4K + 3D)
- [X] Lidarr
- [X] Tautulli

## Features

 - Implements a full request system allow your users to request new content to be added.
 - Implements a playback rules chain, which will allow limitations given to your users. Stopping streams which break the rules in their tracks.

## Give me some examples of these "Front-Ends"

 - [MediaButler WebUI](https://beta.mediabutler.io) - Web application for you and your users 
 - [Discord bot](./DISCORD.md) - Have a bot on your Discord Server which allows your users to perform actions on the API
 - [Organizr v2 Plugin](https://github.com/MediaButler/organizr-plugin) - Plugin to help add and manage requests on the API

## Installation

You will need:
 - [Node.js](https://nodejs.org/) (Tested with v9 but should work with anything >v6)
 - [NPM](https://www.npmjs.com/) (Tested with v5.6.0/v6.0.1 but should work with lower)
 - [MongoDb](https://www.mongodb.com/)


 ### NPM Installation

     npm i -g mediabutler-server
     mediabutler # It will fail to startup properly
     nano ${HOME}/.mediabutler/settings.json
     mediabutler


### Docker Installation

#### Native Docker

    docker run -d \ 
        --name=mongo \
        mongo:latest mongod --smallfiles --bind_ip_all
        
Please note, due to the way docker works the `--bind_ip_all` will not physically bind to all network interfaces, it's just so mongo listenes on all interfaces that appears to the docker internally. You may not need this flag, however in our testing. This was the simplist solution.

    docker create \
        --name=mediabutler \
        --link mongo:mongo \
        -e PLEX_URL=http://192.168.1.100:32400/ \
        -e DB_URL=mongodb://mongo:27017/mediabutler \
        -v ${HOME}/docker/mediabutler:/config:rw \
        -p 9876:9876 \
        mediabutler/server:latest
    docker start mediabutler

#### Docker Compose

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
                - "PLEX_MACHINE_ID=PLEX_MACHINE_ID_HERE"
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

## Thanks

This project couldn't have been completed without a ton of blood sweat and tears, nor without the support from the magical community that surrounds Plex. We would like to give thanks to these people especially for putting up with us:

 - The entire Tautulli team. For your general direction and code changes you made for us. For the best Plex API documentation available. For providing the community with scripts which implement a lot of features that we have built on. Thank you.
 - Sonarr development team. Thank you for making a great application that made it so easy for us to integrate.
 - Radarr development team. You guys took Sonarr and made it something special for Movies and oh my how special it is.
 - The entire Plex team. Without Plex, MediaButer wouldnt exist. It's plain and simple.
 - Organizr "inner circle". Friendly advice, put up with all our complaining, but understood the quest we were on and wanted to help in every which way. Much love to all of you.
 - Ombi team. For showing there is a need for extra services, and also showing that a system needs tighter integrations all over.
 - The JDM_WAAAT community. For being that distraction every single time it was necessary
 - All Alpha and Beta testers. It's been a bumpy road but we thank you for your support in making sure we bring out good working code for everyone to use.
 - and Finally.... YOU. The end-user. We can only hope you enjoy the fruits of our labour and hopefully we can continue to make MediaButler the application we all want it to be!