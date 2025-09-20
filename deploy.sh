#!/bin/bash

# Trivia Platform Deployment Script for AWS EC2
# Usage: ./deploy.sh [EC2_IP] [KEY_FILE]

set -e

EC2_IP=${1:-"your-ec2-ip"}
KEY_FILE=${2:-"your-key.pem"}
APP_DIR="/var/www/trivia"

echo "🎯 Trivia Platform Deployment Script"
echo "=================================="

if [ "$EC2_IP" = "your-ec2-ip" ] || [ "$KEY_FILE" = "your-key.pem" ]; then
    echo "❌ Please provide EC2 IP and key file:"
    echo "   ./deploy.sh YOUR_EC2_IP YOUR_KEY_FILE.pem"
    exit 1
fi

echo "📋 Deployment Configuration:"
echo "   EC2 IP: $EC2_IP"
echo "   Key File: $KEY_FILE"
echo "   App Directory: $APP_DIR"
echo ""

# Test connection
echo "🔗 Testing SSH connection..."
ssh -i "$KEY_FILE" -o ConnectTimeout=10 ec2-user@"$EC2_IP" "echo 'Connection successful'" || {
    echo "❌ SSH connection failed. Check your IP and key file."
    exit 1
}

# Create application directory
echo "📁 Creating application directory..."
ssh -i "$KEY_FILE" ec2-user@"$EC2_IP" "
    sudo mkdir -p $APP_DIR
    sudo chown ec2-user:ec2-user $APP_DIR
    mkdir -p $APP_DIR/logs
"

# Upload application files
echo "📤 Uploading application files..."
scp -i "$KEY_FILE" -r \
    server.js package.json ecosystem.config.js \
    public/ \
    ec2-user@"$EC2_IP":"$APP_DIR"/

# Install dependencies and start application
echo "📦 Installing dependencies and starting application..."
ssh -i "$KEY_FILE" ec2-user@"$EC2_IP" "
    cd $APP_DIR
    
    # Install dependencies
    npm install --production
    
    # Stop existing PM2 process if running
    pm2 stop trivia-platform 2>/dev/null || true
    pm2 delete trivia-platform 2>/dev/null || true
    
    # Start application with PM2
    NODE_ENV=production pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    echo '✅ Application deployed successfully!'
    echo '📊 Application status:'
    pm2 status
"

echo ""
echo "🎉 Deployment Complete!"
echo "=================================="
echo "🌐 Player URL: http://$EC2_IP"
echo "👨‍💼 Moderator URL: http://$EC2_IP/moderator"
echo "🔐 Moderator Login: admin / trivia123"
echo ""
echo "📋 Management Commands:"
echo "   ssh -i $KEY_FILE ec2-user@$EC2_IP"
echo "   cd $APP_DIR"
echo "   pm2 status          # Check status"
echo "   pm2 logs trivia-platform  # View logs"
echo "   pm2 restart trivia-platform  # Restart app"
echo ""
echo "⚠️  Don't forget to:"
echo "   1. Configure nginx reverse proxy (see README.md)"
echo "   2. Set up SSL certificate for production"
echo "   3. Configure domain name if needed"
