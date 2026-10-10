type RelayJobType = 'webhook.deliver' | 'email.send';

interface CreateJobRequest {
  type: RelayJobType;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}

interface RelayClientOptions {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export class RelayClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: RelayClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async createJob(input: CreateJobRequest) {
    const response = await this.fetchImpl(`${this.baseUrl}/v1/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Failed to create job: ${response.status}`);
    }

    return response.json();
  }

  async getJob(id: string) {
    const response = await this.fetchImpl(`${this.baseUrl}/v1/jobs/${id}`, {
      method: 'GET',
      headers: {
        'x-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch job: ${response.status}`);
    }

    return response.json();
  }
}

async function example() {
  const client = new RelayClient({
    baseUrl: 'http://localhost:3000',
    apiKey: 'demo-secret-key',
  });

  const created = await client.createJob({
    type: 'webhook.deliver',
    payload: {
      url: 'https://example.com/webhook',
      method: 'POST',
      body: { event: 'user.created' },
    },
    idempotencyKey: 'user-created-123',
  });

  console.log('Created job:', created);

  const job = await client.getJob(created.id);
  console.log('Current status:', job.status);
}

void example();
