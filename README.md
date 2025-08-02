# Website Health Monitoring Platform

Multi-tiered SaaS platform for website uptime and performance monitoring.

## Architecture
- Frontend: Next.js 14 with TypeScript
- Backend: Node.js with Express
- Database: PostgreSQL
- Queue System: Redis + Bull
- Monitoring: Cloudflare Workers + Custom agents

## Tiers
- Basic ($10/mo): 5 sites, 5-min intervals, email alerts
- Professional ($25/mo): 25 sites, 1-min intervals, SMS + performance
- Enterprise ($50/mo): 100 sites, 30-sec intervals, full monitoring

## Development Setup
See docs/development.md for setup instructions.
