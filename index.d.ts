declare module 'express-toolkit' {
  import { NextFunction, Request, Response, Router } from 'express';
  import { Document, Model } from 'mongoose';

  export function buildRouter(config: {
    controller: Controller;
    endpoints?: { [key: string]: boolean };
    id?: string;
    options?: object;
  }): Router;

  export class Controller {
    constructor(config: {
      name: string;
      model: Model<Document>;
      id?: string;
      defaultSkipValue?: number;
      defaultLimitValue?: number;
      useUpdateOne?: boolean;
    });

    find(query: object): Promise<any[]>;
    findOne(query: object): Promise<any>;
    findById(id: string | number, query?: object): Promise<any>;
    create(data: object | object[]): Promise<any>;
    bulkCreate(data: object[]): Promise<any[]>;
    bulkUpdate(documents: object[]): Promise<any>;
    updateByQuery(query: object, update: object): Promise<any>;
    updateById(id: string | number, update: object, query?: object): Promise<any>;
    replaceById(id: string | number, replacement: object, query?: object): Promise<any>;
    deleteByQuery(query: object): Promise<any>;
    deleteById(id: string | number, query?: object): Promise<any>;
    count(query: object): Promise<number>;
    patchById(id: string | number, operations: object[], query?: object): Promise<any>;
    registerHook(eventName: string, handler: (req: Request, res: Response, next: NextFunction) => void): void;
    getHooks(eventName: string): ((req: Request, res: Response, next: NextFunction) => void)[];
  }

  export class Resource {
    constructor(config: {
      name: string;
      model: Model<Document>;
      endpoints?: { [key: string]: boolean };
      id?: string;
      defaultSkipValue?: number;
      defaultLimitValue?: number;
    });

    getRouter(): Router;
    rebuildRouter(): Router;
    mount(path: string, app: any): void;
    registerHook(eventName: string, handler: (req: Request, res: Response, next: NextFunction) => void): void;
    readonly router: Router;
  }

  export const utils: {
    asyncMiddleware(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): (req: Request, res: Response, next: NextFunction) => void;
    isJSON(str: string): boolean;
    getSorting(query: object): object;
    getProjection(query: object): object | null;
  };
}