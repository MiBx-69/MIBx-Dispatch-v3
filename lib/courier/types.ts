export interface PickupStore {
  store_id: number;
  store_name: string;
  store_address: string;
  is_active: boolean;
  city_id?: number;
  zone_id?: number;
}

export interface City {
  city_id: number;
  city_name: string;
}

export interface Zone {
  zone_id: number;
  zone_name: string;
  city_id: number;
}

export interface Area {
  area_id: number;
  area_name: string;
  zone_id: number;
  home_delivery_available?: boolean;
  pickup_available?: boolean;
}

export interface PricePlanRequest {
  store_id: number;
  item_type: number; // 1: Document, 2: Parcel
  delivery_type: number; // 48: Normal, 12: On Demand
  item_weight: number; // in KG
  recipient_city: number;
  recipient_zone: number;
}

export interface PricePlanResponse {
  price: number;
  plan_id?: number;
  discount?: number;
  final_price: number;
}

export interface CreateShipmentRequest {
  store_id: number;
  merchant_order_id: string; // e.g. Shopify Order Number "#1042" or DB ID
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city: number;
  recipient_zone: number;
  recipient_area?: number;
  delivery_type: number; // 48 = Normal Delivery (default)
  item_type: number; // 1 = Document, 2 = Parcel (default)
  special_instruction?: string;
  item_quantity: number;
  item_weight: number; // In KG (e.g. 0.5, 1.0)
  amount_to_collect: number; // COD amount in BDT (0 if prepaid)
  item_description?: string;
}

export interface CreateShipmentResponse {
  consignment_id: string;
  merchant_order_id: string;
  order_status: string;
  delivery_fee: number;
  amount_to_collect: number;
  tracking_code?: string;
  tracking_url?: string;
}

export interface TrackingInfoResponse {
  consignment_id: string;
  order_status: string;
  order_status_slug: string;
  updated_at: string;
  reason?: string;
  delivery_fee?: number;
  amount_to_collect?: number;
  collected_amount?: number;
}

export interface CancelShipmentResponse {
  success: boolean;
  message: string;
}

export interface CourierService {
  providerName: string;
  authenticate(): Promise<string>;
  getStores(): Promise<PickupStore[]>;
  getCities(): Promise<City[]>;
  getZones(cityId: number): Promise<Zone[]>;
  getAreas(zoneId: number): Promise<Area[]>;
  calculatePrice(request: PricePlanRequest): Promise<PricePlanResponse>;
  createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResponse>;
  getTrackingInfo(consignmentId: string): Promise<TrackingInfoResponse>;
  cancelShipment(consignmentId: string): Promise<CancelShipmentResponse>;
}
