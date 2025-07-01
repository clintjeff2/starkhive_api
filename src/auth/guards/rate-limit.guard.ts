import { Injectable, ExecutionContext, HttpException, Inject } from '@nestjs/common';
import {
  ThrottlerGuard,
  ThrottlerStorage,
  ThrottlerLimitDetail,
} from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  constructor(
    @Inject('THROTTLER_OPTIONS') options: any,
    @Inject('THROTTLER_STORAGE') storage: ThrottlerStorage,
    @Inject(Reflector) reflector: Reflector,
  ) {
    super(options, storage, reflector);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use user id if available, otherwise IP
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }
    return `ip:${req.ip}`;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException('Too many requests, please try again later.', 429);
  }
}
