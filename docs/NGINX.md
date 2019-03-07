# NGINX Reverse Proxy Configuration

We would recommend using MediaButler with a reverse proxy configured to use https to secure all transmissions from the server. This practice generally requires a domain name and a certificate. Both of which you can get for free. [Freenom](https://www.freenom.com) for free domain names and [Letsencrypt](https://letsencrypt.org/) for your certificates. We won't be getting into specifically how to do these methods here other than those links make it completely free and these are 2 examples of how to implement the reverse proxy.


 - Please Note: Once you have completed this task to get clients to use this url, you must then update the URL environment variable on the Server eg. `URL="https://example.com/mediabutler/"` or `URL="https://mediabutler.example.com/"`

 ## SubFolder Method
 
This location block would be placed inside your `server {}` block in your site configuration

```nginx
location /mediabutler/ {
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_http_version 1.1;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;
    proxy_pass http://192.168.1.101:9876/;
    add_header X-Frame-Options SAMEORIGIN;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $remote_addr;
    proxy_set_header X-Forwarded-Protocol $scheme;
    proxy_redirect off;
    proxy_intercept_errors off;
}
```

## SubDomain Method

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name mediabutler.*;

    include /config/nginx/ssl.conf;

    client_max_body_size 0;

    location / {
	    proxy_set_header Upgrade $http_upgrade;
	    proxy_set_header Connection "upgrade";
	    proxy_http_version 1.1;
	    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
	    proxy_set_header Host $host;
	    proxy_pass http://192.168.1.101:9876/;
	    add_header X-Frame-Options SAMEORIGIN;
	    proxy_set_header X-Real-IP $remote_addr;
	    proxy_set_header X-Forwarded-Proto $remote_addr;
	    proxy_set_header X-Forwarded-Protocol $scheme;
	    proxy_redirect off;
	    proxy_intercept_errors off;
    }
}
```
