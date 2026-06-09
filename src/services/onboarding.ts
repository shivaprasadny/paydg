import AsyncStorage from "@react-native-async-storage/async-storage";
import { getProfile } from "../storage/repositories/profileRepo";
import { listWorkplaces } from "../storage/repositories/workplaceRepo";

const ONBOARDING_DONE_KEY = "paydg_onboarding_done_v1";

export async function markOnboardingDone() {
  await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "true");
}

export async function getOnboardingState() {
  const profile = getProfile();
  const workplaces = listWorkplaces();

  const onboardingDone = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);

  return {
    hasProfile: !!profile,
    hasWorkplace: workplaces.length > 0,
    onboardingDone: onboardingDone === "true",
  };
}