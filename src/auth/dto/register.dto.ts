import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RequireAtLeastOne } from './email-or-phone.validator';

/**
 * Regex + message port NGUYÊN VĂN từ backend/accounts/validators.py của bản Django:
 *   nội địa: 0 + 9 số | quốc tế: +<mã 1-3 số> + 9 số
 */
export const PHONE_REGEX = /^(0\d{9}|\+\d{1,3}\d{9})$/;
export const PHONE_MESSAGE =
  'Số điện thoại phải có 10 số (VD: 0912345678) hoặc mã quốc gia + 9 số (VD: +84912345678)';

/**
 * Form đăng ký gửi CẢ email lẫn phone, ô nào người dùng bỏ trống thì gửi chuỗi
 * rỗng. @IsOptional() của class-validator chỉ bỏ qua undefined/null — chuỗi rỗng
 * vẫn bị đưa qua @Matches nên đăng ký bằng email (bỏ trống sđt) luôn báo lỗi
 * định dạng số điện thoại. Chuẩn hoá '' -> undefined TRƯỚC khi validate.
 */
export const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class RegisterDto {
  @IsString({ message: 'Tên không được để trống' })
  @MinLength(1, { message: 'Tên không được để trống' })
  @MaxLength(100, { message: 'Tên không được vượt quá 100 ký tự' })
  name!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: PHONE_MESSAGE })
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone?: string;

  // Django validate_password_field: 8..128 ký tự (KHÔNG phải 6).
  @IsString({ message: 'Mật khẩu không được để trống' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @MaxLength(128, { message: 'Mật khẩu không được vượt quá 128 ký tự' })
  @RequireAtLeastOne(['email', 'phone'])
  password!: string;
}
