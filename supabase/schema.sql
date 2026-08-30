-- =========================================================
-- MIBx Dispatch v3 - Complete Multi-Tenant Database Schema
-- Supabase PostgreSQL + RLS + Audit Trails + Courier Sync
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations (Tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    plan VARCHAR(50) DEFAULT 'pro',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Shops (Stores attached to Organization)
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    shopify_domain VARCHAR(255) UNIQUE NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    currency VARCHAR(10) DEFAULT 'BDT',
    timezone VARCHAR(100) DEFAULT 'Asia/Dhaka',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Memberships (User-Org mapping for multi-tenancy)
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- references auth.users(id) in Supabase
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'admin', -- 'owner', 'admin', 'operator', 'viewer'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, org_id)
);

-- 4. Shopify Connections (OAuth credentials & Webhook tokens)
CREATE TABLE IF NOT EXISTS shopify_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID UNIQUE NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    scopes TEXT NOT NULL,
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    webhook_secret TEXT,
    is_valid BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Courier Configurations (Pathao / Courier credentials per shop)
CREATE TABLE IF NOT EXISTS courier_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    courier_provider VARCHAR(50) DEFAULT 'pathao', -- 'pathao', 'steadfast', 'redx'
    client_id TEXT,
    client_secret TEXT,
    username TEXT,
    password TEXT,
    base_url TEXT DEFAULT 'https://courier.pathao.com',
    access_token TEXT,
    token_expires_at TIMESTAMPTZ,
    default_store_id INT,
    default_delivery_type INT DEFAULT 48, -- 48 = Normal Delivery
    default_item_type INT DEFAULT 1, -- 1 = Document, 2 = Parcel
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, courier_provider)
);

-- 6. Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    shopify_customer_id VARCHAR(100),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    default_city VARCHAR(100),
    default_zone VARCHAR(100),
    default_address TEXT,
    total_orders INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, shopify_customer_id)
);

-- 7. Products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    shopify_product_id VARCHAR(100) NOT NULL,
    title TEXT NOT NULL,
    handle VARCHAR(255),
    vendor VARCHAR(255),
    product_type VARCHAR(100),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, shopify_product_id)
);

-- 8. Orders (Commerce truth synchronized from Shopify)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    shopify_order_id VARCHAR(100) NOT NULL,
    order_number VARCHAR(100) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Financials & Pricing
    currency VARCHAR(10) DEFAULT 'BDT',
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    subtotal_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_discounts NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cod_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    delivery_charge NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    -- Status separation
    order_status VARCHAR(50) DEFAULT 'open', -- 'open', 'closed', 'cancelled'
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'partially_paid', 'refunded'
    fulfillment_status VARCHAR(50) DEFAULT 'unfulfilled', -- 'unfulfilled', 'partial', 'fulfilled', 'restocked'
    courier_status VARCHAR(50) DEFAULT 'unassigned', -- 'unassigned', 'ready_to_dispatch', 'dispatched', 'in_transit', 'delivered', 'failed', 'returned', 'cancelled'
    sync_status VARCHAR(50) DEFAULT 'synced', -- 'synced', 'pending', 'failed', 'reconciling'
    
    -- Recipient & Shipping Information
    recipient_name VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(50) NOT NULL,
    recipient_address TEXT NOT NULL,
    city VARCHAR(100),
    zone VARCHAR(100),
    area VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Pathao Specific Routing IDs
    pathao_store_id INT,
    pathao_city_id INT,
    pathao_zone_id INT,
    pathao_area_id INT,
    
    -- Courier Consignment & Tracking
    courier_provider VARCHAR(50) DEFAULT 'pathao',
    courier_consignment_id VARCHAR(100),
    courier_tracking_url TEXT,
    courier_dispatched_at TIMESTAMPTZ,
    courier_delivered_at TIMESTAMPTZ,
    
    -- Metadata & Notes
    weight_in_kg NUMERIC(6, 2) DEFAULT 0.5,
    item_type INT DEFAULT 2, -- 1 = doc, 2 = parcel
    special_instructions TEXT,
    customer_notes TEXT,
    internal_notes TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Shopify & DB Timestamps
    shopify_created_at TIMESTAMPTZ NOT NULL,
    shopify_updated_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(shop_id, shopify_order_id)
);

-- 9. Order Items (Line items for each order)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    shopify_line_item_id VARCHAR(100) NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    variant_title VARCHAR(255),
    sku VARCHAR(100),
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    image_url TEXT,
    requires_shipping BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Fulfillments (Shopify Fulfillment records)
