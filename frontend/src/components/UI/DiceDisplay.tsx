import React, { useEffect, useState } from 'react';

interface DiceProps {
    value: number | null;
    rolling: boolean;
}

export const DiceDisplay: React.FC<DiceProps> = ({ value, rolling }) => {
    const [randomValue, setRandomValue] = useState(1);
    const [position, setPosition] = useState<'center' | 'top-right'>('center');

    useEffect(() => {
        if (rolling) {
            // Reset position. timeout 0 avoids "synchronous" warning
            setTimeout(() => setPosition('center'), 0);
             
            const interval = setInterval(() => {
                setRandomValue(Math.floor(Math.random() * 11) + 2);
            }, 100);
            return () => clearInterval(interval);
        } else if (value !== null) {
            // After rolling stops and we have a value, wait 3 seconds then move
            const timer = setTimeout(() => {
                setPosition('top-right');
            }, 3000); 
            return () => clearTimeout(timer);
        }
    }, [rolling, value]);

    if (!value && !rolling) return null;

    const positionClasses = position === 'center' 
        ? 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' 
        : 'top-4 right-4 transform translate-x-0 translate-y-0 scale-75'; 

    return (
        <div className={`absolute ${positionClasses} z-50 flex gap-4 pointer-events-none transition-all duration-1000 ease-in-out ${!rolling && !value ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`w-24 h-24 bg-white rounded-xl shadow-2xl flex items-center justify-center border-4 border-indigo-600 ${rolling ? 'animate-bounce' : ''}`}>
                <span className={`text-6xl font-black ${rolling ? 'text-gray-400' : 'text-indigo-600'}`}>
                    {rolling ? randomValue : value}
                </span>
            </div>
        </div>
    );
};
