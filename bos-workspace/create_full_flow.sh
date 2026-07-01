#!/bin/bash
set -e

# --- CẤU HÌNH LIÊN KẾT API ---
API_URL="http://localhost:3000/api/v1"
EMAIL="it@talunglogistics.com"
PASSWORD="Admin@123"

echo "============================================="
echo "🔑 1. ĐĂNG NHẬP ĐỂ LẤY JWT TOKEN VÀ TENANT ID..."
echo "============================================="

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
echo "👤 User ID: $USER_ID"
echo "🏢 Tenant ID: $TENANT_ID"

# Helper function to send authenticated POST requests
api_post() {
  local path="$1"
  local data="$2"
  curl -s -X POST "$API_URL/$path" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "Content-Type: application/json" \
    -d "$data"
}

# Helper function to send authenticated PATCH requests
api_patch() {
  local path="$1"
  local data="$2"
  curl -s -X PATCH "$API_URL/$path" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "Content-Type: application/json" \
    -d "$data"
}

echo ""
echo "============================================="
echo "📦 2. KHỞI TẠO ENTITY (BIỂU MẪU ĐỀ XUẤT)"
echo "============================================="

ENTITY_DATA='{
  "name": "Đề xuất Thanh toán Đơn hàng",
  "code": "PAYMENT_REQUEST",
  "description": "Biểu mẫu đề xuất thanh toán đơn hàng cho nhà cung cấp kèm bảng sản phẩm và duyệt hạn mức tự động.",
  "autoCodePattern": "PAY-{SEQ:4}",
  "titlePattern": "Đề xuất Thanh toán - {supplier_name} - {RECORD_CODE}"
}'

ENTITY_RESPONSE=$(api_post "entities" "$ENTITY_DATA")
ENTITY_ID=$(echo "$ENTITY_RESPONSE" | jq -r '.id // empty' 2>/dev/null || true)

if [ -z "$ENTITY_ID" ]; then
  echo "❌ Tạo Entity thất bại! Có thể đã tồn tại."
  # Thử tìm Entity có sẵn
  ENTITY_ID=$(curl -s -X GET "$API_URL/entities?limit=100" -H "Authorization: Bearer $TOKEN" -H "x-tenant-id: $TENANT_ID" | jq -r '.data[] | select(.code == "PAYMENT_REQUEST") | .id' 2>/dev/null || true)
  if [ -z "$ENTITY_ID" ]; then
    echo "❌ Không thể tìm thấy Entity ID."
    exit 1
  fi
  echo "⚠️ Entity đã tồn tại. Sử dụng Entity ID có sẵn: $ENTITY_ID"
  # Cập nhật titlePattern cho Entity đã tồn tại
  api_patch "entities/$ENTITY_ID" "{\"titlePattern\": \"Đề xuất Thanh toán - {supplier_name} - {RECORD_CODE}\"}" > /dev/null
  echo "📝 Đã đồng bộ titlePattern cho Entity ID $ENTITY_ID"
else
  echo "✅ Đã tạo Entity thành công! ID: $ENTITY_ID"
fi

echo ""
echo "============================================="
echo "📋 3. KHỞI TẠO CÁC TRƯỜNG DỮ LIỆU (FIELDS)"
echo "============================================="

# 3.1. Ngày đề xuất (DATE, isRequired: true)
echo "   -> Ngày đề xuất"
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Ngày đề xuất\",
  \"code\": \"request_date\",
  \"type\": \"DATE\",
  \"isRequired\": true,
  \"orderIndex\": 1
}" > /dev/null

# 3.2. Nhà cung cấp (TEXT, isRequired: true)
echo "   -> Nhà cung cấp"
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Nhà cung cấp\",
  \"code\": \"supplier_name\",
  \"type\": \"TEXT\",
  \"isRequired\": true,
  \"orderIndex\": 2
}" > /dev/null

# 3.3. Phương thức thanh toán (SELECT)
echo "   -> Phương thức thanh toán"
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Phương thức thanh toán\",
  \"code\": \"payment_type\",
  \"type\": \"SELECT\",
  \"isRequired\": true,
  \"options\": {
    \"selectOptions\": [\"Tiền mặt\", \"Chuyển khoản\", \"Tạm ứng\"]
  },
  \"orderIndex\": 3
}" > /dev/null

