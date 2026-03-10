import localforage from 'localforage';

export interface Comic {
  id: string;
  title: string;
  issue?: string;
  publisher?: string;
  collectionName?: string; // Novo campo para agrupar as coleções
  coverDataUrl: string;
  fileBuffer: ArrayBuffer;
  addedAt: number;
  currentPage?: number;
  totalPages?: number;
  isFavorite?: boolean;
  isRead?: boolean;
}

const comicsStore = localforage.createInstance({
  name: 'ComicReader',
  storeName: 'comics'
});

export async function saveComic(comic: Comic) {
  await comicsStore.setItem(comic.id, comic);
}

export async function getComics(): Promise<Omit<Comic, 'fileBuffer'>[]> {
  const comics: Omit<Comic, 'fileBuffer'>[] = [];
  await comicsStore.iterate((value: Comic, key, iterationNumber) => {
    comics.push({
      id: value.id,
      title: value.title,
      issue: value.issue,
      publisher: value.publisher,
      collectionName: value.collectionName,
      coverDataUrl: value.coverDataUrl,
      addedAt: value.addedAt,
      currentPage: value.currentPage,
      totalPages: value.totalPages,
      isFavorite: value.isFavorite,
      isRead: value.isRead,
    });
  });
  return comics.sort((a, b) => b.addedAt - a.addedAt);
}

export async function getComic(id: string): Promise<Comic | null> {
  return await comicsStore.getItem<Comic>(id);
}

export async function deleteComic(id: string) {
  await comicsStore.removeItem(id);
}