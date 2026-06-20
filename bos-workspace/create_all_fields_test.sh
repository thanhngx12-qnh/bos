#!/bin/bash
set -e

# ============================================================
# 🧪 FULL FIELD-TYPE TEST FLOW — BOS Platform
# Covers ALL 23 field types with tricky edge cases
# ============================================================

API_URL="http://localhost:3000/api/v1"
EMAIL="it@talunglogistics.com"
PASSWORD="Admin@123"

# ---- 0. ĐỌC THAM SỐ TUỲ CHỌN ----
# Chạy: bash create_all_fields_test.sh [clean]
# Nếu truyền "clean" sẽ xoá entity cũ trước khi tạo mới
CLEAN_MODE="${1:-}"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   🧪  BOS PLATFORM — FULL FIELD TYPE TEST SETUP          ║"
echo "╚══════════════════════Giờ bắt đầu

(optional)

Thời điểm giao hàng

(optional)

Kỳ báo cáo════════════════════════════════════╝"
echo ""

# ============================
# 1. ĐĂNG NHẬP
# ============================
echo "🔑 1. Đăng nhập lấy JWT Token..."

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | grep -o '[^"]*$' || true)
USER_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"id":[0-9]*' | head -n1 | grep -o '[0-9]*$' || true)
TENANT_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"tenantId":[0-9]*' | head -n1 | grep -o '[0-9]*$' || true)

if [ -z "$TOKEN" ]; then
  echo "❌ Đăng nhập thất bại!"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Đăng nhập thành công!"
echo "   👤 User ID   : $USER_ID"
echo "   🏢 Tenant ID : $TENANT_ID"

# ---- Helper functions ----
api_get() {
  local path="$1"
  curl -s -X GET "$API_URL/$path" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: $TENANT_ID"
}
api_post() {
  local path="$1"
  local data="$2"
  curl -s -X POST "$API_URL/$path" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "Content-Type: application/json" \
    -d "$data"
}
api_patch() {
  local path="$1"
  local data="$2"
  curl -s -X PATCH "$API_URL/$path" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "Content-Type: application/json" \
    -d "$data"
}
api_delete() {
  local path="$1"
  curl -s -X DELETE "$API_URL/$path" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: $TENANT_ID"
}

extract_id() {
  echo "$1" | grep -o '"id":[0-9]*' | head -n1 | grep -o '[0-9]*$' || true
}

# ============================
# 2. KHỞI TẠO ENTITY
# ============================
echo ""
echo "═══════════════════════════════════════════════════════"
echo "📦  2. Tạo Entity kiểm thử toàn bộ kiểu trường"
echo "═══════════════════════════════════════════════════════"

ENTITY_CODE="ALL_FIELDS_TEST"

