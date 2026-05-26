const CACHE_VERSION = 'v1';
const CACHE_NAME = `monitor-maquinas-${CACHE_VERSION}`;

const ASSETS_TO_CACHE = [
  'index.html',
  'styles.css',
  'app.js',
  'manifest.json',
  'icon-192x192.png',
  'icon-512x512.png'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  console.log('🔧 Service Worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Cacheando arquivos...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  console.log('✅ Service Worker ativado');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar requisições (Cache First, com fallback para rede)
self.addEventListener('fetch', event => {
  const { request } = event;

  // Ignorar requisições não-GET
  if (request.method !== 'GET') {
    return;
  }

  // Estratégia: Cache First, Network Fallback
  event.respondWith(
    caches.match(request)
      .then(response => {
        // Se encontrar no cache, retorna
        if (response) {
          return response;
        }

        // Caso contrário, tenta buscar da rede
        return fetch(request)
          .then(response => {
            // Valida a resposta
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clona a resposta para poder cacheá-la
            const responseToCache = response.clone();

            // Cacheia a nova resposta
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Se falhar, tenta retornar do cache
            return caches.match(request);
          });
      })
  );
});

// Sincronização em background (opcional, para futuras melhorias)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Aqui você poderia sincronizar dados com um servidor
      Promise.resolve()
    );
  }
});
