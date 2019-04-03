# MediaButler API Server

[![](https://img.shields.io/discord/379374148436230144.svg)](https://discord.gg/nH9t5sm)
![](https://img.shields.io/gitlab/pipeline/MediaButler/API.svg?gitlab_url=https%3A%2F%2Flab.mediabutler.io)
[![](https://img.shields.io/docker/pulls/mediabutler/server.svg)](https://hub.docker.com/r/mediabutler/server)
[![](https://img.shields.io/npm/dt/mediabutler-server.svg)](https://www.npmjs.com/package/mediabutler-server)
[![](https://images.microbadger.com/badges/image/mediabutler/server.svg)](https://hub.docker.com/r/mediabutler/server)
[![](https://img.shields.io/npm/v/mediabutler-server.svg)](https://www.npmjs.com/package/mediabutler-server)
[![](https://img.shields.io/snyk/vulnerabilities/npm/mediabutler-server.svg?style=flat)](https://snyk.io/vuln/search?q=mediabutler-server&type=npm)

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

 - [Linux CLI](https://github.com/MediaButler/CLI-Linux) - Command line interface for Linux
 - [Windows CLI](https://github.com/MediaButler/CLI-Windows) - Windows command line interface
 - [Discord bot](./DISCORD.md) - Have a bot on your Discord Server which allows your users to perform actions on the API
 - [MediaButler WebUI](https://beta.mediabutler.io) - Web application for you and your users
 - [Organizr v2 Plugin](https://github.com/MediaButler/organizr-plugin) - Plugin to help add and manage requests on the API

## Installation

You will need:
 - [Node.js](https://nodejs.org/) (Tested with v9 but should work with anything >v6)
 - [NPM](https://www.npmjs.com/) (Usually installed with Node.js)
 - [MongoDb](https://www.mongodb.com/)

You will find installation guides on [our Wiki](https://github.com/MediaButler/Wiki/wiki)

## Further Support

If you require further support, you can check [our Wiki](https://github.com/MediaButler/Wiki/wiki) or drop by our [Discord Server](https://discord.gg/nH9t5sm)

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
