import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

export interface SaveFilter {
  name: string;
  extensions: string[];
}

/**
 * Opens a native save-file dialog, then writes the data to the chosen path.
 * Returns true if saved, false if the user cancelled.
 */
export async function saveWithDialog(
  data: Uint8Array | string,
  defaultName: string,
  filters: SaveFilter[]
): Promise<boolean> {
  const path = await save({ defaultPath: defaultName, filters });
  if (!path) return false;

  const bytes =
    typeof data === 'string'
      ? new TextEncoder().encode(data)
      : data;

  await writeFile(path, bytes);
  return true;
}
