# Study Fetch — Monorepo (Frontend + Server)

Ứng dụng học tập tích hợp AI gồm 2 phần: Frontend (React + TypeScript + CRACO) và Backend (Node.js/Express + TypeScript + SQLite). Tài liệu này hướng dẫn cài đặt và chạy dự án trên máy local.

## Yêu cầu hệ thống
- Node.js >= 18
- npm >= 9
- macOS, Linux hoặc Windows

## Cấu trúc thư mục

```
.
├── package.json           # Frontend (React) cấu hình và scripts
├── public/                # Tập tin tĩnh (đã có pdf.worker.min.js cho react-pdf)
├── src/                   # Mã nguồn frontend
├── server/                # Backend (Express + TypeScript)
│   ├── package.json       # Cấu hình và scripts của server
│   ├── env.example        # Mẫu biến môi trường (.env)
│   └── src/               # Mã nguồn server
└── README.md
```

## Thiết lập nhanh

1) Cài dependencies cho frontend (thư mục gốc):
```bash
npm install
```

2) Cài dependencies cho backend:
```bash
cd server
npm install
```

3) Tạo file môi trường cho backend:
```bash
cp env.example .env
```
Mở `server/.env` và cập nhật tối thiểu các biến sau:
- `OPENAI_API_KEY` (bắt buộc)
- `PORT` (mặc định 3001)
- `FRONTEND_URL` (mặc định http://localhost:3000)

Lưu ý: Không commit khóa API. Tránh dùng `server/config.js` để lưu khóa thật. Ưu tiên dùng `.env`.

## Chạy môi trường phát triển

Mở 2 cửa sổ terminal.

- Cửa sổ 1 — Backend:
```bash
cd server
npm run dev
```
Mặc định server chạy ở `http://localhost:3001`.

- Cửa sổ 2 — Frontend:
```bash
cd "../"
npm start
```
Frontend chạy ở `http://localhost:3000`.

## Build và chạy production

Backend:
```bash
cd server
npm run build
npm start
```

Frontend (tại thư mục gốc):
```bash
npm run build
```
Thư mục build nằm ở `build/`. Tùy hạ tầng, bạn có thể deploy static build lên dịch vụ hosting tĩnh.

## Ghi chú quan trọng
- CORS: Biến `FRONTEND_URL` trong `server/.env` phải khớp với URL frontend (mặc định `http://localhost:3000`).
- PDF worker: `public/pdf.worker.min.js` đã có sẵn cho `react-pdf`.
- CSDL: Server sử dụng SQLite (thư mục `server/src/database/` và file db mẫu trong `server/database/`).
- Uploads: Thư mục `server/uploads/` dùng để lưu file tải lên.

## Scripts chính

Frontend (root `package.json`):
- `npm start`: chạy dev server (CRACO)
- `npm run build`: build production
- `npm test`: chạy test (nếu có)

Backend (`server/package.json`):
- `npm run dev`: chạy server TypeScript bằng `tsx` (watch)
- `npm run build`: biên dịch TypeScript + copy schema
- `npm start`: chạy file đã build trong `dist/`

## Thư mục nguồn chính

Frontend (`src/`):
- `components/`: UI components (theo quy tắc: tạo component mới trong `components/`)
- `hooks/`: custom hooks (tạo hook mới trong `hooks/`)
- `contexts/`, `services/`, `utils/`

Backend (`server/src/`):
- `routes/`: định nghĩa API (ví dụ: `ai.ts`, `materials.ts`, `flashcards.ts` ...)
- `ai/`: embeddings, indexer, retrieval
- `database/`: kết nối và schema SQLite
- `server.ts`: điểm vào chính của server

## Khắc phục sự cố
- Cổng bận: đổi `PORT` trong `server/.env` hoặc dừng tiến trình chiếm cổng.
- Lỗi CORS: kiểm tra `FRONTEND_URL` trong `server/.env` khớp với URL frontend.
- Thiếu OPENAI_API_KEY: cập nhật `server/.env` bằng khóa hợp lệ.

---

Nếu cần hướng dẫn chi tiết hơn cho deploy (Docker, reverse proxy, domain, HTTPS), hãy mở issue để được hỗ trợ.
