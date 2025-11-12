#!/bin/bash

# Test script for Supabase Edge Functions
# Usage: ./test.sh [function-name]

set -e

echo "🧪 Supabase Edge Functions Test Suite"
echo "======================================"

# Load environment variables
if [ -f .env ]; then
    source .env
    echo "✅ Environment variables loaded"
else
    echo "⚠️  No .env file found"
fi

# Get Supabase URL and keys
SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
ANON_KEY="${SUPABASE_ANON_KEY:-your-anon-key}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-your-service-key}"

echo "📍 Testing against: $SUPABASE_URL"
echo ""

# Test calendar-sync function
test_calendar_sync() {
    echo "Testing calendar-sync..."

    response=$(curl -s -w "\n%{http_code}" -X POST \
        "$SUPABASE_URL/functions/v1/calendar-sync" \
        -H "Authorization: Bearer $ANON_KEY" \
        -H "Content-Type: application/json")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" == "200" ]; then
        echo "✅ calendar-sync: PASSED"
        echo "Response: $body"
    else
        echo "❌ calendar-sync: FAILED (HTTP $http_code)"
        echo "Response: $body"
    fi
    echo ""
}

# Test send-cleaning-sms function
test_send_sms() {
    echo "Testing send-cleaning-sms..."

    # You need to provide a valid cleaning_job_id
    read -p "Enter a test cleaning_job_id (or press Enter to skip): " job_id

    if [ -z "$job_id" ]; then
        echo "⏭️  Skipped send-cleaning-sms test"
        echo ""
        return
    fi

    response=$(curl -s -w "\n%{http_code}" -X POST \
        "$SUPABASE_URL/functions/v1/send-cleaning-sms" \
        -H "Authorization: Bearer $SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"cleaning_job_id\": \"$job_id\"}")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" == "200" ]; then
        echo "✅ send-cleaning-sms: PASSED"
        echo "Response: $body"
    else
        echo "❌ send-cleaning-sms: FAILED (HTTP $http_code)"
        echo "Response: $body"
    fi
    echo ""
}

# Test twilio-webhook function
test_twilio_webhook() {
    echo "Testing twilio-webhook..."

    response=$(curl -s -w "\n%{http_code}" -X POST \
        "$SUPABASE_URL/functions/v1/twilio-webhook" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "From=%2B1234567890&Body=YES&MessageSid=SM123456789")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" == "200" ]; then
        echo "✅ twilio-webhook: PASSED"
        echo "Response: $body"
    else
        echo "❌ twilio-webhook: FAILED (HTTP $http_code)"
        echo "Response: $body"
    fi
    echo ""
}

# Test stripe-webhook function
test_stripe_webhook() {
    echo "Testing stripe-webhook..."
    echo "⚠️  Note: This will fail signature verification without a valid Stripe signature"

    test_event='{
      "id": "evt_test_123",
      "type": "customer.subscription.created",
      "data": {
        "object": {
          "id": "sub_test_123",
          "customer": "cus_test_123",
          "status": "active"
        }
      }
    }'

    response=$(curl -s -w "\n%{http_code}" -X POST \
        "$SUPABASE_URL/functions/v1/stripe-webhook" \
        -H "Content-Type: application/json" \
        -H "Stripe-Signature: t=1234567890,v1=test_signature" \
        -d "$test_event")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    # Expect 400 due to signature verification
    if [ "$http_code" == "400" ] && [[ "$body" == *"signature"* ]]; then
        echo "✅ stripe-webhook: PASSED (signature verification working)"
        echo "Response: $body"
    else
        echo "⚠️  stripe-webhook: Unexpected response (HTTP $http_code)"
        echo "Response: $body"
    fi
    echo ""
}

# Main test logic
if [ "$1" == "calendar-sync" ]; then
    test_calendar_sync
elif [ "$1" == "send-sms" ]; then
    test_send_sms
elif [ "$1" == "twilio" ]; then
    test_twilio_webhook
elif [ "$1" == "stripe" ]; then
    test_stripe_webhook
elif [ "$1" == "all" ] || [ -z "$1" ]; then
    echo "Running all tests..."
    echo ""
    test_calendar_sync
    test_send_sms
    test_twilio_webhook
    test_stripe_webhook
    echo "✅ All tests completed!"
else
    echo "❌ Unknown test: $1"
    echo ""
    echo "Available tests:"
    echo "  - calendar-sync"
    echo "  - send-sms"
    echo "  - twilio"
    echo "  - stripe"
    echo "  - all (default)"
    echo ""
    echo "Usage: ./test.sh [test-name]"
    exit 1
fi

echo ""
echo "🎉 Testing complete!"
