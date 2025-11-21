# build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files and restore dependencies first to leverage Docker cache
COPY *.csproj ./
RUN dotnet restore 

# Copy the rest of the source code and publish
COPY . .
RUN dotnet publish -c Release -o /app --no-restore

# run
FROM mcr.microsoft.com/dotnet/aspnet:8.0.21
WORKDIR /app
COPY --from=build /app ./
ENV ASPNETCORE_URLS=http://0.0.0.0:8081
ENTRYPOINT ["dotnet", "api.dll"]