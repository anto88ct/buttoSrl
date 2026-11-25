<?php
declare(strict_types=1);

// Contact form endpoint for OVHcloud Web Hosting. Holds no secrets: it sends through mail().
const RECIPIENT = 'servizi.butto@gmail.com';
// The sender domain must be attached to the hosting plan, otherwise OVH rejects the message.
const SENDER = 'no-reply@buttocarmelo.it';
const ALLOWED_ORIGINS = ['https://buttocarmelo.it'];
const MAX_BODY = 16384;
const WINDOW = 3600;
const MAX_PER_IP = 5;
const MAX_TOTAL = 20;

ini_set('display_errors', '0');
header_remove('X-Powered-By');

function respond(int $status, ?string $error = null): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex, nofollow');
    echo json_encode($error === null ? ['ok' => true] : ['ok' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

function field(array $data, string $name): string
{
    return is_string($data[$name] ?? null) ? trim($data[$name]) : '';
}

/** Counts this attempt and returns false when the client or the whole site is over the limit. */
function withinRateLimit(string $client): bool
{
    // Outside the document root, so the file is never reachable over HTTP.
    $dir = dirname(__DIR__, 2) . '/contact-data';
    if (!is_dir($dir) && !@mkdir($dir, 0700) && !is_dir($dir)) {
        throw new RuntimeException('cannot create rate limit directory');
    }
    $handle = @fopen($dir . '/ratelimit.json', 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) {
        throw new RuntimeException('cannot open rate limit file');
    }
    $now = time();
    $log = json_decode((string) stream_get_contents($handle), true);
    $log = array_values(array_filter(
        is_array($log) ? $log : [],
        static fn ($entry): bool => is_array($entry) && $entry[0] > $now - WINDOW
    ));
    $id = hash('sha256', $client);
    $mine = count(array_filter($log, static fn (array $entry): bool => $entry[1] === $id));
    $allowed = $mine < MAX_PER_IP && count($log) < MAX_TOTAL;
    if ($allowed) {
        $log[] = [$now, $id];
    }
    rewind($handle);
    ftruncate($handle, 0);
    fwrite($handle, json_encode($log));
    fclose($handle);
    return $allowed;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, 'Metodo non consentito.');
}
$origin = $_SERVER['HTTP_ORIGIN'] ?? null;
if ($origin !== null && !in_array($origin, ALLOWED_ORIGINS, true)) {
    respond(403, 'Origine non consentita.');
}
// A JSON content type cannot be sent cross-site without a CORS preflight.
$type = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
if ($type !== 'application/json') {
    respond(415, 'Formato non supportato.');
}
$body = file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
if ($body === false) {
    respond(400, 'Richiesta non valida.');
}
if (strlen($body) > MAX_BODY) {
    respond(413, 'Richiesta troppo grande.');
}
$data = json_decode($body, true, 4);
if (!is_array($data)) {
    respond(400, 'Richiesta non valida.');
}
if (field($data, 'website') !== '') {
    respond(200); // honeypot: pretend success, send nothing
}

foreach (['name' => 150, 'email' => 254, 'subject' => 200, 'company' => 200, 'message' => 5000] as $name => $max) {
    $value = field($data, $name);
    $forbidden = $name === 'message' ? '/\x00/' : '/[\x00-\x1F\x7F]/';
    if (mb_strlen($value, 'UTF-8') > $max || preg_match($forbidden, $value)) {
        respond(400, 'Uno o più campi superano i limiti consentiti o contengono caratteri non validi.');
    }
}
$name = field($data, 'name');
$email = field($data, 'email');
$message = field($data, 'message');
$subject = field($data, 'subject') ?: 'Non specificato';
$company = field($data, 'company') ?: 'Non specificata';

if ($name === '') {
    respond(400, 'Il nome è obbligatorio.');
}
// Quotes and separators are refused so the address stays a single Reply-To mailbox.
if (filter_var($email, FILTER_VALIDATE_EMAIL) === false || preg_match('/[\s"<>(),;:\\\\]/', $email)) {
    respond(400, 'Inserisci un indirizzo email valido.');
}
if ($message === '') {
    respond(400, 'Il messaggio è obbligatorio.');
}
if (($data['privacy'] ?? null) !== true) {
    respond(400, 'Devi accettare il trattamento dei dati personali.');
}

$failure = 'Invio non riuscito. Riprova o scrivi a ' . RECIPIENT . ' direttamente.';
try {
    if (!withinRateLimit($_SERVER['REMOTE_ADDR'] ?? 'unknown')) {
        header('Retry-After: ' . WINDOW);
        respond(429, 'Troppi invii. Riprova più tardi o scrivi a ' . RECIPIENT . '.');
    }
} catch (RuntimeException $error) {
    error_log('contact form: ' . $error->getMessage());
    respond(500, $failure);
}

$escape = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$rows = '';
foreach (['Nome' => $name, 'Email' => $email, 'Azienda / Ente' => $company, 'Oggetto' => $subject] as $label => $value) {
    $rows .= '<tr><td style="padding:10px 16px;border-bottom:1px solid #E7E2D8;font-weight:bold;color:#162C1B;white-space:nowrap;">'
        . $escape($label) . '</td><td style="padding:10px 16px;border-bottom:1px solid #E7E2D8;color:#333333;">'
        . $escape($value) . '</td></tr>';
}
$html = '<!doctype html><html lang="it"><body style="margin:0;padding:32px 0;background:#F4F1EA;font-family:Arial,sans-serif;font-size:14px;">'
    . '<table role="presentation" align="center" width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E7E2D8;max-width:600px;width:100%;">'
    . '<tr><td style="background:#162C1B;padding:28px 32px;color:#FFFFFF;font-family:Georgia,serif;font-size:20px;">Nuovo messaggio dal form contatti</td></tr>'
    . '<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' . $rows . '</table></td></tr>'
    . '<tr><td style="padding:20px 32px 28px;line-height:1.6;color:#333333;white-space:pre-wrap;">' . $escape($message) . '</td></tr>'
    . '</table></body></html>';

mb_internal_encoding('UTF-8');
$sent = mail(
    RECIPIENT,
    mb_encode_mimeheader('Nuovo contatto sito — ' . $subject, 'UTF-8', 'B', "\r\n", strlen('Subject: ')),
    chunk_split(base64_encode($html)),
    [
        'From' => 'Sito Butto <' . SENDER . '>',
        'Reply-To' => $email,
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/html; charset=UTF-8',
        'Content-Transfer-Encoding' => 'base64',
    ]
);
if (!$sent) {
    error_log('contact form: mail() failed');
    respond(500, $failure);
}
respond(200);
