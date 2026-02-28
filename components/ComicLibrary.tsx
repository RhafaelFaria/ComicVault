'use client';

import { useState, useEffect, useRef } from 'react';
import { getComics, deleteComic, saveComic, Comic } from '@/lib/db';
import { extractCoverImage } from '@/lib/comic-utils';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface ComicLibraryProps {
  onSelectComic: (id: string) => void;
}

export default function ComicLibrary({ onSelectComic }: ComicLibraryProps) {
  const [comics, setComics] = useState<Omit<Comic, 'fileBuffer'>[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadComics = async () => {
    const loaded = await getComics();
    setComics(loaded);
  };

  useEffect(() => {
    loadComics();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAdding(true);
    try {
      const buffer = await file.arrayBuffer();
      const coverDataUrl = await extractCoverImage(buffer);
      
      if (!coverDataUrl) {
        alert('No images found in this file.');
        setIsAdding(false);
        return;
      }

      const newComic: Comic = {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.(cbz|zip)$/i, ''),
        coverDataUrl,
        fileBuffer: buffer,
        addedAt: Date.now(),
      };

      await saveComic(newComic);
      await loadComics();
    } catch (error) {
      console.error('Error adding comic:', error);
      alert('Failed to add comic. Ensure it is a valid .cbz or .zip file.');
    } finally {
      setIsAdding(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this comic?')) {
      await deleteComic(id);
      await loadComics();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-indigo-600" />
          My Comics
        </h1>
        <div>
          <input
            type="file"
            accept=".cbz,.zip"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAdding}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {isAdding ? (
              <span className="animate-pulse">Processing...</span>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Add Comic
              </>
            )}
          </button>
        </div>
      </div>

      {comics.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">Your library is empty</h2>
          <p className="text-gray-500 mb-6">Add a .cbz or .zip file to start reading.</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-indigo-600 font-medium hover:text-indigo-700"
          >
            Browse files
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {comics.map((comic) => (
            <motion.div
              key={comic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative cursor-pointer flex flex-col"
              onClick={() => onSelectComic(comic.id)}
            >
              <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 bg-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={comic.coverDataUrl}
                  alt={comic.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                <button
                  onClick={(e) => handleDelete(e, comic.id)}
                  className="absolute top-2 right-2 p-2 bg-white/90 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="mt-3 text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
                {comic.title}
              </h3>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