# 3.4. Số tài khoản (TEXT, showIf payment_type == 'Chuyển khoản')
echo "   -> Số tài khoản (Hiển thị khi chuyển khoản)"
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Số tài khoản\",
  \"code\": \"bank_account\",
  \"type\": \"TEXT\",
  \"isRequired\": false,
  \"options\": {
    \"placeholder\": \"Nhập số tài khoản ngân hàng...\",
    \"showIf\": {
      \"field\": \"payment_type\",
      \"operator\": \"==\",
      \"value\": \"Chuyển khoản\"
    }
  },
  \"orderIndex\": 4
}" > /dev/null

# 3.5. Ngân hàng thụ hưởng (TEXT, showIf payment_type == 'Chuyển khoản')
echo "   -> Ngân hàng (Hiển thị khi chuyển khoản)"
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Ngân hàng thụ hưởng\",
  \"code\": \"bank_name\",
  \"type\": \"TEXT\",
  \"isRequired\": false,
  \"options\": {
    \"placeholder\": \"Nhập tên ngân hàng...\",
    \"showIf\": {
      \"field\": \"payment_type\",
      \"operator\": \"==\",
      \"value\": \"Chuyển khoản\"
    }
  },
  \"orderIndex\": 5
}" > /dev/null

# 3.6. Có hợp đồng đính kèm (CHECKBOX)
echo "   -> Có hợp đồng đính kèm"
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Có hợp đồng đính kèm?\",
  \"code\": \"has_contract\",
  \"type\": \"CHECKBOX\",
  \"isRequired\": false,
  \"options\": {
    \"checkboxLabel\": \"Tích chọn nếu có hợp đồng\"
  },
  \"orderIndex\": 6
}" > /dev/null

# 3.7. Số hợp đồng (TEXT, requiredIf has_contract == true)
echo "   -> Số hợp đồng (Bắt buộc khi có hợp đồng)"
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Số hợp đồng\",
  \"code\": \"contract_number\",
  \"type\": \"TEXT\",
  \"isRequired\": false,
  \"options\": {
    \"placeholder\": \"Nhập số hợp đồng bắt buộc...\",
    \"requiredIf\": {
      \"field\": \"has_contract\",
      \"operator\": \"==\",
      \"value\": true
    }
  },
  \"orderIndex\": 7
}" > /dev/null

# 3.8. Danh sách sản phẩm (TABLE)
echo "   -> Danh sách sản phẩm (Bảng con + Tính toán hàng + Footer)"
TABLE_OPTIONS='{
  "columns": [
    {
      "name": "STT",
      "code": "stt",
      "type": "STT"
    },
    {
      "name": "Tên sản phẩm/dịch vụ",
      "code": "item_name",
      "type": "TEXT",
      "isRequired": true
    },
    {
      "name": "Số lượng",
      "code": "quantity",
      "type": "NUMBER",
      "isRequired": true
    },
    {
      "name": "Đơn giá",
      "code": "price",
      "type": "NUMBER",
      "isRequired": true,
      "summaryType": "AVG"
    },
    {
      "name": "Thành tiền",
      "code": "amount",
      "type": "FORMULA",
      "formula": "{quantity} * {price}",
      "summaryType": "SUM"
    }
  ]
}'

ESCAPED_TABLE_OPTIONS=$(echo "$TABLE_OPTIONS" | jq -c .)

api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Danh sách sản phẩm mua sắm\",
  \"code\": \"order_items\",
  \"type\": \"TABLE\",
  \"isRequired\": false,
  \"options\": $ESCAPED_TABLE_OPTIONS,
  \"orderIndex\": 8
}" > /dev/null

# 3.9. Tổng tiền thanh toán (FORMULA, SUM rollup)
echo "   -> Tổng tiền thanh toán (Tính tổng tự động từ bảng con)"
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Tổng tiền thanh toán\",
  \"code\": \"total_payment\",
  \"type\": \"FORMULA\",
  \"isRequired\": false,
  \"options\": {
    \"formula\": \"SUM(order_items.amount)\"
  },
  \"orderIndex\": 9
}" > /dev/null

# 3.10. Phân loại đề xuất (SELECT, isRequired: true)
echo "   -> Phân loại đề xuất"
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Phân loại đề xuất\",
  \"code\": \"proposal_type\",
  \"type\": \"SELECT\",
  \"isRequired\": true,
  \"options\": {
    \"selectOptions\": [\"Công cụ dụng cụ\", \"Tiêu hao\", \"Sửa chữa cải tạo lớn\", \"Khác\"]
  },
  \"orderIndex\": 10
}" > /dev/null

echo "✅ Đã cấu hình xong tất cả các trường dữ liệu động!"

echo ""
echo "============================================="
echo "⚙️ 4. KHỞI TẠO QUY TRÌNH DUYỆT (WORKFLOW)"
echo "============================================="

