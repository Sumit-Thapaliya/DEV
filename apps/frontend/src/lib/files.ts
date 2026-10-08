/** File reading is local UI work, not an API request. */
export function fileAsBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () =>
      reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}
