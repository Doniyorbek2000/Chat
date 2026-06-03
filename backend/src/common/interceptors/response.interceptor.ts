import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  meta?: any;
  message?: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        const meta = data?.meta;
        const message = data?.message;
        const actualData = data?.data !== undefined ? data.data : data;

        if (meta !== undefined || message !== undefined) {
          return {
            success: true,
            data: actualData,
            ...(meta && { meta }),
            ...(message && { message }),
          };
        }

        return {
          success: true,
          data,
        };
      }),
    );
  }
}
