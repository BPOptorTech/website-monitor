import { Request, Response } from 'express';
import { CreateUserData, LoginData } from '../models/User';
export declare const register: (req: Request<{}, {}, CreateUserData>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const login: (req: Request<{}, {}, LoginData>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=authController.d.ts.map