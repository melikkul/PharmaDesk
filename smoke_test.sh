#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_URL="http://localhost:8081"
USER_EMAIL="melik_kul@outlook.com"
USER_PASS="melik123"

echo "🚀 Starting Smoke Test..."

# 1. Hazırlık ve Ön Kontrol
echo "➡️  Checking prerequisites..."
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ Error: jq is not installed.${NC}"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ Error: curl is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Prerequisites checked.${NC}"

# 2. Adım 1: Kimlik Doğrulama (Auth)
echo "➡️  Step 1: Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$USER_EMAIL\", \"password\": \"$USER_PASS\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Auth Failed! No token received.${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi
echo -e "${GREEN}✅ Authentication Successful. Token received.${NC}"


PHARMACY_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.pharmacyId')

# 3. Adım 2: JSONB Doğrulama (Medication)
echo "➡️  Step 2: Verifying Medication JSONB (Array Check)..."
MEDICATION_RESPONSE=$(curl -s -X GET "$API_URL/api/medications/1" \
  -H "Authorization: Bearer $TOKEN")

IS_ARRAY=$(echo "$MEDICATION_RESPONSE" | jq '.alternatives | type == "array"')

if [ "$IS_ARRAY" == "true" ]; then
    echo -e "${GREEN}✅ Medication JSONB Test Passed (alternatives is an Array).${NC}"
else
    echo -e "${RED}❌ Medication JSONB Test Failed! 'alternatives' is not an array.${NC}"
    echo "Response: $MEDICATION_RESPONSE"
    exit 1
fi

# 4. Adım 3: İlişki Doğrulama (Offer Creation)
echo "➡️  Step 3: Verifying Offer Creation Relation..."
# Use dynamic valid Pharmacy ID (self) to avoid FK violation
OFFER_PAYLOAD="{
  \"medicationId\": 1,
  \"price\": 100,
  \"stock\": 10,
  \"type\": \"0\",
  \"status\": 0,
  \"targetPharmacyIds\": [$PHARMACY_ID]
}"

OFFER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/offers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$OFFER_PAYLOAD")

OFFER_RESPONSE_BODY=$(echo "$OFFER_RESPONSE" | head -n -1)
OFFER_RESPONSE_CODE=$(echo "$OFFER_RESPONSE" | tail -n 1)

if [[ "$OFFER_RESPONSE_CODE" == "200" || "$OFFER_RESPONSE_CODE" == "201" ]]; then
    echo -e "${GREEN}✅ Offer Relation Test Passed (Status: $OFFER_RESPONSE_CODE).${NC}"
else
    echo -e "${RED}❌ Offer Relation Test Failed! Status: $OFFER_RESPONSE_CODE${NC}"
    echo "Response: $OFFER_RESPONSE_BODY"
    exit 1
fi

# 5. Adım 4: Veri Bütünlüğü (Transactions)
echo "➡️  Step 4: Verifying Transactions Data Integrity..."
TRANSACTIONS_RESPONSE=$(curl -s -X GET "$API_URL/api/transactions" \
  -H "Authorization: Bearer $TOKEN")

# Check if first item has offerId or orderId field (even if null)
HAS_FIELDS=$(echo "$TRANSACTIONS_RESPONSE" | jq '.[0] | has("offerId") or has("orderId")')

if [ "$HAS_FIELDS" == "true" ]; then
    echo -e "${GREEN}✅ Transactions Data Integrity Test Passed.${NC}"
else
    echo -e "${RED}❌ Transactions Data Integrity Test Failed! Fields missing in first item.${NC}"
     # Optional: print first item for debugging
    echo "$TRANSACTIONS_RESPONSE" | jq '.[0]'
    exit 1
fi

echo -e "${GREEN}🎉 All Smoke Tests Passed Successfully!${NC}"
