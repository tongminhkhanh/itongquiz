import React from 'react';

interface ChoiceIndicatorProps {
    label: string;
    isSelected: boolean;
    colorScheme?: 'orange' | 'indigo';
}

/**
 * ChoiceIndicator: Visual circle label for MCQ and Multiple Select options.
 */
const ChoiceIndicator: React.FC<ChoiceIndicatorProps> = ({ 
    label, 
    isSelected, 
    colorScheme = 'orange' 
}) => {
    const activeClasses = colorScheme === 'orange' 
        ? 'border-orange-500 bg-orange-500 text-white' 
        : 'border-indigo-500 bg-indigo-500 text-white';
    
    const inactiveClasses = 'border-gray-300 text-gray-500 bg-white';

    return (
        <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 transition-colors ${
            isSelected ? activeClasses : inactiveClasses
        }`}>
            {label}
        </span>
    );
};

export default ChoiceIndicator;
