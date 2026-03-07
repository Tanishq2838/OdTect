import { useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, X, ScanLine, Check, Crop as CropIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';
import { Slider } from '@/components/ui/slider';

interface ImageUploaderProps {
  onImageSelect: (image: string | null) => void;
  selectedImage: string | null;
}

export default function ImageUploader({ onImageSelect, selectedImage }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Cropping State
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropConfirm = async () => {
    try {
      if (tempImage && croppedAreaPixels) {
        const croppedImage = await getCroppedImg(tempImage, croppedAreaPixels);
        onImageSelect(croppedImage);
        setTempImage(null); // Exit crop mode
      }
    } catch (e) {
      console.error('Failed to crop image', e);
    }
  };

  const cancelCrop = () => {
    setTempImage(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  /* New Hook for Paste */
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              // Instead of direct select, go to crop mode
              setTempImage(reader.result as string);
            };
            reader.readAsDataURL(file);
            return; // Stop after first image found
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [onImageSelect]);


  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
        const reader = new FileReader();
        reader.onload = () => {
          setTempImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
    []
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          setTempImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
    []
  );

  const clearImage = () => {
    onImageSelect(null);
    setTempImage(null);
  };

  // Render Cropper Mode
  if (tempImage) {
    return (
      <div className="w-full aspect-[4/3] relative rounded-2xl overflow-hidden border border-border/60 shadow-lg bg-black">
        <div className="absolute inset-0 z-10">
          <Cropper
            image={tempImage}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            classes={{ containerClassName: 'rounded-2xl' }}
          />
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-3 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-4">
            <span className="text-white text-xs font-medium w-12">Zoom</span>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(v) => setZoom(v[0])}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="secondary" size="sm" onClick={cancelCrop} className="bg-white/10 hover:bg-white/20 text-white border-0">
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <Button size="sm" onClick={handleCropConfirm} className="bg-primary hover:bg-primary/90 text-white">
              <Check className="w-4 h-4 mr-2" /> Confirm Crop
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {selectedImage ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative group rounded-2xl overflow-hidden border border-border/60 shadow-lg bg-black/5"
          >
            {/* Image Container */}
            <div className="w-full aspect-[4/3] relative bg-stripes">
              <img
                src={selectedImage}
                alt="Clinical preview"
                className="absolute inset-0 w-full h-full object-contain p-2 z-10"
              />

              {/* Scanning Effect Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-20 pointer-events-none overflow-hidden"
              >
                <div className="absolute top-3 left-3 bg-black/50 backdrop-blur px-2 py-1 rounded text-[10px] text-white flex items-center gap-1 border border-white/10">
                  <CropIcon className="w-3 h-3" /> Region Selected
                </div>

                <motion.div
                  className="w-full h-[2px] bg-primary shadow-[0_0_20px_2px_rgba(37,99,235,0.6)]"
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-0 bg-primary/5"
                  animate={{ opacity: [0, 0.1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </motion.div>
            </div>

            {/* Top Controls */}
            <div className="absolute top-3 right-3 z-30 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 rounded-full shadow-lg bg-black/50 hover:bg-destructive text-white backdrop-blur-md border border-white/10"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Status Bar */}
            <div className="absolute bottom-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-md p-3 border-t border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-green-500/10 p-1.5 rounded-lg border border-green-500/20">
                  <ScanLine className="w-3.5 h-3.5 text-green-600" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-foreground block">Ready for analysis</span>
                  <span className="text-[10px] text-muted-foreground block">Image cropped & optimized</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={clearImage} className="h-7 text-xs hover:bg-destructive/10 hover:text-destructive">
                Remove
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="uploader"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <label
              className={`relative flex flex-col items-center justify-center w-full aspect-[4/3] rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden group ${isDragging
                ? 'border-primary bg-primary/5 scale-[1.02] shadow-xl shadow-primary/10'
                : 'border-border/60 bg-secondary/30 hover:border-primary/50 hover:bg-white/50'
                }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {/* Background Pattern */}
              <div className={`absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMCwgMCwgMCwgMC4wNSkiLz48L3N2Zz4=')] opacity-50`} />

              <input
                id="file-input"
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleFileSelect}
              />

              <motion.div
                className="relative z-10 flex flex-col items-center gap-4 p-6 text-center"
                animate={{ y: isDragging ? -5 : 0 }}
              >
                <div className={`p-5 rounded-2xl transition-all duration-300 shadow-sm ${isDragging
                  ? 'bg-primary text-primary-foreground scale-110 rotate-3'
                  : 'bg-white text-muted-foreground group-hover:text-primary group-hover:scale-105 group-hover:-rotate-3'
                  }`}>
                  <UploadCloud className="h-10 w-10" />
                </div>

                <div className="space-y-2">
                  <p className="text-lg font-bold text-foreground">
                    {isDragging ? 'Drop it like it\'s hot!' : 'Click to Upload'}
                  </p>
                  <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">
                    Select an image to analyze. You will be able to crop the region of interest.
                  </p>
                </div>

                <div className="flex gap-2 mt-2">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 bg-background/50 px-2 py-1 rounded border border-border/50">JPG</div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 bg-background/50 px-2 py-1 rounded border border-border/50">PNG</div>
                </div>
              </motion.div>

              {/* Pulsing Border Effect when NOT dragging but hovering */}
              <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/20 rounded-2xl transition-colors pointer-events-none" />
            </label>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
