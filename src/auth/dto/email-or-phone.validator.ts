import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Bắt buộc có ít nhất 1 trong các field được liệt kê.
 *
 * PHẢI gắn lên một field LUÔN BẮT BUỘC (vd: password), KHÔNG gắn lên field có
 * @IsOptional(): class-validator bỏ qua mọi validator còn lại của property khi
 * giá trị undefined, nên đặt ở đó thì rule này không bao giờ chạy.
 */
export function RequireAtLeastOne(
  fields: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'requireAtLeastOne',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [fields],
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const [names] = args.constraints as [string[]];
          const target = args.object as Record<string, unknown>;
          return names.some(
            (n) => typeof target[n] === 'string' && target[n].trim().length > 0,
          );
        },
        defaultMessage() {
          return 'Vui lòng nhập email hoặc số điện thoại';
        },
      },
    });
  };
}
