export interface SSLResult {
    websiteId: number;
    certificateValid: boolean;
    expiresAt: Date | null;
    daysUntilExpiry: number | null;
    issuer: string | null;
    securityGrade: string;
    certificateChainValid: boolean;
}
export declare class SSLMonitor {
    checkSSL(websiteId: number, url: string): Promise<SSLResult>;
    private getCertificate;
    private analyzeCertificate;
    private isSelfSignedCertificate;
    private calculateSecurityGrade;
    private createInvalidResult;
    private saveSSLResult;
    getSSLStatus(websiteId: number): Promise<SSLResult | null>;
    checkExpiringCertificates(dayThreshold?: number): Promise<any[]>;
}
export declare const sslMonitor: SSLMonitor;
//# sourceMappingURL=SSLMonitor.d.ts.map