CREATE TABLE IF NOT EXISTS fulfillments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    shopify_fulfillment_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'success', -- 'pending', 'open', 'success', 'cancelled', 'error'
    tracking_company VARCHAR(100) DEFAULT 'Pathao Courier',
    tracking_number VARCHAR(100),
    tracking_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Courier Shipments (Consignments generated in Pathao)
CREATE TABLE IF NOT EXISTS courier_shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    courier_provider VARCHAR(50) DEFAULT 'pathao',
    consignment_id VARCHAR(100) NOT NULL,
    tracking_code VARCHAR(100),
    delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
    cod_amount NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Order Placed',
    recipient_name VARCHAR(255),
    recipient_phone VARCHAR(50),
    recipient_address TEXT,
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Courier Events (Log of webhook & status checks from Pathao)
CREATE TABLE IF NOT EXISTS courier_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID REFERENCES courier_shipments(id) ON DELETE SET NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    event_name VARCHAR(100) NOT NULL,
    status VARCHAR(100) NOT NULL,
    description TEXT,
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Order Events (Readable Timeline & Audit Trail)
CREATE TABLE IF NOT EXISTS order_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- 'ORDER_CREATED', 'ORDER_UPDATED', 'DISPATCHED_TO_PATHAO', 'STATUS_UPDATED', 'FULFILLMENT_CREATED', 'NOTE_ADDED'
    source VARCHAR(50) NOT NULL, -- 'SHOPIFY_WEBHOOK', 'PATHAO_WEBHOOK', 'MIBX_USER', 'SYNC_JOB'
    actor VARCHAR(100) DEFAULT 'System',
    previous_value JSONB,
    new_value JSONB,
    shopify_id VARCHAR(100),
    pathao_id VARCHAR(100),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Order Revisions (Track field edits)
CREATE TABLE IF NOT EXISTS order_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    actor VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Notes (Operational notes for warehouse & operators)
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    author_name VARCHAR(100) DEFAULT 'Operator',
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Order Details (Additional operational specifications)
CREATE TABLE IF NOT EXISTS order_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    fragile BOOLEAN DEFAULT FALSE,
    liquid BOOLEAN DEFAULT FALSE,
    box_size VARCHAR(50) DEFAULT 'Standard',
    custom_attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Sync Events (Idempotency, Deduplication & Webhook Queue)
CREATE TABLE IF NOT EXISTS sync_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- e.g. 'orders/create', 'orders/updated', 'pathao/status'
    source VARCHAR(50) NOT NULL, -- 'shopify', 'pathao', 'manual'
    event_id VARCHAR(255) NOT NULL, -- Unique deduplication key (e.g. webhook ID or shopify_id + timestamp)
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'processed', -- 'pending', 'processing', 'processed', 'failed'
    error_message TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source, event_id)
);

-- 18. Sync Jobs (Background batch synchronizations)
CREATE TABLE IF NOT EXISTS sync_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    job_type VARCHAR(100) NOT NULL, -- 'FULL_ORDER_SYNC', 'BULK_DISPATCH', 'RECONCILIATION'
    status VARCHAR(50) DEFAULT 'running', -- 'queued', 'running', 'completed', 'failed', 'partial'
    total_count INT DEFAULT 0,
    processed_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    payload JSONB,
    errors JSONB DEFAULT '[]'::jsonb,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 19. Sync Errors (Detailed failure logs for operator review & retry)
CREATE TABLE IF NOT EXISTS sync_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'order', 'fulfillment', 'shipment', 'webhook'
    entity_id VARCHAR(100) NOT NULL,
    error_code VARCHAR(100),
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    retry_count INT DEFAULT 0,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Audit Logs (Tenant-wide security & action logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id VARCHAR(100) DEFAULT 'System',
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- INDEXES FOR HIGH-PERFORMANCE SEARCH & FILTERING
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_shopify_id ON orders(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_orders_courier_status ON orders(courier_status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_sync_status ON orders(sync_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_dedup ON sync_events(source, event_id);
CREATE INDEX IF NOT EXISTS idx_courier_shipments_consignment ON courier_shipments(consignment_id);

-- =========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper policy function: Checks if authenticated user belongs to the shop's org
CREATE OR REPLACE FUNCTION user_has_shop_access(shop_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM shops s
        JOIN memberships m ON m.org_id = s.org_id
        WHERE s.id = shop_uuid
        AND m.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sample policy on orders table
CREATE POLICY orders_tenant_isolation ON orders
    FOR ALL
    USING (user_has_shop_access(shop_id))
    WITH CHECK (user_has_shop_access(shop_id));

-- Service role bypass policy for backend webhook & cron execution
CREATE POLICY service_role_all_access ON orders
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
