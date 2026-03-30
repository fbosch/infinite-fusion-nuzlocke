import type {
  Checkpoint,
  CheckpointLabel,
  CountBucket,
  DormancyBucket,
  EncounterCountBucket,
  ViableRosterBucket,
} from "./trackEvent";

export const toEncounterCountBucket = (count: number): EncounterCountBucket => {
  if (count <= 0) return "e_0";
  if (count === 1) return "e_1";
  if (count <= 4) return "e_2_4";
  if (count <= 9) return "e_5_9";
  if (count <= 19) return "e_10_19";
  if (count <= 39) return "e_20_39";
  if (count <= 79) return "e_40_79";
  return "e_80_plus";
};

export const toCountBucket = (count: number): CountBucket => {
  if (count <= 0) return "c_0";
  if (count === 1) return "c_1";
  if (count <= 3) return "c_2_3";
  if (count <= 7) return "c_4_7";
  if (count <= 15) return "c_8_15";
  return "c_16_plus";
};

export const toViableRosterBucket = (count: number): ViableRosterBucket => {
  if (count <= 0) return "v_0";
  if (count === 1) return "v_1";
  if (count <= 3) return "v_2_3";
  if (count <= 5) return "v_4_5";
  return "v_6_plus";
};

export const toDormancyBucket = (
  daysSinceLastActive: number,
): DormancyBucket => {
  if (daysSinceLastActive <= 0) return "d_same_day";
  if (daysSinceLastActive <= 2) return "d_1_2_days";
  if (daysSinceLastActive <= 6) return "d_3_6_days";
  if (daysSinceLastActive <= 13) return "d_7_13_days";
  if (daysSinceLastActive <= 29) return "d_14_29_days";
  return "d_30_plus_days";
};

export const getCheckpointLabel = (checkpoint: Checkpoint): CheckpointLabel => {
  if (checkpoint === 1) return "cp_1";
  if (checkpoint === 5) return "cp_5";
  if (checkpoint === 10) return "cp_10";
  if (checkpoint === 20) return "cp_20";
  if (checkpoint === 40) return "cp_40";
  return "cp_80";
};
