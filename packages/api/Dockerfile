# 1. Aşama: Build (Derleme)
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Proje dosyalarını kopyala
COPY . .

# Bağımlılıkları yükle ve projeyi derle
RUN dotnet restore
RUN dotnet publish "src/PharmaDesk.API/PharmaDesk.API.csproj" -c Release -o /app/publish

# 2. Aşama: Runtime (Çalıştırma)
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app

# Derlenmiş dosyaları build aşamasından al
COPY --from=build /app/publish .

# Port ve Çalıştırma ayarları
EXPOSE 8081
ENV ASPNETCORE_URLS=http://+:8081
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "PharmaDesk.API.dll"]