// typescript-eslint no soporta TS 7 todavía: sus paquetes usan la API de TS 6 en paralelo,
// mientras tsc/vite siguen con TS 7. Quitar cuando typescript-eslint soporte TS >= 7.1.
const TS6 = 'npm:@typescript/typescript6@^6.0.2';
const NEEDS_TS_API = /^(typescript-eslint|@typescript-eslint\/.+|ts-api-utils)$/;

function readPackage(pkg) {
  if (NEEDS_TS_API.test(pkg.name)) {
    if (pkg.peerDependencies) delete pkg.peerDependencies.typescript;
    pkg.dependencies = { ...pkg.dependencies, typescript: TS6 };
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
