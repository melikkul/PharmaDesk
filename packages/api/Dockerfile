# build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o /app

# run
FROM mcr.microsoft.com/dotnet/aspnet:8.0.21
WORKDIR /app
COPY --from=build /app ./
ENV ASPNETCORE_URLS=http://0.0.0.0:8081
EXPOSE 8081
ENTRYPOINT ["dotnet", "api.dll"]