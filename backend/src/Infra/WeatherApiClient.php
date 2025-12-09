<?php

namespace Infra;

class WeatherApiClient
{
    private $apiKey;
    private $city;

    public function __construct()
    {
        $this->apiKey = Env::get('WEATHER_API_KEY');
        $this->city = Env::get('WEATHER_CITY', 'Tokyo,JP');
    }

    public function fetchCurrentWeather()
    {
        if (empty($this->apiKey)) {
            // Mock data if no key present
            return [
                'main' => ['temp' => 20.0, 'humidity' => 50],
                'weather' => [['main' => 'Clear', 'description' => 'clear sky']]
            ];
        }

        $url = "https://api.openweathermap.org/data/2.5/weather?q={$this->city}&units=metric&appid={$this->apiKey}";

        // Use cURL for better error handling and SSL control
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        // Disable SSL verify for local dev environments (fix for common XAMPP issue)
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);

        if (curl_errno($ch)) {
            error_log("WeatherApi Curl Error: " . curl_error($ch));
            return null;
        }

        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($httpCode !== 200) {
            error_log("WeatherApi HTTP Error: $httpCode. Response: $response");
            return null;
        }

        return json_decode($response, true);
    }
}
