import {
  Area,
  CancelShipmentResponse,
  City,
  CourierService,
  CreateShipmentRequest,
  CreateShipmentResponse,
  PickupStore,
  PricePlanRequest,
  PricePlanResponse,
  TrackingInfoResponse,
  Zone,
} from '../types';

export interface PathaoConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

export class PathaoClient implements CourierService {
  providerName = 'pathao';
  private config: PathaoConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: PathaoConfig) {
    this.config = config;
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}, requiresAuth = true): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (requiresAuth) {
      if (!this.accessToken || Date.now() > this.tokenExpiresAt) {
        await this.authenticate();
      }
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pathao API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data;
  }

  async authenticate(): Promise<string> {
    const payload = {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      username: this.config.username,
      password: this.config.password,
      grant_type: 'password',
    };

    const data = await this.request<{
      access_token: string;
      expires_in: number;
    }>('/aladdin/api/v1/issue-token', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);

    this.accessToken = data.access_token;
    // Expire slightly before actual expiration to be safe
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    
    return this.accessToken;
  }

  async getStores(): Promise<PickupStore[]> {
    const data = await this.request<{ data: { data: any[] } }>('/aladdin/api/v1/stores');
    return data.data.data.map((store) => ({
      store_id: store.store_id,
      store_name: store.store_name,
      store_address: store.store_address,
      is_active: true,
    }));
  }

  async getCities(): Promise<City[]> {
    const data = await this.request<{ data: { data: any[] } }>('/aladdin/api/v1/countries/1/city-list');
    return data.data.data.map((c) => ({
      city_id: c.city_id,
      city_name: c.city_name,
    }));
  }

  async getZones(cityId: number): Promise<Zone[]> {
    const data = await this.request<{ data: { data: any[] } }>(`/aladdin/api/v1/cities/${cityId}/zone-list`);
    return data.data.data.map((z) => ({
      zone_id: z.zone_id,
      zone_name: z.zone_name,
      city_id: cityId,
    }));
  }

  async getAreas(zoneId: number): Promise<Area[]> {
    const data = await this.request<{ data: { data: any[] } }>(`/aladdin/api/v1/zones/${zoneId}/area-list`);
    return data.data.data.map((a) => ({
      area_id: a.area_id,
      area_name: a.area_name,
      zone_id: zoneId,
      home_delivery_available: a.home_delivery_available,
      pickup_available: a.pickup_available,
    }));
  }

  async calculatePrice(request: PricePlanRequest): Promise<PricePlanResponse> {
    const payload = {
      store_id: request.store_id,
      item_type: request.item_type,
      delivery_type: request.delivery_type,
      item_weight: request.item_weight,
      recipient_city: request.recipient_city,
      recipient_zone: request.recipient_zone,
    };

    const data = await this.request<{ data: any }>('/aladdin/api/v1/merchant/price-plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      price: data.data.price,
      plan_id: data.data.plan_id,
      discount: data.data.discount,
      final_price: data.data.price - (data.data.discount || 0), // Based on Pathao API docs usually
    };
  }

  async createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResponse> {
    const payload = {
      store_id: request.store_id,
      merchant_order_id: request.merchant_order_id,
      sender_name: "", // Pathao uses store defaults if empty
      sender_phone: "",
      recipient_name: request.recipient_name,
      recipient_phone: request.recipient_phone,
      recipient_address: request.recipient_address,
      recipient_city: request.recipient_city,
      recipient_zone: request.recipient_zone,
      recipient_area: request.recipient_area,
      delivery_type: request.delivery_type,
      item_type: request.item_type,
      special_instruction: request.special_instruction,
      item_quantity: request.item_quantity,
      item_weight: request.item_weight,
      amount_to_collect: request.amount_to_collect,
      item_description: request.item_description,
    };

    const data = await this.request<{ data: any }>('/aladdin/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      consignment_id: data.data.consignment_id,
      merchant_order_id: data.data.merchant_order_id,
      order_status: data.data.order_status,
      delivery_fee: data.data.delivery_fee,
      amount_to_collect: request.amount_to_collect,
      tracking_code: data.data.consignment_id, // Pathao typically uses consignment ID as tracking code
      tracking_url: `https://pathao.com/courier/tracking/?consignment_id=${data.data.consignment_id}` // Mocked URL format, can be dynamic
    };
  }

  async getTrackingInfo(consignmentId: string): Promise<TrackingInfoResponse> {
    // Note: Pathao may use a different endpoint or query params for tracking
    // For demonstration, assume they expose an order status endpoint by consignment id
    // e.g., GET /aladdin/api/v1/orders/{consignment_id}
    const data = await this.request<{ data: any }>(`/aladdin/api/v1/orders/${consignmentId}`);
    return {
      consignment_id: data.data.consignment_id,
      order_status: data.data.order_status,
      order_status_slug: data.data.order_status_slug,
      updated_at: data.data.updated_at,
      reason: data.data.reason,
      delivery_fee: data.data.delivery_fee,
      amount_to_collect: data.data.amount_to_collect,
      collected_amount: data.data.collected_amount,
    };
  }

  async cancelShipment(consignmentId: string): Promise<CancelShipmentResponse> {
    // Typically POST or DELETE /aladdin/api/v1/orders/{consignmentId}/cancel
    try {
      await this.request(`/aladdin/api/v1/orders/${consignmentId}/cancel`, {
        method: 'POST',
      });
      return { success: true, message: 'Shipment cancelled successfully' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
}
