# MediaButler Discord

## What is it

The Discord bot interacts with the API Server that you host to push and pull information from. This enables notifications and interactions from your MediaButler Server to you via. Discord


## What can it do

There are several specific features of the bot including:

 - Receive Notifications from all supported integrations (Currently: Sonarr/Radarr/Tautulli/Plex)
 - Receive Notifications from requests and rules features of the API Server
 - Playback music from your Plex server and YouTube into a Discord Voice Channel
 - Manage Requests (Add/Delete/Approve)
 - Backend Request Management (Add/Delete AutoApprove/Approvers)
 - Manage Rules (Add/Delete)
 - Kill indidual streams on Plex
 - Get basic information about a TV Show/Movie/Artist
 - Pull a users playback history
 - Retrieve Now Playing from Plex

## What you need

 - Installed and Configured copy of the [MediaButler Server](./README.md)

 ## Getting it

 ### Hosted

 #### Adding to your Discord Server

 Due to how Discord is as a service and to keep setup minimalistic for you. We run the bot in the cloud for you. All you have to do is invite it to your Discord server and the fun can begin.

 You can invite the bot to your server with the following link:

    https://discordapp.com/api/oauth2/authorize?client_id=354733331717554179&permissions=8&scope=bot


Please Note: While the URL will request the bot have administrative permissions, this may not be totally necessary. It is mostly just the `Manage Messages` permission that the bot requires as sometimes if it asks you to post sensitive information. The bot will remove the sensitive information to prevent others from seeing it but knows the information itself. The bot can also create channels in some instances.

#### Logging in

Everyone that interacts with the bot will on their first occasion of seeing the bot run the command `!login` (We are assuming the default prefix of `!` but can be changed within the bots configuration after joining it to your server). This will bring you up a link to plex.tv and a PIN code. If you are logged into Plex you should only need to input the code and that will be over. If not you will be presented with a Plex login screen and then taken to the code input page. Once this is complete you will be sucessfully logged in.

Please Note: If you have recently been invited to a new Plex server, you may need to run the `!login` command for the bot to pick up the new server.

#### Selecting my Plex server

Selecting your server is done by running the `!server` command and should you have the correct permissions (You must be the Plex server admin) you will see it on the list. With an emoji number next to it. React with the appropriate emoji and the server setup should complete.


####  What can I do?

##### Notifications

There are several types of notificaitons that the bot can provide and you can choose where you would like each output. You can set this up by going to the channel you wish the notification in and running `!bot notify` or `!notify`

Types of output are:

    All - Sets all output to this channel.
    Administrative - Administrative only notifications (disconnection/connection from api server, requests admin abilities)
    Request - Front end for user requests, when request is added, approved, filled.
    Sonarr - Sonarr based notifications, on Grab, Import and Upgrade.
    Radarr - Same as Sonarr but for Radarr.
    Playback (User) - Tautulli activity log (Playback started, stopped, paused, finished) - Personally identifiable information (Such as username, ip address) has been removed.
    Playback (Admin) - Same Tautulli output but with the identifiable information.

##### Commands

Please note this list is not yet complete.

##### Change Prefix

To change the prefix of commands on your Discord server. You can use the `!bot prefix` command.

Please Note: This guide assumes you have a prefix of `!`

Example: `!bot prefix &`

##### Audio Playback

You must be in a voice channel for this.

Adding tracks to the playback queue is simple, you can add from either YouTube or from a search of your Plex server using the `!player add` command

Examples: `!player add https://www.youtube.com/watch?v=gl1aHhXnN1k`
`!player add Wu-tang clan`

If required, select a song and the bot will join the voice channel and begin playbak.

Playback can be controlled with the reactions on the 'Now Playing' notification, or with `!player next` `!player stop` `!player queue` `!player prev` `!player pause` `!player shuffle` `!player move` `!player remove`

Please Note: Previous is only able to play the item prior to the one playing.

##### Requests

All users are able to add requests (If they are logged in) using the `!add` or `!request add` command. They are also able to pull the current list of requests and their status with the `!requests` or `!request list` commands

Examples of add: `!request add Avengers` `!add lethal weapon` `!add the incredibles` `!add imdb:tt0095016` `!add tvdb:76290`


###### Administration

Approving a request with `!approve` or `!request approve`

Example: `!approve 5bdb4e876b91bb00114ba05a`

You may with to enable some users requests to be auto approved, you can do this by running `!request addautoapprove <username> <type>`

You may also want to allow other users to approve requests on your behalf, you can do this by running `!request addapprover <username> <type>` this wll allow them to use the `!approve` command

Please note: username is Plex username, type is out of options: `all, tv, movie, music`. Removing can be done with `!request delautoapprove <username>` and `!request delapprover <username>` respectively.

##### Rules

These are an admin only set of commands. Which is under construction.


##### TV Show/Movie/Artist Search

Can pull information about an item of media. It pulls information from thetvdb, omdb and musicbrainz respectively.

Examples of the command:
`!search movie avengers`
`!search show 24`
`!search artist linkin park`

##### Playback History

Under construction.

##### Currently Playing

Is a command usable by everyone, however user accounts will receive limited information (except in the situation of the user is them). Where as the admin will not. This can be used by the `!np` and `!stats nowplaying` command.

 ### Self-Hosted

Please check back later for further information there.

 ## Support

 If you are having issues with the bot, the first place we would recommend checking is the [MediaButler Discord Server](https://discord.gg/nH9t5sm).

