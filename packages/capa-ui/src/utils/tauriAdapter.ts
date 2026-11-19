export type ReadTextFileFn = (path: string) => Promise<string>;

export type OnDragDropFn = (
  callback: (paths: string[], x: number) => void
) => Promise<() => void>;

interface TauriAdapter {
  readTextFile: ReadTextFileFn;
  onDragDrop: OnDragDropFn;
}

let adapter: TauriAdapter | null = null;

export function registerTauriAdapter(a: TauriAdapter): void {
  adapter = a;
}

export function getTauriAdapter(): TauriAdapter | null {
  return adapter;
}