WORKFLOW_DATA="{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Quy trình Phê duyệt Thanh toán\",
  \"description\": \"Tự động định tuyến hồ sơ dựa trên Tổng tiền & Phân loại đề xuất (Công cụ dụng cụ/Tiêu hao kết thúc ở PTGD, Sửa chữa cải tạo lớn đi tiếp lên TGĐ).\"
}"

WORKFLOW_RESPONSE=$(api_post "workflows" "$WORKFLOW_DATA")
WORKFLOW_ID=$(echo "$WORKFLOW_RESPONSE" | grep -o '"id":[0-9]*' | head -n1 | grep -o '[0-9]*$' || true)
VERSION_ID=$(echo "$WORKFLOW_RESPONSE" | grep -o '"version_id":[0-9]*\|"id":[0-9]*' | tail -n1 | grep -o '[0-9]*$' || true)

if [ -z "$WORKFLOW_ID" ]; then
  WORKFLOW_ID=$(echo "$WORKFLOW_RESPONSE" | jq '.id')
  VERSION_ID=$(echo "$WORKFLOW_RESPONSE" | jq '.versions[0].id')
fi

echo "✅ Đã tạo Quy trình thành công! Workflow ID: $WORKFLOW_ID, Version ID: $VERSION_ID"

echo ""
echo "============================================="
echo "🛤️ 5. KHỞI TẠO CÁC BƯỚC DUYỆT (STEPS)"
echo "============================================="

# Hàm tạo bước
create_step() {
  local name="$1"
  local type="$2"
  local idx="$3"
  local perm="$4"
  api_post "workflow-pipeline/steps" "{
    \"versionId\": $VERSION_ID,
    \"name\": \"$name\",
    \"stepType\": \"$type\",
    \"orderIndex\": $idx,
    \"permissions\": $perm
  }"
}

# 5.1. Bước 1: Kiểm soát viên soát xét (USER_TASK)
echo "📍 Tạo Trạm: Kiểm soát viên soát xét"
STEP1_RESP=$(create_step "Kiểm soát viên soát xét" "USER_TASK" 1 "{\"candidateUsers\": [$USER_ID]}")
STEP1_ID=$(echo "$STEP1_RESP" | jq '.id')

# 5.2. Bước 2: Trưởng phòng Tài chính phê duyệt (USER_TASK)
echo "📍 Tạo Trạm: Trưởng phòng Tài chính phê duyệt"
STEP2_RESP=$(create_step "Trưởng phòng Tài chính phê duyệt" "USER_TASK" 2 "{\"candidateUsers\": [$USER_ID]}")
STEP2_ID=$(echo "$STEP2_RESP" | jq '.id')

# 5.3. Bước Router 1: Cổng định tuyến 1 (USER_TASK với Auto-Skip)
echo "📍 Tạo Trạm: Cổng định tuyến 1 (Auto Route 1)"
STEP_ROUTER1_RESP=$(create_step "Cổng định tuyến 1" "USER_TASK" 3 "{\"candidateUsers\": [$USER_ID]}")
STEP_ROUTER1_ID=$(echo "$STEP_ROUTER1_RESP" | jq '.id')

# 5.4. Bước 3: Phó Tổng Giám đốc phê duyệt (USER_TASK)
echo "📍 Tạo Trạm: Phó Tổng Giám đốc phê duyệt"
STEP_PTGD_RESP=$(create_step "Phó Tổng Giám đốc phê duyệt" "USER_TASK" 4 "{\"candidateUsers\": [$USER_ID]}")
STEP_PTGD_ID=$(echo "$STEP_PTGD_RESP" | jq '.id')

# 5.5. Bước Router PTGD: Cổng định tuyến PTGD (USER_TASK với Auto-Skip)
echo "📍 Tạo Trạm: Cổng định tuyến PTGD (Auto Route PTGD)"
STEP_ROUTER_PTGD_RESP=$(create_step "Cổng định tuyến PTGD" "USER_TASK" 5 "{\"candidateUsers\": [$USER_ID]}")
STEP_ROUTER_PTGD_ID=$(echo "$STEP_ROUTER_PTGD_RESP" | jq '.id')

# 5.6. Bước 4: Tổng Giám đốc phê duyệt (USER_TASK)
echo "📍 Tạo Trạm: Tổng Giám đốc phê duyệt"
STEP_TGD_RESP=$(create_step "Tổng Giám đốc phê duyệt" "USER_TASK" 6 "{\"candidateUsers\": [$USER_ID]}")
STEP_TGD_ID=$(echo "$STEP_TGD_RESP" | jq '.id')

