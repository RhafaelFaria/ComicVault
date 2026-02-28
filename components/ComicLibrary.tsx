'use client';

import { useState, useEffect } from 'react';
import { getComics, getComic, deleteComic, saveComic, Comic } from '@/lib/db';
import { extractCoverImage } from '@/lib/comic-utils';
import { Plus, Trash2, BookOpen, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import ComicFormDialog from './ComicFormDialog';

interface ComicLibraryProps {
  onSelectComic: (id: string) => void;
}

export default function ComicLibrary({ onSelectComic }: ComicLibraryProps) {
  const [comics, setComics] = useState<Omit<Comic, 'fileBuffer'>[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComic, setEditingComic] = useState<Omit<Comic, 'fileBuffer'> | null>(null);

  const loadComics = async () => {
    const loaded = await getComics();
    setComics(loaded);
  };

  useEffect(() => {
    loadComics();
  }, []);

  const handleOpenAddDialog = () => {
    setEditingComic(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (e: React.MouseEvent, comic: Omit<Comic, 'fileBuffer'>) => {
    e.stopPropagation();
    setEditingComic(comic);
    setIsDialogOpen(true);
  };

  const handleSaveComic = async (formData: any) => {
    if (editingComic) {
      const fullComic = await getComic(editingComic.id);
      if (!fullComic) throw new Error("Quadrinho não encontrado");

      const updatedComic: Comic = {
        ...fullComic,
        title: formData.title,
        issue: formData.issue,
        publisher: formData.publisher,
        coverDataUrl: formData.coverUrl || fullComic.coverDataUrl,
      };
      await saveComic(updatedComic);
    } else {
      if (!formData.file) throw new Error("Ficheiro ausente");
      const buffer = await formData.file.arrayBuffer();
      
      let finalCoverUrl = formData.coverUrl;
      if (!finalCoverUrl) {
         const extractedUrl = await extractCoverImage(buffer);
         if (extractedUrl) finalCoverUrl = extractedUrl;
         else finalCoverUrl = ''; 
      }

      const newComic: Comic = {
        id: crypto.randomUUID(),
        title: formData.title,
        issue: formData.issue,
        publisher: formData.publisher,
        coverDataUrl: finalCoverUrl,
        fileBuffer: buffer,
        addedAt: Date.now(),
      };
      await saveComic(newComic);
    }
    await loadComics();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Tem a certeza de que deseja apagar este quadrinho?')) {
      await deleteComic(id);
      await loadComics();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-indigo-600" />
          Os Meus Quadrinhos
        </h1>
        <button
          onClick={handleOpenAddDialog}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Adicionar Quadrinho
        </button>
      </div>

      {comics.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">A sua biblioteca está vazia</h2>
          <p className="text-gray-500 mb-6">Adicione um ficheiro .cbz ou .zip para começar a ler.</p>
          <button
            onClick={handleOpenAddDialog}
            className="text-indigo-600 font-medium hover:text-indigo-700"
          >
            Adicionar agora
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
                  src={comic.coverDataUrl || 'https://via.placeholder.com/300x450?text=Sem+Capa'}
                  alt={comic.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-start justify-end p-2 gap-2 opacity-0 group-hover:opacity-100">
                   <button
                    onClick={(e) => handleOpenEditDialog(e, comic)}
                    className="p-2 bg-white/90 text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, comic.id)}
                    className="p-2 bg-white/90 text-red-600 rounded-full hover:bg-red-50 transition-colors"
                    title="Apagar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-medium text-gray-900 line-clamp-1 leading-tight" title={comic.title}>
                  {comic.title}
                </h3>
                {(comic.issue || comic.publisher) && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                    {comic.issue && `Vol. ${comic.issue}`} {comic.issue && comic.publisher && '•'} {comic.publisher}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ComicFormDialog 
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveComic}
        initialData={editingComic}
      />
    </div>
  );
}