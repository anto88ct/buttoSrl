#!/usr/bin/env bash
# Publishes buttocarmelo.it to OVHcloud web hosting over SFTP.
# Builds and tests the site, backs up www, uploads only changed files and verifies the result.
# The FTP password is asked by ssh and is never stored.
set -euo pipefail

HOST="buttocm@ftp.cluster129.hosting.ovh.net"
SITE="https://buttocarmelo.it"
BRANCH="master"

cd "$(dirname "$(readlink -f "$0")")"
export PATH="$HOME/.local/bin:$PATH"

work="$(mktemp -d)"
socket="${XDG_RUNTIME_DIR:-$work}/butto-deploy-$$.sock"
uploading=0

finish() {
  status=$?
  [ -S "$socket" ] && ssh -S "$socket" -O exit "$HOST" >/dev/null 2>&1
  rm -rf "$work"
  echo
  if [ "$status" -eq 0 ]; then
    echo "FINE: nessun errore."
  elif [ "$uploading" -eq 1 ]; then
    echo "ERRORE durante o dopo il caricamento: il sito potrebbe essere aggiornato solo in parte."
    echo "Rilancia lo script. Il backup è in: ${backup:-}"
  else
    echo "ERRORE: il sito online non è stato modificato."
  fi
  # Keeps the window open when started from the launcher.
  [ -t 0 ] && read -r -p "Premi Invio per chiudere. " _
  exit "$status"
}
trap finish EXIT

step() { printf '\n== %s\n' "$1"; }
die() { echo "$1" >&2; exit 1; }
remote() { sftp -q -o ControlPath="$socket" -b "$1" "$HOST" >"$work/sftp.log" 2>&1 || { tail -n 20 "$work/sftp.log" >&2; return 1; }; }

step "Controllo del repository"
current="$(git branch --show-current)"
[ "$current" = "$BRANCH" ] || die "Sei sul ramo '$current'. Passa a '$BRANCH'."
changes="$(git status --porcelain -- . ':(exclude)dist')"
[ -z "$changes" ] || die "Ci sono modifiche senza commit:
$changes"

step "Installazione, build e controlli"
npm ci
npm run build
npm test
npm run audit:seo

[ -f dist/index.html ] || die "dist/index.html non esiste."
odd="$(find dist -name '*[][*?"\\]*')"
[ -z "$odd" ] || die "Nomi di file non supportati da sftp:
$odd"

step "Connessione a OVH (password FTP)"
ssh -M -S "$socket" -fN "$HOST"

step "Backup del sito online"
backup="$(dirname "$(git rev-parse --show-toplevel)")/backup-ovh/$(date +%Y-%m-%d_%H-%M-%S)"
mkdir -p "$backup"
printf 'get -r www "%s/"\nget .ovhconfig "%s/ovhconfig"\n' "$backup" "$backup" >"$work/backup.sftp"
remote "$work/backup.sftp"
[ -d "$backup/www" ] || die "Backup non riuscito."
echo "$backup"

step "Confronto"
old="$backup/www"
: >"$work/static"; : >"$work/php"; : >"$work/html"; : >"$work/htaccess"
while IFS= read -r -d '' file; do
  cmp -s "dist/$file" "$old/$file" && continue
  case "$file" in
    .htaccess) list=htaccess ;;
    *.html) list=html ;;
    *.php) list=php ;;
    *) list=static ;;
  esac
  echo "put \"dist/$file\" \"www/$file\"" >>"$work/$list"
done < <(cd dist && find . -type f -printf '%P\0' | sort -z)

: >"$work/mkdir"
while IFS= read -r dir; do
  [ -d "$old/$dir" ] || echo "mkdir \"www/$dir\"" >>"$work/mkdir"
done < <(cd dist && find . -mindepth 1 -type d -printf '%P\n' | sort)

# Upload order: assets first, then the pages that reference them.
cat "$work/mkdir" "$work/static" "$work/php" "$work/html" "$work/htaccess" >"$work/upload.sftp"
cmp -s deploy/ovh/.ovhconfig "$backup/ovhconfig" || echo 'put deploy/ovh/.ovhconfig .ovhconfig' >>"$work/upload.sftp"

count="$(grep -c '^put ' "$work/upload.sftp" || true)"
if [ "$count" -eq 0 ]; then
  echo "Nessun file da caricare."
else
  step "Caricamento di $count file"
  sed -n 's/^put "dist\/\([^"]*\)".*/  \1/p; s/^put deploy.*/  .ovhconfig/p' "$work/upload.sftp"
  uploading=1
  remote "$work/upload.sftp"
fi

step "File online che non esistono più nella nuova versione"
stale=()
while IFS= read -r -d '' file; do
  [ -e "dist/$file" ] || stale+=("$file")
done < <(cd "$old" && find . -type f ! -path './.well-known/*' -printf '%P\0' | sort -z)
if [ "${#stale[@]}" -eq 0 ]; then
  echo "Nessuno."
else
  printf '  %s\n' "${stale[@]}"
  answer=""
  read -r -p "Cancellarli dal server? Una copia è nel backup. [s/N] " answer || true
  if [[ "$answer" =~ ^[sS]$ ]]; then
    uploading=1
    {
      for file in "${stale[@]}"; do
        [[ "$file" == *[][*?\"\\]* ]] && { echo "Salto (cancella a mano): $file" >&2; continue; }
        echo "rm \"www/$file\""
      done
      while IFS= read -r dir; do
        [ -d "dist/$dir" ] || echo "-rmdir \"www/$dir\""
      done < <(cd "$old" && find . -mindepth 1 -depth -type d ! -path './.well-known*' -printf '%P\n')
    } >"$work/delete.sftp"
    remote "$work/delete.sftp"
  else
    echo "Lasciati sul server."
  fi
fi

step "Verifica"
printf 'get -r www "%s/"\n' "$work" >"$work/verify.sftp"
remote "$work/verify.sftp"
bad=0
while IFS= read -r -d '' file; do
  cmp -s "dist/$file" "$work/www/$file" || { echo "Diverso sul server: $file"; bad=1; }
done < <(cd dist && find . -type f -printf '%P\0')
for page in / /servizi /chi-siamo /certificazioni /sostenibilita /contatti /privacy /cookie; do
  code="$(curl -s -m 30 -o /dev/null -w '%{http_code}' "$SITE$page" || true)"
  echo "  $page $code"
  [ "$code" = 200 ] || bad=1
done
[ "$bad" -eq 0 ] || die "Verifica fallita."
uploading=0
echo "Sito pubblicato e verificato: $SITE"

[ -z "$(git status --porcelain -- dist)" ] || echo "Nota: la build ha modificato dist/. Puoi fare commit."
