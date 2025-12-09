<?php

namespace Game;

class WeatherEffects
{
    public static function calculateBuffs($weatherData)
    {
        $buffs = [];
        $condition = $weatherData['weather'][0]['main'] ?? 'Clear';
        $temp = $weatherData['main']['temp'] ?? 20;

        // Default logic based on prompt
        switch ($condition) {
            case 'Rain':
            case 'Drizzle':
            case 'Thunderstorm':
                $buffs[] = [
                    'type' => 'production_bonus',
                    'target' => 'wood',
                    'amount' => 1,
                    'reason' => 'Rain: Forest growth +1'
                ];
                $buffs[] = [
                    'type' => 'movement_cost',
                    'target' => 'road',
                    'amount' => 1,
                    'reason' => 'Rain: Muddy roads'
                ];
                break;

            case 'Clear':
            case 'Sun':
                $buffs[] = [
                    'type' => 'production_bonus',
                    'target' => 'wheat',
                    'amount' => 1,
                    'reason' => 'Sunny: Bumper harvest +1'
                ];
                break;

            case 'Snow':
                $buffs[] = [
                    'type' => 'production_penalty',
                    'target' => 'sheep',
                    'amount' => -1,
                    'reason' => 'Snow: Livestock struggling -1'
                ];
                break;
        }

        // Season logic? (Requires history, handled separately maybe, or passed in here)

        return [
            'condition' => $condition,
            'temp' => $temp,
            'buffs' => $buffs
        ];
    }
}
