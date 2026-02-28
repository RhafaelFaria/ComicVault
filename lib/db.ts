import localforage from 'localforage';

export interface Comic {
  id: string;
  title: string;
  coverDataUrl: string;
  fileBuffer: ArrayBuffer;
  addedAt: number;
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
      coverDataUrl: value.coverDataUrl,
      addedAt: value.addedAt,
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
