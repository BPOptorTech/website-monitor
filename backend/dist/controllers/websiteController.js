"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWebsite = exports.updateWebsite = exports.getWebsites = exports.createWebsite = void 0;
const database_1 = __importDefault(require("../config/database"));
const createWebsite = async (req, res) => {
    try {
        const { name, url, alertEmails } = req.body;
        const userId = req.userId;
        // Validate required fields
        if (!name || !url) {
            return res.status(400).json({
                success: false,
                error: 'Name and URL are required'
            });
        }
        // Validate URL format
        try {
            new URL(url);
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid URL format'
            });
        }
        // Start a database transaction
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Insert the website
            const websiteResult = await client.query('INSERT INTO websites (user_id, name, url) VALUES ($1, $2, $3) RETURNING *', [userId, name, url]);
            const website = websiteResult.rows[0];
            const websiteId = website.id;
            // Automatically create monitoring config
            await client.query('INSERT INTO monitor_configs (website_id, check_interval, timeout, enabled, monitor_type) VALUES ($1, $2, $3, $4, $5)', [websiteId, 300, 30, true, 'uptime'] // 5 minute intervals, 30 second timeout
            );
            // Create alert configs if emails provided
            if (alertEmails && alertEmails.length > 0) {
                for (const email of alertEmails) {
                    if (email.trim()) {
                        await client.query('INSERT INTO alert_configs (website_id, alert_type, destination, triggers, enabled) VALUES ($1, $2, $3, $4, $5)', [
                            websiteId,
                            'email',
                            email.trim(),
                            JSON.stringify({ downtime: true, slow_response: 5000 }), // Alert on downtime and >5s response
                            true
                        ]);
                    }
                }
            }
            await client.query('COMMIT');
            console.log(`🆕 New website added: ${name} (${url}) with auto-monitoring enabled`);
            if (alertEmails && alertEmails.length > 0) {
                console.log(`📧 Alert emails configured: ${alertEmails.join(', ')}`);
            }
            res.status(201).json({
                success: true,
                data: {
                    ...website,
                    monitoringEnabled: true,
                    alertEmails: alertEmails || []
                }
            });
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Error creating website:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create website'
        });
    }
};
exports.createWebsite = createWebsite;
const getWebsites = async (req, res) => {
    try {
        const userId = req.userId;
        const result = await database_1.default.query(`
      SELECT 
        w.*,
        mc.enabled as monitoring_enabled,
        mc.check_interval,
        COALESCE(
          JSON_AGG(
            CASE WHEN ac.alert_type = 'email' 
            THEN ac.destination 
            ELSE NULL END
          ) FILTER (WHERE ac.alert_type = 'email'), 
          '[]'
        ) as alert_emails
      FROM websites w
      LEFT JOIN monitor_configs mc ON w.id = mc.website_id
      LEFT JOIN alert_configs ac ON w.id = ac.website_id AND ac.enabled = true
      WHERE w.user_id = $1
      GROUP BY w.id, mc.enabled, mc.check_interval
      ORDER BY w.created_at DESC
    `, [userId]);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        console.error('Error fetching websites:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch websites'
        });
    }
};
exports.getWebsites = getWebsites;
const updateWebsite = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, url, alertEmails } = req.body;
        const userId = req.userId;
        // Verify website belongs to user
        const websiteCheck = await database_1.default.query('SELECT id FROM websites WHERE id = $1 AND user_id = $2', [id, userId]);
        if (websiteCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Website not found'
            });
        }
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Update website
            if (name || url) {
                await client.query('UPDATE websites SET name = COALESCE($1, name), url = COALESCE($2, url), updated_at = CURRENT_TIMESTAMP WHERE id = $3', [name, url, id]);
            }
            // Update alert emails if provided
            if (alertEmails !== undefined) {
                // Remove existing email alerts
                await client.query('DELETE FROM alert_configs WHERE website_id = $1 AND alert_type = $2', [id, 'email']);
                // Add new email alerts
                if (alertEmails && alertEmails.length > 0) {
                    for (const email of alertEmails) {
                        if (email.trim()) {
                            await client.query('INSERT INTO alert_configs (website_id, alert_type, destination, triggers, enabled) VALUES ($1, $2, $3, $4, $5)', [
                                id,
                                'email',
                                email.trim(),
                                JSON.stringify({ downtime: true, slow_response: 5000 }),
                                true
                            ]);
                        }
                    }
                }
            }
            await client.query('COMMIT');
            res.json({
                success: true,
                message: 'Website updated successfully'
            });
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Error updating website:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update website'
        });
    }
};
exports.updateWebsite = updateWebsite;
const deleteWebsite = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        // Verify website belongs to user and delete (cascade will handle related records)
        const result = await database_1.default.query('DELETE FROM websites WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Website not found'
            });
        }
        console.log(`🗑️ Website deleted: ${result.rows[0].name} (${result.rows[0].url})`);
        res.json({
            success: true,
            message: 'Website deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting website:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete website'
        });
    }
};
exports.deleteWebsite = deleteWebsite;
//# sourceMappingURL=websiteController.js.map