/**
 * Shared file validation and DataTransfer extraction utilities for drag-and-drop
 * across CapaDropzone and GlobalFileDropOverlay.
 */

export function isValidCapaFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('.txt') || lower.endsWith('.log') || lower.endsWith('.json');
}

interface FileSystemEntryLike {
  isFile: boolean;
  isDirectory: boolean;
  name?: string;
  file: (success: (f: File) => void, error?: (err: unknown) => void) => void;
  createReader: () => {
    readEntries: (success: (entries: FileSystemEntryLike[]) => void, error?: (err: unknown) => void) => void;
  };
}

async function readAllDirectoryEntries(
  reader: ReturnType<FileSystemEntryLike['createReader']>
): Promise<FileSystemEntryLike[]> {
  const all: FileSystemEntryLike[] = [];
  let chunk: FileSystemEntryLike[];
  do {
    chunk = await new Promise<FileSystemEntryLike[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    all.push(...chunk);
  } while (chunk.length > 0);
  return all;
}

async function scanEntry(entry: FileSystemEntryLike, outFiles: File[]): Promise<void> {
  if (entry.isFile) {
    if (isValidCapaFileName(entry.name ?? '')) {
      const file = await new Promise<File>((resolve, reject) => {
        entry.file(resolve, reject);
      });
      outFiles.push(file);
    }
    return;
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    const entries = await readAllDirectoryEntries(reader);
    for (const child of entries) {
      await scanEntry(child, outFiles);
    }
  }
}

/**
 * Extracts supported CAPA files (.txt, .log, .json) from a browser DataTransfer,
 * supporting dropped directories and WebView2 fallbacks.
 */
export async function extractFilesFromDataTransfer(dataTransfer: DataTransfer | null): Promise<File[]> {
  if (!dataTransfer) return [];
  const items = Array.from(dataTransfer.items ?? []);
  const collected: File[] = [];

  const entries = items
    .map(item => {
      const fn = (item as unknown as { webkitGetAsEntry?: () => unknown }).webkitGetAsEntry;
      return fn ? (fn.call(item) as FileSystemEntryLike | null | undefined) : null;
    })
    .filter((entry): entry is FileSystemEntryLike => Boolean(entry));

  if (entries.length > 0) {
    await Promise.all(entries.map(entry => scanEntry(entry, collected)));
  }

  if (collected.length === 0) {
    for (const file of Array.from(dataTransfer.files ?? [])) {
      if (isValidCapaFileName(file.name)) {
        collected.push(file);
      }
    }
  }

  return collected;
}
