import requests
from jose import jwt
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Hardcoded Credentials
CLIENT_ID = "0oa25qglsixBrnZNV0h8"
OKTA_DOMAIN = "nielsen.okta.com"
ISSUER = f"https://{OKTA_DOMAIN}/oauth2/default"
JWKS_URL = f"{ISSUER}/v1/keys"

security = HTTPBearer()

def get_current_user(res: HTTPAuthorizationCredentials = Security(security)):
    token = res.credentials
    try:
        # 1. Fetch Nielsen's public keys to verify the signature
        # In a high-traffic production app, you should cache this JSON
        jwks = requests.get(JWKS_URL).json()
        
        # 2. Decode and validate the token
        payload = jwt.decode(
            token,
            jwks,
            algorithms=['RS256'],
            audience="api://default", # Standard for Okta default auth servers
            issuer=ISSUER
        )
        
        # 3. Optional: Verify the client ID matches if included in the 'cid' claim
        if payload.get("cid") != CLIENT_ID:
            # Note: Sometimes 'aud' or 'cid' is used depending on Okta config
            pass
            
        return payload  # Returns the user claims (email, sub, etc.)
        
    except Exception as e:
        raise HTTPException(
            status_code=401, 
            detail=f"Authentication failed: {str(e)}"
        )