if [ "$CLEAN_MODE" = "clean" ]; then
  echo "🧹 Clean mode: Xoá entity cũ (nếu có)..."
  OLD_ID=$(api_get "entities?limit=200" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('data', data) if isinstance(data, dict) else data
for e in (items if isinstance(items, list) else []):
    if e.get('code') == '$ENTITY_CODE':
        print(e['id'])
        break
" 2>/dev/null || true)
  if [ -n "$OLD_ID" ]; then
    api_delete "entities/$OLD_ID" > /dev/null
    echo "   ✅ Đã xoá entity cũ (ID=$OLD_ID)"
  fi
fi

ENTITY_RESPONSE=$(api_post "entities" '{
  "name": "Phiếu Kiểm Thử Toàn Bộ Trường",
  "code": "ALL_FIELDS_TEST",
  "description": "Entity kiểm thử toàn diện 23 kiểu dữ liệu (text, số, thời gian, chọn lựa, tổ chức, file, nâng cao). Có nhiều trường hợp biên và hóc búa.",
  "autoCodePattern": "TEST-{SEQ:5}",
  "titlePattern": "Phiếu KT [{test_text}] - {RECORD_CODE}"
}')

ENTITY_ID=$(extract_id "$ENTITY_RESPONSE")

if [ -z "$ENTITY_ID" ]; then
  echo "⚠️  Entity đã tồn tại, đang tìm Entity ID sẵn có..."
  ENTITY_ID=$(api_get "entities?limit=200" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('data', data) if isinstance(data, dict) else data
for e in (items if isinstance(items, list) else []):
    if e.get('code') == '$ENTITY_CODE':
        print(e['id'])
        break
" 2>/dev/null || true)
  if [ -z "$ENTITY_ID" ]; then
    echo "❌ Không thể lấy Entity ID. Thử chạy với: bash $0 clean"
    exit 1
  fi
  echo "   ↳ Dùng Entity ID có sẵn: $ENTITY_ID"
else
  echo "✅ Đã tạo Entity (ID=$ENTITY_ID)"
fi

# ============================
# 3. TẠO CÁC TRƯỜNG DỮ LIỆU
# ============================
echo ""
echo "═══════════════════════════════════════════════════════"
echo "📋  3. Tạo 23 loại trường + trường hợp hóc búa"
echo "═══════════════════════════════════════════════════════"

create_field() {
  local label="$1"
  local payload="$2"
  echo "   ➤ $label"
  RESP=$(api_post "fields" "$payload")
  FID=$(extract_id "$RESP")
  if [ -z "$FID" ]; then
    echo "     ⚠️  Đã tồn tại hoặc lỗi tạo trường"
  fi
}

# ─── NHÓM 1: VĂN BẢN ───────────────────────────────────────

create_field "[TEXT] Họ và tên (bắt buộc, min 3, max 100 ký tự)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Họ và tên\",
  \"code\": \"test_text\",
  \"type\": \"TEXT\",
  \"isRequired\": true,
  \"orderIndex\": 1,
  \"options\": {
    \"placeholder\": \"Nhập họ tên đầy đủ...\",
    \"minLength\": 3,
    \"maxLength\": 100,
    \"helpText\": \"Bắt buộc từ 3 đến 100 ký tự\"
  }
}"

create_field "[EMAIL] Thư điện tử (validate định dạng email)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Email liên hệ\",
  \"code\": \"test_email\",
  \"type\": \"EMAIL\",
  \"isRequired\": true,
  \"orderIndex\": 2,
  \"options\": {
    \"placeholder\": \"user@example.com\",
    \"helpText\": \"Hóc búa: thử nhập 'notanemail', 'a@b', '@domain.com'\"
  }
}"

create_field "[PHONE] Số điện thoại (regex VN: 0[3|5|7|8|9]xxxxxxxx)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Số điện thoại\",
  \"code\": \"test_phone\",
  \"type\": \"PHONE\",
  \"isRequired\": false,
  \"orderIndex\": 3,
  \"options\": {
    \"placeholder\": \"Ví dụ: 0901234567\",
    \"regexPattern\": \"^(0[3|5|7|8|9])+([0-9]{8})$\",
    \"errorMessage\": \"Số điện thoại không đúng định dạng VN (VD: 0901234567)\",
    \"helpText\": \"Hóc búa: thử nhập '123', '+84901234567', '090 123 4567'\"
  }
}"

create_field "[TEXTAREA] Mô tả chi tiết (max 2000 ký tự)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Mô tả chi tiết\",
  \"code\": \"test_textarea\",
  \"type\": \"TEXTAREA\",
  \"isRequired\": false,
  \"orderIndex\": 4,
  \"options\": {
    \"placeholder\": \"Nhập mô tả đầy đủ về nội dung...\",
    \"maxLength\": 2000
  }
}"

# ─── NHÓM 2: SỐ LIỆU ───────────────────────────────────────

create_field "[NUMBER] Số lượng (số nguyên, min=1, max=9999)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Số lượng\",
  \"code\": \"test_number\",
  \"type\": \"NUMBER\",
  \"isRequired\": true,
  \"orderIndex\": 5,
  \"options\": {
    \"min\": 1,
    \"max\": 9999,
    \"initValue\": 1,
    \"helpText\": \"Hóc búa: thử nhập 0, -1, 10000, 1.5 (thập phân)\"
  }
}"

create_field "[DECIMAL] Hệ số quy đổi (số thập phân, 2 chữ số sau dấu phẩy)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Hệ số quy đổi\",
  \"code\": \"test_decimal\",
  \"type\": \"DECIMAL\",
  \"isRequired\": false,
  \"orderIndex\": 6,
  \"options\": {
    \"min\": 0.01,
    \"max\": 100,
    \"step\": 0.01,
    \"initValue\": 1.00,
    \"helpText\": \"Hóc búa: thử nhập 0, 0.001 (quá nhiều thập phân), 100.01\"
  }
}"

