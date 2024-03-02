export interface Env {
	RLIMIT: DurableObjectNamespace;
}

export interface Bucket {
	tokens: number; // Current number of tokens available in the bucket
	size: number; // Maximum capacity of the bucket (total number of tokens it can hold)
	last_refill_at: number; // Timestamp of the last refill operation
}
