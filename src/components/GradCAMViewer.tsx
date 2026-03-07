import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, ZoomIn, RotateCcw, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface GradCAMViewerProps {
  originalImage: string;
  gradCamImage: string;
}

export default function GradCAMViewer({ originalImage, gradCamImage }: GradCAMViewerProps) {
  const [viewMode, setViewMode] = useState<'original' | 'heatmap' | 'overlay'>('heatmap');
  const [opacity, setOpacity] = useState(0.7);
  const [zoom, setZoom] = useState(false);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          Visual Analysis
        </h3>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => setZoom(!zoom)}
          >
            <ZoomIn className={`h-4 w-4 ${zoom ? 'text-primary' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => {
              setViewMode('heatmap');
              setOpacity(0.7);
              setZoom(false);
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Viewer */}
      <div className={`relative overflow-hidden rounded-2xl border border-border bg-black/5 transition-all duration-500 ${zoom ? 'aspect-square' : 'aspect-[4/3]'}`}>

        {/* Underlying Original Image */}
        <img
          src={originalImage}
          alt="Original"
          className={`absolute inset-0 h-full w-full object-contain transition-transform duration-500 ${zoom ? 'scale-150' : 'scale-100'}`}
        />

        {/* Overlay Layer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: viewMode === 'original' ? 0 : opacity }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 pointer-events-none mix-blend-multiply"
        >
          <img
            src={gradCamImage}
            alt="GradCAM Overlay"
            className={`h-full w-full object-contain transition-transform duration-500 ${zoom ? 'scale-150' : 'scale-100'}`}
          />
        </motion.div>

        {/* Live Legend */}
        {viewMode !== 'original' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-0 right-0 mx-auto w-max max-w-[90%] bg-black/60 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-3 border border-white/10 shadow-lg pointer-events-none"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] sm:text-xs text-white font-medium">Lesion 94%</span>
            </span>
            <div className="h-3 w-px bg-white/20" />
            <span className="text-[10px] sm:text-xs text-white/80">Region of Interest</span>
          </motion.div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-4 justify-between">
        {/* Mode Toggles */}
        <div className="flex p-1 bg-secondary/50 rounded-lg border border-border/50">
          <button
            onClick={() => setViewMode('heatmap')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'heatmap' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Heatmap
          </button>
          <button
            onClick={() => setViewMode('original')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'original' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Original
          </button>
        </div>

        {/* Opacity Slider */}
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto px-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={[opacity]}
            onValueChange={(val) => {
              setOpacity(val[0]);
              if (viewMode === 'original') setViewMode('heatmap');
            }}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