create_field "[CURRENCY] Giá trị hợp đồng (tiền tệ VNĐ)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Giá trị hợp đồng\",
  \"code\": \"test_currency\",
  \"type\": \"CURRENCY\",
  \"isRequired\": false,
  \"orderIndex\": 7,
  \"options\": {
    \"prefix\": \"VNĐ\",
    \"min\": 0,
    \"helpText\": \"Hóc búa: thử nhập số âm, chữ, 1,000,000 (dấu phẩy)\"
  }
}"

create_field "[PERCENTAGE] Tỷ lệ chiết khấu (0% - 100%)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Tỷ lệ chiết khấu\",
  \"code\": \"test_percentage\",
  \"type\": \"PERCENTAGE\",
  \"isRequired\": false,
  \"orderIndex\": 8,
  \"options\": {
    \"min\": 0,
    \"max\": 100,
    \"initValue\": 0,
    \"helpText\": \"Hóc búa: thử nhập 101, -5, 'abc'\"
  }
}"

# ─── NHÓM 3: THỜI GIAN ──────────────────────────────────────

create_field "[DATE] Ngày đề xuất (bắt buộc)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Ngày đề xuất\",
  \"code\": \"test_date\",
  \"type\": \"DATE\",
  \"isRequired\": true,
  \"orderIndex\": 9,
  \"options\": {
    \"helpText\": \"Hóc búa: thử để trống, nhập ngày trong quá khứ xa (1900-01-01), ngày 29/02 năm không nhuận\"
  }
}"

create_field "[TIME] Giờ bắt đầu họp" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Giờ bắt đầu\",
  \"code\": \"test_time\",
  \"type\": \"TIME\",
  \"isRequired\": false,
  \"orderIndex\": 10,
  \"options\": {
    \"placeholder\": \"08:30\",
    \"helpText\": \"Hóc búa: thử nhập '25:00', '08:60', 'abc'\"
  }
}"

create_field "[DATETIME] Thời điểm giao hàng (Ngày & Giờ)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Thời điểm giao hàng\",
  \"code\": \"test_datetime\",
  \"type\": \"DATETIME\",
  \"isRequired\": false,
  \"orderIndex\": 11,
  \"options\": {
    \"helpText\": \"Hóc búa: thử thời điểm quá khứ so với Ngày đề xuất\"
  }
}"

create_field "[MONTH_YEAR] Kỳ báo cáo (Tháng/Năm)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Kỳ báo cáo\",
  \"code\": \"test_month_year\",
  \"type\": \"MONTH_YEAR\",
  \"isRequired\": false,
  \"orderIndex\": 12,
  \"options\": {
    \"helpText\": \"Hóc búa: thử chọn tháng 13, năm 0000\"
  }
}"

# ─── NHÓM 4: LỰA CHỌN & TỔ CHỨC ────────────────────────────

create_field "[SELECT] Loại hợp đồng (chọn 1, có giá trị mặc định)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Loại hợp đồng\",
  \"code\": \"test_select\",
  \"type\": \"SELECT\",
  \"isRequired\": true,
  \"orderIndex\": 13,
  \"options\": {
    \"choices\": [\"Hợp đồng mua bán\", \"Hợp đồng dịch vụ\", \"Hợp đồng lao động\", \"Hợp đồng thuê\", \"Khác\"],
    \"initValue\": \"Hợp đồng mua bán\",
    \"helpText\": \"Có initValue mặc định = Hợp đồng mua bán\"
  }
}"

create_field "[MULTI_SELECT] Phòng ban liên quan (chọn nhiều)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Phòng ban liên quan\",
  \"code\": \"test_multiselect\",
  \"type\": \"MULTI_SELECT\",
  \"isRequired\": false,
  \"orderIndex\": 14,
  \"options\": {
    \"choices\": [\"Ban Giám đốc\", \"Tài chính - Kế toán\", \"Nhân sự\", \"Kinh doanh\", \"Kỹ thuật\", \"IT\", \"Hành chính\"],
    \"helpText\": \"Hóc búa: thử chọn tất cả 7 lựa chọn, thử bỏ chọn hết\"
  }
}"

