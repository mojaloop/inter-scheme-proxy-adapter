import process from 'node:process';

export const PORT = process.env.ECHO_PORT ?? 6000;

export const DELAY_MS = parseInt(process.env.ECHO_DELAY_MS || '') || 1000;
