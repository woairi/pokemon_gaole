/** 받침 유무 판별 (한글이 아니면 받침 없음으로 취급) */
const hasBatchim = (word: string): boolean => {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 > 0;
};

export const wa = (w: string) => w + (hasBatchim(w) ? '과' : '와');
export const iGa = (w: string) => w + (hasBatchim(w) ? '이' : '가');
export const eunNeun = (w: string) => w + (hasBatchim(w) ? '은' : '는');
export const eulReul = (w: string) => w + (hasBatchim(w) ? '을' : '를');
