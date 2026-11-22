<?php
/**
 * KI-Assistent von KFZ-Zulassungsprofis: https://kfz-zulassungsprofis.de/assistent/
 * Liefert die Oberfläche (admin.html) erst nach erfolgreichem Login aus – derselbe Login wie
 * beim Analytics-Dashboard (intern/Admin.php → verlangeLogin). Die HTML-Datei selbst ist per
 * .htaccess gesperrt. Daten holt die Oberfläche danach über daten.php, Aktionen gehen an aktion.php.
 */

declare(strict_types=1);

use KZP\Assistent\Admin;

require __DIR__ . '/intern/start.php';

Admin::verlangeLogin();
Admin::seitenKopf();
readfile(__DIR__ . '/admin.html');
