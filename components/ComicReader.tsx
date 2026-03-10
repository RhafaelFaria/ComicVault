'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getComic, saveComic } from '@/lib/db';
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

  const urlCache = useRef<Record<number, string>>({});

  useEffect(() => {
    let isMounted = true;
    const loadComic = async () => {
      try {
        const comic = await getComic(comicId);
        if (!comic) {
          alert('Quadrinho não encontrado');
          onClose();
          return;
        }

        const loadedArchive = await openComicArchive(comic.fileBuffer);
        if (isMounted) {
          setArchive(loadedArchive);
          // A Mágica da Memória: carrega a página onde parou
          setCurrentIndex(comic.currentPage || 0);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Falha ao carregar quadrinho:', error);
        alert('Falha ao carregar quadrinho');
        onClose();
      }
    };

    loadComic();
    return () => { isMounted = false; };
  }, [comicId, onClose]);

  // A Mágica de Salvar: Salva o progresso a cada mudança de página (com um pequeno delay para não travar)
  useEffect(() => {
    const saveProgress = async () => {
      if (!archive || !comicId) return;
      try {
        const comic = await getComic(comicId);
        if (comic) {
          comic.currentPage = currentIndex;
          comic.totalPages = archive.files.length;
          // Se chegou à última página, marca como lido!
          if (currentIndex === archive.files.length - 1) {
            comic.isRead = true;
          }
          await saveComic(comic);
        }
      } catch (e) {
        console.error("Erro ao guardar progresso", e);
      }
    };
    
    const timeoutId = setTimeout(saveProgress, 1000);
    return () => clearTimeout(timeoutId);
  }, [currentIndex, archive, comicId]);

  useEffect(() => {
    if (!archive) return;

    let isMounted = true;
    const loadImage = async () => {
      setIsImageLoading(true);
      
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
          console.error('Falha ao carregar imagem:', error);
          if (isMounted) setIsImageLoading(false);
        }
      }

      if (currentIndex < archive.files.length - 1) {
        const nextIndex = currentIndex + 1;
        if (!urlCache.current[nextIndex]) {
          try {
             const url = await getImageUrl(archive.files[nextIndex]);
             urlCache.current[nextIndex] = url;
          } catch (e) {}
        }
      }

      if (currentIndex > 0) {
        const prevIndex = currentIndex - 1;
        if (!urlCache.current[prevIndex]) {
          try {
             const url = await getImageUrl(archive.files[prevIndex]);
             urlCache.current[prevIndex] = url;
          } catch (e) {}
        }
      }

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

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(e.target.value, 10);
    setCurrentIndex(newIndex);
  };

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
        <p className="text-lg font-medium">A abrir quadrinho...</p>
      </div>
    );
  }

  if (!archive) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden select-none">
      
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
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors text-sm font-medium"
              >
                <X className="w-5 h-5" />
                Voltar à Estante
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFitMode(prev => prev === 'height' ? 'width' : 'height')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                title="Ajustar à Tela"
              >
                {fitMode === 'height' ? <Maximize className="w-5 h-5" /> : <Minimize className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              alt={`Página ${currentIndex + 1}`}
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

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent flex flex-col gap-4 z-20"
          >
            <div className="text-center text-white/80 text-sm font-medium">
              Página {currentIndex + 1} de {archive.files.length}
            </div>
            
            <div className="flex items-center gap-4 max-w-2xl mx-auto w-full">
              <button 
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                disabled={currentIndex === 0}
                className="p-2 text-white/70 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <input
                type="range"
                min="0"
                max={archive.files.length - 1}
                value={currentIndex}
                onChange={handleSliderChange}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />

              <button 
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                disabled={currentIndex === archive.files.length - 1}
                className="p-2 text-white/70 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showControls && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
          <div 
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / archive.files.length) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}