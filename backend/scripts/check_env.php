<?php
require_once __DIR__ . '/../src/bootstrap.php';

use Infra\Env;

header('Content-Type: text/plain');

$key = Env::get('WEATHER_API_KEY');
echo "API Key: [" . $key . "]\n";
echo "City: [" . Env::get('WEATHER_CITY') . "]\n";

if (empty($key)) {
    echo "Key is empty. Using Mock Data.\n";
} else {
    echo "Key is present.\n";
}
