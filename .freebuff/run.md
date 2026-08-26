# LAW DIGEST Dev Server

## Prerequisites
- Copy `.env.local` from the main checkout (same directory in this case)
- `npm install` if `node_modules` is missing

## Start
```powershell
npm run dev
```
Default port: 3000. If occupied, kill the existing process first:
```powershell
taskkill /PID <pid> /F
```

## Stop
```powershell
taskkill /PID <pid> /F
```
Or find the PID:
```powershell
netstat -ano | findstr :3000 | findstr LISTEN
```
