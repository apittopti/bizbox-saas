import { NextAuthOptions } from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { getDatabase } from '@bizbox/core-database';
import { userModel, tenantModel } from '@bizbox/core-database';
import { withTenantContext } from '@bizbox/core-database';
import { auditLogger } from '@bizbox/core-database';
import bcrypt from 'bcryptjs';
import { JWT } from 'next-auth/jwt';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  tenantId: string;
  permissions: string[];
  profile?: Record<string, any>;
}

export interface AuthSession {
  user: AuthUser;
  tenant: {
    id: string;
    name: string;
    domain?: string;
    plan: string;
  };
  expires: string;
}

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(getDatabase()),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        tenantId: { label: 'Tenant ID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.tenantId) {
          return null;
        }

        try {
          // Set tenant context for the authentication
          return await withTenantContext(
            { tenantId: credentials.tenantId },
            async () => {
              // Find user by email within the tenant
              const user = await userModel.findByEmail(credentials.email);
              
              if (!user || !user.passwordHash) {
                await auditLogger.logAuthEvent('LOGIN_FAILED', undefined, {
                  email: credentials.email,
                  tenantId: credentials.tenantId,
                  reason: 'user_not_found',
                });
                return null;
              }

              // Verify password
              const isValidPassword = await bcrypt.compare(
                credentials.password,
                user.passwordHash
              );

              if (!isValidPassword) {
                await auditLogger.logAuthEvent('LOGIN_FAILED', user.id, {
                  email: credentials.email,
                  tenantId: credentials.tenantId,
                  reason: 'invalid_password',
                });
                return null;
              }

              // Check if user is active
              if (user.profile?.active === false) {
                await auditLogger.logAuthEvent('LOGIN_FAILED', user.id, {
                  email: credentials.email,
                  tenantId: credentials.tenantId,
                  reason: 'user_inactive',
                });
                return null;
              }

              // Get tenant information
              const tenant = await tenantModel.findById(credentials.tenantId);
              if (!tenant || !tenant.settings?.active) {
                await auditLogger.logAuthEvent('LOGIN_FAILED', user.id, {
                  email: credentials.email,
                  tenantId: credentials.tenantId,
                  reason: 'tenant_inactive',
                });
                return null;
              }

              // Log successful login
              await auditLogger.logAuthEvent('LOGIN', user.id, {
                email: credentials.email,
                tenantId: credentials.tenantId,
              });

              return {
                id: user.id,
                email: user.email,
                name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim(),
                role: user.role,
                tenantId: user.tenantId,
                permissions: user.permissions || [],
                profile: user.profile,
              };
            }
          );
        } catch (error) {
          console.error('Authentication error:', error);
          await auditLogger.logAuthEvent('LOGIN_FAILED', undefined, {
            email: credentials.email,
            tenantId: credentials.tenantId,
            reason: 'system_error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return null;
        }
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user, account }): Promise<JWT> {
      // Initial sign in
      if (account && user) {
        const authUser = user as AuthUser;
        
        // For OAuth providers, we need to handle tenant association
        if (account.provider !== 'credentials') {
          // For OAuth, we'll need to implement tenant selection logic
          // For now, we'll require tenant to be set separately
          throw new Error('OAuth providers require tenant selection');
        }

        token.user = {
          id: authUser.id,
          email: authUser.email,
          name: authUser.name,
          role: authUser.role,
          tenantId: authUser.tenantId,
          permissions: authUser.permissions,
          profile: authUser.profile,
        };

        // Get tenant information
        try {
          const tenant = await tenantModel.findById(authUser.tenantId);
          token.tenant = {
            id: tenant?.id || authUser.tenantId,
            name: tenant?.name || 'Unknown Tenant',
            domain: tenant?.domain,
            plan: tenant?.plan || 'basic',
          };
        } catch (error) {
          console.error('Error fetching tenant info:', error);
        }
      }

      return token;
    },

    async session({ session, token }): Promise<AuthSession> {
      if (token.user && token.tenant) {
        session.user = token.user as AuthUser;
        session.tenant = token.tenant as AuthSession['tenant'];
      }

      return session as AuthSession;
    },

    async signIn({ user, account, profile }) {
      // For OAuth providers, implement additional validation
      if (account?.provider !== 'credentials') {
        // Implement OAuth sign-in logic here
        // This would involve tenant selection or automatic tenant detection
        return true;
      }

      return true;
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      const authUser = user as AuthUser;
      if (authUser.tenantId) {
        await withTenantContext({ tenantId: authUser.tenantId }, async () => {
          await auditLogger.logAuthEvent('LOGIN', authUser.id, {
            provider: account?.provider,
            isNewUser,
          });
        });
      }
    },

    async signOut({ token }) {
      const authToken = token as JWT & { user?: AuthUser };
      if (authToken.user?.tenantId) {
        await withTenantContext({ tenantId: authToken.user.tenantId }, async () => {
          await auditLogger.logAuthEvent('LOGOUT', authToken.user?.id);
        });
      }
    },
  },

  debug: process.env.NODE_ENV === 'development',
};