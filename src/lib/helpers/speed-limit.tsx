import { STATE_SPEED_LIMITS } from "../maps";

export const getStateSpeedLimit = (state?: string) => {
  return state
    ? STATE_SPEED_LIMITS[state as keyof typeof STATE_SPEED_LIMITS]
    : undefined;
};
