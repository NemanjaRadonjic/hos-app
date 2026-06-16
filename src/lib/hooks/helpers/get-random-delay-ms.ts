export const getRandomCertDelayMs = () => {
  return (5 + Math.floor(Math.random() * 11)) * 1000; // 5–15 sec
};
