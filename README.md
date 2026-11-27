# Ký Ức Việt – Hồ sơ số di sản tư liệu (Mã A01)

Dự án xã hội phi lợi nhuận (không bán hàng, không thu phí, không quảng cáo) phục vụ tra cứu, học tập và hỗ trợ bảo tồn 13 di sản tư liệu Việt Nam được UNESCO ghi danh cùng 2 hồ sơ con chuyên đề Bia Tiến sĩ.

- **Sinh viên thực hiện:** Trần Mạnh Trường (PH59448 – Nhóm 1)
- **Chương trình:** Thực tập sinh Đợt 15 — FPT Polytechnic × IMTA TECH
- **Mốc kế hoạch:** Tuần 4 (05/11/2026)

## 1. Cấu trúc dữ liệu & Tệp chính

- `data/tulieu.json`: 15 bản ghi chuẩn 15 trường Dublin Core + các trường nghiệp vụ di sản (`A01-00001` đến `A01-00015`). Hai bản ghi con `A01-00014` và `A01-00015` liên kết `parent_id: "A01-00002"` và tách riêng khỏi thống kê 13 di sản UNESCO (4 Thế giới, 9 Khu vực).
- `data/sources.json`: 9 nguồn tham chiếu (`N01`–`N09`), tách riêng `N08` (DCMI metadata standard) và đánh dấu `N09` cần kiểm tra URL staging.
- `server.ts`: Máy chủ Express phục vụ API công khai đã lọc dữ liệu hạn chế, endpoint `/api/gemini/*` gọi `@google/genai` phía server và API `/api/admin/*` có xác thực.
- `src/`: Giao diện React + TypeScript + Tailwind CSS (`HomePage`, `CatalogPage`, `RecordDetailPage`, `TimelinePage`, `GeminiAssistantPage`, `SourcesRightsPage`, `AboutPage`, `AdminPage`).

## 2. Cấu hình môi trường & Chạy ứng dụng

Sao chép `.env.example` thành `.env` (hoặc cấu hình biến môi trường trên nền tảng chạy):

```bash
GEMINI_API_KEY="khoa_api_gemini_cua_ban"
ADMIN_PASSWORD="mat_khau_quan_tri_tuy_chon"
APP_URL="http://localhost:3000"
```

Cài đặt phụ thuộc và khởi chạy phát triển:

```bash
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`.

## 3. Kiểm thử & Build sản phẩm

```bash
npm run lint
npm run build
```

Khởi chạy bản production:

```bash
NODE_ENV=production npm start
```

## 4. Xuất dữ liệu & Phiếu in

- Trên giao diện **Quản lý (`/quan-ly`) -> Xuất công khai**, có thể tải JSON hoặc CSV (UTF-8 BOM) chỉ gồm các bản ghi `Được công bố` và không chứa trường hạn chế.
- Trên trang **Chi tiết hồ sơ (`/tu-lieu/:id`)**, nhấn **In phiếu tư liệu** để in hoặc lưu PDF phiếu kiểm kê.

## 5. Hạng mục cần sinh viên & trưởng nhóm bổ sung trước nghiệm thu

1. Mở kiểm tra trực tiếp toàn bộ URL nguồn (`N01`–`N09`), đặc biệt thay thế hoặc xác minh liên kết `staging` ở `N09`.
2. Bổ sung nguồn đối chiếu thứ hai cho 12 hồ sơ hiện mới có 1 nguồn dẫn.
3. Xác minh địa chỉ cấp xã/phường, đơn vị giữ trực tiếp và tình trạng bản gốc của từng hiện vật.
4. Thu thập văn bản đồng thuận cấp phép nếu muốn gắn ảnh thật hoặc bản số vào `images`.
5. Xác nhận phương án triển khai 15 bản ghi (13 UNESCO + 2 bản ghi con) với trưởng nhóm.
