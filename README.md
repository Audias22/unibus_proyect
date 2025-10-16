UniBus Zacapa — instrucciones rápidas

1) Problema corriente
- Si ves errores en consola: "FirebaseError: Missing or insufficient permissions" significa que las reglas de Firestore no permiten leer/escribir desde el cliente.

2) Pasos mínimos para configurar Firebase (cliente)
- Crea proyecto en Firebase Console.
- En Build > Firestore Database crea una base de datos en modo de prueba (o production con reglas custom).
- En Project settings > General > Your apps añade una Web App y copia la configuración (apiKey, authDomain, projectId, appId, ...).
- Pega esa configuración en `src/firebase.js` reemplazando el objeto `firebaseConfig`.

3) Reglas recomendadas
- Desarrollo (temporal, no usar en producción):
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if true;
      }
    }
  }

- Producción básica (solo usuarios autenticados pueden leer/escribir):
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if request.auth != null;
      }
    }
  }

4) Crear un usuario admin para probar
- En Authentication > Users > Add user: crea email/clave.
- Usa la pantalla Admin (/#/admin) para iniciar sesión con ese usuario.

5) Probar localmente si no quieres tocar reglas
- Si no quieres cambiar reglas, usa los botones "Cargar ejemplo local" en Dashboard y Gestión para seguir probando UI.

6) Limpieza de código y archivos
- Antes de borrar archivos: haz una copia del repo (zip o rama nueva).
- Archivos a revisar/posible eliminar: duplicados listados en el workspace (por ejemplo `views/student.js` aparece dos veces en la lista, limpiar duplicados). Revisa `libs/` si no usas alguna librería.

7) Seed de datos (opcional)
- Para insertar datos reales automatizados conviene usar Admin SDK desde un script server-side (Node) o Cloud Function con credenciales de servicio.

Si quieres, hago:
- A) Crear un script de "seed" que genere 10 estudiantes de ejemplo (requiere credenciales, te doy instrucciones).
- B) Limpiar archivos duplicados y dejar solo una copia (haré backup primero).
- C) Preparar instrucciones exactas paso-a-paso para pegar las reglas en Firebase.

Indica A, B o C o dime qué prefieres y lo hago.