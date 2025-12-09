import React from 'react';
import type { WeatherData } from '../../types/game';

interface WeatherBannerProps {
    weather: WeatherData | null;
}

export const WeatherBanner: React.FC<WeatherBannerProps> = ({ weather }) => {
    if (!weather) {
        return <div className="p-4 bg-gray-200 rounded animate-pulse">Loading Weather...</div>;
    }

    const { condition, temp, buffs } = weather;

    // Dynamic background based on weather
    const bgColors: Record<string, string> = {
        Clear: 'bg-gradient-to-r from-blue-400 to-yellow-300',
        Rain: 'bg-gradient-to-r from-gray-700 to-blue-800',
        Snow: 'bg-gradient-to-r from-blue-100 to-white text-gray-800',
        Clouds: 'bg-gradient-to-r from-gray-400 to-gray-200',
    };

    const bgClass = bgColors[condition] || 'bg-gradient-to-r from-blue-500 to-indigo-600';

    return (
        <div className={`p-4 rounded-lg shadow-lg text-white mb-4 ${bgClass} transition-all duration-1000`}>
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        {condition === 'Rain' && '🌧️'}
                        {condition === 'Clear' && '☀️'}
                        {condition === 'Snow' && '❄️'}
                        {condition}
                        <span className="text-lg font-normal opacity-90">({temp.toFixed(1)}°C)</span>
                    </h2>
                    <p className="text-sm opacity-80">Real-time Weather Effect</p>
                </div>
                
                {/* Active Buffs List */}
                <div className="flex flex-col items-end gap-1">
                    {buffs.map((buff, idx) => (
                        <div key={idx} className="bg-black/30 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                            {buff.reason}
                        </div>
                    ))}
                    {buffs.length === 0 && <span className="opacity-70 text-sm">No special effects</span>}
                </div>
            </div>
        </div>
    );
};
