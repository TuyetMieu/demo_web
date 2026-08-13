import { BadRequestException, ValidationError } from '@nestjs/common';

/**
 * exceptionFactory cho ValidationPipe.
 *
 * Mặc định Nest chỉ trả `message: string[]` — MẤT tên field, nên frontend không
 * biết tô đỏ ô nào và chỉ hiện được câu chung chung "Dữ liệu không hợp lệ".
 * Factory này giữ nguyên mảng message (tương thích ngược) và bổ sung map
 * `fields: { <tên field>: <message đầu tiên> }` để FE gắn lỗi đúng từng ô.
 *
 * Đồng thời Việt hoá message mặc định của class-validator: DTO nào quên khai
 * `{ message: '...' }` sẽ ném ra tiếng Anh kiểu "language must be a string" —
 * người dùng cuối nhìn thấy nguyên văn trong alert và không hiểu gì.
 */

/**
 * Rule liên-field phải gắn lên một property bắt buộc để chắc chắn được chạy
 * (xem email-or-phone.validator.ts), nhưng ô cần tô đỏ trên form lại là ô khác.
 * Map này chuyển lỗi về đúng ô người dùng phải sửa.
 */
const CROSS_FIELD_TARGET: Record<string, string> = {
  requireAtLeastOne: 'email', // gắn trên `password`, nhưng lỗi là thiếu email/sđt
};

/** Bản dịch theo TÊN RULE của class-validator (chính xác hơn dịch theo chuỗi). */
const RULE_VI: Record<string, string> = {
  isString: 'phải là văn bản',
  isInt: 'phải là số nguyên',
  isNumber: 'phải là số',
  isPositive: 'phải là số dương',
  isBoolean: 'phải là true hoặc false',
  isArray: 'phải là danh sách',
  isEmail: 'phải là email hợp lệ',
  isDateString: 'phải là ngày hợp lệ',
  isNotEmpty: 'không được để trống',
  isEnum: 'có giá trị không hợp lệ',
  isIn: 'có giá trị không hợp lệ',
  min: 'nhỏ hơn giá trị cho phép',
  max: 'lớn hơn giá trị cho phép',
  minLength: 'quá ngắn',
  maxLength: 'quá dài',
  matches: 'sai định dạng',
};

/**
 * message mặc định của class-validator LUÔN bắt đầu bằng tên property
 * ("language must be a string"), còn message tiếng Việt tự khai thì không —
 * dùng đặc điểm đó để chỉ dịch phần chưa được Việt hoá, không đụng vào message
 * đã viết tay.
 */
function toVietnamese(rule: string, rawMsg: string, property: string): string {
  if (rule === 'whitelistValidation') {
    return `Trường "${property}" không được hệ thống chấp nhận`;
  }
  const isDefaultEnglish = rawMsg.startsWith(property);
  if (!isDefaultEnglish) return rawMsg;

  const viTail = RULE_VI[rule];
  return viTail
    ? `Trường "${property}" ${viTail}`
    : `Trường "${property}" không hợp lệ`;
}

export function validationExceptionFactory(errors: ValidationError[]) {
  const fields: Record<string, string> = {};
  const messages: string[] = [];

  const walk = (errs: ValidationError[], prefix = '') => {
    for (const err of errs) {
      const path = prefix ? `${prefix}.${err.property}` : err.property;
      const entries = err.constraints ? Object.entries(err.constraints) : [];

      for (const [rule, rawMsg] of entries) {
        const msg = toVietnamese(rule, rawMsg, err.property);
        messages.push(msg);
        // Chỉ giữ message ĐẦU TIÊN của mỗi field: hiển thị 3 lỗi chồng nhau
        // trên cùng một ô input chỉ làm rối, người dùng sửa xong lỗi đầu sẽ
        // thấy lỗi kế tiếp ở lần submit sau.
        const target = CROSS_FIELD_TARGET[rule] ?? path;
        if (!fields[target]) fields[target] = msg;
      }
      if (err.children?.length) walk(err.children, path);
    }
  };
  walk(errors);

  return new BadRequestException({
    // Message chung là lỗi cụ thể đầu tiên, KHÔNG phải câu chung chung — để
    // toast/alert của client luôn nói rõ sai ở đâu kể cả khi client không đọc
    // được `fields`.
    message: messages,
    fields,
  });
}
