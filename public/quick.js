// Cache the public guide with the app shell without accessing a private wallet.
if ('serviceWorker' in navigator) {
 navigator.serviceWorker.register('./sw.js', {scope:'./',updateViaCache:'none'}).catch(() => {
  // The static reference remains usable when offline installation is unavailable.
 });
}
