export function getLocalDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split('T')[0];
}

export async function getUserIP(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip;
  } catch {
    return 'Unknown';
  }
}

export function generateBookingId(name: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'PAT';
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target!.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const max = 1200;
        if (width > height) {
          if (width > max) { height = Math.round(height * max / width); width = max; }
        } else {
          if (height > max) { width = Math.round(width * max / height); height = max; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.7);
      };
    };
  });
}

export function isSlotDisabled(slotValue: string, selectedDate: string): boolean {
  const today = getLocalDate();
  if (selectedDate !== today) return false;
  const now = new Date();
  const [time, modifier] = slotValue.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (modifier === 'PM' && h !== 12) h += 12;
  if (modifier === 'AM' && h === 12) h = 0;
  return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes() + 15);
}
