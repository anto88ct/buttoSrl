#!/usr/bin/env bash
# Serves dist/ with Apache and PHP in a local container and checks .htaccess and the contact form.
# Run `npm run build` first. Mail is captured in the container and never sent.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f dist/api/contact.php ] || { echo "Run 'npm run build' first." >&2; exit 1; }
engine="$(command -v podman || command -v docker)"
image="docker.io/library/php:8.5.13-apache"
name="butto-hosting-test-$$"
trap '"$engine" rm -f "$name" >/dev/null 2>&1 || true' EXIT

"$engine" run -d --name "$name" --security-opt label=disable \
  -p 127.0.0.1:8480:80 -p 127.0.0.1:8443:443 -v "$PWD/dist":/var/www/html:ro "$image" bash -c '
    set -e
    openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=buttocarmelo.it -keyout /tmp/key.pem -out /tmp/cert.pem 2>/dev/null
    cat > /etc/apache2/sites-enabled/ssl.conf <<CONF
<VirtualHost *:443>
  DocumentRoot /var/www/html
  SSLEngine on
  SSLCertificateFile /tmp/cert.pem
  SSLCertificateKeyFile /tmp/key.pem
</VirtualHost>
CONF
    printf "<Directory /var/www/html>\nAllowOverride All\n</Directory>\n" > /etc/apache2/conf-enabled/override.conf
    echo "sendmail_path = \"tee -a /tmp/mail.eml >/dev/null\"" > /usr/local/etc/php/conf.d/mail.ini
    chown www-data /var/www
    a2enmod -q rewrite headers ssl >/dev/null
    exec apache2-foreground' >/dev/null

tls=(--insecure --resolve buttocarmelo.it:8443:127.0.0.1)
base="https://buttocarmelo.it:8443"
for _ in $(seq 1 60); do
  curl -s -o /dev/null "${tls[@]}" "$base/" && break
  read -r -t 0.5 <> <(:) || true
done

failures=0
check() { # description, expected, actual
  if [ "$2" = "$3" ]; then echo "ok   $1"; else echo "FAIL $1: expected '$2', got '$3'"; failures=$((failures + 1)); fi
}
get() { curl -s -o /dev/null "${tls[@]}" -w '%{http_code} %{redirect_url}' "$base$1" | sed 's/ $//'; }
plain() { curl -s -o /dev/null -H "Host: $1" -w '%{http_code} %{redirect_url}' "http://127.0.0.1:8480$2"; }
post() { # body, extra curl arguments...
  local body="$1"; shift
  curl -s -o /dev/null "${tls[@]}" -w '%{http_code}' -H 'Content-Type: application/json' \
    -H 'Origin: https://buttocarmelo.it' "$@" --data-binary "$body" "$base/api/contact.php"
}

check "HTTP redirects to HTTPS" "301 https://buttocarmelo.it/servizi" "$(plain buttocarmelo.it /servizi)"
check "www redirects to apex" "301 https://buttocarmelo.it/" "$(plain www.buttocarmelo.it /)"
check "foreign Host cannot steer the redirect" "301 https://buttocarmelo.it/" "$(plain evil.example /)"
check "home" "200" "$(get /)"
check "page without slash" "200" "$(get /servizi)"
check "trailing slash redirects" "301 $base/servizi" "$(get /servizi/)"
check "no open redirect" "301 $base/evil.example" "$(get //evil.example/)"
check "missing page" "404" "$(get /nonesiste)"
check "hidden files blocked" "403" "$(get /.htaccess)"
check "no directory listing" "403" "$(get /_astro)"
check "sitemap" "200" "$(get /sitemap-index.xml)"
for file in llms.txt llms-full.txt robots.txt; do
  check "$file served as UTF-8 text" "1" "$(curl -sI "${tls[@]}" "$base/$file" | grep -ci '^content-type: text/plain; *charset=utf-8')"
done

headers="$(curl -sI "${tls[@]}" "$base/")"
for header in strict-transport-security content-security-policy x-content-type-options x-frame-options referrer-policy permissions-policy; do
  check "header $header" "1" "$(grep -ci "^$header:" <<<"$headers")"
done
asset="$(cd dist && find _astro -type f | head -n 1)"
check "hashed assets are immutable" "1" "$(curl -sI "${tls[@]}" "$base/$asset" | grep -ci 'immutable')"

valid='{"name":"Mario <b>","email":"mario@example.com","subject":"Preventivo","message":"Ciao <script>x</script>","privacy":true}'
check "GET refused" "405" "$(get /api/contact.php | cut -d' ' -f1)"
check "foreign origin refused" "403" "$(post "$valid" -H 'Origin: https://spam.example')"
check "non JSON refused" "415" "$(post spam -H 'Content-Type: text/plain')"
check "invalid JSON refused" "400" "$(post '{')"
check "oversized body refused" "413" "$(post "{\"message\":\"$(printf 'x%.0s' $(seq 1 17000))\"}")"
check "header injection in subject refused" "400" "$(post '{"name":"a","email":"a@example.com","subject":"x\r\nBcc: v@example.com","message":"m","privacy":true}')"
check "header injection in email refused" "400" "$(post '{"name":"a","email":"a@example.com\r\nBcc:v@example.com","message":"m","privacy":true}')"
check "second recipient refused" "400" "$(post '{"name":"a","email":"a@example.com,v@example.com","message":"m","privacy":true}')"
check "missing consent refused" "400" "$(post '{"name":"a","email":"a@example.com","message":"m"}')"
check "honeypot accepted silently" "200" "$(post '{"website":"spam"}')"
check "nothing sent so far" "no" "$("$engine" exec "$name" sh -c 'test -s /tmp/mail.eml && echo yes || echo no')"
check "valid message sent" "200" "$(post "$valid")"
mail="$("$engine" exec "$name" cat /tmp/mail.eml | tr -d '\r')"
check "recipient" "1" "$(grep -c '^To: servizi.butto@gmail.com$' <<<"$mail")"
check "reply-to" "1" "$(grep -c '^Reply-To: mario@example.com$' <<<"$mail")"
decoded="$(sed '1,/^$/d' <<<"$mail" | base64 -d)"
check "HTML in input is escaped" "0" "$(grep -c '<script>' <<<"$decoded" || true)"
check "rate limit file is private" "404" "$(get /contact-data/ratelimit.json | cut -d' ' -f1)"
for _ in 2 3 4 5; do post "$valid" >/dev/null; done
check "rate limit" "429" "$(post "$valid")"

if [ "$failures" -gt 0 ]; then
  "$engine" logs "$name" 2>&1 | tail -n 30
  echo "$failures checks failed." >&2
  exit 1
fi
echo "All checks passed."