create_field "[CHECKBOX] Đã đọc và đồng ý điều khoản" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Đã đọc và đồng ý điều khoản\",
  \"code\": \"test_checkbox\",
  \"type\": \"CHECKBOX\",
  \"isRequired\": false,
  \"orderIndex\": 15,
  \"options\": {
    \"checkboxLabel\": \"Tôi đã đọc và đồng ý với điều khoản sử dụng\",
    \"initValue\": false,
    \"helpText\": \"Hóc búa: nộp khi checkbox KHÔNG được tích\"
  }
}"

create_field "[USER_REF] Người phụ trách (thành viên hệ thống)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Người phụ trách\",
  \"code\": \"test_user_ref\",
  \"type\": \"USER_REF\",
  \"isRequired\": false,
  \"orderIndex\": 16,
  \"options\": {
    \"placeholder\": \"Tìm và chọn thành viên...\",
    \"helpText\": \"Hóc búa: tìm kiếm với ký tự đặc biệt, tên có dấu tiếng Việt\"
  }
}"

create_field "[DEPT_REF] Phòng ban thực hiện (cây phòng ban)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Phòng ban thực hiện\",
  \"code\": \"test_dept_ref\",
  \"type\": \"DEPT_REF\",
  \"isRequired\": false,
  \"orderIndex\": 17,
  \"options\": {
    \"placeholder\": \"Chọn phòng ban...\",
    \"helpText\": \"Hóc búa: chọn phòng ban cấp 3 lồng nhau sâu\"
  }
}"

create_field "[ROLE_REF] Vai trò yêu cầu (vai trò hệ thống)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Vai trò yêu cầu\",
  \"code\": \"test_role_ref\",
  \"type\": \"ROLE_REF\",
  \"isRequired\": false,
  \"orderIndex\": 18,
  \"options\": {
    \"placeholder\": \"Chọn vai trò...\",
    \"helpText\": \"Hóc búa: xoá role rồi kiểm tra trường còn lưu hay không\"
  }
}"

# ─── NHÓM 5: TỆP TIN & NÂNG CAO ─────────────────────────────

create_field "[FILE] Đính kèm hợp đồng (PDF/DOCX tối đa 10MB)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Hợp đồng đính kèm\",
  \"code\": \"test_file\",
  \"type\": \"FILE\",
  \"isRequired\": false,
  \"orderIndex\": 19,
  \"options\": {
    \"accept\": \".pdf,.doc,.docx,.xlsx\",
    \"maxSize\": 10,
    \"helpText\": \"Hóc búa: thử upload file >10MB, file .exe, không có file\"
  }
}"

create_field "[IMAGE] Ảnh minh chứng (JPG/PNG tối đa 5MB)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Ảnh minh chứng\",
  \"code\": \"test_image\",
  \"type\": \"IMAGE\",
  \"isRequired\": false,
  \"orderIndex\": 20,
  \"options\": {
    \"accept\": \".jpg,.jpeg,.png,.webp\",
    \"maxSize\": 5,
    \"helpText\": \"Hóc búa: thử đổi đuôi .pdf sang .jpg rồi upload\"
  }
}"

create_field "[LOOKUP] Liên kết tới Entity Thanh toán (PAYMENT_REQUEST)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Hồ sơ thanh toán liên quan\",
  \"code\": \"test_lookup\",
  \"type\": \"LOOKUP\",
  \"isRequired\": false,
  \"orderIndex\": 21,
  \"options\": {
    \"lookupEntityCode\": \"PAYMENT_REQUEST\",
    \"displayField\": \"title\",
    \"helpText\": \"Hóc búa: xoá hồ sơ được liên kết, liên kết tới chính mình\"
  }
}"

create_field "[FORMULA] Giá trị chiết khấu = Giá trị HĐ * Tỷ lệ CK / 100" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Giá trị chiết khấu\",
  \"code\": \"test_formula\",
  \"type\": \"FORMULA\",
  \"isRequired\": false,
  \"orderIndex\": 22,
  \"options\": {
    \"formula\": \"{test_currency} * {test_percentage} / 100\",
    \"helpText\": \"Hóc búa: để trống test_currency hoặc test_percentage, kết quả phải là 0 (không lỗi NaN)\"
  }
}"

