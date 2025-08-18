const { Pool } = require('pg');

const db = new Pool({
    user: 'monitor_admin',
    host: 'localhost',
    database: 'website_monitor',
    password: 'secure_dev_password_2024',
    port: 5432,
});

async function runDiagnostic() {
    try {
        console.log('🔍 Database Diagnostic Report');
        console.log('================================');

        // 1. Check users
        const users = await db.query('SELECT id, email, created_at FROM users ORDER BY id');
        console.log(`\n👥 Users (${users.rows.length}):`);
        users.rows.forEach(user => {
            console.log(`   ID: ${user.id}, Email: ${user.email}`);
        });

        // 2. Check websites
        const websites = await db.query('SELECT * FROM websites ORDER BY id');
        console.log(`\n🌐 Websites (${websites.rows.length}):`);
        websites.rows.forEach(site => {
            console.log(`   ID: ${site.id}, Name: ${site.name}, URL: ${site.url}, User: ${site.user_id}`);
        });

        // 3. Check alert_configs
        const alerts = await db.query('SELECT * FROM alert_configs ORDER BY id');
        console.log(`\n🚨 Alert Configs (${alerts.rows.length}):`);
        if (alerts.rows.length === 0) {
            console.log('   ❌ NO ALERT CONFIGS FOUND - This is the problem!');
        } else {
            alerts.rows.forEach(alert => {
                console.log(`   ID: ${alert.id}, Website: ${alert.website_id}, Type: ${alert.alert_type}, Target: ${alert.alert_target}`);
            });
        }

        // 4. Check monitor_results
        const results = await db.query('SELECT * FROM monitor_results ORDER BY check_time DESC LIMIT 5');
        console.log(`\n📊 Recent Monitor Results (${results.rows.length}):`);
        results.rows.forEach(result => {
            console.log(`   Website: ${result.website_id}, Status: ${result.status}, Time: ${result.check_time}`);
        });

        // 5. Check table structure
        console.log('\n🗂️ Table Structure Check:');
        
        const tables = ['users', 'websites', 'alert_configs', 'monitor_results'];
        for (const table of tables) {
            try {
                const tableCheck = await db.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`   ✅ ${table}: ${tableCheck.rows[0].count} rows`);
            } catch (error) {
                console.log(`   ❌ ${table}: ERROR - ${error.message}`);
            }
        }

        // 6. Check for duplicates
        const duplicates = await db.query(`
            SELECT url, COUNT(*) as count 
            FROM websites 
            GROUP BY url 
            HAVING COUNT(*) > 1
        `);
        
        if (duplicates.rows.length > 0) {
            console.log('\n⚠️ Duplicate URLs found:');
            duplicates.rows.forEach(dup => {
                console.log(`   ${dup.url}: ${dup.count} entries`);
            });
        }

        console.log('\n================================');
        console.log('✅ Diagnostic complete!');

    } catch (error) {
        console.error('❌ Diagnostic failed:', error);
    } finally {
        await db.end();
    }
}

runDiagnostic();
