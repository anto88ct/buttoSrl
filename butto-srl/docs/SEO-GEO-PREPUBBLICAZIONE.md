# Revisione SEO, GEO, prestazioni e bot

Revisione locale del 15 novembre 2026. Dominio già configurato nel progetto: https://buttocarmelo.it. Nessuna pubblicazione effettuata.

## Interventi implementati

- Canonical assoluti senza parametri o frammenti e politica URL senza slash finale (eccetto homepage); sitemap generata alla build, con esclusione API e 404.
- Titolo homepage descrittivo per servizi e territorio; metadati social con nome sito e descrizione immagine; anteprime estese consentite ai motori.
- Dati strutturati LocalBusiness, WebSite, WebPage e breadcrumb collegati con identificatori stabili. P. IVA dai dati aziendali nel repository. Rimosse le coordinate geografiche approssimate, da verificare prima di reinserirle.
- robots.txt lascia accesso ai crawler e alle risorse pubbliche, escludendo /api/. Sono ammessi anche crawler per ricerca LLM e training: non è stata introdotta una politica di divieto training senza una decisione del titolare.
- llms.txt e llms-full.txt contengono dati aziendali, servizi e domande frequenti. Sono file facoltativi, non uno standard universale né una garanzia di citazione o posizionamento. Vanno aggiornati a mano quando cambiano i contenuti del sito.
- I contenuti importanti sono presenti nell’HTML statico; fallback per le animazioni reveal quando JavaScript è disattivato. Accesso a localStorage protetto nel layout.
- Font richiesti direttamente nel documento anziché con @import CSS; preconnect e font-display swap mantenuti.
- Cinque immagini storiche convertite in WebP a massimo 1200 px: 29.240.068 → 263.450 byte (oltre 99% in meno); originali conservati. Sequenza camion caricata vicino alla sezione; video homepage differito e recupero visibilità delle schede in caso di errore/riproduzione negata.
- public/.htaccess: redirect a https://buttocarmelo.it, URL senza slash finale, cache degli asset, header di sicurezza e CSP.
- Modulo (public/api/contact.php): honeypot, verifica Origin quando presente, tipo JSON obbligatorio, corpo limitato a 16 KiB, lunghezze limitate, caratteri di controllo esclusi dalle intestazioni e limite di invii.
- Verifiche ripetibili: npm run build; npm test (richiede Podman o Docker); npm run audit:seo. L’audit legge dist.

## Da completare prima del lancio

1. **Hosting:** web hosting OVHcloud con PHP 8.5 aggiornato (vedi deploy/README.md). Verificare l’invio email in produzione.
2. **Dati pubblicati:** confermare ragione sociale, contatti e sede; verificare documenti, categorie Albo, codici CER, certificazioni ISO, date di validità. I numeri ambientali (4.200 t CO₂ e 85% recupero), le qualifiche e i claim richiedono fonti e periodo di riferimento prima del lancio. Non sono stati inventati attestati, recensioni o dati mancanti.
3. **Antibot:** il limite di invii è in public/api/contact.php (vedi ANTIBOT.md).
4. **Dominio:** redirect da www e HTTP a https://buttocarmelo.it in .htaccess; attivare il certificato SSL nel pannello OVHcloud.
5. **Email:** invio con mail() da no-reply@buttocarmelo.it a servizi.butto@gmail.com; verificare SPF e recapito.
6. **Lingue:** l’inglese è attualmente una traduzione JavaScript sullo stesso URL, non una versione SEO inglese autonoma. Non sono stati aggiunti hreflang fittizi. Per SEO internazionale creare percorsi /en/ prerenderizzati con title/description e hreflang reciproci.
7. **Misurazioni reali:** dopo deploy eseguire PageSpeed Insights mobile e desktop su home, servizi e contatti, verificare LCP ≤2,5s, INP ≤200ms e CLS ≤0,1 sul campo. Nessun punteggio Lighthouse o miglioramento dei Core Web Vitals è stato misurato in questa revisione.
8. **Indicizzazione:** verificare proprietà Search Console/Bing Webmaster, inviare sitemap-index.xml, usare Ispezione URL e Rich Results Test, controllare status 404 reale e header di cache/antibot. Non è possibile garantire indicizzazione, ranking o presenza nelle risposte AI.

## Fonti tecniche

- Google: https://developers.google.com/search/docs/appearance/ai-features
- OpenAI: https://developers.openai.com/api/docs/bots