# 5.7. Bước 5: Hoàn tất (SYSTEM_TASK)
echo "📍 Tạo Trạm: Hoàn tất (Terminal)"
STEP_COMPLETE_RESP=$(create_step "Hoàn tất" "SYSTEM_TASK" 7 "{}")
STEP_COMPLETE_ID=$(echo "$STEP_COMPLETE_RESP" | jq '.id')

# 5.8. Bước 6: Từ chối hồ sơ (SYSTEM_TASK)
echo "📍 Tạo Trạm: Từ chối hồ sơ (Terminal Rejection)"
STEP_REJECT_RESP=$(create_step "Từ chối hồ sơ" "SYSTEM_TASK" 8 "{}")
STEP_REJECT_ID=$(echo "$STEP_REJECT_RESP" | jq '.id')

echo "✅ Đã tạo xong tất cả các bước duyệt."

echo ""
echo "============================================="
echo "🔀 6. KẾT NỐI LUỒNG BẰNG ĐƯỜNG RẼ NHÁNH (TRANSITIONS)"
echo "============================================="

create_transition() {
  local from="$1"
  local to="$2"
  local auto="$3"
  local logic="$4"
  api_post "workflow-pipeline/transitions" "{
    \"fromStepId\": $from,
    \"toStepId\": $to,
    \"autoSkip\": $auto,
    \"conditionLogic\": $logic
  }"
}

# --- NHÁNH 1: Kiểm soát viên (Step 1) ---
echo "🔗 Liên kết: Soát xét -> Trưởng phòng"
create_transition "$STEP1_ID" "$STEP2_ID" false '{"actionLabel": "Soát xét OK"}' > /dev/null

echo "🔗 Liên kết: Soát xét -> Từ chối"
create_transition "$STEP1_ID" "$STEP_REJECT_ID" false '{"actionLabel": "Không phê duyệt (Từ chối)"}' > /dev/null

# --- NHÁNH 2: Trưởng phòng (Step 2) ---
echo "🔗 Liên kết: Trưởng phòng -> Cổng định tuyến 1"
create_transition "$STEP2_ID" "$STEP_ROUTER1_ID" false '{"actionLabel": "Trưởng phòng duyệt"}' > /dev/null

echo "🔗 Liên kết: Trưởng phòng -> Từ chối"
create_transition "$STEP2_ID" "$STEP_REJECT_ID" false '{"actionLabel": "Trưởng phòng từ chối"}' > /dev/null

# --- NHÁNH 3: Cổng định tuyến 1 ---
echo "🔗 Cổng định tuyến 1 -> PTGD (Nếu là Sửa chữa cải tạo lớn)"
create_transition "$STEP_ROUTER1_ID" "$STEP_PTGD_ID" true '{
  "actionLabel": "PTGD duyệt (Cải tạo lớn)",
  "rules": {
    "field": "proposal_type",
    "operator": "==",
    "value": "Sửa chữa cải tạo lớn"
  }
}' > /dev/null

echo "🔗 Cổng định tuyến 1 -> PTGD (Nếu > 50M)"
create_transition "$STEP_ROUTER1_ID" "$STEP_PTGD_ID" true '{
  "actionLabel": "PTGD duyệt (>50M)",
  "rules": {
    "field": "total_payment",
    "operator": ">",
    "value": 50000000
  }
}' > /dev/null

echo "🔗 Cổng định tuyến 1 -> Hoàn tất (Nếu <= 50M và không phải cải tạo lớn)"
create_transition "$STEP_ROUTER1_ID" "$STEP_COMPLETE_ID" true '{
  "actionLabel": "Hoàn tất (<=50M)",
  "rules": {
    "field": "total_payment",
    "operator": "<=",
    "value": 50000000
  }
}' > /dev/null

# --- NHÁNH 4: Phó Tổng Giám đốc (PTGD) ---
echo "🔗 Liên kết: PTGD -> Cổng định tuyến PTGD"
create_transition "$STEP_PTGD_ID" "$STEP_ROUTER_PTGD_ID" false '{"actionLabel": "PTGD phê duyệt"}' > /dev/null

echo "🔗 Liên kết: PTGD -> Từ chối"
create_transition "$STEP_PTGD_ID" "$STEP_REJECT_ID" false '{"actionLabel": "PTGD từ chối"}' > /dev/null

