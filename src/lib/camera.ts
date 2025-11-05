export async function capturePhoto(_quality?: number): Promise<File | null> {
  return null;
}

export async function selectFromGallery(_quality?: number): Promise<File | null> {
  return null;
}

export async function takePicture(): Promise<{ dataUrl: string } | null> {
  return null;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || '';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
