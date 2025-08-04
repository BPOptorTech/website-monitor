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

-- Monitoring checks table
CREATE TABLE monitoring_checks (
    id SERIAL PRIMARY KEY,
    website_id INTEGER REFERENCES websites(id) ON DELETE CASCADE,
    status_code INTEGER,
    response_time INTEGER, -- milliseconds
    is_up BOOLEAN NOT NULL,
    error_message TEXT,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_websites_user_id ON websites(user_id);
CREATE INDEX idx_monitoring_checks_website_id ON monitoring_checks(website_id);
CREATE INDEX idx_monitoring_checks_checked_at ON monitoring_checks(checked_at);
CREATE INDEX idx_alerts_website_id ON alerts(website_id);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
