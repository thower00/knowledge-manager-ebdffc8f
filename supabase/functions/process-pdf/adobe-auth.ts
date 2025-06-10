
export interface AdobeCredentials {
  clientId: string;
  clientSecret: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export async function getAdobeCredentials(): Promise<AdobeCredentials> {
  const clientId = Deno.env.get('ADOBE_CLIENT_ID');
  const clientSecret = Deno.env.get('ADOBE_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    console.error('❌ Adobe credentials missing');
    throw new Error('Adobe credentials not configured');
  }
  
  console.log('✅ Adobe credentials found');
  return { clientId, clientSecret };
}

export async function getAccessToken(credentials: AdobeCredentials): Promise<string> {
  console.log('🔑 Getting Adobe access token...');
  
  const tokenResponse = await fetch('https://ims-na1.adobelogin.com/ims/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'client_id': credentials.clientId,
      'client_secret': credentials.clientSecret,
      'grant_type': 'client_credentials',
      'scope': 'openid,AdobeID,read_organizations,additional_info.projectedProductContext,additional_info.roles'
    })
  });

  console.log(`Token response status: ${tokenResponse.status}`);
  
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('❌ Token request failed:', tokenResponse.status, errorText);
    throw new Error(`Failed to get Adobe access token: ${tokenResponse.status} - ${errorText}`);
  }

  const tokenData: TokenResponse = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    console.error('❌ No access token in response:', tokenData);
    throw new Error('No access token received from Adobe');
  }
  
  console.log('✅ Access token received successfully');
  return accessToken;
}
