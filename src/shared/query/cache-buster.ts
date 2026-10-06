const readEnvVar = (key: "NODE_ENV" | "NEXT_PUBLIC_BUILD_ID") => {
  if (typeof process === "undefined") {
    return;
  }

  return process.env[key];
};

const isDevelopment = readEnvVar("NODE_ENV") === "development";

export const getCacheBuster = () => {
  if (isDevelopment) {
    return Math.floor(Date.now() / (1 * 60 * 1000));
  }

  return readEnvVar("NEXT_PUBLIC_BUILD_ID") || "v1";
};
