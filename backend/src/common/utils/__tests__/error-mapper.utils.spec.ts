import { ErrorMapperUtils } from '../error-mapper.utils';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  HttpStatus,
} from '@nestjs/common';
import {
  ResourceNotFoundError,
  DuplicateEntryError,
  SystemError,
} from '../../errors/domain-errors';

describe('ErrorMapperUtils', () => {
  describe('mapError', () => {
    it('should return the same error if it is an instance of HttpException', () => {
      const error = new BadRequestException('Test Error');
      expect(ErrorMapperUtils.mapError(error)).toBe(error);
    });

    it('should map EntityNotFoundError to ResourceNotFoundError', () => {
      const error = { name: 'EntityNotFoundError', message: 'Not found' };
      const result = ErrorMapperUtils.mapError(error);
      expect(result).toBeInstanceOf(ResourceNotFoundError);
      expect(result.message).toBe('Not found');
    });

    it('should map QueryFailedError duplicate key to DuplicateEntryError', () => {
      const error = { name: 'QueryFailedError', code: '23505' };
      const result = ErrorMapperUtils.mapError(error);
      expect(result).toBeInstanceOf(DuplicateEntryError);
      expect(result.message).toBe('Duplicate entry found');
    });

    it('should map unknown error to SystemError', () => {
      const error = new Error('Unknown');
      const result = ErrorMapperUtils.mapError(error);
      expect(result).toBeInstanceOf(SystemError);
    });
  });

  describe('mapValidationError', () => {
    it('should return structured validation error response', () => {
      const errors = ['Email is invalid', 'Phone is required'];
      const result = ErrorMapperUtils.mapValidationError(errors);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Validation failed');
      expect(result.errors).toEqual(errors);
      expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(result.code).toBeDefined();
    });
  });
});
