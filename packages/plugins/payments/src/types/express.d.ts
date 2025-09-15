import { Request } from 'express';

declare module 'express' {
  interface Request {
    user?: {
      id: string;
      tenantId: string;
      email: string;
      role: string;
    };
  }
}