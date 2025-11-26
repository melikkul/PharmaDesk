FROM mcr.microsoft.com/dotnet/sdk:8.0
WORKDIR /app
EXPOSE 8081
ENV ASPNETCORE_ENVIRONMENT=Development

# Install dotnet-ef tool for migrations if needed
# RUN dotnet tool install --global dotnet-ef
# ENV PATH="$PATH:/root/.dotnet/tools"

ENTRYPOINT ["dotnet", "watch", "run", "--project", "src/PharmaDesk.API/PharmaDesk.API.csproj", "--urls", "http://0.0.0.0:8081"]
