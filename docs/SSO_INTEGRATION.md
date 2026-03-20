# Integración de Single Sign-On (SSO) con ERP Datacom

Este documento detalla el mecanismo de autenticación centralizada implementado para el **CRM DataCom**, el cual delega la gestión de credenciales al portal **ERP Datacom (WebISO)**.

## 1. Flujo de Autenticación

El CRM está configurado para no permitir el inicio de sesión local directo (portal `/login` inhabilitado). El flujo estándar es:

1.  **Acceso Inicial**: El usuario intenta acceder a cualquier ruta protegida del CRM (ej. `/clients`).
2.  **Verificación**: El componente `ProtectedRoute` en el frontend verifica si existe un `authToken` en el `sessionStorage`.
3.  **Redirección ERP**: Si no hay token, el sistema redirige automáticamente al navegador a la URL del portal ERP: `http://10.11.121.58:8081`.
4.  **Login en ERP**: El usuario se autentica en el ERP.
5.  **Retorno con Token**: El ERP valida las credenciales contra la API del CRM y redirige al usuario de vuelta al CRM con el token en la URL: `http://10.11.121.58/clients?sso_token=XYZ123`.
6.  **Captura de Token**: El componente `AuthContext` del CRM captura el `sso_token` de forma síncrona, lo almacena en `sessionStorage` y limpia la URL.

## 2. Detalles de Implementación (Frontend)

### AuthContext.jsx
Se utiliza una función autoejecutable (IIFE) para procesar el token antes de cualquier renderizado de React, evitando parpadeos o redirecciones incorrectas:

```javascript
(function processSSOToken() {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get('sso_token');
    if (!ssoToken) return;
    sessionStorage.setItem('authToken', ssoToken);
    // Limpieza de URL
    const cleanUrl = window.location.origin + window.location.pathname + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);
})();
```

### App.jsx (ProtectedRoute)
Controla la redirección forzada al portal externo:

```javascript
if (!activeToken) {
    window.location.href = 'http://10.11.121.58:8081';
    return null;
}
```

## 3. Seguridad

- **Token de Sesión**: Los tokens generados son estándar de Django Authtoken.
- **No persistencia**: Se utiliza `sessionStorage` para asegurar que el acceso expire al cerrar la pestaña o el navegador por completo.
- **Inhabilitación de Login Interno**: Aunque la ruta `/login` existe en el código para mantener compatibilidad, el `ProtectedRoute` impide su uso al redirigir siempre al portal port 8081.

## 4. Troubleshooting

- **Pantalla Blanca**: Si el CRM se queda en blanco, verifique que el portal ERP (8081) sea accesible desde su red.
- **Bucle de redirección**: Asegúrese de que el ERP esté enviando correctamente el parámetro `?sso_token=` al redirigir de vuelta.
