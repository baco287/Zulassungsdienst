<?php
/**
 * SEO Center von KFZ-Zulassungsprofis: https://kfz-zulassungsprofis.de/seo/
 * Liefert center.html erst nach erfolgreichem Login aus (HTTP-Basic-Auth, derselbe Zugang wie
 * das Analytics-Dashboard, siehe api/analytics-lib.php). Die HTML-Datei selbst ist per
 * .htaccess gesperrt. Die Daten kommen aus daten.php im selben Ordner.
 */

declare(strict_types=1);

require __DIR__ . '/../api/analytics-lib.php';

kzp_require_auth();

$oberflaeche = __DIR__ . '/center.html';
if (!is_file($oberflaeche)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Die Oberfläche des SEO Centers (center.html) ist in diesem Stand nicht enthalten.';
    exit;
}
header('Content-Type: text/html; charset=utf-8');
readfile($oberflaeche);
