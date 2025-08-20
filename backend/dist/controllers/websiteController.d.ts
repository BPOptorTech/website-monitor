import { Request, Response } from 'express';
export declare const createWebsite: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getWebsites: (req: Request, res: Response) => Promise<void>;
export declare const updateWebsite: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteWebsite: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=websiteController.d.ts.map