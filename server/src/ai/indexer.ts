import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import OpenAI from 'openai';
import { embedText } from './embeddings';

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;

function splitPages(text: string) {
    const pages = text.split(/\f/g);
    if (pages.length > 1) return pages.map(s => s.trim()).filter(Boolean);
    return text.split(/\n{2,}/g).map(s => s.trim()).filter(Boolean);
}

function chunkWithPages(pages: string[]) {
    const chunks: { text: string; page: number; chunk_index: number }[] = [];
    pages.forEach((pageText, pIdx) => {
        let i = 0, cIdx = 0;
        while (i < pageText.length) {
            const slice = pageText.slice(i, i + CHUNK_SIZE);
            chunks.push({ text: slice, page: pIdx + 1, chunk_index: cIdx++ });
            i += CHUNK_SIZE - CHUNK_OVERLAP;
        }
    });
    return chunks;
}

export async function indexMaterial(
    openai: OpenAI,
    dbFile: string,
    studySetId: string,
    material: { id: string; file_path: string }
) {
    const db = await open({ filename: dbFile, driver: sqlite3.Database });
    try {
        const pdfPath = path.join(process.cwd(), 'uploads', material.file_path);
        const buf = await fs.readFile(pdfPath);
        const data = await pdf(buf);
        const pages = splitPages(`\f${data.text || ''}`);
        const chunks = chunkWithPages(pages);

        await db.run('DELETE FROM materials_chunks WHERE material_id = ?', [material.id]);
        for (const c of chunks) {
            const v = await embedText(openai, c.text);
            await db.run(
                `INSERT INTO materials_chunks (study_set_id, material_id, page, chunk_index, text, embedding)
         VALUES (?, ?, ?, ?, ?, ?)`,
                [studySetId, material.id, c.page, c.chunk_index, c.text, JSON.stringify(v)]
            );
        }
    } finally {
        await db.close();
    }
}
