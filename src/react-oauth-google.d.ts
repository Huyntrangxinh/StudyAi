// Type declaration for @react-oauth/google
declare module '@react-oauth/google' {
    import { ReactNode } from 'react';

    export interface GoogleOAuthProviderProps {
        clientId: string;
        children: ReactNode;
        nonce?: string;
        onScriptLoadSuccess?: () => void;
        onScriptLoadError?: () => void;
    }

    export function GoogleOAuthProvider(props: GoogleOAuthProviderProps): JSX.Element;

    export interface GoogleLoginProps {
        onSuccess: (credentialResponse: { credential: string }) => void;
        onError: () => void;
        useOneTap?: boolean;
        auto_select?: boolean;
        theme?: 'outline' | 'filled_blue' | 'filled_black';
        size?: 'large' | 'medium' | 'small';
        text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
        shape?: 'rectangular' | 'pill' | 'circle' | 'square';
        locale?: string;
    }

    export function GoogleLogin(props: GoogleLoginProps): JSX.Element;
}

