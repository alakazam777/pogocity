import crypto from 'crypto';

export const generateRandomString = (length: number) => {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};

export const generateCodeChallenge = (codeVerifier: string) => {
    return crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
};
