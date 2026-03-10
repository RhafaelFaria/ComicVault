'use client';

import { useState, useEffect } from 'react';
import { getComics, getComic, deleteComic, saveComic, Comic } from '@/lib/db';
import { extractCoverImage } from '@/lib/comic-utils';
import { Plus, Trash2, BookOpen, Edit2, Search, Heart, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import ComicFormDialog from './ComicFormDialog';

interface ComicLibraryProps {
  onSelectComic: (id: string) => void;
}

export default function ComicLibrary({ onSelectComic }: ComicLibraryProps) {
  const [comics, setComics] = useState<Omit<Comic, 'fileBuffer'>[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'favorites' | 'unread'>('all');
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

  const handleToggleFavorite = async (e: React.MouseEvent, comicId: string) => {
    e.stopPropagation();
    const fullComic = await getComic(comicId);
    if (fullComic) {
      fullComic.isFavorite = !fullComic.isFavorite;
      await saveComic(fullComic);
      await loadComics();
    }
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
        collectionName: formData.collectionName,
        coverDataUrl: formData.coverUrl || fullComic.coverDataUrl,
      };
      await saveComic(updatedComic);
    } else {
      if (!formData.files || formData.files.length === 0) throw new Error("Ficheiros ausentes");

      // Loop para processar VÁRIOS ficheiros ao mesmo tempo
      for (const file of formData.files) {
        const buffer = await file.arrayBuffer();
        
        let finalCoverUrl = formData.coverUrl;
        if (!finalCoverUrl) {
           const extractedUrl = await extractCoverImage(buffer);
           if (extractedUrl) finalCoverUrl = extractedUrl;
           else finalCoverUrl = ''; 
        }

        // Tentar adivinhar o número da edição a partir do nome do ficheiro (ex: The_Boys_05 -> 05)
        const match = file.name.match(/(\d+)/);
        const autoIssue = match ? match[0] : '';
        const autoTitle = file.name.replace(/\.(cbz|zip)$/i, '');

        const newComic: Comic = {
          id: crypto.randomUUID(),
          title: autoTitle,
          issue: autoIssue,
          publisher: formData.publisher,
          collectionName: formData.collectionName,
          coverDataUrl: finalCoverUrl,
          fileBuffer: buffer,
          addedAt: Date.now(),
          currentPage: 0,
          isFavorite: false,
          isRead: false,
        };
        await saveComic(newComic);
      }
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

  const filteredComics = comics.filter((comic) => {
    if (filterMode === 'favorites' && !comic.isFavorite) return false;
    if (filterMode === 'unread' && comic.isRead) return false;

    const searchLower = searchQuery.toLowerCase();
    const titleMatch = comic.title.toLowerCase().includes(searchLower);
    const publisherMatch = comic.publisher?.toLowerCase().includes(searchLower) || false;
    const collectionMatch = comic.collectionName?.toLowerCase().includes(searchLower) || false;
    
    return titleMatch || publisherMatch || collectionMatch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-indigo-600" />
          A Minha Estante
        </h1>
        
        <div className="flex w-full sm:w-auto items-center gap-4">
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Pesquisar títulos ou coleções..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
          <button
            onClick={handleOpenAddDialog}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Adicionar Ficheiros</span>
          </button>
        </div>
      </div>

      {comics.length > 0 && (
        <div className="flex gap-2 mb-8 border-b border-gray-200 pb-2 overflow-x-auto">
          <button onClick={() => setFilterMode('all')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filterMode === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>Toda a Coleção</button>
          <button onClick={() => setFilterMode('favorites')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${filterMode === 'favorites' ? 'bg-rose-100 text-rose-700' : 'text-gray-500 hover:bg-gray-100'}`}><Heart className="w-4 h-4" /> Favoritos</button>
          <button onClick={() => setFilterMode('unread')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filterMode === 'unread' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>Não Lidos</button>
        </div>
      )}

      {comics.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">A sua biblioteca está vazia</h2>
          <p className="text-gray-500 mb-6">Adicione ficheiros .cbz ou .zip para começar a ler.</p>
          <button onClick={handleOpenAddDialog} className="text-indigo-600 font-medium hover:text-indigo-700">Adicionar agora</button>
        </div>
      ) : filteredComics.length === 0 ? (
         <div className="text-center py-20">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900">Nenhum resultado encontrado</h2>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {filteredComics.map((comic) => (
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
                
                <div className="absolute top-2 left-2 flex flex-col gap-2">
                  {comic.isRead && <div className="bg-green-500 text-white p-1 rounded-full shadow-md" title="Lido"><CheckCircle2 className="w-4 h-4" /></div>}
                  <button onClick={(e) => handleToggleFavorite(e, comic.id)} className={`p-1.5 rounded-full shadow-md transition-colors ${comic.isFavorite ? 'bg-rose-500 text-white' : 'bg-white/80 text-gray-400 hover:text-rose-500'}`}>
                    <Heart className="w-4 h-4" fill={comic.isFavorite ? "currentColor" : "none"} />
                  </button>
                </div>

                {comic.totalPages && comic.totalPages > 0 && !comic.isRead && (
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40">
                    <div className="h-full bg-indigo-500" style={{ width: `${((comic.currentPage || 0) / (comic.totalPages - 1)) * 100}%` }} />
                  </div>
                )}

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-start justify-end p-2 gap-2 opacity-0 group-hover:opacity-100">
                   <button onClick={(e) => handleOpenEditDialog(e, comic)} className="p-2 bg-white/90 text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors" title="Editar">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => handleDelete(e, comic.id)} className="p-2 bg-white/90 text-red-600 rounded-full hover:bg-red-50 transition-colors" title="Apagar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3">
                {/* Exibe a Coleção acima do título, se existir */}
                {comic.collectionName && (
                  <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block mb-1 truncate">
                    {comic.collectionName}
                  </span>
                )}
                <h3 className="text-sm font-medium text-gray-900 line-clamp-1 leading-tight" title={comic.title}>{comic.title}</h3>
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

      <ComicFormDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} onSave={handleSaveComic} initialData={editingComic} />
    </div>
  );
}