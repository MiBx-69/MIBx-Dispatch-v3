'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, Send, Key, ExternalLink, Zap } from 'lucide-react';
import { testPathaoConnectionAction, getShopDomainAction } from '@/lib/actions/settings-actions';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [isTestingPathao, setIsTestingPathao] = useState(false);
  const [shopDomain, setShopDomain] = useState('');

  useEffect(() => {
    getShopDomainAction().then(setShopDomain);
  }, []);

  const handleTestPathao = async () => {
    setIsTestingPathao(true);
    try {
      const res = await testPathaoConnectionAction();
      if (res.success) {
        toast.success('Pathao Connected!', { description: res.message });
      } else {
        toast.error('Pathao Connection Failed', { description: res.message });
      }
    } catch {
      toast.error('Network request failed');
    } finally {
      setIsTestingPathao(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Key className="h-6 w-6 text-primary" />
            Integrations & Security Credentials
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your Shopify Partner OAuth connection and Pathao courier credentials securely.
          </p>
        </div>
      </div>

      {/* Section 1: Shopify Partner App */}
      <Card className="border-border/80 bg-card/80 backdrop-blur-xl">
        <CardHeader className="p-5 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Shopify Partner App</CardTitle>
                <CardDescription className="text-xs">
                  GraphQL Admin API & Webhooks Synchronization
                </CardDescription>
              </div>
            </div>

            <Badge variant="synced" className="text-xs px-2.5 py-0.5">
              Configured via .env
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="text-xs text-muted-foreground bg-background/50 p-3 rounded-lg border border-border/50">
            <p>Your Shopify credentials (API Key, Secret, Webhook Secret) are securely loaded from your environment configuration (<code className="text-primary">.env.local</code>).</p>
            <p className="mt-2">Configured Domain: <strong className="text-foreground">{shopDomain || 'Loading...'}</strong></p>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Authorize this app on your store to begin synchronization.
            </span>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                const domain = shopDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
                if (!domain) {
                  toast.error('Shop domain is not configured in .env.local');
                  return;
                }
                window.location.href = `/api/shopify/auth?shop=${domain}`;
              }}
              className="h-8 text-xs gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Connect Shopify Store</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Pathao Courier API */}
      <Card className="border-border/80 bg-card/80 backdrop-blur-xl">
        <CardHeader className="p-5 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-red-500/10 text-[#E22026] flex items-center justify-center">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Pathao Aladdin Courier API</CardTitle>
                <CardDescription className="text-xs">
                  Automated consignment creation, pricing, and live tracking
                </CardDescription>
              </div>
            </div>

            <Badge variant="synced" className="text-xs px-2.5 py-0.5">
              Configured via .env
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="text-xs text-muted-foreground bg-background/50 p-3 rounded-lg border border-border/50">
            <p>Your Pathao API credentials (Client ID, Secret, Username, Password) are securely loaded from your environment configuration (<code className="text-primary">.env.local</code>).</p>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Tokens are automatically cached and renewed server-side.
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTestPathao}
              disabled={isTestingPathao}
              className="h-8 text-xs gap-1.5 border-border/80"
            >
              <Zap className={`h-3.5 w-3.5 ${isTestingPathao ? 'animate-spin text-amber-400' : 'text-primary'}`} />
              <span>{isTestingPathao ? 'Testing Connection...' : 'Test Pathao Connection'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
