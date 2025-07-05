import { SetMetadata } from '@nestjs/common';

export const EXCLUDE_FROM_QUERY = 'excludeFromQuery';

export const ExcludeFromQuery = (): PropertyDecorator => {
  return (target: any, propertyKey: string | symbol) => {
    Reflect.defineMetadata(EXCLUDE_FROM_QUERY, true, target, propertyKey);
  };
};

export { EXCLUDE_FROM_QUERY as EXCLUDE_FROM_QUERY_KEY };
