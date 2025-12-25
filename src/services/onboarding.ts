import { getProfile } from "../storage/repositories/profileRepo";
import { listWorkplaces } from "../storage/repositories/workplaceRepo";

export function getOnboardingState() {
  const profile = getProfile();
  const workplaces = listWorkplaces();
  return {
    hasProfile: !!profile,
    hasWorkplace: workplaces.length > 0,
  };
}
