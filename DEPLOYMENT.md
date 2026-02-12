# TaskManager PM2 Deployment Guide

## Prerequisites
- ✅ PM2 installed globally
- ✅ MongoDB running
- ✅ Node.js installed

### Manual deployment

1. **Build Backend**
   ```bash
   cd backend
   npm run build
   cd ..
   ```

2. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   cd ..
   ```

3. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js
   ```

## Access Your Application

### From Your Computer:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001/api

### From Other Devices on Your Network:
- Frontend: http://YOUR_SERVER_IP:3000
- Backend: http://YOUR_SERVER_IP:3001/api

**To find your IP:**
- Windows: Run `ipconfig` in Command Prompt and look for "IPv4 Address"
- Linux/Mac: Run `ifconfig` or `ip a` and look for your network IP address

**Note:** Make sure your firewall allows incoming connections on ports 3000 and 3001.

## PM2 Commands

| Command | Description |
|---------|-------------|
| `pm2 status` | Check application status |
| `pm2 logs` | View application logs |
| `pm2 logs taskmanager-backend` | View backend logs only |
| `pm2 logs taskmanager-frontend` | View frontend logs only |
| `pm2 restart all` | Restart all applications |
| `pm2 stop all` | Stop all applications |
| `pm2 delete all` | Remove all applications from PM2 |
| `pm2 monit` | Monitor applications in real-time |
| `pm2 save` | Save current PM2 configuration |
| `pm2 startup` | Enable PM2 to start on system boot |

## Firewall Configuration

### Windows Firewall
If other devices cannot access your application, you may need to allow the ports:

```powershell
# Allow port 3000 (Frontend)
New-NetFirewallRule -DisplayName "TaskManager Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Allow port 3001 (Backend)
New-NetFirewallRule -DisplayName "TaskManager Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

## Troubleshooting

### Application won't start
```bash
pm2 logs
```

### Check MongoDB connection
Make sure MongoDB is running:
```bash
mongosh
```

### Rebuild and restart
```bash
pm2 delete all
.\deploy.bat
```

### Check if ports are in use
```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :3001
```

## Auto-start on System Boot

To make PM2 applications survive system reboot, you must register PM2 as a startup service and save the process list.

### Step 1: Enable PM2 Startup

Run this command once (as the user that runs the app):

```bash
pm2 startup
```

PM2 will output a command specific to your system, like:

**Windows:**
```powershell
pm2 startup
```
Follow the instructions provided by PM2 to complete the setup.

**Linux/macOS:**
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u <user> --hp /home/<user>
```

**👉 Copy and execute the command exactly as shown.**

### Step 2: Save Your Running Apps

After your applications are running successfully:

```bash
pm2 save
```

This saves the current process list so PM2 knows what to restart after boot.

### Verify After Reboot

1. Reboot your system:
   ```powershell
   # Windows
   shutdown /r /t 0
   
   # Linux
   sudo reboot
   ```

2. After reboot, check if applications are running:
   ```bash
   pm2 list
   ```

3. If the apps are running and listening on the same ports, the URLs should be reachable again.

### Troubleshooting Auto-start Issues

**Port blocked by firewall:**
```powershell
# Windows - Allow ports
New-NetFirewallRule -DisplayName "TaskManager Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "TaskManager Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
# Verification check
Get-NetFirewallRule -DisplayName "TaskManager*" 

# Linux
sudo ufw allow 3000
sudo ufw allow 3001
```

**PM2 running under wrong user:**
- PM2 startup must be configured for the same user that runs the app
- If you switch users, run `pm2 unstartup` first, then reconfigure with the correct user

**Apps don't start after reboot:**
```bash
# Check PM2 logs
pm2 logs

# Verify saved process list
pm2 resurrect

