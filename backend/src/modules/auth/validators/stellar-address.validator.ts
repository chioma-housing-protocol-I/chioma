import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isStellarAddress', async: false })
export class IsStellarAddressConstraint implements ValidatorConstraintInterface {
  validate(address: string) {
    if (!address) return false;

    // Stellar addresses start with 'G' and are 56 characters long
    // They contain only base32 characters (A-Z and 2-7)
    const stellarAddressRegex = /^G[A-Z2-7]{55}$/;
    return stellarAddressRegex.test(address);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid Stellar public key (starts with 'G' and is 56 characters long)`;
  }
}

export function IsStellarAddress(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStellarAddressConstraint,
    });
  };
}
