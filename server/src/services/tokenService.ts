import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import prisma from '../config/prisma';

export interface AccessTokenPayload {
  sub: string;
  type: 'access';
  v: number;
  jti: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  v: number;
  jti: string;
  iat: number;
  exp: number;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function randomId(): string {
  return crypto.randomUUID();
}

export function generateAccessToken(userId: string, tokenVersion: number): string {
  return jwt.sign(
    { sub: userId, type: 'access', v: tokenVersion },
    config.jwtSecret,
    { expiresIn: config.jwtAccessExpiresIn as string, jwtid: randomId() } as jwt.SignOptions
  );
}

export function generateRefreshToken(userId: string, tokenVersion: number): string {
  return jwt.sign(
    { sub: userId, type: 'refresh', v: tokenVersion },
    config.jwtRefreshSecret,
    { expiresIn: config.jwtRefreshExpiresIn as string, jwtid: randomId() } as jwt.SignOptions
  );
}

function getTokenExpiry(token: string): Date {
  const decoded = jwt.decode(token);
  if (typeof decoded === 'string' || !decoded || typeof decoded.exp !== 'number') {
    throw new Error('Unable to decode token expiry');
  }
  return new Date(decoded.exp * 1000);
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface TokenMeta {
  userAgent?: string;
  ip?: string;
}

export async function issueTokenPair(userId: string, tokenVersion: number, meta?: TokenMeta): Promise<TokenPair> {
  const accessToken = generateAccessToken(userId, tokenVersion);
  const refreshToken = generateRefreshToken(userId, tokenVersion);
  const tokenHash = sha256(refreshToken);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt: getTokenExpiry(refreshToken),
      userAgent: meta?.userAgent,
      ip: meta?.ip,
    },
  });

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, config.jwtSecret) as AccessTokenPayload;
  if (payload.type !== 'access') throw new jwt.JsonWebTokenError('Invalid token type');
  return payload;
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const payload = jwt.verify(token, config.jwtRefreshSecret) as RefreshTokenPayload;
  if (payload.type !== 'refresh') throw new jwt.JsonWebTokenError('Invalid token type');

  const tokenHash = sha256(token);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new jwt.JsonWebTokenError('Refresh token is invalid, expired, or revoked');
  }

  return payload;
}

export async function rotateRefreshToken(
  oldRefreshToken: string,
  meta?: TokenMeta
): Promise<TokenPair> {
  const payload = await verifyRefreshToken(oldRefreshToken);
  const tokenHash = sha256(oldRefreshToken);

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new jwt.JsonWebTokenError('User not found');
  if (user.status !== 'ACTIVE') throw new jwt.JsonWebTokenError('User account is not active');
  if (payload.v !== user.tokenVersion) throw new jwt.JsonWebTokenError('Session expired');

  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return issueTokenPair(user.id, user.tokenVersion, meta);
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const tokenHash = sha256(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
  await revokeAllUserRefreshTokens(userId);
}
