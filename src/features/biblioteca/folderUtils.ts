import type { LibraryFolder } from './types';

export function buildFolderPath(folders: LibraryFolder[], folderId: string): LibraryFolder[] {
  const map = new Map(folders.map((f) => [f.id, f]));
  const path: LibraryFolder[] = [];
  let cursor: LibraryFolder | undefined = map.get(folderId);
  while (cursor) {
    path.unshift(cursor);
    cursor = cursor.parent_id ? map.get(cursor.parent_id) : undefined;
  }
  return path;
}

export function getRootFoldersByCategory(folders: LibraryFolder[], categoryId: string) {
  return folders.filter((f) => f.category_id === categoryId && !f.parent_id);
}

export function getChildFolders(folders: LibraryFolder[], parentId: string) {
  return folders.filter((f) => f.parent_id === parentId);
}

export function countDescendants(folders: LibraryFolder[], folderId: string): number {
  const children = getChildFolders(folders, folderId);
  return children.reduce((acc, c) => acc + 1 + countDescendants(folders, c.id), 0);
}

/** flat list "Categoria › Pai › Filho" para combobox. */
export function flattenFoldersForSelect(
  folders: LibraryFolder[],
  categoryId: string,
): { value: string; label: string; depth: number }[] {
  const out: { value: string; label: string; depth: number }[] = [];
  const cats = folders.filter((f) => f.category_id === categoryId);
  const roots = cats.filter((f) => !f.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  const walk = (node: LibraryFolder, prefix: string, depth: number) => {
    const label = prefix ? `${prefix} › ${node.name}` : node.name;
    out.push({ value: node.id, label, depth });
    cats
      .filter((f) => f.parent_id === node.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((child) => walk(child, label, depth + 1));
  };
  roots.forEach((r) => walk(r, '', 0));
  return out;
}
