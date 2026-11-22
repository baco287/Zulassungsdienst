<?php
/**
 * Analytics-Dashboard von KFZ-Zulassungsprofis: https://kfz-zulassungsprofis.de/analytics/
 * Liefert dashboard.html erst nach erfolgreichem Login aus (HTTP-Basic-Auth, siehe
 * api/analytics-lib.php). Die HTML-Datei selbst ist per .htaccess gesperrt.
 */

declare(strict_types=1);

require __DIR__ . '/../api/analytics-lib.php';

kzp_require_auth();
header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/dashboard.html');
