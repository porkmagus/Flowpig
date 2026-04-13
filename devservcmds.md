for windows:
nvm use 24.14.1
cd /d F:\flowpigdev
rmdir /s /q node_modules
npm install
npm run dev:web

for wsl:
nvm use 24.14.1
cd /mnt/f/flowpigdev
rm -rf node_modules
npm install
npm run dev:web
