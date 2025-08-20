"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sslMonitor = exports.SSLMonitor = void 0;
const tls = __importStar(require("tls"));
const url_1 = require("url");
const database_1 = __importDefault(require("../config/database"));
class SSLMonitor {
    async checkSSL(websiteId, url) {
        try {
            const urlObj = new url_1.URL(url);
            if (urlObj.protocol !== 'https:') {
                return this.createInvalidResult(websiteId, 'Non-HTTPS URL');
            }
            const certificate = await this.getCertificate(urlObj.hostname, urlObj.port || '443');
            const result = this.analyzeCertificate(websiteId, certificate);
            await this.saveSSLResult(result);
            return result;
        }
        catch (error) {
            console.error(`SSL check failed for ${url}:`, error);
            const result = this.createInvalidResult(websiteId, 'SSL check failed');
            await this.saveSSLResult(result);
            return result;
        }
    }
    async getCertificate(hostname, port) {
        return new Promise((resolve, reject) => {
            const options = {
                host: hostname,
                port: parseInt(port),
                servername: hostname,
                rejectUnauthorized: false // We want to check even invalid certs
            };
            const socket = tls.connect(options, () => {
                const certificate = socket.getPeerCertificate(true);
                socket.end();
                resolve(certificate);
            });
            socket.on('error', (error) => {
                reject(error);
            });
            socket.setTimeout(30000, () => {
                socket.destroy();
                reject(new Error('SSL connection timeout'));
            });
        });
    }
    analyzeCertificate(websiteId, certificate) {
        const now = new Date();
        const expiresAt = new Date(certificate.valid_to);
        const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        // Extract issuer organization - try different possible fields
        let issuerMatch = 'Unknown';
        if (certificate.issuer) {
            issuerMatch = certificate.issuer.O || certificate.issuer.CN || certificate.issuer.organizationName || 'Unknown';
        }
        // Calculate security grade based on various factors
        const securityGrade = this.calculateSecurityGrade(certificate, daysUntilExpiry);
        // Check if certificate is currently valid
        const validFrom = new Date(certificate.valid_from);
        // Check for self-signed - use different approaches as the property might vary
        const isSelfSigned = this.isSelfSignedCertificate(certificate);
        const certificateValid = now >= validFrom && now <= expiresAt && !isSelfSigned;
        // Basic chain validation
        const certificateChainValid = !isSelfSigned && certificateValid;
        return {
            websiteId,
            certificateValid,
            expiresAt,
            daysUntilExpiry,
            issuer: issuerMatch,
            securityGrade,
            certificateChainValid
        };
    }
    isSelfSignedCertificate(certificate) {
        // Multiple ways to detect self-signed certificates
        if (certificate.issuer && certificate.subject) {
            // Compare issuer and subject - if they're the same, it's likely self-signed
            const issuerCN = certificate.issuer.CN || certificate.issuer.commonName || '';
            const subjectCN = certificate.subject.CN || certificate.subject.commonName || '';
            if (issuerCN && subjectCN && issuerCN === subjectCN) {
                return true;
            }
        }
        // Check if explicitly marked as self-signed (property name may vary)
        if (certificate.selfSigned !== undefined) {
            return certificate.selfSigned;
        }
        return false;
    }
    calculateSecurityGrade(certificate, daysUntilExpiry) {
        let score = 100;
        // Deduct points for various issues
        if (this.isSelfSignedCertificate(certificate))
            score -= 50;
        if (daysUntilExpiry < 0)
            score -= 40; // Expired
        if (daysUntilExpiry < 30 && daysUntilExpiry >= 0)
            score -= 20; // Expires soon
        if (daysUntilExpiry < 7 && daysUntilExpiry >= 0)
            score -= 30; // Expires very soon
        // Check signature algorithm (try different property names)
        let sigAlg = '';
        if (certificate.signatureAlgorithm) {
            sigAlg = certificate.signatureAlgorithm.toLowerCase();
        }
        else if (certificate.sigalg) {
            sigAlg = certificate.sigalg.toLowerCase();
        }
        if (sigAlg.includes('sha1'))
            score -= 30; // SHA1 is deprecated
        if (sigAlg.includes('md5'))
            score -= 50; // MD5 is very weak
        // Convert score to letter grade
        if (score >= 90)
            return 'A+';
        if (score >= 80)
            return 'A';
        if (score >= 70)
            return 'B';
        if (score >= 60)
            return 'C';
        if (score >= 50)
            return 'D';
        return 'F';
    }
    createInvalidResult(websiteId, reason) {
        return {
            websiteId,
            certificateValid: false,
            expiresAt: null,
            daysUntilExpiry: null,
            issuer: null,
            securityGrade: 'F',
            certificateChainValid: false
        };
    }
    async saveSSLResult(result) {
        try {
            await database_1.default.query(`
        INSERT INTO ssl_monitoring 
        (website_id, certificate_valid, expires_at, days_until_expiry, issuer, security_grade, certificate_chain_valid)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
                result.websiteId,
                result.certificateValid,
                result.expiresAt,
                result.daysUntilExpiry,
                result.issuer,
                result.securityGrade,
                result.certificateChainValid
            ]);
        }
        catch (error) {
            console.error('❌ Error saving SSL result:', error);
        }
    }
    async getSSLStatus(websiteId) {
        try {
            const result = await database_1.default.query(`
        SELECT * FROM ssl_monitoring 
        WHERE website_id = $1 
        ORDER BY last_checked DESC 
        LIMIT 1
      `, [websiteId]);
            if (result.rows.length === 0)
                return null;
            const row = result.rows[0];
            return {
                websiteId: row.website_id,
                certificateValid: row.certificate_valid,
                expiresAt: row.expires_at,
                daysUntilExpiry: row.days_until_expiry,
                issuer: row.issuer,
                securityGrade: row.security_grade,
                certificateChainValid: row.certificate_chain_valid
            };
        }
        catch (error) {
            console.error('❌ Error getting SSL status:', error);
            return null;
        }
    }
    async checkExpiringCertificates(dayThreshold = 30) {
        try {
            const result = await database_1.default.query(`
        SELECT DISTINCT ON (s.website_id) 
          s.*, w.name, w.url 
        FROM ssl_monitoring s
        JOIN websites w ON s.website_id = w.id
        WHERE s.days_until_expiry <= $1 
        AND s.days_until_expiry >= 0
        ORDER BY s.website_id, s.last_checked DESC
      `, [dayThreshold]);
            return result.rows;
        }
        catch (error) {
            console.error('❌ Error checking expiring certificates:', error);
            return [];
        }
    }
}
exports.SSLMonitor = SSLMonitor;
exports.sslMonitor = new SSLMonitor();
//# sourceMappingURL=SSLMonitor.js.map