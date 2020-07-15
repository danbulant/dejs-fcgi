# Dejs-FCGI

Is a simple wrapper for using `ejs` files in same fashion as PHP - just run this library as a service and setup your webserver to use it.

## Nginx config

*Example nginx config - edit to your needs.*

```nginx
# server block {
    location ~ \.ejs$ {
        fastcgi_split_path_info ^(.+?\.ejs)(/.*)$;
        try_files $fastcgi_script_name =404;

        set $path_info $fastcgi_path_info;
        fastcgi_param PATH_INFO $path_info;

        fastcgi_index index.ejs;
        include fastcgi.conf;

        fastcgi_pass 127.0.0.1:8990;
    }
```
