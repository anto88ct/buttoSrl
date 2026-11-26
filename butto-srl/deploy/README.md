# Pubblicazione di buttocarmelo.it su web hosting OVHcloud

## 1. Versione PHP

Caricare `deploy/ovh/.ovhconfig` nella **cartella principale FTP** (quella che contiene `www`, non dentro `www`).

Verificare la patch effettiva: caricare in `www` un file `versione-x7k2.php` con il solo contenuto `<?php echo PHP_VERSION;`, aprirlo nel browser, poi **cancellarlo subito**. Serve almeno `8.5.13` (8.5.12 corregge PHP2Shell, CVE-2026-109618 e CVE-2026-109619; 8.5.13 aggiunge le correzioni del 19 novembre 2026). Se la versione è inferiore, non pubblicare e contattare l'assistenza OVHcloud.

## 2. Dominio, SSL ed email

Nel pannello OVHcloud:

- Web hosting, Multisite: `buttocarmelo.it` e `www.buttocarmelo.it` collegati alla cartella `www`.
- Attivare il certificato SSL. Il sito reindirizza a HTTPS: senza certificato non è raggiungibile correttamente.
- Zona DNS: il record SPF deve autorizzare l'invio OVH, per l'Europa `v=spf1 include:mx.ovh.com ~all`. Deve esistere un solo record SPF.

## 3. Build e caricamento

Rilascio automatico: dal ramo `master`, senza modifiche in sospeso, eseguire `./deploy.sh`. Lo script chiede la password FTP, esegue build e controlli, salva un backup in `../backup-ovh/` (accanto alla cartella del repository), carica solo i file cambiati, chiede conferma prima di cancellare quelli obsoleti e verifica il risultato. Serve Podman o Docker.

Procedura manuale, in alternativa:

```bash
npm ci
npm run build
npm test
npm run audit:seo
```

Caricare via SFTP o FTPS il **contenuto** di `dist/` dentro `www`, compresi i file nascosti (`.htaccess`). Eliminare da `www` i file di benvenuto di OVH.

La cartella `contact-data` viene creata da sola accanto a `www`.

## 4. Controlli dopo la pubblicazione

- `http://www.buttocarmelo.it/servizi/` deve portare a `https://buttocarmelo.it/servizi`.
- Inviare un messaggio dal modulo e controllare l'arrivo in `servizi.butto@gmail.com`, anche nello spam.
- In caso di errori: OVHcloud, scheda "Email scripts".
- Con `astro dev` il modulo non funziona, perché non esegue PHP.
