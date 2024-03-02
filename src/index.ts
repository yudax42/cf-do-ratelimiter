/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Env } from './types';
export { RateLimiter } from './rate-limiter-do';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		// Get the user IP from the request headers
		const ip = request.headers.get('CF-Connecting-IP')!;

		const doId = env.RLIMIT.idFromName(ip);

		// get the Durable Object stub for our Durable Object instance
		const stub = env.RLIMIT.get(doId);

		// pass the request to Durable Object instance
		return stub.fetch(request);
	},
};
