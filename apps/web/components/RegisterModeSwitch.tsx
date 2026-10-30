import { ParticipationTypeSwitch } from "@/components/ParticipationTypeSwitch";

export type RegisterMode = "customer" | "contractor";

export function RegisterModeSwitch({ current }: { current: RegisterMode }) {
  return (
    <ParticipationTypeSwitch
      variant="register"
      active={current}
      hasCustomer
      hasContractor
    />
  );
}
