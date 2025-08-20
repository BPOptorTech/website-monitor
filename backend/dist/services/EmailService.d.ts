export interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
}
export declare class EmailService {
    private transporter;
    constructor(config: EmailConfig);
    sendDowntimeAlert(monitorName: string, url: string, errorDetails: string, alertEmail: string): Promise<void>;
}
//# sourceMappingURL=EmailService.d.ts.map