# --- NHÁNH 5: Cổng định tuyến PTGD ---
echo "🔗 Cổng định tuyến PTGD -> Hoàn tất (Nếu là Công cụ dụng cụ)"
create_transition "$STEP_ROUTER_PTGD_ID" "$STEP_COMPLETE_ID" true '{
  "actionLabel": "Kết thúc tại PTGD (CCDC)",
  "rules": {
    "field": "proposal_type",
    "operator": "==",
    "value": "Công cụ dụng cụ"
  }
}' > /dev/null

echo "🔗 Cổng định tuyến PTGD -> Hoàn tất (Nếu là Tiêu hao)"
create_transition "$STEP_ROUTER_PTGD_ID" "$STEP_COMPLETE_ID" true '{
  "actionLabel": "Kết thúc tại PTGD (Tiêu hao)",
  "rules": {
    "field": "proposal_type",
    "operator": "==",
    "value": "Tiêu hao"
  }
}' > /dev/null

echo "🔗 Cổng định tuyến PTGD -> TGĐ (Mặc định cho các trường hợp khác)"
create_transition "$STEP_ROUTER_PTGD_ID" "$STEP_TGD_ID" true '{
  "actionLabel": "Chuyển tiếp TGĐ",
  "rules": {
    "field": "total_payment",
    "operator": ">=",
    "value": 0
  }
}' > /dev/null

# --- NHÁNH 6: Tổng Giám đốc (TGĐ) ---
echo "🔗 Liên kết: TGĐ -> Hoàn tất"
create_transition "$STEP_TGD_ID" "$STEP_COMPLETE_ID" false '{"actionLabel": "TGĐ Phê duyệt"}' > /dev/null

echo "🔗 Liên kết: TGĐ -> Từ chối"
create_transition "$STEP_TGD_ID" "$STEP_REJECT_ID" false '{"actionLabel": "TGĐ từ chối"}' > /dev/null

echo "✅ Đã tạo các đường dẫn định tuyến và rẽ nhánh thông minh thành công."

echo ""
echo "============================================="
echo "🚀 7. PHÁT HÀNH QUY TRÌNH (PUBLISH WORKFLOW)"
echo "============================================="

api_patch "workflows/$WORKFLOW_ID/versions/$VERSION_ID/status" '{"status": "PUBLISHED"}' > /dev/null

echo "🎉 CHÚC MỪNG! Quy trình đã được thiết lập thành công."
echo "--------------------------------------------------------"
echo "👉 Hướng dẫn test trực quan:"
echo "1. Mở trang: http://localhost:3002/records"
echo "2. Chọn biểu mẫu: 'Đề xuất Thanh toán Đơn hàng'"
echo "3. Nhấn 'Nộp hồ sơ mới'."
echo "4. Phân loại đề xuất:"
echo "   - Chọn 'Công cụ dụng cụ' hoặc 'Tiêu hao' -> Duyệt tới cấp PTGD là tự động hoàn tất."
echo "   - Chọn 'Sửa chữa cải tạo lớn' -> Luôn chuyển tiếp lên cấp TGĐ phê duyệt."
echo "5. Test các tính năng:"
echo "   - Chọn 'Chuyển khoản' -> Sẽ hiện ra 2 ô 'Số tài khoản' và 'Ngân hàng'."
echo "   - Tích chọn 'Có hợp đồng đính kèm' -> Sẽ bắt buộc phải nhập 'Số hợp đồng'."
echo "   - Ở bảng Danh sách sản phẩm, nhấn '+' để thêm dòng:"
echo "     * Nhập số lượng và đơn giá, cột 'Thành tiền' sẽ tự động tính nhân lên."
echo "     * Dưới chân bảng sẽ tự tính Tổng thành tiền và Trung bình đơn giá."
echo "     * Ô 'Tổng tiền thanh toán' bên ngoài sẽ tự động tính tổng của cả bảng."
echo "5. Nhấn 'Nộp & Trình ký' -> Quy trình sẽ được kích hoạt."
echo "6. Vào trang chủ Dashboard để phê duyệt:"
echo "   - Test case 1: Nếu Tổng tiền <= 50 triệu: Sau khi Trưởng phòng duyệt, hồ sơ sẽ chuyển ngay sang trạng thái 'Đã phê duyệt' (COMPLETED)."
echo "   - Test case 2: Nếu Tổng tiền > 50 triệu: Sau khi Trưởng phòng duyệt, hồ sơ sẽ chuyển tiếp đến bước 'Giám đốc phê duyệt'."
echo "   - Test case 3: Nếu nhấn nút 'Từ chối' ở bất kỳ bước nào, hồ sơ sẽ lập tức dừng quy trình và đổi thành 'Hồ sơ bị từ chối' (REJECTED)."
echo "--------------------------------------------------------"
