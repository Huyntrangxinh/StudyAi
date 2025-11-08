# Phân tích TTS (Text-to-Speech) trong dự án

## 📍 Tổng quan

Dự án có **2 loại TTS**:
1. **Frontend TTS** - Sử dụng Web Speech API (Browser native)
2. **Backend TTS** - Sử dụng ElevenLabs và Google Cloud TTS (Server-side)

---

## 🎯 Frontend TTS (Web Speech API)

### 📁 File: `src/hooks/useTextToSpeech.ts`
- **Loại**: React Hook
- **Công nghệ**: Web Speech API (Browser native)
- **Chức năng**:
  - `speakText(text: string)` - Đọc văn bản
  - `unlockTTS()` - Mở khóa TTS sau user gesture
  - `hasUserInteracted` - State kiểm tra user đã tương tác chưa

### 📱 Được dùng ở:
- ✅ **`src/components/StudyFlashcards.tsx`** (Màn học flashcard)
  - Đọc term của flashcard khi chuyển card
  - Có nút bật/tắt audio
  - Có nút replay audio

### ❌ Chưa tách ra service riêng
- Code nằm trực tiếp trong hook
- Không có service layer riêng

---

## 🎯 Backend TTS (Server-side)

### 📁 File 1: `server/src/routes/audio.ts`
- **Endpoint**: `POST /api/audio/generate`
- **Công nghệ**: 
  - ElevenLabs API (cho tiếng Anh)
  - Google Cloud TTS (cho tiếng Việt, fallback)
- **Chức năng**: Generate audio file từ text (MP3)
- **Dòng code**: ~1060-1600
- **Logic**: 
  - Thử ElevenLabs trước (nếu tiếng Anh)
  - Fallback về Google TTS nếu ElevenLabs fail
  - Lưu file MP3 vào `uploads/`

### 📁 File 2: `server/src/routes/slideshow.ts`
- **Hàm**: `synthesizeGoogleTTS(text: string)`
- **Công nghệ**: Google Cloud TTS
- **Chức năng**: Generate audio cho slideshow
- **Dòng code**: ~664-693
- **Logic**: 
  - Sử dụng Google TTS với SSML
  - Thử nhiều voices (vi-VN-Wavenet-A, D, B)
  - Lưu file MP3 vào `uploads/`

### ❌ Chưa tách ra service riêng
- Code nằm trực tiếp trong routes
- Logic TTS bị duplicate giữa `audio.ts` và `slideshow.ts`
- Không có service layer riêng để tái sử dụng

---

## 📊 Tóm tắt

| Loại | File | Được dùng ở | Đã tách service? |
|------|------|-------------|------------------|
| **Frontend TTS** | `src/hooks/useTextToSpeech.ts` | `StudyFlashcards.tsx` | ❌ Chưa |
| **Backend TTS (Audio)** | `server/src/routes/audio.ts` | API endpoint `/api/audio/generate` | ❌ Chưa |
| **Backend TTS (Slideshow)** | `server/src/routes/slideshow.ts` | API endpoint `/api/slideshow` | ❌ Chưa |

---

## 🔧 Đề xuất refactoring

### 1. Frontend TTS Service
Tạo `src/services/ttsService.ts`:
```typescript
// Tách logic TTS ra service riêng
export class TTSService {
  speakText(text: string): Promise<void>
  stopSpeaking(): void
  unlockTTS(): void
  // ...
}
```

### 2. Backend TTS Service
Tạo `server/src/services/ttsService.ts`:
```typescript
// Tách logic TTS ra service riêng
export class TTSService {
  async generateWithElevenLabs(text: string, voiceId?: string): Promise<Buffer>
  async generateWithGoogleTTS(text: string, language: string): Promise<Buffer>
  async generateAudio(text: string, language: string): Promise<Buffer>
  // ...
}
```

### Lợi ích:
- ✅ Tái sử dụng code
- ✅ Dễ test
- ✅ Dễ maintain
- ✅ Tránh duplicate code
- ✅ Tuân thủ clean code principles

