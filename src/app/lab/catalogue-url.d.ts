/**
 * The URL of the catalogue JSON, from `scripts/vite/catalogue.ts`: the content-hashed file in a
 * build (`/Rip-PC/assets/catalogue-<hash>.json`), a fresh one in dev. Only the lab imports it.
 */
declare module 'virtual:rig-lab/catalogue-url' {
  const url: string;
  export default url;
}
