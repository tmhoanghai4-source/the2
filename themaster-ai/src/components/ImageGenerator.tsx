import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Download, RefreshCw, Image as ImageIcon, Wand2 } from 'lucide-react';

interface ImageGeneratorProps {
  prompt: string;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ prompt }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      // In a real scenario, this would call /api/generate-image
      // For now, we simulate the "Nano Banana" process or use a high-quality placeholder
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      
      if (!response.ok) throw new Error('Cổng tri thức Nano Banana đang bận...');
      
      const data = await response.json();
      setImageUrl(data.imageUrl);
    } catch (err: any) {
      setError(err.message);
      // Fallback to picsum for demo if API fails
      setImageUrl(`https://picsum.photos/seed/${encodeURIComponent(prompt)}/1024/1024`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
  }, [prompt]);

  return (
    <div className="my-6 p-1 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-[2.5rem] overflow-hidden shadow-2xl">
      <div className="bg-secondary/95 backdrop-blur-xl p-6 rounded-[2.3rem] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-xl">
              <Wand2 className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tighter text-text-primary">Nano Banana AI</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">Archor Generation Core</p>
            </div>
          </div>
          <button 
            onClick={generate}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 text-text-secondary ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-black/40 group">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4"
              >
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-yellow-500 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-yellow-500">Đang phác thảo...</p>
                  <p className="text-[10px] text-text-secondary max-w-[200px]">{prompt.slice(0, 100)}...</p>
                </div>
              </motion.div>
            ) : imageUrl ? (
              <motion.div 
                key="image"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative h-full"
              >
                <img 
                   src={imageUrl} 
                   alt={prompt} 
                   className="w-full h-full object-cover"
                   referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                   <a 
                     href={imageUrl} 
                     download 
                     className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all"
                   >
                     <Download className="w-4 h-4" /> Tải về
                   </a>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
          <p className="text-[10px] leading-relaxed text-text-secondary/80 italic">
            " {prompt} "
          </p>
        </div>
      </div>
    </div>
  );
};
