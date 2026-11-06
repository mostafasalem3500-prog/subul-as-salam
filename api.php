<?php
// =====================================================================
//  وسيط المصادر على استضافة PHP (Hostinger وغيرها)
//  يجلب من المصادر المعتمدة فقط ويخزّن نسخة مؤقتة، ليعمل الموقع حتى لو منع
//  متصفح الزائر الاتصال المباشر (CORS). النص يمرّ كما هو دون أي تعديل.
//  الاستعمال: api.php?u=<رابط API كامل مُرمَّز>
// =====================================================================
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$ALLOWED = [
  'https://api3.islamhouse.com/v3/paV29H2gm56kvLPy/',
  'https://quranenc.com/api/v1/',
  'https://hadeethenc.com/api/v1/',
];
$TTL = 60 * 60 * 24 * 3;  // 3 أيام

$u = isset($_GET['u']) ? (string)$_GET['u'] : '';
$ok = false;
foreach ($ALLOWED as $p) { if (strncmp($u, $p, strlen($p)) === 0) { $ok = true; break; } }
if (!$ok || strlen($u) > 600 || preg_match('/[\s<>"\\\\]|\.\./', $u)) {
  http_response_code(400); echo '{"error":"source not allowed"}'; exit;
}

$dir = __DIR__ . '/cache';
if (!is_dir($dir)) { @mkdir($dir, 0755, true); @file_put_contents($dir . '/.htaccess', "Require all denied\n"); }
$file = $dir . '/' . sha1($u) . '.json';

if (is_file($file) && time() - filemtime($file) < $TTL) {
  header('X-Cache: HIT'); header('Cache-Control: public, max-age=3600'); readfile($file); exit;
}

function fetch_src($url) {
  if (function_exists('curl_init')) {
    $c = curl_init($url);
    curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => false, CURLOPT_TIMEOUT => 20,
      CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_USERAGENT => 'SubulAsSalam/1.0 (+islamic education)',
      CURLOPT_HTTPHEADER => ['Accept: application/json']]);
    $body = curl_exec($c); $code = curl_getinfo($c, CURLINFO_HTTP_CODE); curl_close($c);
    return [$code, $body];
  }
  $ctx = stream_context_create(['http' => ['timeout' => 20, 'header' => "Accept: application/json\r\nUser-Agent: SubulAsSalam/1.0\r\n"]]);
  $body = @file_get_contents($url, false, $ctx);
  return [$body === false ? 502 : 200, $body];
}

[$code, $body] = fetch_src($u);
if ($code >= 200 && $code < 300 && $body !== false && json_decode($body) !== null) {
  @file_put_contents($file, $body, LOCK_EX);
  header('X-Cache: MISS'); header('Cache-Control: public, max-age=3600'); echo $body; exit;
}
// المصدر متعطّل: نعيد آخر نسخة مخزّنة إن وُجدت
if (is_file($file)) { header('X-Cache: STALE'); readfile($file); exit; }
http_response_code(502); echo '{"error":"source unavailable"}';
