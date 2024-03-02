import { Env, Bucket } from './types';

// constants
const SECONDS = 1000;
const BUCKET_SIZE = 10;
const REFILL_RATE = 1;

export class RateLimiter {
	state: DurableObjectState;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
	}

	// Initialize or retrieve the existing bucket from storage
	private async initBucket(): Promise<Bucket> {
		const bucket = await this.state.storage.get<Bucket>('bucket');

		// If the bucket doesn't exist, create it (the first time)
		const initBucket: Bucket = {
			tokens: BUCKET_SIZE,
			size: BUCKET_SIZE,
			last_refill_at: Date.now(),
		};

		if (!bucket) {
			await this.state.storage.put('bucket', initBucket);
		}

		// Check if an alarm is set for refilling the bucket, if not, set one
		const refiller = await this.state.storage.getAlarm();

		if (!refiller) {
			await this.state.storage.setAlarm(Date.now() + REFILL_RATE * 60 * SECONDS);
		}

		return bucket || initBucket;
	}

	// Check method to handle incoming requests and enforce rate limits
	private async check() {
		const bucket = await this.initBucket();
		const lastRefillAt = Date.now();

		// If there are no tokens left, return a 429 Too Many Requests response
		if (bucket.tokens === 0) {
			return new Response(`Too Many Requets - ${new Date(lastRefillAt).getHours()}:${new Date(lastRefillAt).getMinutes()}`, {
				status: 429,
			});
		}

		// Decrement token count and update the bucket
		const newBucket: Bucket = {
			...bucket,
			tokens: bucket.tokens - 1,
			last_refill_at: lastRefillAt,
		};

		console.log('new bucket: ', newBucket);

		await this.state.storage.put('bucket', newBucket);

		return new Response(`allowed - ${new Date(lastRefillAt).getHours()}:${new Date(lastRefillAt).getMinutes()}`, { status: 200 });
	}

	// Method to handle incoming fetch events
	async fetch(request: Request) {
		if (request.method === 'POST') {
			const url = new URL(request.url);

			// Route the request based on the URL pathname
			switch (url.pathname) {
				case '/check':
					return await this.check();
				default:
					return new Response('Not found', { status: 404 });
			}
		}
	}

	// Method called by the alarm to refill the token bucket
	async alarm() {
		const bucket = await this.state.storage.get<Bucket>('bucket');

		if (bucket) {
			await this.state.storage.put('bucket', {
				...bucket,
				tokens: bucket.size, // Refill tokens to the bucket's size
			});
		}
	}
}
