import { ErrorMapperUtils } from '../error-mapper.utils';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  HttpStatus,
} from '@nestjs/common';

describe('ErrorMapperUtils', () => {
  describe('mapError', () => {
    it('should return the same error if it is an instance of HttpException', () => {
      const error = new BadRequestException('Test Error');
      expect(ErrorMapperUtils.mapError(error)).toBe(error);
    });

    it('should map EntityNotFoundError to NotFoundException', () => {
      const error = { name: 'EntityNotFoundError', message: 'Not found' };
      const result = ErrorMapperUtils.mapError(error);
      expect(result).toBeInstanceOf(NotFoundException);
      expect(result.message).toBe('Not found');
    });

    it('should map QueryFailedError duplicate key to BadRequestException', () => {
      const error = { name: 'QueryFailedError', code: '23505' };
      const result = ErrorMapperUtils.mapError(error);
      expect(result).toBeInstanceOf(BadRequestException);
      expect(result.message).toBe('Duplicate entry found');
    });

    it('should map unknown error to InternalServerErrorException', () => {
      const error = new Error('Unknown');
      const result = ErrorMapperUtils.mapError(error);
      expect(result).toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('mapValidationError', () => {
    it('should return structured validation error response', () => {
      const errors = ['Email is invalid', 'Phone is required'];
      const result = ErrorMapperUtils.mapValidationError(errors);
      expect(result).toEqual({
        success: false,
        message: 'Validation failed',
        errors,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    });
  });
});
