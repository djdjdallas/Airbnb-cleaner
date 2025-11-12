#!/bin/bash

# Deployment script for Supabase Edge Functions
# Usage: ./deploy.sh [function-name] or ./deploy.sh all

set -e

echo "🚀 Supabase Edge Functions Deployment"
echo "======================================"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it with: npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Run: supabase login"
    exit 1
fi

# Function to deploy a single function
deploy_function() {
    local func_name=$1
    echo ""
    echo "📦 Deploying $func_name..."

    if supabase functions deploy "$func_name" --no-verify-jwt; then
        echo "✅ $func_name deployed successfully"
    else
        echo "❌ Failed to deploy $func_name"
        exit 1
    fi
}

# Function to set environment variables
set_secrets() {
    echo ""
    echo "🔐 Setting environment variables..."
    echo "⚠️  Make sure you have these values in your .env file"
    echo ""

    read -p "Do you want to set environment variables? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "Enter your environment variables (press Enter to skip):"

        read -p "TWILIO_ACCOUNT_SID: " twilio_sid
        if [ ! -z "$twilio_sid" ]; then
            supabase secrets set TWILIO_ACCOUNT_SID="$twilio_sid"
        fi

        read -p "TWILIO_AUTH_TOKEN: " twilio_token
        if [ ! -z "$twilio_token" ]; then
            supabase secrets set TWILIO_AUTH_TOKEN="$twilio_token"
        fi

        read -p "TWILIO_PHONE_NUMBER: " twilio_phone
        if [ ! -z "$twilio_phone" ]; then
            supabase secrets set TWILIO_PHONE_NUMBER="$twilio_phone"
        fi

        read -p "STRIPE_SECRET_KEY: " stripe_key
        if [ ! -z "$stripe_key" ]; then
            supabase secrets set STRIPE_SECRET_KEY="$stripe_key"
        fi

        read -p "STRIPE_WEBHOOK_SECRET: " stripe_webhook
        if [ ! -z "$stripe_webhook" ]; then
            supabase secrets set STRIPE_WEBHOOK_SECRET="$stripe_webhook"
        fi

        echo "✅ Environment variables set"
    fi
}

# Main deployment logic
if [ "$1" == "all" ] || [ -z "$1" ]; then
    echo "Deploying all functions..."

    deploy_function "calendar-sync"
    deploy_function "twilio-webhook"
    deploy_function "send-cleaning-sms"
    deploy_function "stripe-webhook"

    echo ""
    echo "✅ All functions deployed successfully!"

    set_secrets

    echo ""
    echo "📋 Next steps:"
    echo "1. Configure Twilio webhook: https://console.twilio.com/"
    echo "2. Configure Stripe webhook: https://dashboard.stripe.com/webhooks"
    echo "3. Set up cron job for calendar-sync in Supabase Dashboard"
    echo ""
    echo "📖 See README.md for detailed instructions"

elif [ "$1" == "secrets" ]; then
    set_secrets

else
    # Deploy specific function
    if [ -d "$1" ]; then
        deploy_function "$1"
        echo ""
        echo "✅ Deployment complete!"
    else
        echo "❌ Function '$1' not found"
        echo ""
        echo "Available functions:"
        echo "  - calendar-sync"
        echo "  - twilio-webhook"
        echo "  - send-cleaning-sms"
        echo "  - stripe-webhook"
        echo ""
        echo "Usage: ./deploy.sh [function-name|all|secrets]"
        exit 1
    fi
fi

echo ""
echo "🎉 Done!"
