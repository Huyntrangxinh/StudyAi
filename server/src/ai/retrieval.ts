import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import OpenAI from 'openai';
import { embedText, cosine } from './embeddings';

export async function retrieveTopChunks(
  openai: OpenAI,
  dbFile: string,
  studySetId: string,
  question: string,
  topK = 6,
  minSim = 0.18
) {
  const db = await open({ filename: dbFile, driver: sqlite3.Database });
  try {
    const qVec = await embedText(openai, question);
    const rows = await db.all(
      'SELECT id, page, chunk_index, text, embedding FROM materials_chunks WHERE study_set_id = ?',
      [studySetId]
    );

    const scored = rows.map(r => {
      const v = JSON.parse(r.embedding) as number[];
      return { page: r.page, chunk_index: r.chunk_index, text: r.text, sim: cosine(qVec, v) };
    });

    scored.sort((a, b) => b.sim - a.sim);
    const top = scored.slice(0, topK);
    const best = top[0]?.sim ?? 0;
    const inScope = best >= minSim;

    return { inScope, top };
  } finally {
    await db.close();
  }
}
