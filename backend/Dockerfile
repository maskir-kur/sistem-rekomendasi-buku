# Gunakan alpine karena ukurannya sangat kecil (~30MB) dan hemat RAM
FROM node:18-alpine

WORKDIR /app

# Copy package.json terlebih dahulu untuk memanfaatkan cache Docker
COPY package*.json ./

# Install dependensi hanya untuk production (tanpa devDependencies)
RUN npm ci --only=production

# Copy seluruh sisa kode aplikasi
COPY . .

EXPOSE 3000

# Jalankan Node.js dengan membatasi penggunaan memory heap agar tidak OOM
CMD ["node", "--max-old-space-size=100", "server.js"]
