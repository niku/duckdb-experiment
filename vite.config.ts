export default {
  build: {
    target: "esnext", // To fix "Top-level await is not available in the configured target environment" error message at `npm run build`
  },
};
