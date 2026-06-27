# Tài liệu Hướng dẫn Kiểm thử Hệ thống BOS (Business Operating System)

Tài liệu này cung cấp hướng dẫn kiểm thử chi tiết các tính năng vừa phát triển và trả lời các thắc mắc liên quan đến chức năng Trình ký & Chữ ký số trong hệ thống.

---

## 📌 THÔNG TIN HỆ THỐNG & CẤU HÌNH KIỂM THỬ

* **Next.js Frontend:** [http://localhost:3002](http://localhost:3002)
* **NestJS Backend:** [http://localhost:3000](http://localhost:3000)
* **Tài khoản kiểm thử Admin/SuperAdmin:**
  * **Email:** `it@talunglogistics.com`
  * **Mật khẩu:** `Admin@123`
  * **Workspace:** `Công ty CP TLQM (TLQM)` (Tenant ID: 12)

---

## 🧪 PHẦN 1: HƯỚNG DẪN KIỂM THỬ THỦ CÔNG (MANUAL TEST CASES)

### 📋 Test Case 1: Cấu hình Chọn Người Duyệt Tiếp Theo Động (Dynamic Next Assignee)

* **Mục tiêu:** Kiểm tra người gửi/người duyệt trước có thể chủ động chọn cụ thể ai là người duyệt tiếp theo ở bước sau.
* **Các bước thực hiện:**
  1. Đăng nhập vào [http://localhost:3002](http://localhost:3002) bằng tài khoản quản trị `it@talunglogistics.com`.
  2. Truy cập trang quản trị **Biểu mẫu & Quy trình** (`/metadata`).
  3. Chọn biểu mẫu **"Đề xuất Thanh toán Đơn hàng"** $\rightarrow$ bấm **"Xem chi tiết/Thiết kế"**.
  4. Chọn tab **"Sơ đồ quy trình (Canvas)"**.
  5. Nhấp đúp vào trạm đầu tiên **"Kiểm soát viên soát xét"** để mở Drawer cấu hình bên phải.
  6. Tích chọn ô: **"Cho phép người gửi/người duyệt trước chọn cụ thể người duyệt tiếp theo"**.
  7. Bấm **"Lưu cấu hình trạm"** và nhấn **"Publish Quy trình"** ở góc phải canvas.
  8. Quay lại trang **Hồ sơ** (`/records`), chọn biểu mẫu **"Đề xuất Thanh toán Đơn hàng"** và bấm **"Nộp hồ sơ mới"**.
  9. Điền thông tin đề xuất (Ví dụ: Nhà cung cấp: *Thép Hòa Phát*, Phương thức: *Chuyển khoản*, số tiền > 50M).
  10. Nhấn **"Nộp & Trình ký"**.
* **Kết quả kỳ vọng:**
  - Hệ thống hiển thị Modal hoặc ô chọn Người duyệt tiếp theo, cho phép người dùng chọn danh sách ứng viên (ví dụ chọn *BOS Admin* hoặc tài khoản khác).
  - Sau khi nộp, hồ sơ được gán chính xác cho người vừa được chọn.

---

### 📋 Test Case 2: Bộ lọc Trạng thái trường Liên kết (Lookup Status Filtering)

* **Mục tiêu:** Xác minh tính năng lọc các bản ghi liên kết (Lookup) dựa trên trạng thái (chỉ hiện bản ghi đã hoàn thành `COMPLETED`).
* **Các bước thực hiện:**
  1. Truy cập trang quản trị **Biểu mẫu & Quy trình** (`/metadata`).
  2. Tạo mới một Thực thể (Entity):
     * **Tên:** `Biên bản đối chiếu công nợ`
     * **Mã:** `DEBT_RECONCILIATION`
  3. Vào trang thiết kế trường của biểu mẫu vừa tạo $\rightarrow$ Kéo thả thêm trường mới:
     * **Tên trường:** `Hồ sơ thanh toán liên kết`
     * **Mã trường:** `payment_request_id`
     * **Kiểu dữ liệu:** `Liên kết (LOOKUP)`
     * **Thực thể liên kết:** Chọn `Đề xuất Thanh toán Đơn hàng`
     * **Cột hiển thị nhãn:** `id` hoặc `title`
     * **Lọc theo trạng thái hồ sơ liên kết:** Chọn `Hoàn thành (COMPLETED)`.
     * Bấm **"Lưu trường"**.
  4. Truy cập trang **Hồ sơ** (`/records`), chọn biểu mẫu **"Biên bản đối chiếu công nợ"** $\rightarrow$ bấm **"Nộp hồ sơ mới"**.
  5. Nhấp vào dropdown chọn của trường **"Hồ sơ thanh toán liên kết"**.
* **Kết quả kỳ vọng:**
  - Danh sách dropdown chỉ hiển thị các hồ sơ `Đề xuất Thanh toán Đơn hàng` đã được duyệt hoàn toàn ở trạng thái **Hoàn thành (COMPLETED)**.
  - Các hồ sơ đang ở trạng thái Nháp (DRAFT), Đang duyệt (IN_PROGRESS) hoặc Bị từ chối (REJECTED) **không được phép xuất hiện** trong danh sách này.

---

### 📋 Test Case 3: Báo cáo BI & Biểu đồ Analytics (Dashboard Analytics)

* **Mục tiêu:** Kiểm tra hiển thị tổng hợp hiệu suất quy trình, chi tiêu phòng ban và điểm nghẽn SLA.
* **Các bước thực hiện:**
  1. Truy cập trang chủ Dashboard (`/`).
  2. Bấm chuyển đổi nút Segmented từ **"Bàn làm việc"** sang **"Báo cáo BI (Analytics)"**.
  3. Lựa chọn biểu mẫu **"Đề xuất Thanh toán Đơn hàng"** và trường số học **"Tổng tiền thanh toán"** tại khu vực thống kê chi tiêu phòng ban.
* **Kết quả kỳ vọng:**
  - Biểu đồ hình cột SVG hiển thị đúng tỷ lệ chi tiêu thực tế của từng phòng ban.
  - Hiển thị danh sách các trạm duyệt bị quá thời hạn SLA (điểm nghẽn quy trình) tại bảng Bottlenecks.
  - Các thẻ chỉ số tổng quát (Tổng số hồ sơ, Hồ sơ đang duyệt, Hồ sơ hoàn thành...) tải dữ liệu chính xác theo Tenant hiện tại.

---

## ✒️ PHẦN 2: THÔNG TIN CHI TIẾT VỀ CHỨC NĂNG TRÌNH KÝ & CHỮ KÝ SỐ

Dưới đây là phần trả lời chi tiết cho các câu hỏi của anh về cơ chế Trình ký & Chữ ký số trong hệ thống BOS:

### ❓ Câu hỏi 1: Chữ ký sẽ được đặt ở vị trí nào khi trình ký?

**Trả lời:** Chữ ký số trong hệ thống BOS được hiển thị ở 2 khu vực chính:
1. **Trong Nhật ký Phê duyệt (Timeline & Logs) của Hồ sơ:**
   - Khi xem chi tiết hồ sơ ở Drawer chi tiết hoặc trên Dashboard, lịch sử các bước phê duyệt được sắp xếp theo dạng Timeline từ dưới lên.
   - Tại mỗi bước đã phê duyệt, hệ thống hiển thị thông tin người ký, thời gian ký, ý kiến phản hồi (comment) và **ảnh chữ ký tay base64/con dấu đỏ thực tế** được vẽ hoặc chọn từ thư viện của người đó.
2. **Trong Mẫu in (Print Template - WYSIWYG):**
   - Khi thiết kế mẫu in, người quản trị có thể chủ động kéo thả hoặc gõ mã token động dạng `{{approvals[0].signature}}`, `{{approvals[1].signature}}` (tương ứng với chữ ký của trạm 1, trạm 2...) đặt vào **bất kỳ vị trí nào** trên bản in (thường là trong bảng ký tên ở cuối văn bản).
   - Khi xuất in hồ sơ, thẻ chữ ký số chất lượng cao sẽ hiển thị đúng vị trí đã cấu hình.

---

### ❓ Câu hỏi 2: Hệ thống có hỗ trợ Ký nháy hay không?

**Trả lời:**
* **Hiện tại:** Hệ thống hỗ trợ cơ chế ký phê duyệt điện tử ở từng bước. Nếu tài liệu cần nhiều chữ ký xác nhận ở từng trang hoặc từng mục, người phê duyệt có thể tự tạo một mẫu chữ ký viết tắt (Chữ ký nháy) trong hồ sơ cá nhân và chọn nó khi thực hiện thao tác ký. Trên mẫu in, quản trị viên có thể chèn các token chữ ký ở lề trang hoặc các điều khoản cụ thể.
* **Đề xuất phát triển:** Trong các phiên bản tới, chúng ta có thể bổ sung tùy chọn **"Ký nháy hàng loạt (Marginal Initials)"** tự động đè một chữ ký thu nhỏ của người đại diện vào góc dưới bên phải tất cả các trang của văn bản PDF khi xuất bản.

---

### ❓ Câu hỏi 3: Khi xem Preview văn bản mẫu in, có thể nhấn vào từng chữ ký để xem thông tin xác thực hay không?

**Trả lời:**
* **Thiết kế in ấn sạch (Clean Print):** Để bản in ra giấy hoặc xuất file PDF đẹp, không bị đè các nút bấm web, hệ thống đã **hiển thị trực tiếp toàn bộ thông tin xác thực của chữ ký ngay trên thẻ chữ ký số**.
* Cụ thể, mỗi chữ ký hiển thị trên bản in sẽ bao gồm một khung chứa:
  - Thẻ tag màu xanh lá: **`[ĐÃ KÝ ĐIỆN TỬ]`**
  - Ảnh **chữ ký vẽ tay** của người duyệt.
  - Ảnh **con dấu đỏ** (nếu chọn sử dụng dấu pháp nhân doanh nghiệp đè lên chữ ký).
  - Các thông tin đi kèm (được cấu hình ẩn/hiện): **Họ và tên**, **Chức vụ/Vai trò**, **Phòng ban**, và **Thời gian ký số chính xác**.
* Do thông tin đã hiển thị tường minh trực tiếp trên bản in, người dùng **không cần phải nhấp vào** chữ ký để mở popover (tránh việc khi xuất PDF hoặc in ra giấy bị mất thông tin ẩn).
* **Trong tương lai:** Nếu tích hợp chữ ký số chứng thư công cộng (CA), tệp PDF xuất ra sẽ chứa Metadata chữ ký số hợp chuẩn. Khi người dùng tải file PDF về và mở bằng Adobe Reader, click vào chữ ký sẽ hiển thị chứng thư số bảo mật (Certificate details) của người ký.
