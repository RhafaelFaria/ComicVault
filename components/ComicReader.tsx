'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getComic } from '@/lib/db';
import { openComicArchive, getImageUrl, ComicArchive } from '@/lib/comic-utils';
import { ChevronLeft, ChevronRight, X, Maximize, Minimize, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ComicReaderProps {
  comicId: string;
  onClose: () => void;
}

export default function ComicReader({ comicId, onClose }: ComicReaderProps) {
  const [archive, setArchive] = useState<ComicArchive | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fitMode, setFitMode] = useState<'height' | 'width'>('height');
  const [showControls, setShowControls] = useState(true);
  
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Cache for object URLs to avoid recreating them
  const urlCache = useRef<Record<number, string>>({});

  useEffect(() => {
    let isMounted = true;
    const loadComic = async () => {
      try {
        const comic = await getComic(comicId);
        if (!comic) {
          alert('Comic not found');
          onClose();
          return;
        }

        const loadedArchive = await openComicArchive(comic.fileBuffer);
        if (isMounted) {
          setArchive(loadedArchive);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load comic:', error);
        alert('Failed to load comic');
        onClose();
      }
    };

    loadComic();
    return () => { isMounted = false; };
  }, [comicId, onClose]);

  useEffect(() => {
    if (!archive) return;

    let isMounted = true;
    const loadImage = async () => {
      setIsImageLoading(true);
      
      // Check cache first
      if (urlCache.current[currentIndex]) {
        setCurrentImageUrl(urlCache.current[currentIndex]);
        setIsImageLoading(false);
      } else {
        try {
          const file = archive.files[currentIndex];
          const url = await getImageUrl(file);
          
          if (isMounted) {
            urlCache.current[currentIndex] = url;
            setCurrentImageUrl(url);
            setIsImageLoading(false);
          }
        } catch (error) {
          console.error('Failed to load image:', error);
          if (isMounted) setIsImageLoading(false);
        }
      }

      // Preload next image
      if (currentIndex < archive.files.length - 1) {
        const nextIndex = currentIndex + 1;
        if (!urlCache.current[nextIndex]) {
          try {
             const url = await getImageUrl(archive.files[nextIndex]);
             urlCache.current[nextIndex] = url;
          } catch (e) {}
        }
      }

      // Preload prev image
      if (currentIndex > 0) {
        const prevIndex = currentIndex - 1;
        if (!urlCache.current[prevIndex]) {
          try {
             const url = await getImageUrl(archive.files[prevIndex]);
             urlCache.current[prevIndex] = url;
          } catch (e) {}
        }
      }

      // Cleanup old cache entries to save memory
      Object.keys(urlCache.current).forEach(key => {
        const idx = parseInt(key);
        if (Math.abs(idx - currentIndex) > 2) {
          URL.revokeObjectURL(urlCache.current[idx]);
          delete urlCache.current[idx];
        }
      });
    };

    loadImage();

    return () => { isMounted = false; };
  }, [archive, currentIndex]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    const cache = urlCache.current;
    return () => {
      Object.values(cache).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handleNext = useCallback(() => {
    if (archive && currentIndex < archive.files.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, archive]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-500" />
        <p className="text-lg font-medium">Opening comic...</p>
      </div>
    );
  }

  if (!archive) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden select-none">
      {/* Top Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center z-20"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <span className="text-white font-medium">
                Page {currentIndex + 1} of {archive.files.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFitMode(prev => prev === 'height' ? 'width' : 'height')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                title="Toggle Fit Mode"
              >
                {fitMode === 'height' ? <Maximize className="w-5 h-5" /> : <Minimize className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Image Area */}
      <div 
        className="flex-1 flex items-center justify-center relative overflow-auto"
        onClick={() => setShowControls(prev => !prev)}
      >
        <div className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-w-resize" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
        <div className="absolute inset-y-0 right-0 w-1/3 z-10 cursor-e-resize" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
        
        {isImageLoading && !currentImageUrl && (
          <div className="absolute inset-0 flex items-center justify-center z-0">
             <Loader2 className="w-8 h-8 animate-spin text-white/50" />
          </div>
        )}

        <AnimatePresence mode="wait">
          {currentImageUrl && (
            <motion.img
              key={currentIndex}
              src={currentImageUrl}
              alt={`Page ${currentIndex + 1}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`
                max-w-none 
                ${fitMode === 'height' ? 'h-full w-auto object-contain' : 'w-full h-auto object-contain'}
              `}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Progress */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
        <div 
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / archive.files.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
