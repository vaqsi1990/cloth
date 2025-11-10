import { NextRequest, NextResponse } from 'next/server';
import { bogTokenManager } from '@/lib/bog-token';

export async function GET() {
  try {
    console.log('🔑 BOG Token Request - Using Token Manager');
    
    // Get token info for debugging
    const tokenInfo = bogTokenManager.getTokenInfo();
    console.log('Current token info:', tokenInfo);
    
    // Get a valid token (automatically refreshes if expired)
    const access_token = await bogTokenManager.getValidToken();
    
    // Get updated token info
    const updatedTokenInfo = bogTokenManager.getTokenInfo();
    
    console.log('✅ Token retrieved successfully');
    console.log('Updated token info:', updatedTokenInfo);
    
    return NextResponse.json({
      access_token,
      token_type: 'Bearer',
      expires_in: updatedTokenInfo.timeUntilExpiry ? Math.floor(updatedTokenInfo.timeUntilExpiry / 1000) : 0,
      success: true,
      token_info: updatedTokenInfo,
    });
  } catch (error) {
    console.error('❌ BOG Token error:', error);
    
    const errorObj = error instanceof Error ? error : new Error('Unknown error');
    let errorMessage = 'Failed to get BOG access token';
    let errorDetails = errorObj.message || 'Unknown error occurred';
    
    if (errorObj.message.includes('Missing BOG credentials')) {
      errorMessage = 'Missing BOG credentials';
      errorDetails = 'BOG_CLIENT_ID and BOG_CLIENT_SECRET must be set in environment variables';
    } else if (errorObj.message.includes('unauthorized_client')) {
      errorMessage = 'Invalid BOG credentials';
      errorDetails = 'Please check your BOG_CLIENT_ID and BOG_CLIENT_SECRET. Make sure they are correct and match your BOG application registration.';
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        status: 500,
      },
      { status: 500 }
    );
  }
}
