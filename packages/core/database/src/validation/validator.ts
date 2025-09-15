import { z } from 'zod';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export class DataValidator {
  /**
   * Validate data against a Zod schema
   */
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
    try {
      const result = schema.safeParse(data);
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      } else {
        return {
          success: false,
          errors: result.error.errors.map(err => 
            `${err.path.join('.')}: ${err.message}`
          ),
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Validate and transform data, throwing on validation failure
   */
  static validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = this.validate(schema, data);
    
    if (!result.success) {
      throw new Error(`Validation failed: ${result.errors?.join(', ')}`);
    }
    
    return result.data!;
  }

  /**
   * Create a validation middleware for Express/Next.js
   */
  static createValidationMiddleware<T>(schema: z.ZodSchema<T>, target: 'body' | 'query' | 'params' = 'body') {
    return (req: any, res: any, next: any) => {
      const dataToValidate = req[target];
      const result = this.validate(schema, dataToValidate);
      
      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: result.errors,
            timestamp: new Date().toISOString(),
          },
        });
      }
      
      // Replace the original data with validated/transformed data
      req[target] = result.data;
      next();
    };
  }

  /**
   * Validate multiple fields with different schemas
   */
  static validateMultiple(validations: Array<{
    schema: z.ZodSchema<any>;
    data: unknown;
    field: string;
  }>): ValidationResult<Record<string, any>> {
    const results: Record<string, any> = {};
    const errors: string[] = [];

    for (const validation of validations) {
      const result = this.validate(validation.schema, validation.data);
      
      if (result.success) {
        results[validation.field] = result.data;
      } else {
        errors.push(...(result.errors || []).map(err => `${validation.field}.${err}`));
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors,
      };
    }

    return {
      success: true,
      data: results,
    };
  }

  /**
   * Validate partial updates (only validate provided fields)
   */
  static validatePartial<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<Partial<T>> {
    if (!data || typeof data !== 'object') {
      return {
        success: false,
        errors: ['Data must be an object'],
      };
    }

    // Create a partial schema that only validates provided fields
    // Use schema as-is if it doesn't have partial method
    const partialSchema = 'partial' in schema && typeof (schema as any).partial === 'function' 
      ? (schema as any).partial() 
      : schema;
    return this.validate(partialSchema, data);
  }

  /**
   * Sanitize and validate user input
   */
  static sanitizeAndValidate<T>(
    schema: z.ZodSchema<T>, 
    data: unknown,
    sanitizers?: Array<(value: any) => any>
  ): ValidationResult<T> {
    let sanitizedData = data;

    // Apply sanitizers if provided
    if (sanitizers && sanitizedData) {
      for (const sanitizer of sanitizers) {
        sanitizedData = sanitizer(sanitizedData);
      }
    }

    return this.validate(schema, sanitizedData);
  }
}

// Common sanitizers
export const sanitizers = {
  trimStrings: (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizers.trimStrings);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizers.trimStrings(value);
      }
      return sanitized;
    }
    return obj;
  },

  removeEmptyStrings: (obj: any): any => {
    if (typeof obj === 'string') {
      return obj === '' ? undefined : obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizers.removeEmptyStrings).filter(item => item !== undefined);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedValue = sanitizers.removeEmptyStrings(value);
        if (sanitizedValue !== undefined) {
          sanitized[key] = sanitizedValue;
        }
      }
      return sanitized;
    }
    return obj;
  },

  normalizeEmail: (obj: any): any => {
    if (typeof obj === 'string' && obj.includes('@')) {
      return obj.toLowerCase().trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizers.normalizeEmail);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = key.toLowerCase().includes('email') 
          ? sanitizers.normalizeEmail(value)
          : value;
      }
      return sanitized;
    }
    return obj;
  },
};