import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import {
  emptyToUndefined,
  PHONE_MESSAGE,
  PHONE_REGEX,
} from 'src/auth/dto/register.dto';

/**
 * Form hồ sơ luôn gửi cả 4 trường; ô để trống gửi chuỗi rỗng.
 *
 * KHÔNG có @Transform thì '' đi thẳng xuống service và ghi đè users.email —
 * cột NOT NULL + UNIQUE. Hậu quả: (1) người đó mất email, không đăng nhập bằng
 * email được nữa; (2) người thứ hai làm vậy đụng lỗi trùng khoá. Quy '' về
 * undefined để service bỏ qua trường không nhập, đúng ngữ nghĩa "chỉ cập nhật
 * trường có gửi".
 */
export class UpdateProfileDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Họ tên không hợp lệ' })
  name?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone?: string;

  // Nhận chuỗi 'YYYY-MM-DD' (cột DB là @db.Date), service tự parse sang Date.
  @IsOptional()
  @IsString({ message: 'Ngày sinh không hợp lệ' })
  birthday?: string;
}

export class ChangePasswordDto {
  @IsString({ message: 'Vui lòng nhập mật khẩu hiện tại' })
  @MinLength(1, { message: 'Vui lòng nhập mật khẩu hiện tại' })
  current!: string;

  @IsString({ message: 'Vui lòng nhập mật khẩu mới' })
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  new!: string;
}

/**
 * Câu hỏi nhiều lựa chọn gửi lên MẢNG (hoặc mảng rỗng khi người dùng không
 * chọn gì — ví dụ câu "ngôn ngữ đã biết" bị ẩn khi chọn "chưa có kinh nghiệm").
 * Quy về chuỗi ngăn cách ', ' và bỏ hẳn trường khi rỗng, thay vì để
 * ValidationPipe báo "language must be a string" — câu người dùng không hiểu.
 */
const toCommaString = ({ value }: { value: unknown }) => {
  if (Array.isArray(value)) {
    const joined = value
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      .join(', ');
    return joined === '' ? undefined : joined;
  }
  return typeof value === 'string' && value.trim() === '' ? undefined : value;
};

/**
 * Khảo sát định hướng — PHẢI khai đủ 11 trường của form questionaire.
 *
 * ValidationPipe chạy với forbidNonWhitelisted:true nên bất kỳ trường nào form
 * gửi lên mà DTO không khai đều làm cả request 400 ("property X should not
 * exist") — trước đây DTO chỉ có 5/11 trường nên KHÔNG AI hoàn thành được khảo
 * sát. Ba trường career_target/language/domain là đầu vào của
 * pickRoadmapTemplate; số còn lại chỉ lưu vào surveys.data_json để phân tích.
 *
 * Câu chọn nhiều đáp án (purpose, goal, language, domain, skill_detail) có thể
 * đến dưới dạng mảng — @Transform(toCommaString) quy hết về chuỗi, nên MỌI
 * trường đều khai @IsString kèm message tiếng Việt (message mặc định của
 * class-validator là tiếng Anh, người dùng cuối không hiểu).
 */
const INVALID = (field: string) => ({
  message: `Câu trả lời cho "${field}" không hợp lệ`,
});

export class SurveyDto {
  @IsOptional()
  @Transform(toCommaString)
  @IsString(INVALID('nghề nghiệp'))
  job?: string;

  @IsOptional()
  @Transform(toCommaString)
  @IsString(INVALID('mục đích học'))
  purpose?: string;

  @IsOptional()
  @Transform(toCommaString)
  @IsString(INVALID('kinh nghiệm'))
  experience?: string;

  @IsOptional()
  @Transform(toCommaString)
  @IsString(INVALID('ngôn ngữ đã biết'))
  language?: string;

  @IsOptional()
  @Transform(toCommaString)
  @IsString(INVALID('trình độ'))
  level?: string;

  @IsOptional()
  @Transform(toCommaString)
  @IsString(INVALID('kỹ năng muốn học'))
  skill_detail?: string;

  @IsOptional()
  @Transform(toCommaString)
  @IsString(INVALID('mục tiêu'))
  goal?: string;

  @IsOptional()
  @Transform(toCommaString)
  @IsString(INVALID('lĩnh vực quan tâm'))
  domain?: string;

  @IsOptional()
  @Transform(toCommaString)
  @IsString(INVALID('định hướng nghề nghiệp'))
  career_target?: string;

  /** Số giờ học mỗi tuần. */
  @IsOptional()
  @Transform(toCommaString)
  @IsString(INVALID('thời gian học mỗi tuần'))
  time?: string;

  /** Mốc thời gian muốn đạt mục tiêu. */
  @IsOptional()
  @Transform(toCommaString)
  @IsString(INVALID('thời hạn đạt mục tiêu'))
  timeline?: string;
}
