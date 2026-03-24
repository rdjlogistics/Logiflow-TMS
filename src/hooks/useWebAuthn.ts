import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CREDENTIAL_STORAGE_KEY = 'webauthn_credential_id';
const BIOMETRIC_DISMISSED_KEY = 'webauthn_setup_dismissed';

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlDecode(str: string): Uint8Array {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function useWebAuthn() {
  const [isSupported, setIsSupported] = useState(false);
  const [hasCredential, setHasCredential] = useState(false);
  const [loading, setLoading] = useState(false);
  const [setupDismissed, setSetupDismissed] = useState(false);

  useEffect(() => {
    const supported = !!window.PublicKeyCredential;
    setIsSupported(supported);
    const storedCred = localStorage.getItem(CREDENTIAL_STORAGE_KEY);
    setHasCredential(!!storedCred);
    setSetupDismissed(!!localStorage.getItem(BIOMETRIC_DISMISSED_KEY));
  }, []);

  const dismissSetup = useCallback(() => {
    localStorage.setItem(BIOMETRIC_DISMISSED_KEY, 'true');
    setSetupDismissed(true);
  }, []);

  const register = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      // 1. Get challenge from server
      const { data: challengeData, error: challengeErr } = await supabase.functions.invoke('webauthn-auth', {
        body: { action: 'register-challenge' },
      });

      if (challengeErr || !challengeData) throw new Error('Failed to get challenge');

      const { challenge, signed, userId, user: userInfo } = challengeData;

      // 2. Create credential using platform authenticator (Face ID / Touch ID)
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge: base64urlDecode(challenge).buffer as ArrayBuffer,
          rp: {
            name: 'Chauffeur Portal',
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(userId),
            name: userInfo?.name || 'Chauffeur',
            displayName: userInfo?.name || 'Chauffeur',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
          attestation: 'none',
        },
      })) as PublicKeyCredential | null;

      if (!credential) throw new Error('Credential creation cancelled');

      const response = credential.response as AuthenticatorAttestationResponse;
      const credentialId = base64urlEncode(credential.rawId);
      const publicKeyBytes = response.getPublicKey?.();

      if (!publicKeyBytes) throw new Error('No public key in response');

      const publicKey = base64urlEncode(publicKeyBytes);

      // Detect device name
      const ua = navigator.userAgent;
      let deviceName = 'Apparaat';
      if (/iPhone/.test(ua)) deviceName = 'iPhone (Face ID)';
      else if (/iPad/.test(ua)) deviceName = 'iPad (Face ID)';
      else if (/Mac/.test(ua)) deviceName = 'Mac (Touch ID)';
      else if (/Android/.test(ua)) deviceName = 'Android (Biometrie)';
      else if (/Windows/.test(ua)) deviceName = 'Windows Hello';

      // 3. Verify and store on server
      const { data: verifyData, error: verifyErr } = await supabase.functions.invoke('webauthn-auth', {
        body: {
          action: 'register-verify',
          signed,
          credentialId,
          publicKey,
          deviceName,
        },
      });

      if (verifyErr || !verifyData?.success) throw new Error('Registration verification failed');

      // 4. Store credential ID locally
      localStorage.setItem(CREDENTIAL_STORAGE_KEY, credentialId);
      localStorage.removeItem(BIOMETRIC_DISMISSED_KEY);
      setHasCredential(true);
      setSetupDismissed(false);

      return true;
    } catch (err) {
      console.error('WebAuthn register error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const credentialId = localStorage.getItem(CREDENTIAL_STORAGE_KEY);
      if (!credentialId) throw new Error('No stored credential');

      // 1. Get auth challenge (no auth required)
      const { data: challengeData, error: challengeErr } = await supabase.functions.invoke('webauthn-auth', {
        body: { action: 'get-auth-challenge', credentialId },
      });

      if (challengeErr || !challengeData) throw new Error('Failed to get challenge');

      const { challenge } = challengeData;

      // 2. Get assertion from authenticator
      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge: base64urlDecode(challenge).buffer as ArrayBuffer,
          allowCredentials: [
            {
              id: base64urlDecode(credentialId).buffer as ArrayBuffer,
              type: 'public-key',
              transports: ['internal'],
            },
          ],
          userVerification: 'required',
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!assertion) throw new Error('Authentication cancelled');

      const response = assertion.response as AuthenticatorAssertionResponse;

      // 3. Send to server for verification
      const { data: authData, error: authErr } = await supabase.functions.invoke('webauthn-auth', {
        body: {
          action: 'authenticate',
          credentialId,
          authenticatorData: base64urlEncode(response.authenticatorData),
          clientDataJSON: base64urlEncode(response.clientDataJSON),
          signature: base64urlEncode(response.signature),
        },
      });

      if (authErr || !authData?.success) throw new Error('Authentication failed');

      // 4. Use the OTP to sign in
      const { error: otpErr } = await supabase.auth.verifyOtp({
        email: authData.email,
        token: authData.token,
        type: 'magiclink',
      });

      if (otpErr) throw new Error('Session creation failed');

      return true;
    } catch (err) {
      console.error('WebAuthn authenticate error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeCredential = useCallback(async (): Promise<boolean> => {
    try {
      const credentialId = localStorage.getItem(CREDENTIAL_STORAGE_KEY);
      if (credentialId) {
        // Delete from server
        await supabase
          .from('webauthn_credentials' as any)
          .delete()
          .eq('credential_id', credentialId);
      }
      localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
      localStorage.removeItem(BIOMETRIC_DISMISSED_KEY);
      setHasCredential(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    isSupported,
    hasCredential,
    loading,
    setupDismissed,
    register,
    authenticate,
    removeCredential,
    dismissSetup,
  };
}
