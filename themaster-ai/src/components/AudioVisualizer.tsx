
import React from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive }) => {
  if (!isActive) return null;
  return (
    <div className="flex items-end gap-0.5 h-4 mb-2 px-2">
      {[...Array(12)].map((_, i) => (
        <div 
          key={i} 
          className="w-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full animate-visualizer"
          style={{ 
            height: `${Math.random() * 100}%`,
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
  );
};

export default AudioVisualizer;
