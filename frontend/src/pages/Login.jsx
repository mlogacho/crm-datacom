import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Lock, User, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();

    // Steps: 1 (Credentials), 2 (Setup 2FA), 3 (Verify 2FA)
    const [step, setStep] = useState(1);

    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [totpCode, setTotpCode] = useState('');
    const [setupData, setSetupData] = useState(null); // { qr_code, temp_secret, user_id }
    const [verifyData, setVerifyData] = useState(null); // { user_id }

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials(prev => ({ ...prev, [name]: value }));
    };

    const handleInitialLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await axios.post('/api/api-token-auth/', credentials);

            if (response.data.requires_2fa_setup) {
                setSetupData(response.data);
                setStep(2);
            } else if (response.data.requires_2fa) {
                setVerifyData(response.data);
                setStep(3);
            } else if (response.data.token) {
                // Fallback if 2FA wasn't triggered for some reason (shouldn't happen with our new logic)
                await login(response.data.token);
                navigate('/');
            }
        } catch (err) {
            console.error('Error logging in:', err);
            setError('Credenciales incorrectas. Por favor, intente de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetup2FA = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await axios.post('/api/core/2fa/verify-setup/', {
                user_id: setupData.user_id,
                temp_secret: setupData.temp_secret,
                totp_code: totpCode
            });
            await login(response.data.token);
            navigate('/');
        } catch (err) {
            console.error('Error in 2FA Setup:', err);
            setError(err.response?.data?.error || 'Código incorrecto. Intente nuevamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify2FA = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await axios.post('/api/api-token-auth/', {
                ...credentials,
                totp_code: totpCode
            });
            await login(response.data.token);
            navigate('/');
        } catch (err) {
            console.error('Error verifying 2FA:', err);
            setError('Código de autenticador inválido. Intente de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2629&auto=format&fit=crop')] bg-cover bg-center">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex justify-center flex-col items-center">
                    <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center p-3 mb-6 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                        <img src="/logo.jpg" alt="Datacom Logo" className="w-full h-full object-contain" />
                    </div>
                    <h2 className="text-center text-3xl font-extrabold text-white">
                        Datacom CRM
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-300">
                        Inicie sesión para acceder a su panel de control
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-up">
                <div className="bg-white/95 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/20">
                    {step === 1 && (
                        <form className="space-y-6" onSubmit={handleInitialLogin}>
                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md animate-fade-in">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm text-red-700">{error}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-slate-700">
                                    Nombre de Usuario
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        required
                                        className="input-field pl-10"
                                        placeholder="admin"
                                        value={credentials.username}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                                    Contraseña
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        className="input-field pl-10"
                                        placeholder="••••••••"
                                        value={credentials.password}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg hover:-translate-y-0.5'}`}
                                >
                                    {isLoading ? (
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <LogIn className="w-5 h-5 mr-2" />
                                    )}
                                    {isLoading ? 'Comprobando credenciales...' : 'Siguiente'}
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 2 && setupData && (
                        <form className="space-y-6" onSubmit={handleSetup2FA}>
                            <div className="text-center mb-6">
                                <ShieldCheck className="w-12 h-12 text-primary-600 mx-auto mb-2" />
                                <h3 className="text-lg font-bold text-slate-900">Configurar Seguridad (2FA)</h3>
                                <p className="text-sm text-slate-500 mt-2">
                                    Por tu seguridad, Datacom CRM requiere Autenticación de Dos Factores.
                                </p>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                                <p className="text-sm text-slate-700 mb-4 font-medium">1. Escanea este código QR con la aplicación Google Authenticator (o Authy) desde tu celular.</p>
                                <img src={setupData.qr_code} alt="QR Code" className="mx-auto w-48 h-48 border-4 border-white rounded-lg shadow-sm" />
                            </div>

                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-md animate-fade-in text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    2. Ingresa el código de 6 dígitos que aparece en la aplicación
                                </label>
                                <input
                                    type="text"
                                    required
                                    maxLength="6"
                                    className="input-field text-center text-2xl tracking-widest font-mono"
                                    placeholder="000000"
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ''))}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    disabled={isLoading}
                                    className="w-1/3 flex justify-center py-3 px-4 border border-slate-300 rounded-xl shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                                >
                                    Volver
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || totpCode.length !== 6}
                                    className={`w-2/3 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 ${isLoading || totpCode.length !== 6 ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg'}`}
                                >
                                    {isLoading ? 'Verificando...' : 'Confirmar y Entrar'}
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 3 && (
                        <form className="space-y-6" onSubmit={handleVerify2FA}>
                            <div className="text-center mb-6">
                                <ShieldCheck className="w-12 h-12 text-primary-600 mx-auto mb-2" />
                                <h3 className="text-lg font-bold text-slate-900">Verificación 2FA</h3>
                                <p className="text-sm text-slate-500 mt-2">
                                    Abre Google Authenticator e ingresa tu código de verificación de 6 dígitos.
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-md animate-fade-in text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            <div>
                                <input
                                    type="text"
                                    required
                                    maxLength="6"
                                    autoFocus
                                    className="input-field text-center text-3xl tracking-widest font-mono py-4"
                                    placeholder="------"
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ''))}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    disabled={isLoading}
                                    className="w-1/3 flex justify-center py-3 px-4 border border-slate-300 rounded-xl shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                                >
                                    Atrás
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || totpCode.length !== 6}
                                    className={`w-2/3 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 ${isLoading || totpCode.length !== 6 ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg'}`}
                                >
                                    {isLoading ? 'Verificando...' : 'Ingresar al CRM'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
