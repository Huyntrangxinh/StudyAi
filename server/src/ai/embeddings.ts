import OpenAI from 'openai';

const EMB_MODEL = 'text-embedding-3-large';

export async function embedText(openai: OpenAI, input: string): Promise<number[]> {
  const res = await openai.embeddings.create({ model: EMB_MODEL, input });
  const v = res.data[0].embedding as number[];
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map(x => x / norm);
}

export function cosine(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}
