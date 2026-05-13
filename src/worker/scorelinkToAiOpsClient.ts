interface AiOpsEnv {
  AI_OPS_BASE_URL: string;
  AI_OPS_CONNECTOR_SECRET: string;
}

interface CustomerUpdate {
  externalCustomerId: string;
  name: string;
  email: string;
  companyName?: string;
  planKey: string;
  status: string;
  billingEmail?: string;
}

interface UsageSnapshot {
  externalCustomerId: string;
  snapshotDate: string;
  activeLeaguesCount: number;
  activeEventsCount: number;
  activeBoardsCount: number;
  totalSessions: number;
  premiumFeatureUsageCount: number;
  gamesStreamedLast30d: number;
  multiFieldUsageCount: number;
  lastActiveAt?: string;
  usageScore: number;
}

interface SupportMessage {
  threadId: string;
  messageId: string;
  from: string;
  fromName: string;
  subject: string;
  message: string;
  channel: string;
}

export class ScoreLinkToAiOpsClient {
  private baseUrl: string;
  private secret: string;

  constructor(env: AiOpsEnv) {
    this.baseUrl = env.AI_OPS_BASE_URL;
    this.secret = env.AI_OPS_CONNECTOR_SECRET;
  }

  private async makeRequest(endpoint: string, payload: any): Promise<{ ok: boolean; error?: string }> {
    if (!this.baseUrl || !this.secret) {
      console.warn('AI Ops connector not configured, skipping request');
      return { ok: false, error: 'Not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-aiops-connector-secret': this.secret,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI Ops request failed: ${response.status} - ${errorText}`);
        return { ok: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      return { ok: true };
    } catch (error) {
      console.error('AI Ops request error:', error);
      return { ok: false, error: String(error) };
    }
  }

  async sendCustomerUpdate(customer: CustomerUpdate): Promise<{ ok: boolean; error?: string }> {
    return this.makeRequest('/api/connectors/scorelink/customers', customer);
  }

  async sendUsageSnapshot(usage: UsageSnapshot): Promise<{ ok: boolean; error?: string }> {
    return this.makeRequest('/api/connectors/scorelink/usage', usage);
  }

  async sendSupportMessage(message: SupportMessage): Promise<{ ok: boolean; error?: string }> {
    return this.makeRequest('/api/connectors/scorelink/support-message', message);
  }

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    if (!this.baseUrl || !this.secret) {
      return { ok: false, error: 'Not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/connectors/scorelink/health`, {
        method: 'GET',
        headers: {
          'x-aiops-connector-secret': this.secret,
        },
      });

      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}` };
      }

      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  }
}