# BẢNG CON — Dòng item với đủ kiểu: STT, TEXT, NUMBER, SELECT, FORMULA
TABLE_OPTIONS=$(cat <<'EOF'
{
  "columns": [
    {
      "name": "STT",
      "code": "stt",
      "type": "STT"
    },
    {
      "name": "Tên hạng mục",
      "code": "item_name",
      "type": "TEXT",
      "isRequired": true
    },
    {
      "name": "Danh mục",
      "code": "item_category",
      "type": "SELECT",
      "choices": ["Thiết bị", "Phần mềm", "Dịch vụ", "Văn phòng phẩm", "Khác"]
    },
    {
      "name": "Số lượng",
      "code": "qty",
      "type": "NUMBER",
      "isRequired": true,
      "summaryType": "SUM"
    },
    {
      "name": "Đơn giá (VNĐ)",
      "code": "unit_price",
      "type": "NUMBER",
      "isRequired": true,
      "summaryType": "AVG"
    },
    {
      "name": "Thành tiền",
      "code": "line_total",
      "type": "FORMULA",
      "formula": "{qty} * {unit_price}",
      "summaryType": "SUM"
    },
    {
      "name": "Ghi chú dòng",
      "code": "item_note",
      "type": "TEXT",
      "isRequired": false
    }
  ]
}
EOF
)

ESCAPED_TABLE=$(echo "$TABLE_OPTIONS" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin)))" 2>/dev/null || echo "$TABLE_OPTIONS")

create_field "[TABLE] Bảng hạng mục (STT tự động, SELECT cột, FORMULA tính tổng, AVG đơn giá)" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Danh sách hạng mục\",
  \"code\": \"test_table\",
  \"type\": \"TABLE\",
  \"isRequired\": false,
  \"orderIndex\": 23,
  \"options\": $ESCAPED_TABLE
}"

echo ""
echo "✅ Đã tạo xong toàn bộ 23 kiểu trường dữ liệu!"

# ============================
# 4. TẠO QUY TRÌNH DUYỆT
# ============================
echo ""
echo "═══════════════════════════════════════════════════════"
echo "⚙️  4. Tạo Quy trình phê duyệt 2 cấp (đơn giản)"
echo "═══════════════════════════════════════════════════════"

WORKFLOW_RESPONSE=$(api_post "workflows" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Quy trình Kiểm thử Toàn Trường\",
  \"description\": \"Quy trình 2-bước: Trưởng phòng soát xét → Giám đốc phê duyệt. Dùng để test tất cả field types.\"
}")

WORKFLOW_ID=$(extract_id "$WORKFLOW_RESPONSE")
VERSION_ID=$(echo "$WORKFLOW_RESPONSE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
versions = d.get('versions', [])
print(versions[0]['id'] if versions else '')
" 2>/dev/null || true)

if [ -z "$WORKFLOW_ID" ]; then
  echo "⚠️  Workflow đã tồn tại hoặc lỗi tạo"
else
  echo "✅ Tạo Workflow (ID=$WORKFLOW_ID, VersionID=$VERSION_ID)"

  # Tạo các bước
  create_step() {
    local name="$1"; local type="$2"; local idx="$3"; local perm="$4"
    api_post "workflow-pipeline/steps" "{
      \"versionId\": $VERSION_ID,
      \"name\": \"$name\",
      \"stepType\": \"$type\",
      \"orderIndex\": $idx,
      \"permissions\": $perm
    }"
  }

  echo "   📍 Bước 1: Trưởng phòng soát xét"
  STEP1_RESP=$(create_step "Trưởng phòng soát xét" "USER_TASK" 1 "{\"candidateUsers\": [$USER_ID]}")
  STEP1_ID=$(extract_id "$STEP1_RESP")

  echo "   📍 Bước 2: Giám đốc phê duyệt"
  STEP2_RESP=$(create_step "Giám đốc phê duyệt" "USER_TASK" 2 "{\"candidateUsers\": [$USER_ID]}")
  STEP2_ID=$(extract_id "$STEP2_RESP")

  echo "   📍 Bước 3: Hoàn tất"
  STEP3_RESP=$(create_step "Hoàn tất" "SYSTEM_TASK" 3 "{}")
  STEP3_ID=$(extract_id "$STEP3_RESP")

  echo "   📍 Bước 4: Từ chối hồ sơ"
  STEP4_RESP=$(create_step "Từ chối hồ sơ" "SYSTEM_TASK" 4 "{}")
  STEP4_ID=$(extract_id "$STEP4_RESP")

  # Tạo transitions
  create_trans() {
    local from="$1"; local to="$2"; local auto="$3"; local logic="$4"
    api_post "workflow-pipeline/transitions" "{
      \"fromStepId\": $from,
      \"toStepId\": $to,
      \"autoSkip\": $auto,
      \"conditionLogic\": $logic
    }" > /dev/null
  }

  echo "   🔗 Soát xét → Giám đốc duyệt"
  create_trans "$STEP1_ID" "$STEP2_ID" false '{"actionLabel": "Soát xét OK, chuyển Giám đốc"}'

  echo "   🔗 Soát xét → Từ chối"
  create_trans "$STEP1_ID" "$STEP4_ID" false '{"actionLabel": "Không phê duyệt (Từ chối)"}'

  echo "   🔗 Giám đốc → Hoàn tất"
  create_trans "$STEP2_ID" "$STEP3_ID" false '{"actionLabel": "Giám đốc phê duyệt"}'

  echo "   🔗 Giám đốc → Từ chối"
  create_trans "$STEP2_ID" "$STEP4_ID" false '{"actionLabel": "Giám đốc từ chối"}'

  # Publish workflow
  echo "   🚀 Phát hành workflow..."
  api_patch "workflows/$WORKFLOW_ID/versions/$VERSION_ID/status" '{"status": "PUBLISHED"}' > /dev/null
  echo "✅ Workflow đã được phát hành!"
