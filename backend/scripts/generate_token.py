"""
Run this once to generate secrets/token.json from your OAuth client secret.

Usage:
    python scripts/generate_token.py

Prerequisites:
1. Go to https://console.cloud.google.com
2. Enable the Gmail API for your project
3. Create OAuth 2.0 credentials (Desktop app)
4. Download the JSON and save as secrets/client_secret.json
5. Run this script — it opens a browser for you to authorize
6. The token is saved to secrets/token.json
7. Set GMAIL_TOKEN_FILE=secrets/token.json in your .env
"""
import os
import sys

# Ensure we can import from the project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
CLIENT_SECRET = "secrets/client_secret.json"
TOKEN_OUTPUT = "secrets/token.json"


def main():
    if not os.path.exists(CLIENT_SECRET):
        print(f"ERROR: {CLIENT_SECRET} not found.")
        print("Download your OAuth 2.0 credentials from Google Cloud Console and save them there.")
        sys.exit(1)

    os.makedirs("secrets", exist_ok=True)

    flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET, SCOPES)
    creds = flow.run_local_server(port=0)

    with open(TOKEN_OUTPUT, "w") as f:
        f.write(creds.to_json())

    print(f"✓ Token saved to {TOKEN_OUTPUT}")
    print(f'  Add this to your .env: GMAIL_TOKEN_FILE={TOKEN_OUTPUT}')


if __name__ == "__main__":
    main()