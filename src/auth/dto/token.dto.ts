import { IsOptional, IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @IsString({ message: 'Thiếu refresh token' })
  @MinLength(1, { message: 'Thiếu refresh token' })
  refresh!: string;
}

/** Logout: refresh là tuỳ chọn — không gửi vẫn trả ok. */
export class LogoutDto {
  @IsOptional()
  @IsString()
  refresh?: string;
}
