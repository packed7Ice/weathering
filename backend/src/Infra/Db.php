<?php

namespace Infra;

use PDO;
use PDOException;

class Db
{
    private static $instance = null;
    private $pdo;

    private function __construct()
    {
        $connection = trim(Env::get('DB_CONNECTION', 'sqlite'));

        try {
            if ($connection === 'sqlite') {
                $rawPath = Env::get('DB_DATABASE', __DIR__ . '/../../database.sqlite');
                // Ensure absolute path by joining with __DIR__ if it looks relative and not starting with / or C:
                // But simple way: if it starts with .., prepend project root.
                // Better: just force it to be relative to this file if it starts with ..

                if (strpos($rawPath, '..') === 0) {
                    $path = __DIR__ . '/../../' . basename($rawPath);
                } else {
                    $path = $rawPath;
                }

                // Debug log
                error_log("DB Path resolved to: " . $path);

                if (!file_exists($path)) {
                    $dir = dirname($path);
                    if (!file_exists($dir)) {
                        mkdir($dir, 0777, true);
                    }
                    touch($path);
                }
                $this->pdo = new PDO("sqlite:" . $path);
                $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            } elseif ($connection === 'mysql') {
                $host = Env::get('DB_HOST', '127.0.0.1');
                $port = Env::get('DB_PORT', '3306');
                $db   = Env::get('DB_DATABASE', 'weathering');
                $user = Env::get('DB_USERNAME', 'root');
                $pass = Env::get('DB_PASSWORD', '');

                $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
                $this->pdo = new PDO($dsn, $user, $pass);
                $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            } else {
                throw new PDOException("Unsupported DB Connection: [$connection]");
            }
        } catch (PDOException $e) {
            header('Content-Type: application/json');
            http_response_code(500);
            echo json_encode(['error' => "DB Connection Error (" . $connection . "): " . $e->getMessage()]);
            exit;
        }
    }

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new Db();
        }
        return self::$instance;
    }

    public static function pdo()
    {
        return self::getInstance()->pdo;
    }
}
