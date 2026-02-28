'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { Comic } from '@/lib/db';

interface ComicFormData {
  title: string;
  issue: string;
  publisher: string;
  coverUrl: string;
  file: File | null;
}

interface ComicFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ComicFormData) => Promise<void>;
  initialData?: Omit<Comic, 'fileBuffer'> | null;
}

export default function ComicFormDialog({ isOpen, onClose, onSave, initialData }: ComicFormDialogProps) {
  const [formData, setFormData] = useState<ComicFormData>({
    title: '', issue: '', publisher: '', coverUrl: '', file: null
  });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        issue: initialData.issue || '',
        publisher: initialData.publisher || '',
        coverUrl: initialData.coverDataUrl || '',
        file: null
      });
    } else {
      setFormData({ title: '', issue: '', publisher: '', coverUrl: '', file: null });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialData && !formData.file) {
      alert('Por favor, adicione o ficheiro do quadrinho (.cbz ou .zip).');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {initialData ? 'Editar Quadrinho' : 'Adicionar Quadrinho'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          <form id="comic-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <input 
                type="text" required value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Ex: The Amazing Spider-Man"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Edição</label>
                <input 
                  type="text" value={formData.issue}
                  onChange={(e) => setFormData({...formData, issue: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Ex: 300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Editora</label>
                <input 
                  type="text" value={formData.publisher}
                  onChange={(e) => setFormData({...formData, publisher: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Ex: Marvel"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link da Capa (Opcional)</label>
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <input 
                    type="url" value={formData.coverUrl}
                    onChange={(e) => setFormData({...formData, coverUrl: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="https://..."
                  />
                </div>
                {formData.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={formData.coverUrl} alt="Capa" className="w-10 h-14 object-cover rounded border border-gray-200" onError={(e) => e.currentTarget.src = ''} />
                ) : (
                  <div className="w-10 h-14 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Se vazio, tentaremos extrair do ficheiro.</p>
            </div>

            {!initialData && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ficheiro do Quadrinho</label>
                <input
                  type="file" accept=".cbz,.zip" className="hidden" ref={fileInputRef}
                  onChange={(e) => setFormData({...formData, file: e.target.files?.[0] || null})}
                />
                <button
                  type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600 bg-gray-50 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  {formData.file ? formData.file.name : 'Selecionar ficheiro .cbz ou .zip'}
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors">
            Cancelar
          </button>
          <button type="submit" form="comic-form" disabled={isSaving} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
            {isSaving ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}