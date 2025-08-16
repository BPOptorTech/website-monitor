-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    subscription_tier VARCHAR(20) DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'professional', 'enterprise')),
    stripe_customer_id VARCHAR(255),
    subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'past_due')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Websites table
CREATE TABLE websites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    check_interval INTEGER DEFAULT 300, -- seconds
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alerts table
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    website_id INTEGER REFERENCES websites(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'down', 'slow', 'ssl_expiry'
    message TEXT NOT NULL,
    is_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE monitor_configs (
    id SERIAL PRIMARY KEY,
    website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    check_interval INTEGER DEFAULT 300,
    timeout INTEGER DEFAULT 30,
    enabled BOOLEAN DEFAULT true,
    monitor_type VARCHAR(20) DEFAULT 'uptime',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Store all monitoring check results
CREATE TABLE monitor_results (
    id SERIAL PRIMARY KEY,
    website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL,
    response_time INTEGER,
    status_code INTEGER,
    error_message TEXT,
    ssl_expiry_days INTEGER,
    performance_score INTEGER,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alert configurations
CREATE TABLE alert_configs (
    id SERIAL PRIMARY KEY,
    website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    triggers JSONB DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track sent alerts to prevent spam
CREATE TABLE alert_history (
    id SERIAL PRIMARY KEY,
    website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    message TEXT,
    status VARCHAR(10) DEFAULT 'sent',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_websites_user_id ON websites(user_id);
CREATE INDEX idx_alerts_website_id ON alerts(website_id);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
CREATE INDEX idx_monitor_results_website_time ON monitor_results(website_id, checked_at DESC);
CREATE INDEX idx_monitor_results_status ON monitor_results(status, checked_at DESC);
CREATE INDEX idx_alert_history_website ON alert_history(website_id, sent_at DESC);

-- Default monitoring config for existing websites
INSERT INTO monitor_configs (website_id, check_interval, enabled) 
SELECT id, 300, true FROM websites;