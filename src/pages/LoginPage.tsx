import React, { useState } from 'react';
import { IonPage, IonContent, IonButton, IonInput, IonText, IonSpinner } from '@ionic/react';
import { useAuth } from '../contexts/AuthContext';
import { useHistory } from 'react-router-dom';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { signIn, signUp } = useAuth();
    const history = useHistory();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isSignUp) {
                await signUp(email, password);
                setError('Conta criada! Verifique seu email para confirmar.');
            } else {
                await signIn(email, password);
                history.push('/home');
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao autenticar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <IonPage>
            <IonContent className="ion-padding">
                <div className="flex min-h-screen items-center justify-center bg-background">
                    <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow-lg">
                        <div className="text-center">
                            <h1 className="text-3xl font-bold text-foreground">
                                {isSignUp ? 'Criar Conta' : 'Login'}
                            </h1>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Gerencie suas finanças pessoais
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-foreground">Email</label>
                                <IonInput
                                    type="email"
                                    value={email}
                                    onIonInput={(e) => setEmail(e.detail.value!)}
                                    placeholder="seu@email.com"
                                    className="mt-1 rounded-md border border-input bg-background px-3 py-2"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-foreground">Senha</label>
                                <IonInput
                                    type="password"
                                    value={password}
                                    onIonInput={(e) => setPassword(e.detail.value!)}
                                    placeholder="••••••••"
                                    className="mt-1 rounded-md border border-input bg-background px-3 py-2"
                                    required
                                />
                            </div>

                            {error && (
                                <IonText color="danger" className="text-sm">
                                    {error}
                                </IonText>
                            )}

                            <IonButton
                                expand="block"
                                type="submit"
                                disabled={loading}
                                className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                {loading ? <IonSpinner name="crescent" /> : isSignUp ? 'Criar Conta' : 'Entrar'}
                            </IonButton>
                        </form>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-sm text-primary hover:underline"
                            >
                                {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se'}
                            </button>
                        </div>
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
};
