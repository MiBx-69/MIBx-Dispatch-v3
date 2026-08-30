'use server';

import { PathaoClient } from '../courier/pathao/api';

export async function testPathaoConnectionAction() {
  try {
    const service = new PathaoClient({
      baseUrl: process.env.PATHAO_BASE_URL || 'https://api-hermes.pathao.com',
      clientId: process.env.PATHAO_CLIENT_ID || '',
      clientSecret: process.env.PATHAO_CLIENT_SECRET || '',
      username: process.env.PATHAO_USERNAME || '',
      password: process.env.PATHAO_PASSWORD || '',
    });
    
    if (!process.env.PATHAO_CLIENT_ID) {
      throw new Error('Pathao credentials are not configured in .env.local');
    }
    
    const token = await service.authenticate();
    const stores = await service.getStores();

    return {
      success: true,
      message: `Connected successfully! Retrieved ${stores.length} pickup store(s).`,
      stores,
      tokenSnippet: `${token.slice(0, 10)}...${token.slice(-6)}`,
    };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: errMessage || 'Authentication failed. Please verify credentials.',
    };
  }
}

export async function getShopDomainAction() {
  return process.env.SHOPIFY_SHOP_DOMAIN || '';
}
