<?php

namespace Infra;

class Env
{
    private static $loaded = false;
    private static $vars = [];

    public static function load($path)
    {
        if (self::$loaded) return;

        if (!file_exists($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (trim($line) === '' || strpos(trim($line), '#') === 0) continue;

            // Ensure the line contains an '=' before processing as a key-value pair
            if (strpos($line, '=') === false) {
                continue;
            }

            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            // Remove wrapping quotes if present
            if (preg_match('/^"(.*)"$/', $value, $m)) $value = $m[1];
            elseif (preg_match("/^'(.*)'$/", $value, $m)) $value = $m[1];

            self::$vars[$name] = $value; // Keep this for internal tracking

            // Populate standard getenv/$_ENV for compatibility
            // The original check `if (!getenv($name))` is removed as per instruction,
            // meaning these will always be set/overwritten.
            $_ENV[$name] = $value;
            putenv("$name=$value");
        }

        self::$loaded = true;
    }

    public static function get($key, $default = null)
    {
        if (array_key_exists($key, self::$vars)) {
            return self::$vars[$key];
        }
        $val = getenv($key);
        return $val !== false ? $val : $default;
    }
}
