export interface CameraOptions {
  quality?: number;
  allowEditing?: boolean;
}

export interface Photo {
  dataUrl?: string;
  format: string;
  saved: boolean;
}

async function fileToDataUrl(file: File, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', quality / 100);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function takePicture(options: CameraOptions = {}): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      try {
        const dataUrl = await fileToDataUrl(file, options.quality || 90);
        resolve({
          dataUrl,
          format: 'jpeg',
          saved: false,
        });
      } catch (error) {
        reject(error);
      }
    };

    input.click();
  });
}

export async function selectFromGallery(options: CameraOptions = {}): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      try {
        const dataUrl = await fileToDataUrl(file, options.quality || 90);
        resolve({
          dataUrl,
          format: 'jpeg',
          saved: false,
        });
      } catch (error) {
        reject(error);
      }
    };

    input.click();
  });
}

export async function checkCameraPermissions() {
  return { camera: 'granted', photos: 'granted' };
}

export async function requestCameraPermissions() {
  return { camera: 'granted', photos: 'granted' };
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}
