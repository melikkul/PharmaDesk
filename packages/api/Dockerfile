# Development Mode Dockerfile (SDK + EF Tool)
FROM mcr.microsoft.com/dotnet/sdk:8.0

WORKDIR /app

# Dosyaları kopyala
COPY . .

# Restore dependencies
RUN dotnet restore

# EF Core aracını local tool olarak yükle (global yerine)
RUN dotnet tool install --tool-path /tools dotnet-ef --version 8.0.0

# Path ayarını yap
ENV PATH="$PATH:/tools"

# Uygulamayı Watch modunda başlat (Hot Reload)
ENTRYPOINT ["dotnet", "watch", "run", "--urls", "http://0.0.0.0:8081"]