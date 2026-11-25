# Protezione bot (web hosting OVHcloud)

## Limite di invii del modulo

`public/api/contact.php` accetta al massimo 5 invii l'ora per IP e 20 l'ora in totale; l'eccesso riceve 429. I contatori (hash dell'IP e orario) stanno in `contact-data/`, fuori dalla cartella pubblica. Il limite totale protegge la quota di invio, ma un abuso può bloccare temporaneamente anche i visitatori legittimi: in quel caso valutare un captcha.

Controllare in OVHcloud, scheda "Email scripts", lo stato dell'invio e gli errori.

## Crawler

OAI-SearchBot serve la ricerca ChatGPT; GPTBot riguarda il training. La configurazione consegnata permette entrambi. Per escludere il training OpenAI aggiungere a robots.txt, mantenendo il gruppo generico e la sitemap:

```
User-agent: GPTBot
Disallow: /
```
