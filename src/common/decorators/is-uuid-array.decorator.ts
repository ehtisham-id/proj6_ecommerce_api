import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsUUIDArray(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isUUIDArray',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!Array.isArray(value)) return false;
          return value.every((v) => typeof v === 'string' && /^[0-9a-fA-F-]{36}$/.test(v));
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be an array of UUIDs`;
        },
      },
    });
  };
}