fi

# ============================
# 5. HƯỚNG DẪN TEST
# ============================
echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║   🎯  HƯỚNG DẪN TEST THỦ CÔNG — KIỂM TRA TỪng LOẠI TRƯỜNG         ║"
echo "╠══════════════════════════════════════════════════════════════════════╣"
echo "║                                                                      ║"
echo "║  Mở trình duyệt: http://localhost:3002/records                       ║"
echo "║  Chọn entity: 'Phiếu Kiểm Thử Toàn Bộ Trường'                      ║"
echo "║  Nhấn 'Nộp hồ sơ mới'                                               ║"
echo "║                                                                      ║"
echo "╠══════════════════════════════════════════════════════════════════════╣"
echo "║  📝 VĂN BẢN                                                          ║"
echo "║  TC01 [TEXT]      Để trống → phải báo lỗi bắt buộc                  ║"
echo "║  TC02 [TEXT]      Nhập 1 ký tự → phải báo lỗi min=3                 ║"
echo "║  TC03 [TEXT]      Nhập 101 ký tự → phải báo lỗi max=100             ║"
echo "║  TC04 [EMAIL]     Nhập 'notanemail' → báo lỗi định dạng             ║"
echo "║  TC05 [EMAIL]     Nhập 'a@b' → kiểm tra xem có pass không           ║"
echo "║  TC06 [PHONE]     Nhập '012345678' (chỉ 9 số) → lỗi regex           ║"
echo "║  TC07 [PHONE]     Nhập '+84901234567' → lỗi regex VN                ║"
echo "║  TC08 [TEXTAREA]  Paste văn bản 2001 ký tự → phải báo lỗi max       ║"
echo "║                                                                      ║"
echo "║  🔢 SỐ LIỆU                                                           ║"
echo "║  TC09 [NUMBER]    Nhập 0 → phải báo lỗi min=1                       ║"
echo "║  TC10 [NUMBER]    Nhập -5 → phải báo lỗi                            ║"
echo "║  TC11 [NUMBER]    Nhập 10000 → phải báo lỗi max=9999                ║"
echo "║  TC12 [NUMBER]    Nhập 1.5 → phải tự làm tròn hoặc báo lỗi         ║"
echo "║  TC13 [DECIMAL]   Nhập 0.001 → kiểm tra làm tròn 2 chữ số          ║"
echo "║  TC14 [CURRENCY]  Nhập số âm → kiểm tra validation                  ║"
echo "║  TC15 [PERCENTAGE] Nhập 101 → báo lỗi max=100                       ║"
echo "║                                                                      ║"
echo "║  📅 THỜI GIAN                                                         ║"
echo "║  TC16 [DATE]      Để trống → phải báo lỗi bắt buộc                  ║"
echo "║  TC17 [DATE]      Nhập 29/02/2023 (không nhuận) → phải từ chối      ║"
echo "║  TC18 [DATETIME]  Chọn thời điểm quá khứ → kiểm tra UI              ║"
echo "║  TC19 [TIME]      Nhập '25:00' → phải từ chối                       ║"
echo "║  TC20 [MONTH_YEAR] Chọn tháng 2/2024, xem format hiển thị           ║"
echo "║                                                                      ║"
echo "║  🔘 LỰA CHỌN & TỔ CHỨC                                               ║"
echo "║  TC21 [SELECT]    Verify initValue = 'Hợp đồng mua bán' đã chọn sẵn ║"
echo "║  TC22 [SELECT]    Xoá rồi submit → phải báo lỗi bắt buộc            ║"
echo "║  TC23 [MULTI_SELECT] Chọn tất cả 7 item → kiểm tra hiển thị tags    ║"
echo "║  TC24 [MULTI_SELECT] Bỏ chọn hết → kiểm tra gửi null hay []         ║"
echo "║  TC25 [CHECKBOX]  Không tích submit → kiểm tra value = false         ║"
echo "║  TC26 [USER_REF]  Gõ tên có dấu tiếng Việt → tìm kiếm phải hoạt động ║"
echo "║  TC27 [DEPT_REF]  Chọn phòng ban cấp 3 (nested) → lưu đúng          ║"
echo "║  TC28 [ROLE_REF]  Chọn role → lưu ID hay tên?                       ║"
echo "║                                                                      ║"
echo "║  📎 TỆP & NÂNG CAO                                                    ║"
echo "║  TC29 [FILE]      Upload file .exe → phải bị chặn                   ║"
echo "║  TC30 [FILE]      Upload file PDF 11MB → phải báo lỗi >10MB         ║"
echo "║  TC31 [IMAGE]     Đổi tên file PDF → img.jpg rồi upload             ║"
echo "║  TC32 [LOOKUP]    Chọn hồ sơ → xem label hiển thị đúng chưa        ║"
echo "║  TC33 [FORMULA]   Nhập Currency=0, Percentage=0 → Kết quả = 0       ║"
echo "║  TC34 [FORMULA]   Để trống Currency → FORMULA phải là 0 (không NaN) ║"
echo "║                                                                      ║"
echo "║  📊 BẢNG CON (TABLE)                                                  ║"
echo "║  TC35 [TABLE]     Thêm 1 dòng → STT phải tự điền = 1                ║"
echo "║  TC36 [TABLE]     Nhập qty=5, price=200000 → line_total=1000000      ║"
echo "║  TC37 [TABLE]     Kéo dòng để sắp xếp → STT phải cập nhật lại       ║"
echo "║  TC38 [TABLE]     Xoá dòng STT=2 → STT phải renumber (1,3 → 1,2)    ║"
echo "║  TC39 [TABLE]     Cột SELECT (Danh mục) → chọn đúng từ choices      ║"
echo "║  TC40 [TABLE]     Footer SUM(line_total) phải cộng đúng tất cả dòng ║"
echo "║  TC41 [TABLE]     Footer AVG(unit_price) phải tính trung bình đúng  ║"
echo "║  TC42 [TABLE]     Thêm 0 dòng → submit → bảng lưu là [] hay null?   ║"
echo "║                                                                      ║"
echo "║  🔁 QUY TRÌNH DUYỆT                                                   ║"
echo "║  TC43  Nộp form hợp lệ → Trạng thái = PENDING                       ║"
echo "║  TC44  Trưởng phòng 'Soát xét OK' → chuyển sang bước Giám đốc       ║"
echo "║  TC45  Giám đốc 'Phê duyệt' → Trạng thái = COMPLETED                ║"
echo "║  TC46  Trưởng phòng 'Từ chối' → Trạng thái = REJECTED               ║"
echo "║  TC47  REJECTED → Nhấn 'Sửa & Trình ký lại' → form load đúng data   ║"
echo "║  TC48  Chi tiết hồ sơ: MULTI_SELECT hiện nhiều tags, TABLE đúng dữ  ║"
echo "║         liệu, FORMULA tính đúng số                                   ║"
echo "║                                                                      ║"
echo "╠══════════════════════════════════════════════════════════════════════╣"
echo "║  Entity ID : $ENTITY_ID"
echo "║  Mở trực tiếp thiết kế trường:"
echo "║  👉 http://localhost:3002/metadata/$ENTITY_ID/fields"
echo "╚══════════════════════════════════════════════════════════════════════╝"
