# 🎯 Trivia Platform

A simple, mobile-friendly trivia platform for in-person events where players use their phones to answer questions displayed on stage.

## ✨ Features

- **📱 Mobile-First Design** - Optimized for phone usage with large touch targets
- **⚡ Real-Time Updates** - 2-second polling for automatic screen updates
- **🎮 Simple Game Flow** - Start → Questions → Reveal → Scoring → End
- **👨‍💼 Moderator Dashboard** - Complete game control and live statistics
- **🔒 Secure & Simple** - Hardcoded authentication for MVP deployment
- **📊 Live Statistics** - Real-time answer distribution and player scores

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm 8+
- AWS EC2 instance (t2.micro or larger)

### Local Development
```bash
# Clone and setup
cd trivia-app
npm install

# Start development server
npm run dev

# Access the game
# Players: http://localhost:3000
# Moderator: http://localhost:3000/moderator
```

### Production Deployment on AWS EC2

#### 1. Launch EC2 Instance
```bash
# Launch t2.micro instance with Amazon Linux 2
# Configure Security Group:
# - HTTP (80): 0.0.0.0/0
# - HTTPS (443): 0.0.0.0/0  
# - SSH (22): Your IP only
```

#### 2. Server Setup
```bash
# Connect to EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install nginx for reverse proxy
sudo yum install -y nginx
```

#### 3. Deploy Application
```bash
# Create application directory
sudo mkdir -p /var/www/trivia
sudo chown ec2-user:ec2-user /var/www/trivia

# Upload application files
scp -i your-key.pem -r * ec2-user@your-ec2-ip:/var/www/trivia/

# Install dependencies
cd /var/www/trivia
npm install --production

# Create logs directory
mkdir -p logs

# Start with PM2
npm run pm2:start
```

#### 4. Configure Nginx
```bash
# Create nginx config
sudo tee /etc/nginx/conf.d/trivia.conf << EOF
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Test configuration
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. Setup Auto-Start
```bash
# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

## 🎮 How to Use

### For Players
1. **Join Game** - Visit the website when moderator starts a game
2. **Answer Questions** - Tap your choice (A, B, C, or D)
3. **View Results** - See correct answer and statistics after reveal
4. **Final Score** - View your score at game end

### For Moderators
1. **Login** - Visit `/moderator` and login with `admin` / `trivia123`
2. **Add Questions** - Create questions with 4 options each
3. **Start Game** - Begin the trivia session
4. **Control Flow** - Advance questions → Reveal answers → End game
5. **Monitor Stats** - View live player count and answer statistics

## 🔧 Configuration

### Environment Variables
```bash
# Production
export NODE_ENV=production
export PORT=3000

# Development  
export NODE_ENV=development
export PORT=3000
```

### Moderator Credentials
- **Username:** `admin`
- **Password:** `trivia123`
- **Change in:** `server.js` line ~370 (search for "trivia123")

## 📊 API Endpoints

### Player Endpoints
- `GET /` - Player interface
- `GET /api/game-state` - Current game status
- `POST /api/join` - Join game (get player ID)
- `POST /api/answer` - Submit answer

### Moderator Endpoints
- `GET /moderator` - Moderator dashboard
- `POST /api/moderator/login` - Authentication
- `POST /api/moderator/start-game` - Start new game
- `POST /api/moderator/add-question` - Add question
- `POST /api/moderator/next-question` - Advance to next question
- `POST /api/moderator/reveal-answer` - Show results
- `POST /api/moderator/end-game` - End current game
- `GET /api/moderator/status` - Game status and statistics

## 🛠 Management Commands

```bash
# Development
npm run dev          # Start development server
npm test            # Run syntax checks

# Production with PM2
npm run pm2:start   # Start application
npm run pm2:stop    # Stop application  
npm run pm2:restart # Restart application
npm run pm2:logs    # View logs

# Direct PM2 commands
pm2 status          # Check status
pm2 monit          # Monitor resources
pm2 logs trivia-platform  # View logs
```

## 📱 Mobile Compatibility

- **Responsive Design** - Works on all screen sizes
- **Touch Optimized** - Large buttons (75px+ on mobile)
- **Native Feel** - System fonts and native-style interface
- **Network Resilient** - Handles poor connections gracefully
- **Offline Detection** - Shows connection status

## 🔒 Security Notes

- **MVP Security** - Uses hardcoded credentials for simplicity
- **Input Validation** - All inputs validated and sanitized
- **Rate Limiting** - Prevents answer spam (3 attempts per 5 seconds)
- **Basic Headers** - XSS and content-type protection in production

## 🐛 Troubleshooting

### Common Issues

**Server won't start:**
```bash
# Check if port is in use
lsof -ti:3000
# Kill process if needed
kill -9 $(lsof -ti:3000)
```

**Players can't connect:**
```bash
# Check firewall/security groups
# Ensure port 80/443 are open
# Verify nginx is running
sudo systemctl status nginx
```

**Game state issues:**
```bash
# Restart application
npm run pm2:restart
# Check logs
npm run pm2:logs
```

### Logs Location
- **Application logs:** `/var/www/trivia/logs/`
- **Nginx logs:** `/var/log/nginx/`
- **PM2 logs:** `~/.pm2/logs/`

## 📈 Scaling Considerations

**Current Limits (Single Server):**
- ~100 concurrent players
- In-memory storage (resets on restart)
- Single game session

**Future Enhancements:**
- Database persistence (PostgreSQL/MongoDB)
- Multiple concurrent games
- WebSocket upgrade for true real-time
- Load balancing for higher capacity

## 🤝 Support

For issues or questions:
1. Check logs: `npm run pm2:logs`
2. Restart service: `npm run pm2:restart`
3. Review this documentation
4. Check AWS EC2 instance health

## 📄 License

MIT License - Feel free to modify and use for your events!
# trivia
