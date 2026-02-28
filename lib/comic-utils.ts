import JSZip from 'jszip';

export interface ComicArchive {
  zip: JSZip;
  files: JSZip.JSZipObject[];
}

export async function openComicArchive(buffer: ArrayBuffer): Promise<ComicArchive> {
  const zip = await JSZip.loadAsync(buffer);
  const imageFiles = Object.values(zip.files).filter(file => 
    !file.dir && file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)
  );

  // Sort files alphabetically
  imageFiles.sort((a, b) => a.name.localeCompare(b.name));

  return { zip, files: imageFiles };
}

export async function getImageUrl(file: JSZip.JSZipObject): Promise<string> {
  const blob = await file.async('blob');
  return URL.createObjectURL(blob);
}

export async function extractCoverImage(buffer: ArrayBuffer): Promise<string | null> {
  const { files } = await openComicArchive(buffer);
  
  if (files.length === 0) return null;
  
  const coverFile = files[0];
  const blob = await coverFile.async('blob');
  
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
