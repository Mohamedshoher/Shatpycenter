import { describe, it, expect, afterEach } from 'vitest';

describe('auth-server session tokens', () => {
    const ORIGINAL_SECRET = process.env.AUTH_SECRET;

    afterEach(() => {
        if (ORIGINAL_SECRET === undefined) delete process.env.AUTH_SECRET;
        else process.env.AUTH_SECRET = ORIGINAL_SECRET;
    });

    it('creates and verifies a valid session token round-trip', async () => {
        process.env.AUTH_SECRET = 'test-secret-at-least-32-characters-long';
        const { createSessionToken, verifySessionToken } = await import('../auth-server');

        const token = await createSessionToken({
            uid: 'mock-director',
            role: 'director',
            displayName: 'المدير العام',
        });

        const payload = await verifySessionToken(token);
        expect(payload).not.toBeNull();
        expect(payload?.uid).toBe('mock-director');
        expect(payload?.role).toBe('director');
    });

    it('rejects a token signed with a different secret', async () => {
        process.env.AUTH_SECRET = 'secret-one-at-least-32-characters-long';
        const { createSessionToken } = await import('../auth-server');
        const token = await createSessionToken({ uid: 'x', role: 'teacher', displayName: 'م' });

        process.env.AUTH_SECRET = 'secret-two-at-least-32-characters-long';
        const { verifySessionToken } = await import('../auth-server');
        const payload = await verifySessionToken(token);
        expect(payload).toBeNull();
    });

    it('fails safe (returns null, does not throw) when AUTH_SECRET is missing', async () => {
        delete process.env.AUTH_SECRET;
        const { verifySessionToken } = await import('../auth-server');
        await expect(verifySessionToken('not-a-real-token')).resolves.toBeNull();
    });

    it('rejects a garbage/tampered token', async () => {
        process.env.AUTH_SECRET = 'test-secret-at-least-32-characters-long';
        const { verifySessionToken } = await import('../auth-server');
        const payload = await verifySessionToken('this.is.garbage');
        expect(payload).toBeNull();
    });
});
