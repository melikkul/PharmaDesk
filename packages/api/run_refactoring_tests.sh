#!/bin/bash
# PharmaDesk Database Migration and Test Script
# Run from: packages/api directory

set -e # Exit on error

echo "=================================================="
echo "🔧 PharmaDesk Database Refactoring Verification"
echo "=================================================="

# Navigate to API directory
cd "$(dirname "$0")"

echo ""
echo "📦 Step 1: Restore NuGet packages..."
echo "--------------------------------------------------"
dotnet restore

echo ""
echo "🔨 Step 2: Build the solution..."
echo "--------------------------------------------------"
dotnet build --no-restore

echo ""
echo "🧪 Step 3: Run Verification Tests..."
echo "--------------------------------------------------"
cd tests/PharmaDesk.Domain.Tests
dotnet test --no-build --verbosity normal

echo ""
echo "✅ Step 4: Tests Completed!"
echo ""
echo "=================================================="
echo "📋 Next Step: Apply Database Migration"
echo "=================================================="
echo ""
echo "If all tests pass, run the following commands to apply migrations:"
echo ""
echo "  cd src/PharmaDesk.Infrastructure"
echo "  dotnet ef migrations add RefactorEntities --startup-project ../PharmaDesk.API"
echo "  dotnet ef database update --startup-project ../PharmaDesk.API"
echo ""
echo "Or if using Docker:"
echo "  docker-compose exec api dotnet ef migrations add RefactorEntities"
echo "  docker-compose exec api dotnet ef database update"
echo ""
