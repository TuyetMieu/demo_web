import { Transform } from 'class-transformer';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { emptyToUndefined } from './register.dto';
import { RequireAtLeastOne } from './email-or-phone.validator';

export class LoginDto {
  // Không dùng @IsEmail(): bản Django cho phép đăng nhập bằng email HOẶC sđt,
  // ép định dạng email ở đây sẽ chặn luôn nhánh đăng nhập bằng sđt.
  // @Transform: ô bỏ trống gửi lên chuỗi rỗng, phải quy về undefined để
  // RequireAtLeastOne báo đúng "thiếu email/sđt" thay vì lỗi khó hiểu khác.
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Email không hợp lệ' })
  email?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Số điện thoại không hợp lệ' })
  phone?: string;

  // RequireAtLeastOne đặt ở đây (field bắt buộc) chứ không đặt trên email —
  // xem giải thích trong email-or-phone.validator.ts.
  @IsString({ message: 'Mật khẩu không được để trống' })
  @MinLength(1, { message: 'Mật khẩu không được để trống' })
  @RequireAtLeastOne(['email', 'phone'])
  password!: string;
}
