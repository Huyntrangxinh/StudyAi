# AI Learning Platform

Nền tảng học tập tích hợp AI với hệ thống quản lý người dùng cho sinh viên và giáo viên.

## Tính năng

### 🔐 Hệ thống Authentication
- **Đăng nhập/Đăng ký** cho sinh viên và giáo viên
- **Phân quyền** rõ ràng: Admin, Giáo viên, Sinh viên
- **Validation email** sinh viên phải có đuôi @ictu.edu.vn
- **Quản lý tài khoản** giáo viên bởi admin

### 👥 Quản lý người dùng
- **Admin Panel** để quản lý tài khoản giáo viên
- **Dashboard** riêng cho từng loại người dùng
- **Bảo mật** và kiểm soát truy cập

### 🤖 Tích hợp AI
- **AI Học tập** để hỗ trợ sinh viên
- **Tương tác 24/7** với AI
- **Học tập thông minh** và cá nhân hóa

## Cài đặt

1. **Cài đặt dependencies:**
```bash
npm install
```

2. **Chạy ứng dụng:**
```bash
npm start
```

3. **Truy cập:** http://localhost:3000

## Cấu trúc dự án

```
src/
├── components/          # React components
│   ├── Login.tsx       # Màn hình đăng nhập
│   ├── Register.tsx    # Màn hình đăng ký
│   ├── Dashboard.tsx   # Dashboard chính
│   ├── AdminPanel.tsx  # Panel quản trị
│   └── ProtectedRoute.tsx # Bảo vệ routes
├── contexts/           # React Context
│   └── AuthContext.tsx # Context xác thực
├── hooks/              # Custom hooks
│   └── useAuth.ts      # Hook xác thực
└── App.tsx            # Component chính
```

## Quy tắc người dùng

### 👨‍🎓 Sinh viên
- **Email:** Phải có đuôi @ictu.edu.vn
- **Đăng ký:** Tự đăng ký tài khoản
- **Quyền:** Xem khóa học, tương tác AI, làm bài tập

### 👨‍🏫 Giáo viên  
- **Email:** Được admin cung cấp
- **Tạo tài khoản:** Chỉ admin mới tạo được
- **Quyền:** Quản lý lớp học, tạo bài tập, xem tiến độ sinh viên

### 👨‍💼 Admin
- **Quyền cao nhất:** Quản lý toàn bộ hệ thống
- **Chức năng:** Tạo tài khoản giáo viên, quản lý người dùng, thống kê

## Công nghệ sử dụng

- **React 18** với TypeScript
- **React Router** cho navigation
- **Tailwind CSS** cho styling
- **React Hook Form** cho form handling
- **React Hot Toast** cho notifications
- **Lucide React** cho icons

## Phát triển tiếp

- [ ] Tích hợp API thực tế
- [ ] Tính năng AI học tập
- [ ] Quản lý khóa học
- [ ] Hệ thống bài tập
- [ ] Thống kê và báo cáo


