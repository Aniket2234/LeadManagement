#!/bin/bash

# Check if .env file exists and source it
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    export $(cat .env | sed 's/#.*//g' | xargs)
fi

# Check if MONGODB_URI is set
if [ -z "$MONGODB_URI" ]; then
    echo "ERROR: MONGODB_URI environment variable is not set!"
    echo "Please create a .env file with your MongoDB connection string."
    echo "See .env.example for the required format."
    exit 1
fi

npm run dev