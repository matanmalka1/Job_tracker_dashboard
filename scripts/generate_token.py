from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

flow = InstalledAppFlow.from_client_secrets_file(
    "secrets/client_secret.json",
    SCOPES
)

creds = flow.run_local_server(port=0)

with open("secrets/token.json", "w") as token:
    token.write(creds.to_json())

print("token.json created successfully")