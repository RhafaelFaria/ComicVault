'use client';

import { useState } from 'react';
import ComicLibrary from '@/components/ComicLibrary';
import ComicReader from '@/components/ComicReader';

export default function Home() {
  const [selectedComicId, setSelectedComicId] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-white">
      {selectedComicId ? (
        <ComicReader 
          comicId={selectedComicId} 
          onClose={() => setSelectedComicId(null)} 
        />
      ) : (
        <ComicLibrary onSelectComic={setSelectedComicId} />
      )}
    </main>
  );
}
